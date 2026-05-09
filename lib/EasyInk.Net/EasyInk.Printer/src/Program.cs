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

namespace EasyInk.Printer;

static class Program
{
    private static Mutex _mutex;
    private static string _crashLogDir;
    private static bool _disposed;

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
        finally
        {
            _mutex.ReleaseMutex();
            _mutex.Dispose();
        }
    }

    private static void Run()
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);

        var config = HostConfig.Load();

        var resolvedDbPath = HostConfig.ResolveDbPath(config.DbPath);
        var logDir = Path.GetDirectoryName(resolvedDbPath);
        SimpleLogger.Configure(logDir);

        // 订阅 Engine 日志事件，转发到本地日志
        EngineApi.Log += OnEngineLog;

        _crashLogDir = HostConfig.ResolveCrashLogDir(config.CrashLogDir);
        AppDomain.CurrentDomain.UnhandledException += (s, e) =>
            WriteCrashLog(e.ExceptionObject as Exception, "AppDomain.UnhandledException");
        Application.ThreadException += (s, e) =>
            WriteCrashLog(e.Exception, "Application.ThreadException");
        TaskScheduler.UnobservedTaskException += (s, e) =>
        {
            WriteCrashLog(e.Exception, "TaskScheduler.UnobservedTaskException");
            e.SetObserved();
        };

        var auditService = new AuditService(config.DbPath);
        var engineApi = new EngineApi(sumatraPdfExePath: null, sumatraTempDir: config.SumatraTempDir);

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
        var httpServer = new HttpServer(config.HttpPort);
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

            _mutex.ReleaseMutex();
            _mutex.Dispose();

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

    private static void WriteCrashLog(Exception ex, string source)
    {
        try
        {
            if (string.IsNullOrEmpty(_crashLogDir)) return;
            if (!Directory.Exists(_crashLogDir))
                Directory.CreateDirectory(_crashLogDir);

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
            var filePath = Path.Combine(_crashLogDir, fileName);
            File.WriteAllText(filePath, sb.ToString(), Encoding.UTF8);
        }
        catch
        {
            // 崩溃时写日志本身不应再抛异常
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
