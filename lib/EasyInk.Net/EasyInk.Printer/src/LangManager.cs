using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Reflection;
using System.Text;
using System.Windows.Forms;
using Newtonsoft.Json;

namespace EasyInk.Printer;

public static class LangManager
{
    private static readonly Dictionary<string, string> _zhCN = new();
    private static Dictionary<string, string> _current;

    static LangManager()
    {
        _zhCN = LoadEmbedded("EasyInk.Printer.i18n.zh-CN.json");
        _current = _zhCN;
    }

    public static string CurrentCulture { get; private set; } = "zh-CN";

    public static void Initialize(string culture = null)
    {
        if (string.IsNullOrEmpty(culture))
        {
            culture = CultureInfo.CurrentUICulture.Name;
            if (culture != "zh-CN" && culture != "en-US")
                culture = "zh-CN";
        }

        if (culture == "en-US")
            _current = LoadEmbedded("EasyInk.Printer.i18n.en-US.json");
        else
            _current = _zhCN;

        CurrentCulture = culture;
    }

    public static string Get(string key)
    {
        if (_current.TryGetValue(key, out var value))
            return value;
        if (_zhCN.TryGetValue(key, out value))
            return value;
        return key;
    }

    public static string Get(string key, params object[] args)
    {
        var template = Get(key);
        return args.Length > 0 ? string.Format(template, args) : template;
    }

    public static void RefreshForm(Form form)
    {
        if (form == null) return;
        ApplyToControl(form);
    }

    private static void ApplyToControl(Control control)
    {
        var tag = control.Tag as string;
        if (!string.IsNullOrEmpty(tag) && tag.StartsWith("i18n:"))
        {
            var key = tag.Substring(5);
            control.Text = Get(key);
        }

        foreach (Control child in control.Controls)
            ApplyToControl(child);

        if (control is ToolStrip toolStrip)
        {
            foreach (ToolStripItem item in toolStrip.Items)
                ApplyToToolStripItem(item);
        }
    }

    private static void ApplyToToolStripItem(ToolStripItem item)
    {
        var tag = item.Tag as string;
        if (!string.IsNullOrEmpty(tag) && tag.StartsWith("i18n:"))
        {
            var key = tag.Substring(5);
            item.Text = Get(key);
        }

        if (item is ToolStripDropDownItem dropDown)
        {
            foreach (ToolStripItem child in dropDown.DropDownItems)
                ApplyToToolStripItem(child);
        }
    }

    public static void SetI18nTag(Control control, string key)
    {
        control.Tag = $"i18n:{key}";
        control.Text = Get(key);
    }

    private static Dictionary<string, string> LoadEmbedded(string resourceName)
    {
        var asm = Assembly.GetExecutingAssembly();
        using var stream = asm.GetManifestResourceStream(resourceName);
        if (stream == null)
        {
            SimpleLogger.Error($"Embedded resource not found: {resourceName}");
            return new Dictionary<string, string>();
        }

        using var reader = new StreamReader(stream, Encoding.UTF8);
        var json = reader.ReadToEnd();
        try
        {
            return JsonConvert.DeserializeObject<Dictionary<string, string>>(json)
                   ?? new Dictionary<string, string>();
        }
        catch (Exception ex)
        {
            SimpleLogger.Error($"Failed to parse i18n resource: {resourceName}", ex);
            return new Dictionary<string, string>();
        }
    }
}
