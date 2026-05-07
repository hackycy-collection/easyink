using System;
using System.Diagnostics;
using System.IO;
using Microsoft.Win32;
using Newtonsoft.Json;

namespace EasyInk.Printer.Host.Config;

public class HostConfig
{
    public int HttpPort { get; set; } = 18080;
    public bool AutoStart { get; set; } = false;
    public bool MinimizeToTray { get; set; } = true;
    public string DbPath { get; set; }
    public bool TrustAllOrigins { get; set; } = false;
    public string ApiKey { get; set; }

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
                var exePath = Process.GetCurrentProcess().MainModule.FileName;
                key.SetValue(AutoStartRegName, $"\"{exePath}\"");
            }
            else
            {
                key.DeleteValue(AutoStartRegName, false);
            }
        }
        catch (Exception ex)
        {
            EasyInk.Printer.SimpleLogger.Error("设置开机自启动失败", ex);
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
            EasyInk.Printer.SimpleLogger.Error("配置读取失败，使用默认值", ex);
        }
        return new HostConfig();
    }

    public void Save()
    {
        if (!Directory.Exists(ConfigDir))
            Directory.CreateDirectory(ConfigDir);

        var json = JsonConvert.SerializeObject(this, Formatting.Indented);
        File.WriteAllText(ConfigPath, json);
    }
}
