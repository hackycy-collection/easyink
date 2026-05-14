using System;
using System.Diagnostics;
using System.IO;

namespace EasyInk.Printer;

/// <summary>
/// 轻量级日志，同时输出到 Debug 和文件
/// </summary>
public static class SimpleLogger
{
    private static readonly object Lock = new object();
    private static string? _logPath;

    /// <summary>
    /// 配置日志输出目录
    /// </summary>
    public static void Configure(string logDirectory)
    {
        if (string.IsNullOrEmpty(logDirectory)) return;
        if (!Directory.Exists(logDirectory))
            Directory.CreateDirectory(logDirectory);
        _logPath = Path.Combine(logDirectory, "easyink.log");
    }

    /// <summary>
    /// 记录信息日志
    /// </summary>
    public static void Info(string message)
    {
        Write("INFO", message);
    }

    /// <summary>
    /// 记录调试日志
    /// </summary>
    public static void Debug(string message, Exception? ex = null)
    {
        var text = ex != null ? $"{message}: {ex}" : message;
        Write("DEBUG", text);
    }

    /// <summary>
    /// 记录错误日志
    /// </summary>
    public static void Error(string message, Exception? ex = null)
    {
        var text = ex != null ? $"{message}: {ex}" : message;
        Write("ERROR", text);
    }

    private static void Write(string level, string message)
    {
        var line = $"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] [{level}] {message}";
        System.Diagnostics.Debug.WriteLine(line);

        if (_logPath == null) return;
        try
        {
            lock (Lock)
            {
                File.AppendAllText(_logPath, line + Environment.NewLine);
            }
        }
        catch
        {
            // 日志写入失败不应影响业务
        }
    }
}
