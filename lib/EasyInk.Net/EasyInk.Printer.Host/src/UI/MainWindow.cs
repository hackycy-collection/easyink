using System;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Windows.Forms;
using EasyInk.Printer.Host.Api;
using EasyInk.Printer.Host.Config;
using EasyInk.Printer.Host.Server;
using EasyInk.Printer.Host.Utils;

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
    private readonly System.Collections.Generic.HashSet<int> _loadedTabs = new();
    private readonly System.Collections.Generic.HashSet<int> _refreshingTabs = new();

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

        _tabs.SelectedIndexChanged += OnTabChanged;
    }

    private void OnTabChanged(object sender, EventArgs e)
    {
        var idx = _tabs.SelectedIndex;
        if (_loadedTabs.Contains(idx)) return;

        switch (idx)
        {
            case 1: // 打印机
                _loadedTabs.Add(idx);
                var printersTab = _tabs.TabPages[idx];
                var printersLv = printersTab.Controls.OfType<ListView>().FirstOrDefault();
                if (printersLv != null) RefreshPrinters(printersLv);
                break;
            case 2: // 任务
                _loadedTabs.Add(idx);
                var jobsTab = _tabs.TabPages[idx];
                var jobsLv = jobsTab.Controls.OfType<ListView>().FirstOrDefault();
                if (jobsLv != null) RefreshJobs(jobsLv);
                break;
        }
    }

    private TabPage CreateDashboardTab()
    {
        var tab = new TabPage("仪表盘");
        var panel = new Panel { Dock = DockStyle.Fill, Padding = new Padding(16) };

        var titleFont = new Font("Microsoft YaHei UI", 9f);
        var valueFont = new Font("Microsoft YaHei UI", 18f, FontStyle.Bold);
        var cardSize = new Size(180, 90);

        var colorRunning = Color.FromArgb(56, 142, 142);
        var colorError = Color.FromArgb(211, 47, 47);
        var colorPort = Color.FromArgb(63, 81, 181);
        var colorWs = Color.FromArgb(255, 152, 0);
        var colorIdle = Color.FromArgb(56, 142, 142);
        var colorBusy = Color.FromArgb(255, 111, 0);

        var hasError = !_server.IsRunning && _server.LastError != null;
        var statusColor = hasError ? colorError : colorRunning;
        var statusText = _server.IsRunning ? "运行中" : (hasError ? "异常" : "已停止");

        // -- 状态卡片 --
        var cardsPanel = new FlowLayoutPanel
        {
            Dock = DockStyle.Top,
            Height = 118,
            FlowDirection = FlowDirection.LeftToRight,
            WrapContents = false,
            Padding = new Padding(0, 0, 0, 8),
            AutoSize = false
        };

        Label lblStatusVal, lblPortVal, lblWsVal, lblQueueVal;
        var cardStatus = CreateCardPanel(cardSize, statusColor, "服务状态",
            statusText, valueFont, statusColor, titleFont, out lblStatusVal);
        var cardPort = CreateCardPanel(cardSize, colorPort, "端口",
            _server.Port.ToString(), valueFont, colorPort, titleFont, out lblPortVal);
        var cardWs = CreateCardPanel(cardSize, colorWs, "WebSocket 连接",
            _wsHandler.ConnectionCount.ToString(), valueFont, colorWs, titleFont, out lblWsVal);
        var cardQueue = CreateCardPanel(cardSize, colorIdle, "打印队列",
            "空闲", valueFont, colorIdle, titleFont, out lblQueueVal);

        cardsPanel.Controls.AddRange(new Control[] { cardStatus, cardPort, cardWs, cardQueue });

        _wsHandler.ConnectionCountChanged += () =>
        {
            if (IsDisposed) return;
            if (InvokeRequired)
                BeginInvoke(new Action(() => lblWsVal.Text = _wsHandler.ConnectionCount.ToString()));
            else
                lblWsVal.Text = _wsHandler.ConnectionCount.ToString();
        };

        // -- 设备信息区域 --
        var infoPanel = new Panel
        {
            Dock = DockStyle.Top,
            AutoSize = true,
            BackColor = Color.White,
            BorderStyle = BorderStyle.FixedSingle,
            Padding = new Padding(16, 12, 16, 12),
            Margin = new Padding(0, 0, 0, 12)
        };

        var infoTitleFont = new Font("Microsoft YaHei UI", 10f, FontStyle.Bold);
        var infoKeyFont = new Font("Microsoft YaHei UI", 9f);
        var infoValFont = new Font("Microsoft YaHei UI", 9f, FontStyle.Bold);
        var rowHeight = 24;

        var lblInfoTitle = new Label
        {
            Text = "设备信息",
            Font = infoTitleFont,
            ForeColor = Color.FromArgb(50, 50, 50),
            Dock = DockStyle.Top,
            Height = 28
        };

        var lanIps = NetworkHelper.GetLanIpv4Addresses();
        var addresses = lanIps.Count > 0
            ? string.Join("  ", lanIps.Select(ip => $"http://{ip}:{_server.Port}"))
            : $"http://localhost:{_server.Port}";

        var deviceNumber = NetworkHelper.GenerateDeviceNumber();
        var appVersion = typeof(StatusController).Assembly.GetName().Version?.ToString() ?? "1.0.0";
        var macs = NetworkHelper.GetActivePhysicalMacs();
        var macText = macs.Count > 0 ? string.Join("  /  ", macs) : "未检测到";

        var infoRows = new[]
        {
            new { Key = "服务地址:", Value = addresses },
            new { Key = "设备编号:", Value = deviceNumber },
            new { Key = "应用版本:", Value = appVersion },
            new { Key = "MAC 地址:", Value = macText }
        };

        foreach (var row in infoRows.Reverse())
        {
            var rowPanel = new FlowLayoutPanel
            {
                Dock = DockStyle.Top,
                Height = rowHeight,
                FlowDirection = FlowDirection.LeftToRight,
                WrapContents = false,
                Padding = new Padding(0),
                Margin = new Padding(0, 0, 0, 4)
            };

            var lblKey = new Label
            {
                Text = row.Key,
                Font = infoKeyFont,
                ForeColor = Color.FromArgb(128, 128, 128),
                AutoSize = true,
                Margin = new Padding(0, 3, 8, 0)
            };

            var lblVal = new Label
            {
                Text = row.Value,
                Font = infoValFont,
                ForeColor = Color.FromArgb(50, 50, 50),
                AutoSize = true,
                MaximumSize = new Size(600, 0),
                Margin = new Padding(0, 3, 0, 0)
            };

            rowPanel.Controls.Add(lblKey);
            rowPanel.Controls.Add(lblVal);
            infoPanel.Controls.Add(rowPanel);
        }

        infoPanel.Controls.Add(lblInfoTitle);

        // -- 错误提示区域 --
        var errorPanel = new Panel
        {
            Dock = DockStyle.Top,
            Height = 0,
            Visible = false,
            BackColor = Color.FromArgb(255, 243, 224),
            Padding = new Padding(12),
            Margin = new Padding(0, 0, 0, 8)
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

        // -- 刷新按钮 --
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
            // 刷新服务状态卡片
            var err = !_server.IsRunning && _server.LastError != null;
            lblStatusVal.Text = _server.IsRunning ? "运行中" : (err ? "异常" : "已停止");
            lblStatusVal.ForeColor = err ? colorError : colorRunning;
            cardStatus.Controls[1].BackColor = err ? colorError : colorRunning;
            lblPortVal.Text = _server.Port.ToString();
            lblWsVal.Text = _wsHandler.ConnectionCount.ToString();

            // 刷新打印队列状态
            RefreshQueueStatus(lblQueueVal, cardQueue, colorIdle, colorBusy);

            // 刷新错误区域
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

        // 添加顺序决定 Dock.Top 的视觉排列（后添加的更靠上）
        panel.Controls.Add(btnBar);
        panel.Controls.Add(errorPanel);
        panel.Controls.Add(infoPanel);
        panel.Controls.Add(cardsPanel);
        tab.Controls.Add(panel);
        return tab;
    }

    private void RefreshQueueStatus(Label lblQueueVal, Panel cardQueue, Color colorIdle, Color colorBusy)
    {
        try
        {
            var json = _api.GetAllJobs();
            var result = Newtonsoft.Json.Linq.JObject.Parse(json);
            var data = result["data"] as Newtonsoft.Json.Linq.JArray;
            var hasActive = data != null && data.Any(j =>
            {
                var st = j["status"]?.ToString();
                return st == "printing" || st == "queued";
            });

            var isBusy = hasActive;
            lblQueueVal.Text = isBusy ? "忙碌" : "空闲";
            lblQueueVal.ForeColor = isBusy ? colorBusy : colorIdle;
            cardQueue.Controls[1].BackColor = isBusy ? colorBusy : colorIdle;
        }
        catch
        {
            lblQueueVal.Text = "--";
            lblQueueVal.ForeColor = colorIdle;
        }
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

    private bool TryBeginRefresh(int tabIndex)
    {
        return _refreshingTabs.Add(tabIndex);
    }

    private void EndRefresh(int tabIndex)
    {
        _refreshingTabs.Remove(tabIndex);
    }

    private async Task RefreshListViewAsync(ListView listView, int tabIndex, string operationName, Func<string> dataFetcher, Action<ListView, Newtonsoft.Json.Linq.JArray> rowMapper)
    {
        if (!TryBeginRefresh(tabIndex)) return;
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
        finally
        {
            EndRefresh(tabIndex);
        }
    }

    private async void RefreshPrinters(ListView listView)
    {
        await RefreshListViewAsync(listView, 1, "获取打印机列表", () => _api.GetPrinters(),
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
        await RefreshListViewAsync(listView, 2, "获取任务列表", () => _api.GetAllJobs(),
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
        await RefreshListViewAsync(listView, 3, "查询日志", () => _api.QueryLogs(from, to, limit: 200),
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
            Height = 96,
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

        var chkStartMinimized = new CheckBox
        {
            Text = "启动时最小化到托盘（不显示主窗口）",
            Dock = DockStyle.Top,
            Height = 28,
            Checked = _config.StartMinimized,
            Padding = new Padding(4, 2, 4, 2)
        };
        grpDisplay.Controls.Add(chkStartMinimized);
        grpDisplay.Controls.Add(chkMinimizeToTray);

        // 安全设置组
        var grpSecurity = new GroupBox
        {
            Text = "安全设置",
            Dock = DockStyle.Top,
            Height = 100,
            Padding = new Padding(12, 8, 12, 12)
        };

        var securityPanel = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            ColumnCount = 2,
            RowCount = 2,
            Padding = new Padding(4)
        };
        securityPanel.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 100));
        securityPanel.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        securityPanel.RowStyles.Add(new RowStyle(SizeType.Absolute, 28));
        securityPanel.RowStyles.Add(new RowStyle(SizeType.Absolute, 28));

        var chkTrustAllOrigins = new CheckBox
        {
            Text = "信任所有来源请求（关闭后仅允许本机页面调用）",
            Anchor = AnchorStyles.Left,
            Checked = _config.TrustAllOrigins
        };

        var lblApiKey = new Label { Text = "API Key:", Anchor = AnchorStyles.Left, AutoSize = true };
        var txtApiKey = new TextBox
        {
            Text = _config.ApiKey ?? "",
            Dock = DockStyle.Fill,
            Anchor = AnchorStyles.Left | AnchorStyles.Right
        };

        var placeholderText = "留空则不启用认证";
        var isPlaceholder = string.IsNullOrEmpty(_config.ApiKey);
        if (isPlaceholder)
        {
            txtApiKey.Text = placeholderText;
            txtApiKey.ForeColor = SystemColors.GrayText;
        }

        txtApiKey.GotFocus += (s, e) =>
        {
            if (txtApiKey.Text == placeholderText && txtApiKey.ForeColor == SystemColors.GrayText)
            {
                txtApiKey.Text = "";
                txtApiKey.ForeColor = SystemColors.WindowText;
            }
        };
        txtApiKey.LostFocus += (s, e) =>
        {
            if (string.IsNullOrWhiteSpace(txtApiKey.Text))
            {
                txtApiKey.Text = placeholderText;
                txtApiKey.ForeColor = SystemColors.GrayText;
            }
        };

        securityPanel.Controls.Add(chkTrustAllOrigins, 0, 0);
        securityPanel.SetColumnSpan(chkTrustAllOrigins, 2);
        securityPanel.Controls.Add(lblApiKey, 0, 1);
        securityPanel.Controls.Add(txtApiKey, 1, 1);
        grpSecurity.Controls.Add(securityPanel);

        // 路径设置组
        var grpPath = new GroupBox
        {
            Text = "路径设置",
            Dock = DockStyle.Top,
            Height = 165,
            Padding = new Padding(12, 8, 12, 12)
        };

        var pathPanel = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            ColumnCount = 3,
            RowCount = 3,
            Padding = new Padding(4)
        };
        pathPanel.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 110));
        pathPanel.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        pathPanel.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 60));
        pathPanel.RowStyles.Add(new RowStyle(SizeType.Absolute, 32));
        pathPanel.RowStyles.Add(new RowStyle(SizeType.Absolute, 32));
        pathPanel.RowStyles.Add(new RowStyle(SizeType.Absolute, 32));

        var lblDbPath = new Label { Text = "数据库路径:", Anchor = AnchorStyles.Left, AutoSize = true };
        var txtDbPath = new TextBox
        {
            Text = string.IsNullOrWhiteSpace(_config.DbPath) ? HostConfig.DefaultDbPath : _config.DbPath,
            Dock = DockStyle.Fill,
            Anchor = AnchorStyles.Left | AnchorStyles.Right
        };
        var btnBrowseDb = new Button
        {
            Text = "浏览",
            Width = 52,
            Anchor = AnchorStyles.Left
        };
        btnBrowseDb.Click += (s, e) =>
        {
            using var dlg = new SaveFileDialog
            {
                Title = "选择数据库文件位置",
                Filter = "SQLite 数据库|*.db|所有文件|*.*",
                FileName = "audit.db",
                InitialDirectory = Path.GetDirectoryName(txtDbPath.Text)
            };
            if (dlg.ShowDialog() == DialogResult.OK)
                txtDbPath.Text = dlg.FileName;
        };

        var lblTempDir = new Label { Text = "PDF 临时目录:", Anchor = AnchorStyles.Left, AutoSize = true };
        var txtTempDir = new TextBox
        {
            Text = string.IsNullOrWhiteSpace(_config.SumatraTempDir) ? HostConfig.DefaultSumatraTempDir : _config.SumatraTempDir,
            Dock = DockStyle.Fill,
            Anchor = AnchorStyles.Left | AnchorStyles.Right
        };
        var btnBrowseTemp = new Button
        {
            Text = "浏览",
            Width = 52,
            Anchor = AnchorStyles.Left
        };
        btnBrowseTemp.Click += (s, e) =>
        {
            using var dlg = new FolderBrowserDialog
            {
                Description = "选择 PDF 临时文件目录",
                SelectedPath = txtTempDir.Text
            };
            if (dlg.ShowDialog() == DialogResult.OK)
                txtTempDir.Text = dlg.SelectedPath;
        };

        var lblCrashDir = new Label { Text = "崩溃日志目录:", Anchor = AnchorStyles.Left, AutoSize = true };
        var txtCrashDir = new TextBox
        {
            Text = string.IsNullOrWhiteSpace(_config.CrashLogDir) ? HostConfig.DefaultCrashLogDir : _config.CrashLogDir,
            Dock = DockStyle.Fill,
            Anchor = AnchorStyles.Left | AnchorStyles.Right
        };
        var btnBrowseCrash = new Button
        {
            Text = "浏览",
            Width = 52,
            Anchor = AnchorStyles.Left
        };
        btnBrowseCrash.Click += (s, e) =>
        {
            using var dlg = new FolderBrowserDialog
            {
                Description = "选择崩溃日志目录",
                SelectedPath = txtCrashDir.Text
            };
            if (dlg.ShowDialog() == DialogResult.OK)
                txtCrashDir.Text = dlg.SelectedPath;
        };

        pathPanel.Controls.Add(lblDbPath, 0, 0);
        pathPanel.Controls.Add(txtDbPath, 1, 0);
        pathPanel.Controls.Add(btnBrowseDb, 2, 0);
        pathPanel.Controls.Add(lblTempDir, 0, 1);
        pathPanel.Controls.Add(txtTempDir, 1, 1);
        pathPanel.Controls.Add(btnBrowseTemp, 2, 1);
        pathPanel.Controls.Add(lblCrashDir, 0, 2);
        pathPanel.Controls.Add(txtCrashDir, 1, 2);
        pathPanel.Controls.Add(btnBrowseCrash, 2, 2);
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
            // 路径校验
            var dbPathValue = txtDbPath.Text.Trim();
            if (!HostConfig.IsValidFilePath(dbPathValue, out var dbError))
            {
                MessageBox.Show($"数据库路径无效: {dbError}", "错误", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                txtDbPath.Focus();
                return;
            }

            var tempDirValue = txtTempDir.Text.Trim();
            if (!HostConfig.IsValidFilePath(tempDirValue + Path.DirectorySeparatorChar, out var tempError))
            {
                MessageBox.Show($"PDF 临时目录无效: {tempError}", "错误", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                txtTempDir.Focus();
                return;
            }

            var crashDirValue = txtCrashDir.Text.Trim();
            if (!HostConfig.IsValidFilePath(crashDirValue + Path.DirectorySeparatorChar, out var crashError))
            {
                MessageBox.Show($"崩溃日志目录无效: {crashError}", "错误", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                txtCrashDir.Focus();
                return;
            }

            _config.HttpPort = (int)numPort.Value;
            _config.AutoStart = chkAutoStart.Checked;
            _config.MinimizeToTray = chkMinimizeToTray.Checked;
            _config.StartMinimized = chkStartMinimized.Checked;
            _config.TrustAllOrigins = chkTrustAllOrigins.Checked;
            var apiKeyValue = (txtApiKey.ForeColor == SystemColors.GrayText || string.IsNullOrWhiteSpace(txtApiKey.Text))
                ? null : txtApiKey.Text.Trim();
            _config.ApiKey = apiKeyValue;

            _config.DbPath = string.Equals(dbPathValue, HostConfig.DefaultDbPath, StringComparison.OrdinalIgnoreCase)
                ? null : dbPathValue;
            _config.SumatraTempDir = string.Equals(tempDirValue, HostConfig.DefaultSumatraTempDir.TrimEnd(Path.DirectorySeparatorChar), StringComparison.OrdinalIgnoreCase)
                ? null : tempDirValue;
            _config.CrashLogDir = string.Equals(crashDirValue, HostConfig.DefaultCrashLogDir, StringComparison.OrdinalIgnoreCase)
                ? null : crashDirValue;

            try
            {
                _config.Save();
            }
            catch (Exception ex)
            {
                MessageBox.Show($"配置保存失败: {ex.Message}", "错误", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }

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
