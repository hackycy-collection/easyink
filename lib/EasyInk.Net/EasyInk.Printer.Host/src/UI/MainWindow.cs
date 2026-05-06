using System;
using System.Drawing;
using System.Threading.Tasks;
using System.Windows.Forms;
using EasyInk.Printer.Host.Config;
using EasyInk.Printer.Host.Plugin;
using EasyInk.Printer.Host.Server;

namespace EasyInk.Printer.Host.UI;

/// <summary>
/// 主管理窗口
/// </summary>
public class MainWindow : Form
{
    private readonly HttpServer _server;
    private readonly WebSocketHandler _wsHandler;
    private readonly PluginBridge _plugin;
    private readonly HostConfig _config;
    private TabControl _tabs;

    public MainWindow(HttpServer server, WebSocketHandler wsHandler, PluginBridge plugin, HostConfig config)
    {
        _server = server;
        _wsHandler = wsHandler;
        _plugin = plugin;
        _config = config;

        InitializeComponent();
    }

    private void InitializeComponent()
    {
        Text = "EasyInk Printer Host";
        Size = new Size(900, 640);
        StartPosition = FormStartPosition.CenterScreen;
        MinimumSize = new Size(700, 500);
        Font = new Font("Microsoft YaHei UI", 9f);

        _tabs = new TabControl
        {
            Dock = DockStyle.Fill,
            Padding = new Point(12, 4)
        };

        _tabs.TabPages.Add(CreateDashboardTab());
        _tabs.TabPages.Add(CreatePrintersTab());
        _tabs.TabPages.Add(CreateJobsTab());
        _tabs.TabPages.Add(CreateLogsTab());
        _tabs.TabPages.Add(CreateSettingsTab());

        Controls.Add(_tabs);
    }

    private TabPage CreateDashboardTab()
    {
        var tab = new TabPage("仪表盘");

        var panel = new Panel { Dock = DockStyle.Fill, Padding = new Padding(16) };

        var lblTitle = new Label
        {
            Text = "服务状态",
            Font = new Font("Microsoft YaHei UI", 14f, FontStyle.Bold),
            AutoSize = true,
            Location = new Point(16, 16)
        };

        var lblStatus = new Label
        {
            Text = $"状态: 运行中\n端口: {_server.Port}\nWebSocket 连接: {_wsHandler.ConnectionCount}",
            Font = new Font("Microsoft YaHei UI", 11f),
            AutoSize = true,
            Location = new Point(16, 56)
        };

        var btnRefresh = new Button
        {
            Text = "刷新",
            Location = new Point(16, 160),
            Size = new Size(80, 30)
        };
        btnRefresh.Click += (s, e) =>
        {
            lblStatus.Text = $"状态: {(_server.IsRunning ? "运行中" : "已停止")}\n" +
                           $"端口: {_server.Port}\n" +
                           $"WebSocket 连接: {_wsHandler.ConnectionCount}";
        };

        panel.Controls.AddRange(new Control[] { lblTitle, lblStatus, btnRefresh });
        tab.Controls.Add(panel);
        return tab;
    }

    private TabPage CreatePrintersTab()
    {
        var tab = new TabPage("打印机");

        var listView = new ListView
        {
            Dock = DockStyle.Fill,
            View = View.Details,
            FullRowSelect = true,
            GridLines = true
        };
        listView.Columns.Add("打印机名称", 250);
        listView.Columns.Add("默认", 50);
        listView.Columns.Add("状态", 100);
        listView.Columns.Add("在线", 60);
        listView.Columns.Add("有纸", 60);

        var btnRefresh = new Button
        {
            Text = "刷新打印机列表",
            Dock = DockStyle.Top,
            Height = 36
        };
        btnRefresh.Click += (s, e) => RefreshPrinters(listView);

        tab.Controls.Add(listView);
        tab.Controls.Add(btnRefresh);
        return tab;
    }

    private async void RefreshPrinters(ListView listView)
    {
        listView.Items.Clear();
        try
        {
            var json = await Task.Run(() => _plugin.GetPrinters());
            var result = Newtonsoft.Json.Linq.JObject.Parse(json);
            if (result["success"]?.ToObject<bool>() == true)
            {
                var printers = result["data"] as Newtonsoft.Json.Linq.JArray;
                if (printers != null)
                {
                    foreach (var p in printers)
                    {
                        var item = new ListViewItem(p["name"]?.ToString());
                        item.SubItems.Add(p["isDefault"]?.ToObject<bool>() == true ? "是" : "");
                        var status = p["status"];
                        item.SubItems.Add(status?["message"]?.ToString() ?? "");
                        item.SubItems.Add(status?["isOnline"]?.ToObject<bool>() == true ? "是" : "否");
                        item.SubItems.Add(status?["hasPaper"]?.ToObject<bool>() == true ? "是" : "否");
                        listView.Items.Add(item);
                    }
                }
            }
        }
        catch (Exception ex)
        {
            MessageBox.Show($"获取打印机列表失败: {ex.Message}", "错误", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }

    private TabPage CreateJobsTab()
    {
        var tab = new TabPage("任务");

        var listView = new ListView
        {
            Dock = DockStyle.Fill,
            View = View.Details,
            FullRowSelect = true,
            GridLines = true
        };
        listView.Columns.Add("任务ID", 200);
        listView.Columns.Add("打印机", 150);
        listView.Columns.Add("状态", 100);
        listView.Columns.Add("创建时间", 150);
        listView.Columns.Add("错误信息", 200);

        var btnRefresh = new Button
        {
            Text = "刷新任务列表",
            Dock = DockStyle.Top,
            Height = 36
        };
        btnRefresh.Click += (s, e) =>
        {
            // TODO: 当 DLL 插件支持 getAllJobs 后实现
            listView.Items.Clear();
        };

        tab.Controls.Add(listView);
        tab.Controls.Add(btnRefresh);
        return tab;
    }

    private TabPage CreateLogsTab()
    {
        var tab = new TabPage("日志");

        var filterPanel = new Panel { Dock = DockStyle.Top, Height = 44 };

        var lblFrom = new Label { Text = "从:", Location = new Point(8, 12), AutoSize = true };
        var dtpFrom = new DateTimePicker { Location = new Point(30, 8), Width = 160, Format = DateTimePickerFormat.Short };
        var lblTo = new Label { Text = "到:", Location = new Point(200, 12), AutoSize = true };
        var dtpTo = new DateTimePicker { Location = new Point(222, 8), Width = 160, Format = DateTimePickerFormat.Short };
        var btnQuery = new Button { Text = "查询", Location = new Point(400, 7), Size = new Size(70, 26) };

        filterPanel.Controls.AddRange(new Control[] { lblFrom, dtpFrom, lblTo, dtpTo, btnQuery });

        var listView = new ListView
        {
            Dock = DockStyle.Fill,
            View = View.Details,
            FullRowSelect = true,
            GridLines = true
        };
        listView.Columns.Add("时间", 150);
        listView.Columns.Add("打印机", 150);
        listView.Columns.Add("状态", 80);
        listView.Columns.Add("用户", 100);
        listView.Columns.Add("任务ID", 200);
        listView.Columns.Add("错误", 200);

        btnQuery.Click += (s, e) => RefreshLogs(listView, dtpFrom.Value, dtpTo.Value);

        tab.Controls.Add(listView);
        tab.Controls.Add(filterPanel);
        return tab;
    }

    private async void RefreshLogs(ListView listView, DateTime from, DateTime to)
    {
        listView.Items.Clear();
        try
        {
            var json = await Task.Run(() => _plugin.QueryLogs(from, to, limit: 200));
            var result = Newtonsoft.Json.Linq.JObject.Parse(json);
            if (result["success"]?.ToObject<bool>() == true)
            {
                var logs = result["data"] as Newtonsoft.Json.Linq.JArray;
                if (logs != null)
                {
                    foreach (var log in logs)
                    {
                        var item = new ListViewItem(log["timestamp"]?.ToString());
                        item.SubItems.Add(log["printerName"]?.ToString());
                        item.SubItems.Add(log["status"]?.ToString());
                        item.SubItems.Add(log["userId"]?.ToString());
                        item.SubItems.Add(log["jobId"]?.ToString());
                        item.SubItems.Add(log["errorMessage"]?.ToString());
                        listView.Items.Add(item);
                    }
                }
            }
        }
        catch (Exception ex)
        {
            MessageBox.Show($"查询日志失败: {ex.Message}", "错误", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }

    private TabPage CreateSettingsTab()
    {
        var tab = new TabPage("设置");

        var panel = new Panel { Dock = DockStyle.Fill, Padding = new Padding(16) };

        var y = 16;

        var lblPort = new Label { Text = "HTTP 端口:", Location = new Point(16, y), AutoSize = true };
        var numPort = new NumericUpDown
        {
            Location = new Point(120, y - 2),
            Width = 100,
            Minimum = 1024,
            Maximum = 65535,
            Value = _config.HttpPort
        };
        y += 36;

        var chkAutoStart = new CheckBox
        {
            Text = "开机自启动",
            Location = new Point(16, y),
            AutoSize = true,
            Checked = _config.AutoStart
        };
        y += 30;

        var chkMinimizeToTray = new CheckBox
        {
            Text = "关闭窗口时最小化到托盘",
            Location = new Point(16, y),
            AutoSize = true,
            Checked = _config.MinimizeToTray
        };
        y += 30;

        var lblDbPath = new Label { Text = "数据库路径:", Location = new Point(16, y), AutoSize = true };
        var txtDbPath = new TextBox
        {
            Location = new Point(120, y - 2),
            Width = 300,
            Text = _config.DbPath ?? "(默认)",
            ReadOnly = true
        };
        y += 44;

        var btnSave = new Button
        {
            Text = "保存设置",
            Location = new Point(16, y),
            Size = new Size(100, 30)
        };
        btnSave.Click += (s, e) =>
        {
            _config.HttpPort = (int)numPort.Value;
            _config.AutoStart = chkAutoStart.Checked;
            _config.MinimizeToTray = chkMinimizeToTray.Checked;
            _config.Save();
            MessageBox.Show("设置已保存，部分设置需要重启服务后生效。", "提示", MessageBoxButtons.OK, MessageBoxIcon.Information);
        };

        panel.Controls.AddRange(new Control[] { lblPort, numPort, chkAutoStart, chkMinimizeToTray, lblDbPath, txtDbPath, btnSave });
        tab.Controls.Add(panel);
        return tab;
    }
}
