using System.Threading;
using EasyInk.Engine.Models;
using EasyInk.Engine.Services;
using EasyInk.Engine.Services.Abstractions;
using Xunit;

namespace EasyInk.Engine.Tests;

public class RoutingPrintServiceTests
{
    [Fact]
    public void Print_WhenSumatraPatternMatches_UsesSumatraBeforeRaw()
    {
        var gdi = new CapturingPrintService("gdi");
        var raw = new CapturingPrintService("raw");
        var sumatra = new CapturingPrintService("sumatra");
        var router = new RoutingPrintService(
            gdi,
            raw,
            new[] { "XP" },
            sumatra,
            new[] { "XP-80C" });

        router.Print("req-1", Request("XP-80C"));

        Assert.Equal(1, sumatra.Calls);
        Assert.Equal(0, raw.Calls);
        Assert.Equal(0, gdi.Calls);
    }

    [Fact]
    public void Print_WhenRawPatternMatches_UsesRaw()
    {
        var gdi = new CapturingPrintService("gdi");
        var raw = new CapturingPrintService("raw");
        var sumatra = new CapturingPrintService("sumatra");
        var router = new RoutingPrintService(
            gdi,
            raw,
            new[] { "XP" },
            sumatra,
            new[] { "Office" });

        router.Print("req-1", Request("XP-80C"));

        Assert.Equal(0, sumatra.Calls);
        Assert.Equal(1, raw.Calls);
        Assert.Equal(0, gdi.Calls);
    }

    [Fact]
    public void Print_WhenNoPatternMatches_UsesGdi()
    {
        var gdi = new CapturingPrintService("gdi");
        var raw = new CapturingPrintService("raw");
        var sumatra = new CapturingPrintService("sumatra");
        var router = new RoutingPrintService(
            gdi,
            raw,
            new[] { "XP" },
            sumatra,
            new[] { "Office" });

        router.Print("req-1", Request("HP LaserJet"));

        Assert.Equal(0, sumatra.Calls);
        Assert.Equal(0, raw.Calls);
        Assert.Equal(1, gdi.Calls);
    }

    private static PrintRequestParams Request(string printerName)
    {
        return new PrintRequestParams
        {
            PrinterName = printerName,
            PdfBase64 = "JVBERi0xLjQK"
        };
    }

    private sealed class CapturingPrintService : IPrintService
    {
        private readonly string _name;

        public CapturingPrintService(string name)
        {
            _name = name;
        }

        public int Calls { get; private set; }

        public PrinterResult Print(string requestId, PrintRequestParams request, CancellationToken cancellationToken = default)
        {
            Calls++;
            return PrinterResult.Ok(requestId, _name);
        }
    }
}
