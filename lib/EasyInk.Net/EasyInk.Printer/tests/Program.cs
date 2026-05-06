using EasyInk.Printer;

namespace EasyInk.Printer.Tests;

/// <summary>
/// 测试程序
/// 用于本地测试打印功能
/// </summary>
class Program
{
    static void Main(string[] args)
    {
        var api = new PrinterApi();

        Console.WriteLine("=== EasyInk.Printer 测试程序 ===");
        Console.WriteLine();

        // 测试获取打印机列表
        Console.WriteLine("1. 获取打印机列表:");
        var printers = api.GetPrinters();
        Console.WriteLine(printers);
        Console.WriteLine();

        // 测试获取打印机状态
        Console.WriteLine("2. 获取打印机状态:");
        var status = api.GetPrinterStatus("Microsoft Print to PDF");
        Console.WriteLine(status);
        Console.WriteLine();

        // 测试打印（需要提供PDF文件）
        if (args.Length > 0 && File.Exists(args[0]))
        {
            Console.WriteLine("3. 测试打印:");
            var pdfBytes = File.ReadAllBytes(args[0]);
            var pdfBase64 = Convert.ToBase64String(pdfBytes);

            var result = api.Print(
                printerName: "Microsoft Print to PDF",
                pdfBase64: pdfBase64,
                copies: 1,
                paperWidth: 40,
                paperHeight: 30,
                paperUnit: "mm",
                dpi: 300,
                userId: "test-user",
                labelType: "test"
            );
            Console.WriteLine(result);
        }
        else
        {
            Console.WriteLine("3. 跳过打印测试（未提供PDF文件）");
            Console.WriteLine("   用法: EasyInk.Printer.Tests.exe <pdf文件路径>");
        }

        Console.WriteLine();

        // 测试查询日志
        Console.WriteLine("4. 查询审计日志:");
        var logs = api.QueryLogs(limit: 10);
        Console.WriteLine(logs);

        Console.WriteLine();
        Console.WriteLine("=== 测试完成 ===");
    }
}
