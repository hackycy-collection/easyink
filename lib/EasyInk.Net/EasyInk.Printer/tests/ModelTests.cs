using EasyInk.Printer.Models;
using Xunit;

namespace EasyInk.Printer.Tests;

public class PaperSizeParamsTests
{
    [Fact]
    public void MmToHundredthsOfInch_ConversionIsCorrect()
    {
        var p = new PaperSizeParams { Width = 100, Height = 200, Unit = "mm" };
        // 100mm = 100/25.4*100 ≈ 393.7 hundredths of inch
        Assert.Equal(393, p.WidthInHundredthsOfInch);
        // 200mm = 200/25.4*100 ≈ 787.4
        Assert.Equal(787, p.HeightInHundredthsOfInch);
    }

    [Fact]
    public void InchToHundredthsOfInch_ConversionIsCorrect()
    {
        var p = new PaperSizeParams { Width = 3, Height = 5, Unit = "inch" };
        Assert.Equal(300, p.WidthInHundredthsOfInch);
        Assert.Equal(500, p.HeightInHundredthsOfInch);
    }

    [Fact]
    public void DefaultUnit_IsMm()
    {
        var p = new PaperSizeParams();
        Assert.Equal("mm", p.Unit);
    }
}

public class OffsetParamsTests
{
    [Fact]
    public void MmToHundredthsOfInch_ConversionIsCorrect()
    {
        var o = new OffsetParams { X = 10, Y = 20, Unit = "mm" };
        // 10mm = 10/25.4*100 ≈ 39.37
        Assert.Equal(39, o.XInHundredthsOfInch);
        // 20mm = 20/25.4*100 ≈ 78.74
        Assert.Equal(78, o.YInHundredthsOfInch);
    }

    [Fact]
    public void InchToHundredthsOfInch_ConversionIsCorrect()
    {
        var o = new OffsetParams { X = 1.5, Y = 2.5, Unit = "inch" };
        Assert.Equal(150, o.XInHundredthsOfInch);
        Assert.Equal(250, o.YInHundredthsOfInch);
    }
}

public class PrinterResultTests
{
    [Fact]
    public void Ok_SetsSuccessAndData()
    {
        var result = PrinterResult.Ok("id-1", new { Name = "test" });
        Assert.True(result.Success);
        Assert.Equal("id-1", result.Id);
        Assert.NotNull(result.Data);
        Assert.Null(result.ErrorInfo);
    }

    [Fact]
    public void Error_SetsErrorInfo()
    {
        var result = PrinterResult.Error("id-2", "CODE", "message", "details");
        Assert.False(result.Success);
        Assert.Equal("id-2", result.Id);
        Assert.Equal("CODE", result.ErrorInfo.Code);
        Assert.Equal("message", result.ErrorInfo.Message);
        Assert.Equal("details", result.ErrorInfo.Details);
    }
}
