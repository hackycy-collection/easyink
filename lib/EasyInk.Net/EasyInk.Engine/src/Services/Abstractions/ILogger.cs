using System;

namespace EasyInk.Engine.Services.Abstractions;

public interface ILogger
{
    void Log(LogLevel level, string message);
}

internal sealed class NullLogger : ILogger
{
    public void Log(LogLevel level, string message) { }
}
