using EasyInk.Printer.Host.Config;
using Xunit;

namespace EasyInk.Printer.Host.Tests;

public class HostConfigTests
{
    [Theory]
    [InlineData(@"C:\data\audit.db")]
    [InlineData(@"D:\some\path\file.db")]
    [InlineData(@"E:\")]
    public void IsValidFilePath_ValidPaths_ReturnsTrue(string path)
    {
        Assert.True(HostConfig.IsValidFilePath(path, out _));
    }

    [Theory]
    [InlineData(null, "路径不能为空")]
    [InlineData("", "路径不能为空")]
    [InlineData("  ", "路径不能为空")]
    [InlineData(@"data\audit.db", "路径必须包含盘符")]
    [InlineData(@"\data\audit.db", "路径必须包含盘符")]
    [InlineData(@"1:\invalid.db", "路径必须包含盘符")]
    public void IsValidFilePath_InvalidPaths_ReturnsFalseWithError(string path, string expectedError)
    {
        Assert.False(HostConfig.IsValidFilePath(path, out var error));
        Assert.Contains(expectedError, error);
    }

    [Fact]
    public void DefaultDbPath_HasDriveLetter()
    {
        Assert.True(HostConfig.IsValidFilePath(HostConfig.DefaultDbPath, out _));
    }

    [Fact]
    public void DefaultSumatraTempDir_HasDriveLetter()
    {
        var dir = HostConfig.DefaultSumatraTempDir;
        Assert.True(HostConfig.IsValidFilePath(dir, out _));
    }

    [Fact]
    public void ResolveDbPath_Null_ReturnsDefault()
    {
        Assert.Equal(HostConfig.DefaultDbPath, HostConfig.ResolveDbPath(null));
    }

    [Fact]
    public void ResolveDbPath_Empty_ReturnsDefault()
    {
        Assert.Equal(HostConfig.DefaultDbPath, HostConfig.ResolveDbPath(""));
    }

    [Fact]
    public void ResolveDbPath_Custom_ReturnsCustom()
    {
        Assert.Equal(@"D:\custom\db.sqlite", HostConfig.ResolveDbPath(@"D:\custom\db.sqlite"));
    }
}
