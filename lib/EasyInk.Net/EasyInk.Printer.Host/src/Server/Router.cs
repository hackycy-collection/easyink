using System;
using System.IO;
using System.Net;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using EasyInk.Printer.Host.Api;
using EasyInk.Printer.Host.Plugin;

namespace EasyInk.Printer.Host.Server;

/// <summary>
/// HTTP 路由分发
/// </summary>
public class Router
{
    private readonly PrinterController _printerController;
    private readonly PrintController _printController;
    private readonly JobController _jobController;
    private readonly LogController _logController;
    private readonly StatusController _statusController;
    private readonly WebSocketHandler _wsHandler;

    private static readonly JsonSerializerSettings JsonSettings = new JsonSerializerSettings
    {
        ContractResolver = new Newtonsoft.Json.Serialization.CamelCasePropertyNamesContractResolver()
    };

    public Router(PluginBridge plugin, WebSocketHandler wsHandler)
    {
        _printerController = new PrinterController(plugin);
        _printController = new PrintController(plugin);
        _jobController = new JobController(plugin);
        _logController = new LogController(plugin);
        _statusController = new StatusController();
        _wsHandler = wsHandler;
    }

    public async Task HandleRequest(HttpListenerContext context)
    {
        var request = context.Request;
        var response = context.Response;

        // CORS
        response.Headers.Add("Access-Control-Allow-Origin", "*");
        response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        response.Headers.Add("Access-Control-Allow-Headers", "Content-Type");

        if (request.HttpMethod == "OPTIONS")
        {
            response.StatusCode = 200;
            response.Close();
            return;
        }

        string result;
        try
        {
            result = RouteRequest(request);
        }
        catch (Exception ex)
        {
            result = JsonConvert.SerializeObject(new
            {
                success = false,
                errorInfo = new { code = "INTERNAL_ERROR", message = ex.Message }
            }, JsonSettings);
        }

        var buffer = Encoding.UTF8.GetBytes(result);
        response.ContentType = "application/json; charset=utf-8";
        response.ContentLength64 = buffer.Length;
        await response.OutputStream.WriteAsync(buffer, 0, buffer.Length);
        response.Close();
    }

    private string RouteRequest(HttpListenerRequest request)
    {
        var path = request.Url.AbsolutePath.TrimEnd('/');
        var method = request.HttpMethod;

        // GET /api/status
        if (method == "GET" && path == "/api/status")
            return _statusController.GetStatus();

        // GET /api/status/connections (WebSocket 连接数)
        if (method == "GET" && path == "/api/status/connections")
            return JsonConvert.SerializeObject(new { success = true, data = new { count = _wsHandler.ConnectionCount } }, JsonSettings);

        // GET /api/printers
        if (method == "GET" && path == "/api/printers")
            return _printerController.GetPrinters();

        // GET /api/printers/{name}/status
        if (method == "GET" && path.StartsWith("/api/printers/") && path.EndsWith("/status"))
        {
            var name = Uri.UnescapeDataString(path.Substring(14, path.Length - 14 - 7));
            return _printerController.GetPrinterStatus(name);
        }

        // POST /api/print
        if (method == "POST" && path == "/api/print")
            return _printController.Print(ReadBody(request));

        // POST /api/print/async
        if (method == "POST" && path == "/api/print/async")
            return _printController.PrintAsync(ReadBody(request));

        // POST /api/print/batch
        if (method == "POST" && path == "/api/print/batch")
            return _printController.BatchPrint(ReadBody(request));

        // POST /api/print/batch/async
        if (method == "POST" && path == "/api/print/batch/async")
            return _printController.BatchPrintAsync(ReadBody(request));

        // GET /api/jobs
        if (method == "GET" && path == "/api/jobs")
            return _jobController.GetAllJobs();

        // GET /api/jobs/{id}
        if (method == "GET" && path.StartsWith("/api/jobs/"))
        {
            var id = path.Substring(10);
            return _jobController.GetJobStatus(id);
        }

        // GET /api/logs
        if (method == "GET" && path == "/api/logs")
            return _logController.QueryLogs(request.QueryString);

        // 404
        return JsonConvert.SerializeObject(new
        {
            success = false,
            errorInfo = new { code = "NOT_FOUND", message = $"路由不存在: {method} {path}" }
        }, JsonSettings);
    }

    private static string ReadBody(HttpListenerRequest request)
    {
        if (request.InputStream == null) return null;
        using (var reader = new StreamReader(request.InputStream, request.ContentEncoding))
        {
            return reader.ReadToEnd();
        }
    }
}
