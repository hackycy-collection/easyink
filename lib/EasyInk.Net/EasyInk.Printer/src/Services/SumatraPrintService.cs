using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;
using EasyInk.Printer.Models;
using EasyInk.Printer.Services.Abstractions;

namespace EasyInk.Printer.Services;

/// <summary>
/// 基于 SumatraPDF 的直接打印服务，PDF 矢量直通打印机，无光栅化损失
/// </summary>
public class SumatraPrintService : IPrintService
{
    private const int DefaultTimeoutMs = 30_000;

    private readonly string _sumatraExePath;
    private readonly string _tempDir;
    private readonly IPrinterService _printerService;
    private readonly IAuditService _auditService;
    private readonly int _timeoutMs;

    /// <summary>
    /// 初始化 SumatraPDF 打印服务
    /// </summary>
    /// <param name="printerService">打印机服务</param>
    /// <param name="auditService">审计日志服务</param>
    /// <param name="sumatraExePath">SumatraPDF.exe 路径，null 则从应用目录查找</param>
    /// <param name="tempDir">临时文件目录，null 则使用系统临时目录</param>
    /// <param name="timeoutMs">打印超时毫秒数</param>
    public SumatraPrintService(
        IPrinterService printerService,
        IAuditService auditService,
        string sumatraExePath = null,
        string tempDir = null,
        int? timeoutMs = null)
    {
        _printerService = printerService ?? throw new ArgumentNullException(nameof(printerService));
        _auditService = auditService ?? throw new ArgumentNullException(nameof(auditService));
        _sumatraExePath = sumatraExePath ?? ResolveDefaultExePath();
        _tempDir = tempDir ?? Path.GetTempPath();
        _timeoutMs = timeoutMs ?? DefaultTimeoutMs;

        SweepStaleTempFiles();
    }

    /// <inheritdoc />
    public PrinterResult Print(string requestId, PrintRequestParams request)
    {
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
            return PrinterResult.Error(requestId, "INVALID_PDF_SOURCE", ex.Message);
        }

        if (!File.Exists(_sumatraExePath))
            return PrinterResult.Error(requestId, "SUMATRA_NOT_FOUND", $"SumatraPDF.exe 不存在: {_sumatraExePath}");

        var tempFile = Path.Combine(_tempDir, $"easyink_{requestId}.pdf");
        try
        {
            var pdfBytes = provider.GetPdfBytes();
            File.WriteAllBytes(tempFile, pdfBytes);

            var args = BuildArguments(tempFile, request);
            var exitCode = RunProcess(_sumatraExePath, args, _timeoutMs, out var stderr);

            if (exitCode == 0)
            {
                _auditService.LogPrint(new PrintAuditLog
                {
                    Timestamp = DateTime.UtcNow,
                    PrinterName = request.PrinterName,
                    PaperWidth = request.PaperSize?.Width,
                    PaperHeight = request.PaperSize?.Height,
                    PaperUnit = request.PaperSize?.Unit,
                    Copies = request.Copies,
                    UserId = request.UserData?.UserId,
                    LabelType = request.UserData?.LabelType,
                    Status = "Success",
                    JobId = requestId
                });
                return PrinterResult.Ok(requestId, PrintResult.Success(requestId));
            }

            var errorDetail = string.IsNullOrWhiteSpace(stderr)
                ? $"SumatraPDF 退出码: {exitCode}"
                : stderr.Trim();

            _auditService.LogPrint(new PrintAuditLog
            {
                Timestamp = DateTime.UtcNow,
                PrinterName = request.PrinterName,
                Status = "Failed",
                ErrorMessage = errorDetail,
                JobId = requestId
            });
            return PrinterResult.Error(requestId, "PRINT_FAILED", errorDetail);
        }
        catch (TimeoutException)
        {
            _auditService.LogPrint(new PrintAuditLog
            {
                Timestamp = DateTime.UtcNow,
                PrinterName = request.PrinterName,
                Status = "Failed",
                ErrorMessage = "打印超时",
                JobId = requestId
            });
            return PrinterResult.Error(requestId, "PRINT_TIMEOUT", $"打印超时({_timeoutMs}ms)");
        }
        catch (Exception ex)
        {
            _auditService.LogPrint(new PrintAuditLog
            {
                Timestamp = DateTime.UtcNow,
                PrinterName = request.PrinterName,
                Status = "Failed",
                ErrorMessage = ex.Message,
                JobId = requestId
            });
            return PrinterResult.Error(requestId, "PRINT_FAILED", ex.Message);
        }
        finally
        {
            TryDelete(tempFile);
        }
    }

    internal static string BuildArguments(string pdfPath, PrintRequestParams request)
    {
        var sb = new StringBuilder();
        sb.Append($"-print-to \"{request.PrinterName}\" ");
        sb.Append("-exit-on-print ");
        sb.Append("-silent ");

        var settings = BuildPrintSettings(request);
        if (settings.Length > 0)
            sb.Append($"-print-settings \"{settings}\" ");

        sb.Append($"\"{pdfPath}\"");
        return sb.ToString();
    }

    internal static string BuildPrintSettings(PrintRequestParams request)
    {
        var parts = new StringBuilder();

        if (request.Copies > 1)
            parts.Append($"{request.Copies}x");

        if (request.Landscape)
        {
            if (parts.Length > 0) parts.Append(',');
            parts.Append("landscape");
        }

        if (request.PaperSize != null)
        {
            if (parts.Length > 0) parts.Append(',');
            var w = request.PaperSize.Width.ToString("0.##");
            var h = request.PaperSize.Height.ToString("0.##");
            parts.Append($"paper={w}x{h}{request.PaperSize.Unit}");
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
            try { process.Kill(); } catch { }
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
        try { File.Delete(path); } catch { }
        Thread.Sleep(100);
        try { File.Delete(path); } catch { }
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
        catch { }
    }
}
