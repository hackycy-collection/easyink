using System.Reflection;

namespace EasyInk.Printer.Utils;

public static class VersionHelper
{
    public static string GetDisplayVersion(Assembly assembly)
    {
        var informationalVersion = assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion;
        if (!string.IsNullOrWhiteSpace(informationalVersion))
        {
            return informationalVersion;
        }

        return assembly.GetName().Version?.ToString() ?? "1.0.0";
    }
}