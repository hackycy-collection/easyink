using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Text;

namespace EasyInk.Printer.Utils;

/// <summary>
/// 网络与设备信息工具
/// </summary>
public static class NetworkHelper
{
    /// <summary>
    /// 获取所有活跃物理网卡的MAC地址
    /// </summary>
    public static List<string> GetActivePhysicalMacs()
    {
        var result = new List<string>();
        try
        {
            foreach (var nic in NetworkInterface.GetAllNetworkInterfaces())
            {
                if (nic.OperationalStatus != OperationalStatus.Up) continue;
                if (nic.NetworkInterfaceType == NetworkInterfaceType.Loopback) continue;
                if (nic.NetworkInterfaceType == NetworkInterfaceType.Tunnel) continue;
                // 过滤常见虚拟网卡类型
                if (nic.Description.IndexOf("virtual", StringComparison.OrdinalIgnoreCase) >= 0) continue;
                if (nic.Description.IndexOf("vmware", StringComparison.OrdinalIgnoreCase) >= 0) continue;
                if (nic.Description.IndexOf("vpn", StringComparison.OrdinalIgnoreCase) >= 0) continue;
                if (nic.Description.IndexOf("pseudo", StringComparison.OrdinalIgnoreCase) >= 0) continue;

                var mac = nic.GetPhysicalAddress().ToString();
                if (!string.IsNullOrEmpty(mac) && mac != "000000000000")
                    result.Add(FormatMac(mac));
            }
        }
        catch (Exception ex) { SimpleLogger.Debug("获取MAC地址异常", ex); }
        return result;
    }

    /// <summary>
    /// 获取所有局域网IPv4地址
    /// </summary>
    public static List<string> GetLanIpv4Addresses()
    {
        var result = new List<string>();
        try
        {
            foreach (var nic in NetworkInterface.GetAllNetworkInterfaces())
            {
                if (nic.OperationalStatus != OperationalStatus.Up) continue;
                if (nic.NetworkInterfaceType == NetworkInterfaceType.Loopback) continue;

                foreach (var addr in nic.GetIPProperties().UnicastAddresses)
                {
                    if (addr.Address.AddressFamily != AddressFamily.InterNetwork) continue;
                    var ip = addr.Address.ToString();
                    if (ip == "127.0.0.1") continue;
                    result.Add(ip);
                }
            }
        }
        catch (Exception ex) { SimpleLogger.Debug("获取LAN IPv4地址异常", ex); }
        return result;
    }

    /// <summary>
    /// 基于机器名哈希生成短设备编号（8位十六进制，带横杠分隔）
    /// </summary>
    public static string GenerateDeviceNumber()
    {
        var machineName = Environment.MachineName ?? "unknown";
        using (var sha = SHA256.Create())
        {
            var hash = sha.ComputeHash(Encoding.UTF8.GetBytes(machineName));
            var hex = BitConverter.ToString(hash).Replace("-", "").Substring(0, 8).ToUpperInvariant();
            return $"{hex.Substring(0, 4)}-{hex.Substring(4, 4)}";
        }
    }

    private static string FormatMac(string raw)
    {
        if (raw.Length != 12) return raw;
        return string.Join(":", Enumerable.Range(0, 6).Select(i => raw.Substring(i * 2, 2)));
    }
}
