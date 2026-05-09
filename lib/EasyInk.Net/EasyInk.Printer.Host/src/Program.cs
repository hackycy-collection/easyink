using System;
using System.Diagnostics;
using System.IO;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using EasyInk.Printer.Host.UI;
using EasyInk.Printer.Host.Server;
using EasyInk.Printer.Host.Config;

namespace EasyInk.Printer.Host;

static class Program
{
    private static Mutex _mutex;
    private static string _crashLogDir;

    [STAThread]
    static void Main(string[] args)
    {
        bool createdNew;
        _mutex = new Mutex(true, "EasyInk.Printer.Host.SingleInstance", out createdNew);

        if (!createdNew)
        {
            MessageBox.Show("EasyInk Printer Host 已在运行中。", "提示", MessageBoxButtons.OK, MessageBoxIcon.Information);
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
        EasyInk.Printer.SimpleLogger.Configure(logDir);

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

        var printerApi = new PrinterApi(config.DbPath, sumatraTempDir: config.SumatraTempDir);
        var httpServer = new HttpServer(config.HttpPort);
        var wsHandler = new WebSocketHandler();
        var wsCommandHandler = new WebSocketCommandHandler(printerApi, wsHandler);
        wsHandler.SetCommandHandler(wsCommandHandler);
        var router = new Router(printerApi, wsHandler, config);

        httpServer.OnRequest = context =>
        {
            if (context.Request.IsWebSocketRequest)
                return wsHandler.HandleConnection(context);
            return router.HandleRequest(context);
        };

        if (!httpServer.TryStart())
        {
            EasyInk.Printer.SimpleLogger.Error($"HTTP 服务启动失败: {httpServer.LastError}");
        }

        var trayIcon = new TrayIcon(httpServer);
        var mainWindow = new MainWindow(httpServer, wsHandler, printerApi, config);

        mainWindow.OnRestart += () =>
        {
            httpServer.Stop();
            wsHandler.Dispose();
            printerApi.Dispose();
            trayIcon.Dispose();

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
                EasyInk.Printer.SimpleLogger.Error($"HTTP 服务重启失败: {httpServer.LastError}");
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
            httpServer.Stop();
            wsHandler.Dispose();
            printerApi.Dispose();
            trayIcon.Dispose();
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

        if (httpServer.IsRunning)
            httpServer.Stop();
        wsHandler.Dispose();
        printerApi.Dispose();
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
