using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Net.WebSockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using EasyInk.Engine;
using EasyInk.Engine.Models;
using EasyInk.Printer.Services.Abstractions;

namespace EasyInk.Printer.Server;

public class WebSocketCommandHandler
{
    private const int MaxPdfBytes = 50 * 1024 * 1024;
    private const int MaxChunkBytes = 2 * 1024 * 1024;
    private static readonly TimeSpan UploadSessionTtl = TimeSpan.FromMinutes(10);

    private readonly EngineApi _api;
    private readonly WebSocketHandler _wsHandler;
    private readonly IAuditService _auditService;
    private readonly ConcurrentDictionary<string, PdfUploadSession> _uploads = new();

    public WebSocketCommandHandler(EngineApi api, WebSocketHandler wsHandler, IAuditService auditService)
    {
        _api = api;
        _wsHandler = wsHandler;
        _auditService = auditService;
    }

    public async Task HandleMessage(WebSocket ws, WebSocketMessage message)
    {
        PrinterResult result;

        try
        {
            result = message.Command switch
            {
                "print" => HandlePrint(message),
                "printAsync" => HandlePrintAsync(message),
                "uploadPdfChunk" => HandleUploadPdfChunk(message),
                "printUploadedPdf" => HandlePrintUploadedPdf(message, "print"),
                "printUploadedPdfAsync" => HandlePrintUploadedPdf(message, "printAsync"),
                "getPrinters" => _api.GetPrinters(),
                "getPrinterStatus" => HandleGetPrinterStatus(message),
                "getJobStatus" => HandleGetJobStatus(message),
                "getAllJobs" => _api.GetAllJobs(),
                "queryLogs" => HandleQueryLogs(message),
                _ => PrinterResult.Error(message.Id, ErrorCode.UnknownCommand, $"未知命令: {message.Command}")
            };
        }
        catch (Exception ex)
        {
            result = PrinterResult.Error(message.Id, ErrorCode.InternalError, ex.Message);
        }

        await SendResponse(ws, result);
    }

    private PrinterResult HandlePrint(WebSocketMessage message)
    {
        return ExecutePrintCommand(message.Id, "print", message.Params, message.PdfBytes);
    }

    private PrinterResult HandlePrintAsync(WebSocketMessage message)
    {
        return ExecutePrintCommand(message.Id, "printAsync", message.Params, message.PdfBytes);
    }

    private PrinterResult HandleUploadPdfChunk(WebSocketMessage message)
    {
        CleanupExpiredUploads();

        if (message.Params == null)
            return PrinterResult.Error(message.Id, ErrorCode.InvalidParams, "缺少切片参数");
        if (message.PdfBytes == null || message.PdfBytes.Length == 0)
            return PrinterResult.Error(message.Id, ErrorCode.InvalidParams, "缺少 PDF 切片数据");
        if (message.PdfBytes.Length > MaxChunkBytes)
            return PrinterResult.Error(message.Id, ErrorCode.ChunkTooLarge, $"PDF 切片过大，上限 {MaxChunkBytes / 1024 / 1024}MB");

        var uploadId = message.Params["uploadId"]?.ToString();
        var chunkIndex = message.Params["chunkIndex"]?.ToObject<int?>();
        var totalChunks = message.Params["totalChunks"]?.ToObject<int?>();
        var totalBytes = message.Params["totalBytes"]?.ToObject<long?>();

        if (string.IsNullOrEmpty(uploadId) || chunkIndex == null || totalChunks == null || totalBytes == null)
            return PrinterResult.Error(message.Id, ErrorCode.InvalidParams, "缺少 uploadId、chunkIndex、totalChunks 或 totalBytes");
        if (totalBytes <= 0 || totalBytes > MaxPdfBytes)
            return PrinterResult.Error(message.Id, ErrorCode.PdfTooLarge, $"PDF 文件过大，上限 {MaxPdfBytes / 1024 / 1024}MB");
        if (totalChunks <= 0 || chunkIndex < 0 || chunkIndex >= totalChunks)
            return PrinterResult.Error(message.Id, ErrorCode.InvalidParams, "无效的切片序号");

        try
        {
            var upload = _uploads.GetOrAdd(uploadId, _ => new PdfUploadSession(uploadId, totalChunks.Value, totalBytes.Value));
            upload.AddChunk(chunkIndex.Value, totalChunks.Value, totalBytes.Value, message.PdfBytes);

            return PrinterResult.Ok(message.Id, new
            {
                uploadId,
                receivedChunks = upload.ReceivedChunks,
                totalChunks = upload.TotalChunks,
                receivedBytes = upload.ReceivedBytes,
                totalBytes = upload.TotalBytes,
                completed = upload.IsComplete
            });
        }
        catch (Exception ex)
        {
            return PrinterResult.Error(message.Id, ErrorCode.InvalidChunk, ex.Message);
        }
    }

    private PrinterResult HandlePrintUploadedPdf(WebSocketMessage message, string command)
    {
        if (message.Params == null)
            return PrinterResult.Error(message.Id, ErrorCode.InvalidParams, "缺少打印参数");

        var uploadId = message.Params["uploadId"]?.ToString();
        if (string.IsNullOrEmpty(uploadId))
            return PrinterResult.Error(message.Id, ErrorCode.InvalidParams, "缺少 uploadId 参数");

        if (!_uploads.TryGetValue(uploadId, out var upload))
            return PrinterResult.Error(message.Id, ErrorCode.UploadNotFound, $"PDF 上传不存在或已过期: {uploadId}");

        byte[] pdfBytes;
        try
        {
            pdfBytes = upload.Assemble();
        }
        catch (Exception ex)
        {
            return PrinterResult.Error(message.Id, ErrorCode.UploadIncomplete, ex.Message);
        }

        _uploads.TryRemove(uploadId, out _);
        var printParams = ConvertToDictionary(message.Params) ?? new Dictionary<string, object>();
        printParams.Remove("uploadId");
        return ExecutePrintCommand(message.Id, command, printParams, pdfBytes);
    }

    private PrinterResult ExecutePrintCommand(string id, string command, JObject parameters, byte[] pdfBytes)
    {
        return ExecutePrintCommand(id, command, ConvertToDictionary(parameters), pdfBytes);
    }

    private PrinterResult ExecutePrintCommand(string id, string command, Dictionary<string, object> parameters, byte[] pdfBytes)
    {
        var printParams = parameters ?? new Dictionary<string, object>();
        if (pdfBytes != null && pdfBytes.Length > 0)
        {
            printParams.Remove("pdfBase64");
            printParams.Remove("pdfUrl");
            printParams["pdfBytes"] = pdfBytes;
        }

        if (printParams.Count == 0)
            return PrinterResult.Error(id, ErrorCode.InvalidParams, "缺少打印参数");

        return _api.HandleCommand(new PrinterCommand
        {
            Command = command,
            Id = id,
            Params = printParams
        });
    }

    private PrinterResult HandleGetPrinterStatus(WebSocketMessage message)
    {
        var printerName = message.Params?["printerName"]?.ToString();
        if (string.IsNullOrEmpty(printerName))
            return PrinterResult.Error(message.Id, ErrorCode.InvalidParams, "缺少printerName参数");

        return _api.GetPrinterStatus(printerName);
    }

    private PrinterResult HandleGetJobStatus(WebSocketMessage message)
    {
        var jobId = message.Params?["jobId"]?.ToString();
        if (string.IsNullOrEmpty(jobId))
            return PrinterResult.Error(message.Id, ErrorCode.InvalidParams, "缺少jobId参数");

        return _api.HandleCommand(new PrinterCommand
        {
            Command = "getJobStatus",
            Id = message.Id,
            Params = ConvertToDictionary(message.Params)
        });
    }

    private PrinterResult HandleQueryLogs(WebSocketMessage message)
    {
        var p = message.Params;
        var startTime = p?["startTime"]?.ToObject<DateTime?>();
        var endTime = p?["endTime"]?.ToObject<DateTime?>();
        var printerName = p?["printerName"]?.ToString();
        var userId = p?["userId"]?.ToString();
        var status = p?["status"]?.ToString();
        var limit = p?["limit"]?.ToObject<int?>() ?? 100;
        var offset = p?["offset"]?.ToObject<int?>() ?? 0;

        var logs = _auditService.QueryLogs(startTime, endTime, printerName, userId, status, limit, offset);
        return PrinterResult.Ok(message.Id, new { logs });
    }

    private static Dictionary<string, object> ConvertToDictionary(JObject obj)
    {
        if (obj == null)
            return null;

        var dict = new Dictionary<string, object>();
        foreach (var prop in obj.Properties())
        {
            dict[prop.Name] = prop.Value.ToObject<object>();
        }
        return dict;
    }

    private void CleanupExpiredUploads()
    {
        var cutoff = DateTime.UtcNow - UploadSessionTtl;
        foreach (var pair in _uploads)
        {
            if (pair.Value.CreatedAt < cutoff)
                _uploads.TryRemove(pair.Key, out _);
        }
    }

    private async Task SendResponse(WebSocket ws, PrinterResult result)
    {
        if (ws.State != WebSocketState.Open)
            return;

        var json = JsonConvert.SerializeObject(result, JsonConfig.CamelCase);
        var bytes = Encoding.UTF8.GetBytes(json);
        var segment = new ArraySegment<byte>(bytes);
        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
        await ws.SendAsync(segment, WebSocketMessageType.Text, true, cts.Token);
    }

    private sealed class PdfUploadSession
    {
        private readonly object _lock = new object();
        private readonly byte[][] _chunks;

        public PdfUploadSession(string uploadId, int totalChunks, long totalBytes)
        {
            UploadId = uploadId;
            TotalChunks = totalChunks;
            TotalBytes = totalBytes;
            CreatedAt = DateTime.UtcNow;
            _chunks = new byte[totalChunks][];
        }

        public string UploadId { get; }
        public int TotalChunks { get; }
        public long TotalBytes { get; }
        public DateTime CreatedAt { get; }
        public int ReceivedChunks { get; private set; }
        public long ReceivedBytes { get; private set; }
        public bool IsComplete => ReceivedChunks == TotalChunks && ReceivedBytes == TotalBytes;

        public void AddChunk(int chunkIndex, int totalChunks, long totalBytes, byte[] chunk)
        {
            lock (_lock)
            {
                if (totalChunks != TotalChunks || totalBytes != TotalBytes)
                    throw new ArgumentException("上传元数据不一致");
                if (chunkIndex < 0 || chunkIndex >= TotalChunks)
                    throw new ArgumentOutOfRangeException(nameof(chunkIndex));
                if (_chunks[chunkIndex] != null)
                    return;
                if (ReceivedBytes + chunk.Length > TotalBytes)
                    throw new ArgumentException("切片总大小超过声明的 PDF 大小");

                _chunks[chunkIndex] = chunk;
                ReceivedChunks++;
                ReceivedBytes += chunk.Length;
            }
        }

        public byte[] Assemble()
        {
            lock (_lock)
            {
                if (!IsComplete)
                    throw new InvalidOperationException($"PDF 上传未完成: {ReceivedChunks}/{TotalChunks}");
                if (TotalBytes > int.MaxValue)
                    throw new InvalidOperationException("PDF 文件过大");

                var result = new byte[(int)TotalBytes];
                var offset = 0;
                foreach (var chunk in _chunks)
                {
                    if (chunk == null)
                        throw new InvalidOperationException("PDF 上传缺少切片");
                    Buffer.BlockCopy(chunk, 0, result, offset, chunk.Length);
                    offset += chunk.Length;
                }
                return result;
            }
        }
    }
}
