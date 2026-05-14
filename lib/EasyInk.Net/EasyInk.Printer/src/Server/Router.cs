using System;
using System.IO;
using System.Net;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;
using EasyInk.Engine;
using EasyInk.Engine.Models;
using EasyInk.Printer.Api;
using EasyInk.Printer.Config;
using EasyInk.Printer.Services.Abstractions;

namespace EasyInk.Printer.Server;

public class Router
{
    private const long MaxRequestBodyBytes = 10 * 1024 * 1024; // 10MB

    private readonly PrinterController _printerController;
    private readonly PrintController _printController;
    private readonly JobController _jobController;
    private readonly LogController _logController;
    private readonly StatusController _statusController;
    private readonly WebSocketHandler _wsHandler;
    private readonly bool _trustAllOrigins;
    private readonly string _apiKey;

    public Router(EngineApi engineApi, WebSocketHandler wsHandler, HostConfig config, IAuditService auditService)
    {
        _printerController = new PrinterController(engineApi);
        _printController = new PrintController(engineApi);
        _jobController = new JobController(engineApi);
        _logController = new LogController(auditService);
        _statusController = new StatusController();
        _wsHandler = wsHandler;
        _trustAllOrigins = config.TrustAllOrigins;
        _apiKey = config.ApiKey;
    }

    public async Task HandleRequest(HttpListenerContext context)
    {
        var request = context.Request;
        var response = context.Response;

        if (_trustAllOrigins)
        {
            response.Headers.Add("Access-Control-Allow-Origin", "*");
        }
        else
        {
            var origin = request.Headers["Origin"];
            if (!string.IsNullOrEmpty(origin) && IsLocalOrigin(origin))
                response.Headers.Add("Access-Control-Allow-Origin", origin);
        }
        response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        response.Headers.Add("Access-Control-Allow-Headers", "Content-Type, X-API-Key");

        if (request.HttpMethod == "OPTIONS")
        {
            response.StatusCode = 200;
            response.Close();
            return;
        }

        if (!ValidateApiKey(request))
        {
            var unauthorized = Encoding.UTF8.GetBytes(SerializeResult(PrinterResult.Error(null, ErrorCode.Unauthorized, "无效的 API Key")));
            response.StatusCode = 401;
            response.ContentType = "application/json; charset=utf-8";
            response.ContentLength64 = unauthorized.Length;
            await response.OutputStream.WriteAsync(unauthorized, 0, unauthorized.Length);
            response.Close();
            return;
        }

        PrinterResult result;
        try
        {
            result = await RouteRequest(request);
        }
        catch (Exception ex)
        {
            result = PrinterResult.Error(null, ErrorCode.InternalError, ex.Message);
        }

        var buffer = Encoding.UTF8.GetBytes(SerializeResult(result));
        response.ContentType = "application/json; charset=utf-8";
        response.ContentLength64 = buffer.Length;
        await response.OutputStream.WriteAsync(buffer, 0, buffer.Length);
        response.Close();
    }

    private async Task<PrinterResult> RouteRequest(HttpListenerRequest request)
    {
        var path = request.Url.AbsolutePath.TrimEnd('/');
        var method = request.HttpMethod;

        if (method == "GET" && path == "/api/status")
            return _statusController.GetStatus();

        if (method == "GET" && path == "/api/status/connections")
            return PrinterResult.Ok("connections", new { count = _wsHandler.ConnectionCount });

        if (method == "GET" && path == "/api/printers")
            return _printerController.GetPrinters();

        // GET /api/printers/{name}/status
        if (method == "GET" && path.StartsWith("/api/printers/") && path.EndsWith("/status"))
        {
            var segments = path.Split('/');
            if (segments.Length == 5 && !string.IsNullOrEmpty(segments[3]))
            {
                var name = Uri.UnescapeDataString(segments[3]);
                return _printerController.GetPrinterStatus(name);
            }
            return PrinterResult.Error(null, ErrorCode.InvalidParams, "缺少打印机名称");
        }

        if (method == "POST" && path == "/api/print")
            return await HandlePrintRequest(request);

        if (method == "POST" && path == "/api/print/async")
            return await HandleEnqueuePrintRequest(request);

        if (method == "POST" && path == "/api/print/batch")
            return _printController.BatchPrint(await ReadBodyAsString(request));

        if (method == "POST" && path == "/api/print/batch/async")
            return _printController.EnqueueBatchPrint(await ReadBodyAsString(request));

        if (method == "GET" && path == "/api/jobs")
            return _jobController.GetAllJobs();

        if (method == "GET" && path.StartsWith("/api/jobs/"))
        {
            var id = path.Substring(10);
            if (string.IsNullOrEmpty(id))
                return PrinterResult.Error(null, ErrorCode.InvalidParams, "缺少任务ID");
            return _jobController.GetJobStatus(id);
        }

        if (method == "GET" && path == "/api/logs")
            return _logController.QueryLogs(request.QueryString);

        return PrinterResult.Error(null, ErrorCode.NotFound, $"路由不存在: {method} {path}");
    }

    private async Task<PrinterResult> HandlePrintRequest(HttpListenerRequest request)
    {
        var (paramsJson, pdfBytes) = await ReadMultipartOrJson(request);
        if (paramsJson == null)
            return PrinterResult.Error(null, ErrorCode.InvalidParams, "缺少请求参数");
        if (pdfBytes != null)
            return _printController.Print(paramsJson, pdfBytes);
        return _printController.Print(paramsJson);
    }

    private async Task<PrinterResult> HandleEnqueuePrintRequest(HttpListenerRequest request)
    {
        var (paramsJson, pdfBytes) = await ReadMultipartOrJson(request);
        if (paramsJson == null)
            return PrinterResult.Error(null, ErrorCode.InvalidParams, "缺少请求参数");
        if (pdfBytes != null)
            return _printController.EnqueuePrint(paramsJson, pdfBytes);
        return _printController.EnqueuePrint(paramsJson);
    }

    private async Task<(string paramsJson, byte[] pdfBytes)> ReadMultipartOrJson(HttpListenerRequest request)
    {
        var contentType = request.ContentType ?? "";

        if (contentType.Contains("multipart/form-data"))
        {
            var body = await ReadBodyAsBytes(request);
            var multipart = MultipartParser.Parse(body, contentType);

            if (multipart.Params == null || multipart.PdfBytes == null || multipart.PdfBytes.Length == 0)
                return (null, null);

            return (multipart.Params.ToString(), multipart.PdfBytes);
        }

        return (await ReadBodyAsString(request), null);
    }

    private static async Task<string> ReadBodyAsString(HttpListenerRequest request)
    {
        if (request.InputStream == null) return null;
        if (request.ContentLength64 < 0) return null;
        if (request.ContentLength64 > MaxRequestBodyBytes)
            throw new InvalidOperationException($"请求体过大: {request.ContentLength64 / 1024 / 1024}MB，上限 {MaxRequestBodyBytes / 1024 / 1024}MB");

        var buffer = new byte[request.ContentLength64];
        int totalRead = 0;
        int bytesRead;
        while (totalRead < buffer.Length &&
               (bytesRead = await request.InputStream.ReadAsync(buffer, totalRead, buffer.Length - totalRead)) > 0)
        {
            totalRead += bytesRead;
        }

        return request.ContentEncoding.GetString(buffer, 0, totalRead);
    }

    private static async Task<byte[]> ReadBodyAsBytes(HttpListenerRequest request)
    {
        if (request.InputStream == null) return null;
        if (request.ContentLength64 < 0) return null;
        if (request.ContentLength64 > MaxRequestBodyBytes)
            throw new InvalidOperationException($"请求体过大: {request.ContentLength64 / 1024 / 1024}MB，上限 {MaxRequestBodyBytes / 1024 / 1024}MB");

        var buffer = new byte[request.ContentLength64];
        int totalRead = 0;
        int bytesRead;
        while (totalRead < buffer.Length &&
               (bytesRead = await request.InputStream.ReadAsync(buffer, totalRead, buffer.Length - totalRead)) > 0)
        {
            totalRead += bytesRead;
        }

        if (totalRead == buffer.Length)
            return buffer;

        var result = new byte[totalRead];
        Array.Copy(buffer, result, totalRead);
        return result;
    }

    private static string SerializeResult(PrinterResult result)
    {
        return JsonConvert.SerializeObject(result, JsonConfig.CamelCase);
    }

    private bool ValidateApiKey(HttpListenerRequest request)
    {
        return ValidateApiKeyCore(_apiKey, request.Headers["X-API-Key"]);
    }

    internal static bool ValidateApiKeyCore(string configuredKey, string providedKey)
    {
        if (string.IsNullOrEmpty(configuredKey))
            return true;
        if (string.IsNullOrEmpty(providedKey))
            return false;
        if (providedKey.Length != configuredKey.Length)
            return false;

        // constant-time comparison to prevent timing attacks
        int diff = 0;
        for (int i = 0; i < configuredKey.Length; i++)
            diff |= configuredKey[i] ^ providedKey[i];
        return diff == 0;
    }

    internal static bool IsLocalOrigin(string origin)
    {
        if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri))
            return false;

        var host = uri.Host;
        return host == "localhost"
            || host == "127.0.0.1"
            || host == "[::1]"
            || host == "0.0.0.0";
    }
}
