namespace EasyInk.Engine.Models;

/// <summary>
/// 错误码常量
/// </summary>
public static class ErrorCode
{
    // 参数校验
    public const string InvalidParams = "INVALID_PARAMS";
    public const string InvalidJson = "INVALID_JSON";

    // 命令
    public const string UnknownCommand = "UNKNOWN_COMMAND";

    // 任务
    public const string JobNotFound = "JOB_NOT_FOUND";
    public const string QueueFull = "QUEUE_FULL";

    // 打印
    public const string SumatraNotFound = "SUMATRA_NOT_FOUND";
    public const string PrintFailed = "PRINT_FAILED";
    public const string PrintTimeout = "PRINT_TIMEOUT";
    public const string InvalidPdfSource = "INVALID_PDF_SOURCE";

    // WebSocket
    public const string ChunkTooLarge = "CHUNK_TOO_LARGE";
    public const string PdfTooLarge = "PDF_TOO_LARGE";
    public const string InvalidChunk = "INVALID_CHUNK";
    public const string UploadNotFound = "UPLOAD_NOT_FOUND";
    public const string UploadIncomplete = "UPLOAD_INCOMPLETE";
    public const string MessageTooLarge = "MESSAGE_TOO_LARGE";
    public const string InvalidMessage = "INVALID_MESSAGE";

    // 服务
    public const string InternalError = "INTERNAL_ERROR";
    public const string Unauthorized = "UNAUTHORIZED";
    public const string NotFound = "NOT_FOUND";
}
