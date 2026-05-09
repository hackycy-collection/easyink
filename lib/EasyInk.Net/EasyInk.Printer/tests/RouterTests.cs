using EasyInk.Printer.Server;
using Xunit;

namespace EasyInk.Printer.Tests;

public class RouterTests
{
    [Fact]
    public void ValidateApiKey_NoConfiguredKey_ReturnsTrue()
    {
        Assert.True(Router.ValidateApiKeyCore(null, null));
        Assert.True(Router.ValidateApiKeyCore("", null));
        Assert.True(Router.ValidateApiKeyCore(null, "some-key"));
    }

    [Fact]
    public void ValidateApiKey_MatchingKey_ReturnsTrue()
    {
        Assert.True(Router.ValidateApiKeyCore("my-secret-key", "my-secret-key"));
    }

    [Fact]
    public void ValidateApiKey_WrongKey_ReturnsFalse()
    {
        Assert.False(Router.ValidateApiKeyCore("my-secret-key", "wrong-key"));
    }

    [Fact]
    public void ValidateApiKey_MissingProvidedKey_ReturnsFalse()
    {
        Assert.False(Router.ValidateApiKeyCore("my-secret-key", null));
        Assert.False(Router.ValidateApiKeyCore("my-secret-key", ""));
    }

    [Fact]
    public void ValidateApiKey_CaseSensitive()
    {
        Assert.False(Router.ValidateApiKeyCore("MyKey", "mykey"));
        Assert.False(Router.ValidateApiKeyCore("MyKey", "MYKEY"));
    }

    [Theory]
    [InlineData("http://localhost:3000")]
    [InlineData("http://127.0.0.1:3000")]
    [InlineData("http://[::1]:3000")]
    [InlineData("http://0.0.0.0:3000")]
    public void IsLocalOrigin_LocalAddresses_ReturnsTrue(string origin)
    {
        Assert.True(Router.IsLocalOrigin(origin));
    }

    [Theory]
    [InlineData("http://example.com")]
    [InlineData("http://10.0.0.1")]
    [InlineData("http://192.168.1.1")]
    [InlineData("http://172.16.0.1")]
    [InlineData("http://evil.com")]
    public void IsLocalOrigin_RemoteAddresses_ReturnsFalse(string origin)
    {
        Assert.False(Router.IsLocalOrigin(origin));
    }

    [Fact]
    public void IsLocalOrigin_InvalidUri_ReturnsFalse()
    {
        Assert.False(Router.IsLocalOrigin("not a url"));
        Assert.False(Router.IsLocalOrigin(""));
    }
}
