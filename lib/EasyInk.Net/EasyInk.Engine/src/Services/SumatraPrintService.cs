using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;
using EasyInk.Engine.Models;
using EasyInk.Engine.Services.Abstractions;

namespace EasyInk.Engine.Services;

/// <summary>
/// 基于 SumatraPDF 的直接打印服务，PDF 矢量直通打印机，无光栅化损失
/// </summary>
public class SumatraPrintService : IPrintService
{
    private const int DefaultTimeoutMs = 30_000;

    private readonly string _sumatraExePath;
    private readonly string _tempDir;
    private readonly IPrinterService _printerService;
    private readonly int _timeoutMs;
    private int _sweepDone;

    /// <summary>
    /// 初始化 SumatraPDF 打印服务
    /// </summary>
    public SumatraPrintService(
        IPrinterService printerService,
        string sumatraExePath = null,
        string tempDir = null,
        int? timeoutMs = null)
    {
        _printerService = printerService ?? throw new ArgumentNullException(nameof(printerService));
        _sumatraExePath = sumatraExePath ?? ResolveDefaultExePath();
        _tempDir = tempDir ?? Path.GetTempPath();
        _timeoutMs = timeoutMs ?? DefaultTimeoutMs;
    }

    /// <summary>
    /// 执行同步打印
    /// </summary>
    public PrinterResult Print(string requestId, PrintRequestParams request)
    {
        if (Interlocked.CompareExchange(ref _sweepDone, 1, 0) == 0)
            SweepStaleTempFiles();

        var status = _printerService.GetPrinterStatus(request.PrinterName);
        if (!status.IsReady)
            return PrinterResult.Error(requestId, status.StatusCode, status.Message);

        IPdfProvider provider;
        try
        {
            provider = request.CreatePdfProvider();
        }
        catch (Exception ex)
        {
            return PrinterResult.Error(requestId, ErrorCode.InvalidPdfSource, ex.Message);
        }

        if (!File.Exists(_sumatraExePath))
            return PrinterResult.Error(requestId, ErrorCode.SumatraNotFound, $"SumatraPDF.exe 不存在: {_sumatraExePath}");

        var tempFile = Path.Combine(_tempDir, $"easyink_{requestId}.pdf");
        try
        {
            var pdfBytes = provider.GetPdfBytes();
            File.WriteAllBytes(tempFile, pdfBytes);

            var paperKind = request.PaperSize != null
                ? _printerService.GetPaperKind(request.PrinterName, request.PaperSize.Width)
                : null;

            var args = BuildArguments(tempFile, request, paperKind);
            var exitCode = RunProcess(_sumatraExePath, args, _timeoutMs, out var stderr);

            if (exitCode == 0)
            {
                EngineApi.RaiseLog(LogLevel.Info, $"打印成功: {request.PrinterName}, jobId={requestId}");
                return PrinterResult.Ok(requestId, PrintResult.Success(requestId));
            }

            var errorDetail = string.IsNullOrWhiteSpace(stderr)
                ? $"SumatraPDF 退出码: {exitCode}"
                : stderr.Trim();

            EngineApi.RaiseLog(LogLevel.Error, $"打印失败: {request.PrinterName}, jobId={requestId}, {errorDetail}");
            return PrinterResult.Error(requestId, ErrorCode.PrintFailed, errorDetail);
        }
        catch (TimeoutException)
        {
            EngineApi.RaiseLog(LogLevel.Error, $"打印超时: {request.PrinterName}, jobId={requestId}, {_timeoutMs}ms");
            return PrinterResult.Error(requestId, ErrorCode.PrintTimeout, $"打印超时({_timeoutMs}ms)");
        }
        catch (Exception ex)
        {
            EngineApi.RaiseLog(LogLevel.Error, $"打印异常: {request.PrinterName}, jobId={requestId}, {ex.Message}");
            return PrinterResult.Error(requestId, ErrorCode.PrintFailed, ex.Message);
        }
        finally
        {
            TryDelete(tempFile);
        }
    }

    internal static string BuildArguments(string pdfPath, PrintRequestParams request, int? paperKind = null)
    {
        var sb = new StringBuilder();
        sb.Append($"-print-to \"{request.PrinterName}\" ");
        sb.Append("-exit-on-print ");
        sb.Append("-silent ");

        var settings = BuildPrintSettings(request, paperKind);
        if (settings.Length > 0)
            sb.Append($"-print-settings \"{settings}\" ");

        sb.Append($"\"{pdfPath}\"");
        return sb.ToString();
    }

    internal static string BuildPrintSettings(PrintRequestParams request, int? paperKind = null)
    {
        var parts = new StringBuilder();

        parts.Append("shrink");

        if (request.Copies > 1)
            parts.Append($",{request.Copies}x");

        if (request.Landscape)
        {
            parts.Append(",landscape");
        }

        if (request.PaperSize != null)
        {
            if (paperKind.HasValue && paperKind.Value != 0)
            {
                // Use driver-registered paper kind to avoid custom paper size path
                parts.Append($",paperkind={paperKind.Value}");
            }
            else
            {
                // Fallback: SumatraPDF expects paper={w}mm x {h}mm
                var wMm = string.Equals(request.PaperSize.Unit, "inch", StringComparison.OrdinalIgnoreCase)
                    ? request.PaperSize.Width * 25.4
                    : request.PaperSize.Width;
                var hMm = string.Equals(request.PaperSize.Unit, "inch", StringComparison.OrdinalIgnoreCase)
                    ? request.PaperSize.Height * 25.4
                    : request.PaperSize.Height;
                parts.Append($",paper={wMm:0.##}mm x {hMm:0.##}mm");
            }
        }

        return parts.ToString();
    }

    private static int RunProcess(string fileName, string arguments, int timeoutMs, out string stderr)
    {
        stderr = null;
        using var process = new Process();
        process.StartInfo = new ProcessStartInfo
        {
            FileName = fileName,
            Arguments = arguments,
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardError = true,
            WindowStyle = ProcessWindowStyle.Hidden
        };

        var stderrBuilder = new StringBuilder();
        process.ErrorDataReceived += (_, e) =>
        {
            if (e.Data != null)
                stderrBuilder.AppendLine(e.Data);
        };

        process.Start();
        process.BeginErrorReadLine();

        if (!process.WaitForExit(timeoutMs))
        {
            try
            {
                process.Kill();
                process.WaitForExit();
            }
            catch (InvalidOperationException) { }
            catch (Exception ex)
            {
                EngineApi.RaiseLog(LogLevel.Error, $"终止打印进程后等待失败: {ex.Message}");
            }
            throw new TimeoutException();
        }

        process.WaitForExit();
        stderr = stderrBuilder.ToString();
        return process.ExitCode;
    }

    private static string ResolveDefaultExePath()
    {
        var appDir = AppDomain.CurrentDomain.BaseDirectory ?? AppContext.BaseDirectory;
        return Path.Combine(appDir, "SumatraPDF.exe");
    }

    private static void TryDelete(string path)
    {
        try { File.Delete(path); }
        catch (IOException) { }
        catch (UnauthorizedAccessException ex)
        {
            EngineApi.RaiseLog(LogLevel.Error, $"删除临时文件失败 {path}: {ex.Message}");
        }
    }

    private void SweepStaleTempFiles()
    {
        try
        {
            var cutoff = DateTime.UtcNow.AddHours(-1);
            var staleFiles = Directory.GetFiles(_tempDir, "easyink_*.pdf")
                .Where(f => File.GetLastWriteTimeUtc(f) < cutoff);

            foreach (var file in staleFiles)
                TryDelete(file);
        }
        catch (Exception ex)
        {
            EngineApi.RaiseLog(LogLevel.Error, $"清理过期临时文件失败: {ex.Message}");
        }
    }
}
