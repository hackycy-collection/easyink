using System;
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
        var httpServer = new HttpServer(config.HttpPort);

        var trayIcon = new TrayIcon(httpServer);
        var mainWindow = new MainWindow(httpServer, config);

        httpServer.Start();

        Application.Run(mainWindow);

        httpServer.Stop();
        trayIcon.Dispose();
        _mutex.ReleaseMutex();
    }
}
