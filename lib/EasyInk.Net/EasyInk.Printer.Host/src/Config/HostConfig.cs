using System;
using System.IO;
using System.Reflection;
using Microsoft.Win32;
using Newtonsoft.Json;

namespace EasyInk.Printer.Host.Config;

public class HostConfig
{
    public int HttpPort { get; set; } = 18080;
    public bool AutoStart { get; set; } = false;
    public bool MinimizeToTray { get; set; } = true;
    public string DbPath { get; set; }
    public bool TrustAllOrigins { get; set; } = true;

    private static readonly string ConfigDir = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
        "EasyInk.Printer.Host");

    private static readonly string ConfigPath = Path.Combine(ConfigDir, "config.json");

    private const string AutoStartRegKey = @"Software\Microsoft\Windows\CurrentVersion\Run";
    private const string AutoStartRegName = "EasyInkPrinterHost";

    public static bool GetAutoStartRegistry()
    {
        try
        {
            using var key = Registry.CurrentUser.OpenSubKey(AutoStartRegKey, false);
            return key?.GetValue(AutoStartRegName) != null;
        }
        catch
        {
            return false;
        }
    }

    public static void SetAutoStartRegistry(bool enable)
    {
        try
        {
            using var key = Registry.CurrentUser.OpenSubKey(AutoStartRegKey, true);
            if (key == null) return;

            if (enable)
            {
                var exePath = Assembly.GetExecutingAssembly().Location;
                // .NET Framework WinForms exe is a .exe, not .dll
                if (exePath.EndsWith(".dll", StringComparison.OrdinalIgnoreCase))
                    exePath = exePath.Substring(0, exePath.Length - 4) + ".exe";
                key.SetValue(AutoStartRegName, $"\"{exePath}\"");
            }
            else
            {
                key.DeleteValue(AutoStartRegName, false);
            }
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[HostConfig] 设置开机自启动失败: {ex.Message}");
        }
    }

    public static HostConfig Load()
    {
        try
        {
            if (File.Exists(ConfigPath))
            {
                var json = File.ReadAllText(ConfigPath);
                return JsonConvert.DeserializeObject<HostConfig>(json) ?? new HostConfig();
            }
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[HostConfig] 配置读取失败，使用默认值: {ex.Message}");
        }
        return new HostConfig();
    }

    public void Save()
    {
        try
        {
            if (!Directory.Exists(ConfigDir))
                Directory.CreateDirectory(ConfigDir);

            var json = JsonConvert.SerializeObject(this, Formatting.Indented);
            File.WriteAllText(ConfigPath, json);
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[HostConfig] 配置写入失败: {ex.Message}");
        }
    }
}
