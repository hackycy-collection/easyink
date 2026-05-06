using System.Data.SQLite;
using Dapper;

namespace EasyInk.Printer.Services;

/// <summary>
/// 审计日志服务
/// </summary>
public class AuditService
{
    private readonly string _connectionString;

    public AuditService(string dbPath = null)
    {
        var path = dbPath ?? Path.Combine(AppContext.BaseDirectory, "data", "audit.db");
        _connectionString = $"Data Source={path}";

        var directory = Path.GetDirectoryName(path);
        if (!string.IsNullOrEmpty(directory) && !Directory.Exists(directory))
        {
            Directory.CreateDirectory(directory);
        }

        InitializeDatabase();
    }

    private void InitializeDatabase()
    {
        using var connection = new SQLiteConnection(_connectionString);
        connection.Execute(@"
            CREATE TABLE IF NOT EXISTS PrintAuditLog (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                Timestamp DATETIME NOT NULL,
                PrinterName TEXT NOT NULL,
                PaperWidth REAL,
                PaperHeight REAL,
                PaperUnit TEXT DEFAULT 'mm',
                Copies INTEGER DEFAULT 1,
                Dpi INTEGER,
                UserId TEXT,
                LabelType TEXT,
                Status TEXT NOT NULL,
                ErrorMessage TEXT,
                JobId TEXT,
                CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ");

        connection.Execute("CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON PrintAuditLog(Timestamp)");
        connection.Execute("CREATE INDEX IF NOT EXISTS idx_audit_printer ON PrintAuditLog(PrinterName)");
        connection.Execute("CREATE INDEX IF NOT EXISTS idx_audit_user ON PrintAuditLog(UserId)");
        connection.Execute("CREATE INDEX IF NOT EXISTS idx_audit_status ON PrintAuditLog(Status)");
    }

    /// <summary>
    /// 记录打印日志
    /// </summary>
    public void LogPrint(PrintAuditLog log)
    {
        using var connection = new SQLiteConnection(_connectionString);
        connection.Execute(@"
            INSERT INTO PrintAuditLog
            (Timestamp, PrinterName, PaperWidth, PaperHeight, PaperUnit,
             Copies, Dpi, UserId, LabelType, Status, ErrorMessage, JobId)
            VALUES
            (@Timestamp, @PrinterName, @PaperWidth, @PaperHeight, @PaperUnit,
             @Copies, @Dpi, @UserId, @LabelType, @Status, @ErrorMessage, @JobId)
        ", log);
    }

    /// <summary>
    /// 查询审计日志
    /// </summary>
    public List<PrintAuditLog> QueryLogs(
        DateTime? startTime = null,
        DateTime? endTime = null,
        string printerName = null,
        string userId = null,
        string status = null,
        int limit = 100,
        int offset = 0)
    {
        using var connection = new SQLiteConnection(_connectionString);

        var sql = "SELECT * FROM PrintAuditLog WHERE 1=1";
        var parameters = new DynamicParameters();

        if (startTime.HasValue)
        {
            sql += " AND Timestamp >= @StartTime";
            parameters.Add("StartTime", startTime.Value);
        }

        if (endTime.HasValue)
        {
            sql += " AND Timestamp <= @EndTime";
            parameters.Add("EndTime", endTime.Value);
        }

        if (!string.IsNullOrEmpty(printerName))
        {
            sql += " AND PrinterName = @PrinterName";
            parameters.Add("PrinterName", printerName);
        }

        if (!string.IsNullOrEmpty(userId))
        {
            sql += " AND UserId = @UserId";
            parameters.Add("UserId", userId);
        }

        if (!string.IsNullOrEmpty(status))
        {
            sql += " AND Status = @Status";
            parameters.Add("Status", status);
        }

        sql += " ORDER BY Timestamp DESC LIMIT @Limit OFFSET @Offset";
        parameters.Add("Limit", limit);
        parameters.Add("Offset", offset);

        return connection.Query<PrintAuditLog>(sql, parameters).ToList();
    }
}

/// <summary>
/// 打印审计日志
/// </summary>
public class PrintAuditLog
{
    public long Id { get; set; }
    public DateTime Timestamp { get; set; }
    public string PrinterName { get; set; }
    public double? PaperWidth { get; set; }
    public double? PaperHeight { get; set; }
    public string PaperUnit { get; set; }
    public int Copies { get; set; } = 1;
    public int? Dpi { get; set; }
    public string UserId { get; set; }
    public string LabelType { get; set; }
    public string Status { get; set; }
    public string ErrorMessage { get; set; }
    public string JobId { get; set; }
    public DateTime CreatedAt { get; set; }
}
