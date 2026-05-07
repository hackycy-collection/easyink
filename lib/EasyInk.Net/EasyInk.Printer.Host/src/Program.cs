using System;
using System.Threading;
using System.Windows.Forms;
using EasyInk.Printer.Host.UI;
using EasyInk.Printer.Host.Server;
using EasyInk.Printer.Host.Config;

namespace EasyInk.Printer.Host;

static class Program
{
    [STAThread]
    static void Main(string[] args)
    {
        bool createdNew;
        using (var mutex = new Mutex(true, "EasyInk.Printer.Host.SingleInstance", out createdNew))
        {
            if (!createdNew)
            {
                MessageBox.Show("EasyInk Printer Host 已在运行中。", "提示", MessageBoxButtons.OK, MessageBoxIcon.Information);
                return;
            }

            Run();
        }
    }

    private static void Run()
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);

        var config = HostConfig.Load();
        var printerApi = new PrinterApi(config.DbPath);
        var httpServer = new HttpServer(config.HttpPort);
        var wsHandler = new WebSocketHandler();
        var router = new Router(printerApi, wsHandler);

        httpServer.OnRequest = context =>
        {
            if (context.Request.IsWebSocketRequest)
                return wsHandler.HandleConnection(context);
            return router.HandleRequest(context);
        };

        httpServer.Start();

        var trayIcon = new TrayIcon(httpServer);
        var mainWindow = new MainWindow(httpServer, wsHandler, printerApi, config);

        trayIcon.OnShowMainWindow += () =>
        {
            mainWindow.Show();
            mainWindow.WindowState = FormWindowState.Normal;
            mainWindow.BringToFront();
        };

        trayIcon.OnRestartServer += () =>
        {
            httpServer.Stop();
            httpServer.Start();
            trayIcon.UpdateStatus($"运行中 - 端口 {config.HttpPort}");
            trayIcon.ShowBalloon("EasyInk Printer", "服务已重启");
        };

        trayIcon.OnExit += () =>
        {
            httpServer.Stop();
            printerApi.Dispose();
            trayIcon.Dispose();
            Application.Exit();
        };

        trayIcon.UpdateStatus($"运行中 - 端口 {config.HttpPort}");

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
