using System;
using System.IO;
using Newtonsoft.Json;

namespace EasyInk.Printer.Host.Config;

/// <summary>
/// 宿主程序配置
/// </summary>
public class HostConfig
{
    public int HttpPort { get; set; } = 18080;
    public bool AutoStart { get; set; } = false;
    public bool MinimizeToTray { get; set; } = true;
    public string LogLevel { get; set; } = "Info";
    public string DbPath { get; set; }

    private static readonly string ConfigDir = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
        "EasyInk.Printer.Host");

    private static readonly string ConfigPath = Path.Combine(ConfigDir, "config.json");

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
        catch
        {
            // 配置读取失败时使用默认值
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
