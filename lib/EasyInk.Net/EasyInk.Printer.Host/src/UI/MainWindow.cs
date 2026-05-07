using System;
using System.Drawing;
using System.Threading.Tasks;
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
    private readonly WebSocketHandler _wsHandler;
    private readonly PrinterApi _api;
    private readonly HostConfig _config;
    private TabControl _tabs;

    public event Action OnRestart;

    public MainWindow(HttpServer server, WebSocketHandler wsHandler, PrinterApi api, HostConfig config)
    {
        _server = server;
        _wsHandler = wsHandler;
        _api = api;
        _config = config;

        InitializeComponent();
    }

    private void InitializeComponent()
    {
        Text = "EasyInk Printer Host";
        Icon = TrayIcon.LoadAppIcon();
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

        var cardsPanel = new FlowLayoutPanel
        {
            Dock = DockStyle.Top,
            Height = 110,
            FlowDirection = FlowDirection.LeftToRight,
            WrapContents = false,
            Padding = new Padding(0, 0, 0, 8),
            AutoSize = false
        };

        var titleFont = new Font("Microsoft YaHei UI", 9f);
        var valueFont = new Font("Microsoft YaHei UI", 18f, FontStyle.Bold);
        var cardSize = new Size(180, 90);

        var colorRunning = Color.FromArgb(56, 142, 142);
        var colorError = Color.FromArgb(211, 47, 47);
        var colorPort = Color.FromArgb(63, 81, 181);
        var colorWs = Color.FromArgb(255, 152, 0);

        var hasError = !_server.IsRunning && _server.LastError != null;
        var statusColor = hasError ? colorError : colorRunning;
        var statusText = _server.IsRunning ? "运行中" : (hasError ? "异常" : "已停止");

        // 状态卡片
        Label lblStatusVal, lblPortVal, lblWsVal;
        var cardStatus = CreateCardPanel(cardSize, statusColor, "服务状态",
            statusText, valueFont, statusColor, titleFont, out lblStatusVal);

        // 端口卡片
        var cardPort = CreateCardPanel(cardSize, colorPort, "端口",
            _server.Port.ToString(), valueFont, colorPort, titleFont, out lblPortVal);

        // WebSocket 连接卡片
        var cardWs = CreateCardPanel(cardSize, colorWs, "WebSocket 连接",
            _wsHandler.ConnectionCount.ToString(), valueFont, colorWs, titleFont, out lblWsVal);

        cardsPanel.Controls.AddRange(new Control[] { cardStatus, cardPort, cardWs });

        _wsHandler.ConnectionCountChanged += () =>
        {
            if (IsDisposed) return;
            if (InvokeRequired)
                BeginInvoke(new Action(() => lblWsVal.Text = _wsHandler.ConnectionCount.ToString()));
            else
                lblWsVal.Text = _wsHandler.ConnectionCount.ToString();
        };

        // 错误提示区域
        var errorPanel = new Panel
        {
            Dock = DockStyle.Top,
            Height = 0,
            Visible = false,
            BackColor = Color.FromArgb(255, 243, 224),
            Padding = new Padding(12),
            Margin = new Padding(0, 8, 0, 0)
        };

        var lblError = new Label
        {
            Dock = DockStyle.Fill,
            ForeColor = Color.FromArgb(191, 63, 0),
            Font = new Font("Microsoft YaHei UI", 9f)
        };
        errorPanel.Controls.Add(lblError);

        if (hasError)
        {
            lblError.Text = $"启动失败: {_server.LastError}  请检查端口是否被占用或权限是否足够。";
            errorPanel.Height = 40;
            errorPanel.Visible = true;
        }

        var btnRefresh = new Button
        {
            Text = "刷新",
            Size = new Size(72, 28),
            Margin = new Padding(0)
        };

        var btnBar = new FlowLayoutPanel
        {
            Dock = DockStyle.Top,
            Height = 36,
            FlowDirection = FlowDirection.LeftToRight,
            WrapContents = false,
            Padding = new Padding(0, 4, 0, 0)
        };
        btnBar.Controls.Add(btnRefresh);
        btnRefresh.Click += (s, e) =>
        {
            var err = !_server.IsRunning && _server.LastError != null;
            lblStatusVal.Text = _server.IsRunning ? "运行中" : (err ? "异常" : "已停止");
            lblStatusVal.ForeColor = err ? colorError : colorRunning;
            cardStatus.Controls[1].BackColor = err ? colorError : colorRunning; // accentBar
            lblPortVal.Text = _server.Port.ToString();
            lblWsVal.Text = _wsHandler.ConnectionCount.ToString();

            if (err)
            {
                lblError.Text = $"启动失败: {_server.LastError}  请检查端口是否被占用或权限是否足够。";
                errorPanel.Height = 40;
                errorPanel.Visible = true;
            }
            else
            {
                errorPanel.Height = 0;
                errorPanel.Visible = false;
            }
        };

        panel.Controls.Add(btnBar);
        panel.Controls.Add(errorPanel);
        panel.Controls.Add(cardsPanel);
        tab.Controls.Add(panel);
        return tab;
    }

    private Panel CreateCardPanel(Size size, Color accentColor, string title, string value, Font valueFont, Color valueColor, Font titleFont, out Label valueLabel)
    {
        var card = new Panel
        {
            BackColor = Color.White,
            Size = size,
            Margin = new Padding(0, 0, 12, 0),
            Padding = new Padding(0),
            BorderStyle = BorderStyle.FixedSingle
        };

        var accentBar = new Panel
        {
            Dock = DockStyle.Top,
            Height = 3,
            BackColor = accentColor
        };

        var contentPanel = new Panel
        {
            Dock = DockStyle.Fill,
            Padding = new Padding(8, 12, 8, 8)
        };

        var lblTitle = new Label
        {
            Text = title,
            Font = titleFont,
            ForeColor = Color.FromArgb(128, 128, 128),
            Dock = DockStyle.Top,
            TextAlign = ContentAlignment.MiddleCenter,
            Height = 20,
            Margin = new Padding(0)
        };

        valueLabel = new Label
        {
            Text = value,
            Font = valueFont,
            ForeColor = valueColor,
            Dock = DockStyle.Top,
            TextAlign = ContentAlignment.MiddleCenter,
            Height = 40,
            Margin = new Padding(0)
        };

        contentPanel.Controls.Add(valueLabel);
        contentPanel.Controls.Add(lblTitle);

        card.Controls.Add(contentPanel);
        card.Controls.Add(accentBar);
        return card;
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

        var toolPanel = new Panel
        {
            Dock = DockStyle.Top,
            Height = 44,
            Padding = new Padding(8)
        };

        var btnRefresh = new Button
        {
            Text = "刷新",
            Dock = DockStyle.Left,
            Width = 80
        };
        btnRefresh.Click += (s, e) => RefreshPrinters(listView);

        toolPanel.Controls.Add(btnRefresh);

        tab.Controls.Add(listView);
        tab.Controls.Add(toolPanel);
        return tab;
    }

    private async Task RefreshListViewAsync(ListView listView, string operationName, Func<string> dataFetcher, Action<ListView, Newtonsoft.Json.Linq.JArray> rowMapper)
    {
        try
        {
            listView.Items.Clear();
            var json = await Task.Run(dataFetcher);
            var result = Newtonsoft.Json.Linq.JObject.Parse(json);
            if (result["success"]?.ToObject<bool>() == true)
            {
                var data = result["data"] as Newtonsoft.Json.Linq.JArray;
                if (data != null)
                    rowMapper(listView, data);
            }
        }
        catch (ObjectDisposedException) { }
        catch (Exception ex)
        {
            try { MessageBox.Show($"{operationName}失败: {ex.Message}", "错误", MessageBoxButtons.OK, MessageBoxIcon.Error); }
            catch (ObjectDisposedException) { }
        }
    }

    private async void RefreshPrinters(ListView listView)
    {
        await RefreshListViewAsync(listView, "获取打印机列表", () => _api.GetPrinters(),
            (listViewCtrl, data) =>
            {
                foreach (var p in data)
                {
                    var item = new ListViewItem(p["name"]?.ToString());
                    item.SubItems.Add(p["isDefault"]?.ToObject<bool>() == true ? "是" : "");
                    var status = p["status"];
                    item.SubItems.Add(status?["message"]?.ToString() ?? "");
                    item.SubItems.Add(status?["isOnline"]?.ToObject<bool>() == true ? "是" : "否");
                    item.SubItems.Add(status?["hasPaper"]?.ToObject<bool>() == true ? "是" : "否");
                    listViewCtrl.Items.Add(item);
                }
            });
    }

    private async void RefreshJobs(ListView listView)
    {
        await RefreshListViewAsync(listView, "获取任务列表", () => _api.GetAllJobs(),
            (listViewCtrl, data) =>
            {
                foreach (var job in data)
                {
                    var item = new ListViewItem(job["jobId"]?.ToString());
                    item.SubItems.Add(job["printerName"]?.ToString());
                    item.SubItems.Add(job["status"]?.ToString());
                    item.SubItems.Add(job["createdAt"]?.ToString());
                    item.SubItems.Add(job["errorMessage"]?.ToString());
                    listViewCtrl.Items.Add(item);
                }
            });
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

        var toolPanel = new Panel
        {
            Dock = DockStyle.Top,
            Height = 44,
            Padding = new Padding(8)
        };

        var btnRefresh = new Button
        {
            Text = "刷新",
            Dock = DockStyle.Left,
            Width = 80
        };
        btnRefresh.Click += (s, e) => RefreshJobs(listView);

        toolPanel.Controls.Add(btnRefresh);

        tab.Controls.Add(listView);
        tab.Controls.Add(toolPanel);
        return tab;
    }

    private TabPage CreateLogsTab()
    {
        var tab = new TabPage("日志");

        var filterPanel = new Panel
        {
            Dock = DockStyle.Top,
            Height = 44,
            Padding = new Padding(8)
        };

        var flowLayout = new FlowLayoutPanel
        {
            Dock = DockStyle.Fill,
            FlowDirection = FlowDirection.LeftToRight,
            WrapContents = false,
            AutoSize = false,
            Padding = new Padding(0)
        };

        var lblFrom = new Label { Text = "从:", AutoSize = true, Margin = new Padding(0, 4, 4, 0) };
        var dtpFrom = new DateTimePicker { Width = 140, Format = DateTimePickerFormat.Short, Margin = new Padding(0, 0, 12, 0) };
        var lblTo = new Label { Text = "到:", AutoSize = true, Margin = new Padding(0, 4, 4, 0) };
        var dtpTo = new DateTimePicker { Width = 140, Format = DateTimePickerFormat.Short, Margin = new Padding(0, 0, 12, 0) };
        var btnQuery = new Button { Text = "查询", Width = 70, Margin = new Padding(0) };

        flowLayout.Controls.AddRange(new Control[] { lblFrom, dtpFrom, lblTo, dtpTo, btnQuery });
        filterPanel.Controls.Add(flowLayout);

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
        await RefreshListViewAsync(listView, "查询日志", () => _api.QueryLogs(from, to, limit: 200),
            (listViewCtrl, data) =>
            {
                foreach (var log in data)
                {
                    var item = new ListViewItem(log["timestamp"]?.ToString());
                    item.SubItems.Add(log["printerName"]?.ToString());
                    item.SubItems.Add(log["status"]?.ToString());
                    item.SubItems.Add(log["userId"]?.ToString());
                    item.SubItems.Add(log["jobId"]?.ToString());
                    item.SubItems.Add(log["errorMessage"]?.ToString());
                    listViewCtrl.Items.Add(item);
                }
            });
    }

    private TabPage CreateSettingsTab()
    {
        var tab = new TabPage("设置");

        var panel = new Panel { Dock = DockStyle.Fill, Padding = new Padding(16) };

        // 基本设置组
        var grpBasic = new GroupBox
        {
            Text = "基本设置",
            Dock = DockStyle.Top,
            Height = 100,
            Padding = new Padding(12, 8, 12, 12)
        };

        var basicPanel = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            ColumnCount = 2,
            RowCount = 2,
            Padding = new Padding(4)
        };
        basicPanel.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 100));
        basicPanel.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        basicPanel.RowStyles.Add(new RowStyle(SizeType.Absolute, 32));
        basicPanel.RowStyles.Add(new RowStyle(SizeType.Absolute, 32));

        var lblPort = new Label { Text = "HTTP 端口:", Anchor = AnchorStyles.Left, AutoSize = true };
        var numPort = new NumericUpDown
        {
            Width = 120,
            Minimum = 1024,
            Maximum = 65535,
            Value = _config.HttpPort,
            Anchor = AnchorStyles.Left
        };

        var lblAutoStart = new Label { Text = "开机自启动:", Anchor = AnchorStyles.Left, AutoSize = true };
        var chkAutoStart = new CheckBox
        {
            Text = "",
            Anchor = AnchorStyles.Left,
            Checked = HostConfig.GetAutoStartRegistry()
        };

        basicPanel.Controls.Add(lblPort, 0, 0);
        basicPanel.Controls.Add(numPort, 1, 0);
        basicPanel.Controls.Add(lblAutoStart, 0, 1);
        basicPanel.Controls.Add(chkAutoStart, 1, 1);
        grpBasic.Controls.Add(basicPanel);

        // 显示设置组
        var grpDisplay = new GroupBox
        {
            Text = "显示设置",
            Dock = DockStyle.Top,
            Height = 68,
            Padding = new Padding(12, 8, 12, 12)
        };

        var chkMinimizeToTray = new CheckBox
        {
            Text = "关闭窗口时最小化到托盘",
            Dock = DockStyle.Top,
            Height = 28,
            Checked = _config.MinimizeToTray,
            Padding = new Padding(4, 2, 4, 2)
        };
        grpDisplay.Controls.Add(chkMinimizeToTray);

        // 安全设置组
        var grpSecurity = new GroupBox
        {
            Text = "安全设置",
            Dock = DockStyle.Top,
            Height = 68,
            Padding = new Padding(12, 8, 12, 12)
        };

        var chkTrustAllOrigins = new CheckBox
        {
            Text = "信任所有来源请求（关闭后仅允许本机页面调用）",
            Dock = DockStyle.Top,
            Height = 28,
            Checked = _config.TrustAllOrigins,
            Padding = new Padding(4, 2, 4, 2)
        };
        grpSecurity.Controls.Add(chkTrustAllOrigins);

        // 路径信息组
        var grpPath = new GroupBox
        {
            Text = "路径信息",
            Dock = DockStyle.Top,
            Height = 70,
            Padding = new Padding(12, 8, 12, 12)
        };

        var pathPanel = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            ColumnCount = 2,
            RowCount = 1,
            Padding = new Padding(4)
        };
        pathPanel.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 100));
        pathPanel.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));

        var lblDbPath = new Label { Text = "数据库路径:", Anchor = AnchorStyles.Left, AutoSize = true };
        var txtDbPath = new TextBox
        {
            Text = _config.DbPath ?? "(默认)",
            ReadOnly = true,
            Dock = DockStyle.Fill,
            BackColor = SystemColors.Window
        };

        pathPanel.Controls.Add(lblDbPath, 0, 0);
        pathPanel.Controls.Add(txtDbPath, 1, 0);
        grpPath.Controls.Add(pathPanel);

        // 保存按钮
        var btnSave = new Button
        {
            Text = "保存设置",
            Dock = DockStyle.Top,
            Height = 32,
            Margin = new Padding(0, 12, 0, 0)
        };
        btnSave.Click += (s, e) =>
        {
            _config.HttpPort = (int)numPort.Value;
            _config.AutoStart = chkAutoStart.Checked;
            _config.MinimizeToTray = chkMinimizeToTray.Checked;
            _config.TrustAllOrigins = chkTrustAllOrigins.Checked;
            _config.Save();

            HostConfig.SetAutoStartRegistry(chkAutoStart.Checked);

            var result = MessageBox.Show(
                "设置已保存，是否立即重启程序使配置生效？",
                "确认",
                MessageBoxButtons.YesNo,
                MessageBoxIcon.Question);

            if (result == DialogResult.Yes)
            {
                OnRestart?.Invoke();
            }
            else
            {
                MessageBox.Show("部分设置将在下次启动程序后生效。", "提示", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
        };

        panel.Controls.Add(btnSave);
        panel.Controls.Add(grpPath);
        panel.Controls.Add(grpSecurity);
        panel.Controls.Add(grpDisplay);
        panel.Controls.Add(grpBasic);
        tab.Controls.Add(panel);
        return tab;
    }
}
