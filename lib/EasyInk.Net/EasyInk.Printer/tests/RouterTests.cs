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
}
