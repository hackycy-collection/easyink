using System;
using Newtonsoft.Json.Linq;

namespace EasyInk.Printer.Server;

public class WebSocketMessage
{
    public string Command { get; set; }
    public string Id { get; set; }
    public JObject Params { get; set; }
    public byte[] PdfBytes { get; set; }

    public static WebSocketMessage FromText(string json)
    {
        var obj = JObject.Parse(json);
        return new WebSocketMessage
        {
            Command = obj["command"]?.ToString(),
            Id = obj["id"]?.ToString() ?? Guid.NewGuid().ToString(),
            Params = obj["params"] as JObject
        };
    }

    public static WebSocketMessage FromBinary(byte[] data)
    {
        if (data.Length < 4)
            throw new ArgumentException("二进制消息过短");

        // 读取元数据长度（大端序）
        int metadataLength = (data[0] << 24) | (data[1] << 16) | (data[2] << 8) | data[3];
        if (metadataLength <= 0 || metadataLength > data.Length - 4)
            throw new ArgumentException("无效的元数据长度");

        // 读取元数据
        var metadataBytes = new byte[metadataLength];
        Array.Copy(data, 4, metadataBytes, 0, metadataLength);
        var metadataJson = System.Text.Encoding.UTF8.GetString(metadataBytes);
        var metadata = JObject.Parse(metadataJson);

        // 读取 PDF 数据
        var pdfStart = 4 + metadataLength;
        byte[] pdfBytes = null;
        if (pdfStart < data.Length)
        {
            pdfBytes = new byte[data.Length - pdfStart];
            Array.Copy(data, pdfStart, pdfBytes, 0, pdfBytes.Length);
        }

        return new WebSocketMessage
        {
            Command = metadata["command"]?.ToString(),
            Id = metadata["id"]?.ToString() ?? Guid.NewGuid().ToString(),
            Params = metadata["params"] as JObject,
            PdfBytes = pdfBytes
        };
    }
}
