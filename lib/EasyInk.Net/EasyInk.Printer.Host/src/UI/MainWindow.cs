using System;
using System.Windows.Forms;
using EasyInk.Printer.Host.Config;
using EasyInk.Printer.Host.Server;

namespace EasyInk.Printer.Host.UI;

/// <summary>
/// 主管理窗口
/// </summary>
public class MainWindow : Form
{
    private readonly HttpServer _server;
    private readonly HostConfig _config;
    private TabControl _tabs;

    public MainWindow(HttpServer server, HostConfig config)
    {
        _server = server;
        _config = config;

        InitializeComponent();
    }

    private void InitializeComponent()
    {
        Text = "EasyInk Printer Host";
        Size = new System.Drawing.Size(800, 600);
        StartPosition = FormStartPosition.CenterScreen;
        MinimumSize = new System.Drawing.Size(640, 480);

        _tabs = new TabControl
        {
            Dock = DockStyle.Fill
        };

        _tabs.TabPages.Add(CreateTab("仪表盘"));
        _tabs.TabPages.Add(CreateTab("打印机"));
        _tabs.TabPages.Add(CreateTab("任务"));
        _tabs.TabPages.Add(CreateTab("日志"));
        _tabs.TabPages.Add(CreateTab("设置"));

        Controls.Add(_tabs);

        // 关闭时最小化到托盘而非退出
        FormClosing += (s, e) =>
        {
            if (e.CloseReason == CloseReason.UserClosing)
            {
                e.Cancel = true;
                Hide();
            }
        };
    }

    private TabPage CreateTab(string name)
    {
        var tab = new TabPage(name);
        // TODO: 后续实现各 Tab 的具体控件
        var label = new Label
        {
            Text = $"{name} - 开发中",
            Dock = DockStyle.Fill,
            TextAlign = System.Drawing.ContentAlignment.MiddleCenter,
            Font = new System.Drawing.Font("Microsoft YaHei", 12)
        };
        tab.Controls.Add(label);
        return tab;
    }
}
