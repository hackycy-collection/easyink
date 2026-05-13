using System;
using System.Diagnostics;
using System.IO;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using EasyInk.Engine;
using EasyInk.Engine.Models;
using EasyInk.Printer.Models;
using EasyInk.Printer.UI;
using EasyInk.Printer.Server;
using EasyInk.Printer.Config;
using EasyInk.Printer.Services;
using EasyInk.Printer.Services.Abstractions;

namespace EasyInk.Printer;

static class Program
{
    private static Mutex _mutex;
    private static string _crashLogDir;
    private static bool _disposed;
    private static int _fatalDialogShown;

    [STAThread]
    static void Main(string[] args)
    {
        bool createdNew;
        _mutex = new Mutex(true, "EasyInk.Printer.SingleInstance", out createdNew);

        if (!createdNew)
        {
            MessageBox.Show("EasyInk Printer 已在运行中。", "提示", MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }

        try
        {
            Run();
        }
        catch (Exception ex)
        {
            HandleFatalException(ex, "Program.Main");
        }
        finally
        {
            DisposeMutex();
        }
    }

    private static void Run()
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        Application.SetUnhandledExceptionMode(UnhandledExceptionMode.CatchException);

        var config = HostConfig.Load();

        var resolvedDbPath = HostConfig.ResolveDbPath(config.DbPath);
        var logDir = Path.GetDirectoryName(resolvedDbPath);
        SimpleLogger.Configure(logDir);

        // 订阅 Engine 日志事件，转发到本地日志
        EngineApi.Log += OnEngineLog;

        _crashLogDir = HostConfig.ResolveCrashLogDir(config.CrashLogDir);
        AppDomain.CurrentDomain.UnhandledException += (s, e) =>
            HandleFatalException(ToException(e.ExceptionObject), "AppDomain.UnhandledException");
        Application.ThreadException += (s, e) =>
            HandleFatalException(e.Exception, "Application.ThreadException");
        TaskScheduler.UnobservedTaskException += (s, e) =>
        {
            HandleFatalException(e.Exception, "TaskScheduler.UnobservedTaskException");
            e.SetObserved();
        };

        IAuditService auditService = CreateAuditService(config.DbPath);
        var engineApi = new EngineApi(
            sumatraPdfExePath: null,
            sumatraTempDir: config.SumatraTempDir,
            printTimeoutMs: config.PrintTimeoutSeconds * 1000,
            maxQueueSize: config.MaxQueueSize);

        // 订阅打印完成事件，写入审计日志
        EngineApi.PrintCompleted += (requestId, request, result) =>
        {
            try
            {
                auditService.LogPrint(new Models.PrintAuditLog
                {
                    Timestamp = DateTime.Now,
                    PrinterName = request.PrinterName ?? "",
                    PaperWidth = request.PaperSize?.Width,
                    PaperHeight = request.PaperSize?.Height,
                    PaperUnit = request.PaperSize?.Unit ?? "mm",
                    Copies = request.Copies,
                    Dpi = request.Dpi,
                    UserId = request.UserData?.UserId,
                    LabelType = request.UserData?.LabelType,
                    Status = result.Success ? JobStatus.Completed : JobStatus.Failed,
                    ErrorMessage = result.ErrorInfo?.Message,
                    JobId = requestId
                });
            }
            catch (Exception ex)
            {
                SimpleLogger.Error("审计日志写入失败", ex);
            }
        };
        var httpServer = new HttpServer(config.HttpPort, config.MaxConcurrentRequests);
        var wsHandler = new WebSocketHandler(config.MaxWebSocketConnections);
        var wsCommandHandler = new WebSocketCommandHandler(engineApi, wsHandler, auditService);
        wsHandler.SetCommandHandler(wsCommandHandler);
        var router = new Router(engineApi, wsHandler, config, auditService);

        httpServer.OnRequest = context =>
        {
            if (context.Request.IsWebSocketRequest)
                return wsHandler.HandleConnection(context);
            return router.HandleRequest(context);
        };

        if (!httpServer.TryStart())
        {
            SimpleLogger.Error($"HTTP 服务启动失败: {httpServer.LastError}");
        }

        var trayIcon = new TrayIcon(httpServer);
        var mainWindow = new MainWindow(httpServer, wsHandler, engineApi, config, auditService);

        mainWindow.OnRestart += () =>
        {
            Cleanup(httpServer, wsHandler, engineApi, trayIcon);

            DisposeMutex();

            Process.Start(Application.ExecutablePath);
            Application.Exit();
        };

        trayIcon.OnShowMainWindow += () =>
        {
            mainWindow.Show();
            mainWindow.ShowInTaskbar = true;
            mainWindow.WindowState = FormWindowState.Normal;
            mainWindow.BringToFront();
        };

        trayIcon.OnRestartServer += () =>
        {
            httpServer.Stop();
            if (!httpServer.TryStart())
            {
                SimpleLogger.Error($"HTTP 服务重启失败: {httpServer.LastError}");
            }
            if (httpServer.IsRunning)
            {
                trayIcon.UpdateStatus($"运行中 - 端口 {config.HttpPort}");
                trayIcon.ShowBalloon("EasyInk Printer", "服务已重启");
            }
            else
            {
                trayIcon.UpdateStatus("异常 - 启动失败");
                trayIcon.ShowBalloon("EasyInk Printer", $"服务启动失败: {httpServer.LastError}");
            }
        };

        trayIcon.OnExit += () =>
        {
            Cleanup(httpServer, wsHandler, engineApi, trayIcon);
            Application.Exit();
        };

        if (httpServer.IsRunning)
            trayIcon.UpdateStatus($"运行中 - 端口 {config.HttpPort}");
        else
            trayIcon.UpdateStatus("异常 - 启动失败");

        if (config.StartMinimized)
        {
            mainWindow.WindowState = FormWindowState.Minimized;
            mainWindow.ShowInTaskbar = false;
        }
        mainWindow.FormClosing += (s, e) =>
        {
            if (e.CloseReason != CloseReason.UserClosing) return;

            if (config.MinimizeToTray)
            {
                e.Cancel = true;
                mainWindow.Hide();
                return;
            }

            var result = MessageBox.Show(
                "关闭窗口后打印服务将停止运行，已提交的打印任务会中断。\n确定要退出吗？",
                "退出确认",
                MessageBoxButtons.YesNo,
                MessageBoxIcon.Warning,
                MessageBoxDefaultButton.Button2);

            if (result != DialogResult.Yes)
                e.Cancel = true;
        };

        Application.Run(mainWindow);

        Cleanup(httpServer, wsHandler, engineApi, trayIcon);
    }

    private static void OnEngineLog(LogLevel level, string message)
    {
        if (level == LogLevel.Error)
            SimpleLogger.Error(message);
        else
            SimpleLogger.Info(message);
    }

    private static void Cleanup(HttpServer httpServer, WebSocketHandler wsHandler, EngineApi engineApi, TrayIcon trayIcon)
    {
        if (_disposed) return;
        _disposed = true;

        try { httpServer.Stop(); } catch { }
        try { wsHandler.Dispose(); } catch { }
        try { engineApi.Dispose(); } catch { }
        try { trayIcon.Dispose(); } catch { }
        EngineApi.ClearEvents();
    }

    private static IAuditService CreateAuditService(string dbPath)
    {
        try
        {
            return new AuditService(dbPath);
        }
        catch (Exception ex)
        {
            SimpleLogger.Error("审计日志初始化失败，已禁用审计功能", ex);

            var logPath = WriteCrashLog(ex, "AuditService.InitializeDatabase");
            ShowMessage(
                BuildAuditServiceWarning(ex, logPath),
                "EasyInk Printer 启动告警",
                MessageBoxIcon.Warning);

            return new NullAuditService();
        }
    }

    private static Exception ToException(object exceptionObject)
    {
        if (exceptionObject is Exception exception)
            return exception;

        return new InvalidOperationException($"捕获到非 Exception 类型的未处理异常: {exceptionObject ?? "(null)"}");
    }

    private static void DisposeMutex()
    {
        if (_mutex == null) return;

        try { _mutex.ReleaseMutex(); } catch (ApplicationException) { } catch (ObjectDisposedException) { }
        try { _mutex.Dispose(); } catch (ObjectDisposedException) { }

        _mutex = null;
    }

    private static void HandleFatalException(Exception ex, string source)
    {
        var safeException = ex ?? new InvalidOperationException("捕获到空异常对象。");

        try
        {
            SimpleLogger.Error($"未处理异常: {source}", safeException);
        }
        catch
        {
            // 忽略日志二次失败，避免覆盖原始异常。
        }

        var logPath = WriteCrashLog(safeException, source);
        if (Interlocked.CompareExchange(ref _fatalDialogShown, 1, 0) != 0)
            return;

        ShowMessage(
            BuildFatalErrorMessage(safeException, logPath),
            "EasyInk Printer 启动失败",
            MessageBoxIcon.Error);
    }

    private static string BuildFatalErrorMessage(Exception ex, string logPath)
    {
        var sb = new StringBuilder();
        sb.AppendLine("EasyInk Printer 启动失败，应用即将退出。");
        AppendUserFacingException(sb, ex);
        AppendSQLiteGuidance(sb, ex);
        AppendLogPath(sb, logPath);
        return sb.ToString().TrimEnd();
    }

    private static string BuildAuditServiceWarning(Exception ex, string logPath)
    {
        var sb = new StringBuilder();
        sb.AppendLine("审计日志模块初始化失败，打印服务会继续启动，但日志记录与查询功能不可用。");
        AppendUserFacingException(sb, ex);
        AppendSQLiteGuidance(sb, ex);
        AppendLogPath(sb, logPath);
        return sb.ToString().TrimEnd();
    }

    private static void AppendUserFacingException(StringBuilder sb, Exception ex)
    {
        sb.AppendLine();
        sb.AppendLine($"异常类型: {ex.GetType().Name}");
        sb.AppendLine($"异常消息: {ex.Message}");
    }

    private static void AppendSQLiteGuidance(StringBuilder sb, Exception ex)
    {
        if (!ContainsSQLiteInteropError(ex)) return;

        sb.AppendLine();
        sb.AppendLine("原因判断: 缺少 SQLite 原生依赖，或该依赖的运行库未安装。");
        sb.AppendLine("请确认安装目录中存在 x64\\SQLite.Interop.dll 和 x86\\SQLite.Interop.dll。");
        sb.AppendLine("如果文件缺失，请重新安装最新安装包；如果文件存在，请检查系统是否缺少 Microsoft Visual C++ 运行库。");
    }

    private static bool ContainsSQLiteInteropError(Exception ex)
    {
        if (ex == null) return false;

        if (ex is DllNotFoundException &&
            ex.Message.IndexOf("SQLite.Interop.dll", StringComparison.OrdinalIgnoreCase) >= 0)
        {
            return true;
        }

        if (ex is AggregateException aggregateException)
        {
            foreach (var inner in aggregateException.InnerExceptions)
            {
                if (ContainsSQLiteInteropError(inner))
                    return true;
            }
        }

        return ContainsSQLiteInteropError(ex.InnerException);
    }

    private static void AppendLogPath(StringBuilder sb, string logPath)
    {
        if (string.IsNullOrEmpty(logPath)) return;

        sb.AppendLine();
        sb.AppendLine($"崩溃日志: {logPath}");
    }

    private static void ShowMessage(string text, string caption, MessageBoxIcon icon)
    {
        try
        {
            MessageBox.Show(text, caption, MessageBoxButtons.OK, icon);
        }
        catch
        {
            // 桌面环境异常时至少保留日志文件。
        }
    }

    private static string WriteCrashLog(Exception ex, string source)
    {
        try
        {
            var crashLogDir = string.IsNullOrWhiteSpace(_crashLogDir)
                ? HostConfig.DefaultCrashLogDir
                : _crashLogDir;

            if (!Directory.Exists(crashLogDir))
                Directory.CreateDirectory(crashLogDir);

            var sb = new StringBuilder();
            sb.AppendLine("========== 崩溃日志 ==========");
            sb.AppendLine($"时间: {DateTime.Now:yyyy-MM-dd HH:mm:ss.fff}");
            sb.AppendLine($"来源: {source}");
            sb.AppendLine();

            sb.AppendLine("--- 环境信息 ---");
            sb.AppendLine($"OS: {Environment.OSVersion}");
            sb.AppendLine($".NET: {Environment.Version}");
            sb.AppendLine($"64位系统: {Environment.Is64BitOperatingSystem}");
            sb.AppendLine($"64位进程: {Environment.Is64BitProcess}");
            sb.AppendLine($"工作集: {Environment.WorkingSet / 1024 / 1024} MB");
            sb.AppendLine($"进程运行时长: {Process.GetCurrentProcess().TotalProcessorTime}");
            sb.AppendLine();

            sb.AppendLine("--- 异常信息 ---");
            AppendException(sb, ex, 0);

            var fileName = $"crash_{DateTime.Now:yyyyMMdd_HHmmss}.log";
            var filePath = Path.Combine(crashLogDir, fileName);
            File.WriteAllText(filePath, sb.ToString(), Encoding.UTF8);
            return filePath;
        }
        catch
        {
            // 崩溃时写日志本身不应再抛异常
            return null;
        }
    }

    private static void AppendException(StringBuilder sb, Exception ex, int depth)
    {
        if (ex == null) return;

        var indent = new string(' ', depth * 2);
        if (depth > 0)
            sb.AppendLine($"{indent}--- 内部异常 (InnerException) ---");

        sb.AppendLine($"{indent}类型: {ex.GetType().FullName}");
        sb.AppendLine($"{indent}消息: {ex.Message}");
        sb.AppendLine($"{indent}堆栈:");
        sb.AppendLine(ex.StackTrace ?? "(无堆栈信息)");

        if (ex is AggregateException agg)
        {
            for (int i = 0; i < agg.InnerExceptions.Count; i++)
            {
                sb.AppendLine();
                sb.AppendLine($"{indent}--- 聚合异常 [{i}] ---");
                AppendException(sb, agg.InnerExceptions[i], depth + 1);
            }
        }

        if (ex.InnerException != null)
        {
            sb.AppendLine();
            AppendException(sb, ex.InnerException, depth + 1);
        }
    }
}
