using System;
using System.IO;
using System.Net;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using EasyInk.Printer;
using EasyInk.Printer.Host.Api;
using EasyInk.Printer.Host.Config;

namespace EasyInk.Printer.Host.Server;

public class Router
{
    private const long MaxRequestBodyBytes = 10 * 1024 * 1024; // 10MB

    private readonly PrinterController _printerController;
    private readonly PrintController _printController;
    private readonly JobController _jobController;
    private readonly LogController _logController;
    private readonly StatusController _statusController;
    private readonly WebSocketHandler _wsHandler;
    private readonly bool _trustAllOrigins;

    private static readonly JsonSerializerSettings JsonSettings = new JsonSerializerSettings
    {
        ContractResolver = new Newtonsoft.Json.Serialization.CamelCasePropertyNamesContractResolver()
    };

    public Router(PrinterApi printerApi, WebSocketHandler wsHandler, HostConfig config)
    {
        _printerController = new PrinterController(printerApi);
        _printController = new PrintController(printerApi);
        _jobController = new JobController(printerApi);
        _logController = new LogController(printerApi);
        _statusController = new StatusController();
        _wsHandler = wsHandler;
        _trustAllOrigins = config.TrustAllOrigins;
    }

    public async Task HandleRequest(HttpListenerContext context)
    {
        var request = context.Request;
        var response = context.Response;

        if (_trustAllOrigins)
        {
            response.Headers.Add("Access-Control-Allow-Origin", "*");
        }
        else
        {
            var origin = request.Headers["Origin"];
            if (!string.IsNullOrEmpty(origin))
                response.Headers.Add("Access-Control-Allow-Origin", origin);
        }
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

        if (method == "GET" && path == "/api/status")
            return _statusController.GetStatus();

        if (method == "GET" && path == "/api/status/connections")
            return JsonConvert.SerializeObject(new { success = true, data = new { count = _wsHandler.ConnectionCount } }, JsonSettings);

        if (method == "GET" && path == "/api/printers")
            return _printerController.GetPrinters();

        // GET /api/printers/{name}/status
        if (method == "GET" && path.StartsWith("/api/printers/") && path.EndsWith("/status"))
        {
            var segments = path.Split('/');
            // ["", "api", "printers", "{name}", "status"]
            if (segments.Length == 5 && !string.IsNullOrEmpty(segments[3]))
            {
                var name = Uri.UnescapeDataString(segments[3]);
                return _printerController.GetPrinterStatus(name);
            }
            return ErrorJson("INVALID_PARAMS", "缺少打印机名称");
        }

        if (method == "POST" && path == "/api/print")
            return _printController.Print(ReadBody(request));

        if (method == "POST" && path == "/api/print/async")
            return _printController.PrintAsync(ReadBody(request));

        if (method == "POST" && path == "/api/print/batch")
            return _printController.BatchPrint(ReadBody(request));

        if (method == "POST" && path == "/api/print/batch/async")
            return _printController.BatchPrintAsync(ReadBody(request));

        if (method == "GET" && path == "/api/jobs")
            return _jobController.GetAllJobs();

        if (method == "GET" && path.StartsWith("/api/jobs/"))
        {
            var id = path.Substring(10);
            if (string.IsNullOrEmpty(id))
                return ErrorJson("INVALID_PARAMS", "缺少任务ID");
            return _jobController.GetJobStatus(id);
        }

        if (method == "GET" && path == "/api/logs")
            return _logController.QueryLogs(request.QueryString);

        return ErrorJson("NOT_FOUND", $"路由不存在: {method} {path}");
    }

    private static string ReadBody(HttpListenerRequest request)
    {
        if (request.InputStream == null) return null;
        if (request.ContentLength64 > MaxRequestBodyBytes)
            throw new InvalidOperationException($"请求体过大: {request.ContentLength64 / 1024 / 1024}MB，上限 {MaxRequestBodyBytes / 1024 / 1024}MB");

        var buffer = new byte[MaxRequestBodyBytes];
        int totalRead = 0;
        int bytesRead;
        while (totalRead < buffer.Length &&
               (bytesRead = request.InputStream.Read(buffer, totalRead, buffer.Length - totalRead)) > 0)
        {
            totalRead += bytesRead;
        }

        if (totalRead >= MaxRequestBodyBytes)
            throw new InvalidOperationException($"请求体过大，上限 {MaxRequestBodyBytes / 1024 / 1024}MB");

        return request.ContentEncoding.GetString(buffer, 0, totalRead);
    }

    private static string ErrorJson(string code, string message)
    {
        return JsonConvert.SerializeObject(new
        {
            success = false,
            errorInfo = new { code, message }
        }, JsonSettings);
    }
}
