using System;
using System.Threading;
using System.Windows.Forms;
using EasyInk.Printer.Host.UI;
using EasyInk.Printer.Host.Server;
using EasyInk.Printer.Host.Config;
using EasyInk.Printer.Host.Plugin;

namespace EasyInk.Printer.Host;

static class Program
{
    private static Mutex _mutex;

    [STAThread]
    static void Main(string[] args)
    {
        // 单实例检查
        bool createdNew;
        _mutex = new Mutex(true, "EasyInk.Printer.Host.SingleInstance", out createdNew);
        if (!createdNew)
        {
            MessageBox.Show("EasyInk Printer Host 已在运行中。", "提示", MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }

        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);

        var config = HostConfig.Load();
        var plugin = new PluginBridge(config.DbPath);
        var httpServer = new HttpServer(config.HttpPort);
        var wsHandler = new WebSocketHandler();
        var router = new Router(plugin, wsHandler);

        httpServer.OnRequest += context =>
        {
            if (context.Request.IsWebSocketRequest)
                wsHandler.HandleConnection(context).Wait();
            else
                router.HandleRequest(context).Wait();
        };

        var trayIcon = new TrayIcon(httpServer);
        var mainWindow = new MainWindow(httpServer, wsHandler, plugin, config);

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
            plugin.Dispose();
            trayIcon.Dispose();
            Application.Exit();
        };

        httpServer.Start();
        trayIcon.UpdateStatus($"运行中 - 端口 {config.HttpPort}");

        // 启动后最小化到托盘
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

        httpServer.Stop();
        plugin.Dispose();
        trayIcon.Dispose();
        _mutex.ReleaseMutex();
    }
}
