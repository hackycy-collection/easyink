using System;
using System.Diagnostics;
using System.Threading;
using System.Windows.Forms;
using EasyInk.Printer.Host.UI;
using EasyInk.Printer.Host.Server;
using EasyInk.Printer.Host.Config;

namespace EasyInk.Printer.Host;

static class Program
{
    private static Mutex _mutex;

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

        Run();

        _mutex.ReleaseMutex();
        _mutex.Dispose();
    }

    private static void Run()
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);

        var config = HostConfig.Load();
        var printerApi = new PrinterApi(config.DbPath);
        var httpServer = new HttpServer(config.HttpPort);
        var wsHandler = new WebSocketHandler();
        var router = new Router(printerApi, wsHandler, config);

        httpServer.OnRequest = context =>
        {
            if (context.Request.IsWebSocketRequest)
                return wsHandler.HandleConnection(context);
            return router.HandleRequest(context);
        };

        httpServer.TryStart();

        var trayIcon = new TrayIcon(httpServer);
        var mainWindow = new MainWindow(httpServer, wsHandler, printerApi, config);

        mainWindow.OnRestart += () =>
        {
            httpServer.Stop();
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
            mainWindow.WindowState = FormWindowState.Normal;
            mainWindow.BringToFront();
        };

        trayIcon.OnRestartServer += () =>
        {
            httpServer.Stop();
            httpServer.TryStart();
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
            printerApi.Dispose();
            trayIcon.Dispose();
            Application.Exit();
        };

        if (httpServer.IsRunning)
            trayIcon.UpdateStatus($"运行中 - 端口 {config.HttpPort}");
        else
            trayIcon.UpdateStatus("异常 - 启动失败");

        mainWindow.WindowState = FormWindowState.Minimized;
        mainWindow.ShowInTaskbar = false;
        mainWindow.FormClosing += (s, e) =>
        {
            if (e.CloseReason == CloseReason.UserClosing)
            {
                e.Cancel = true;
                mainWindow.Hide();
            }
        };

        Application.Run(mainWindow);

        if (httpServer.IsRunning)
            httpServer.Stop();
    }
}
