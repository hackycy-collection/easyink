using System;
using System.Drawing;
using System.IO;
using System.Reflection;
using System.Windows.Forms;
using EasyInk.Printer.Server;

namespace EasyInk.Printer.UI;

/// <summary>
/// 系统托盘管理
/// </summary>
public class TrayIcon : IDisposable
{
    private readonly NotifyIcon _notifyIcon;
    private readonly HttpServer _server;

    public event Action OnShowMainWindow;
    public event Action OnRestartServer;
    public event Action OnExit;

    public TrayIcon(HttpServer server)
    {
        _server = server;

        _notifyIcon = new NotifyIcon
        {
            Text = LangManager.Get("Tray_Port_Template", server.Port),
            Icon = LoadAppIcon(),
            Visible = true
        };

        var menu = new ContextMenuStrip();
        menu.Items.Add(LangManager.Get("Tray_ShowMainWindow"), null, (s, e) => OnShowMainWindow?.Invoke());
        menu.Items.Add(LangManager.Get("Tray_RestartService"), null, (s, e) => OnRestartServer?.Invoke());
        menu.Items.Add("-");
        menu.Items.Add(LangManager.Get("Tray_Exit"), null, (s, e) => OnExit?.Invoke());
        _notifyIcon.ContextMenuStrip = menu;

        _notifyIcon.DoubleClick += (s, e) => OnShowMainWindow?.Invoke();
    }

    public void UpdateStatus(string status)
    {
        _notifyIcon.Text = $"EasyInk Printer - {status}";
    }

    public void ShowBalloon(string title, string text, ToolTipIcon icon = ToolTipIcon.Info)
    {
        _notifyIcon.ShowBalloonTip(3000, title, text, icon);
    }

    public static Icon LoadAppIcon()
    {
        var assembly = Assembly.GetExecutingAssembly();
        var stream = assembly.GetManifestResourceStream("EasyInk.Printer.app.ico");
        if (stream != null)
            return new Icon(stream);

        var path = Path.Combine(Path.GetDirectoryName(assembly.Location), "app.ico");
        return File.Exists(path) ? new Icon(path) : SystemIcons.Application;
    }

    public void Dispose()
    {
        _notifyIcon.Visible = false;
        _notifyIcon.Dispose();
    }
}
