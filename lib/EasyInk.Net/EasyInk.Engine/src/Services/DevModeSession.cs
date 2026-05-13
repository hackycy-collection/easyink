using System;
using System.Runtime.InteropServices;
using EasyInk.Engine.Models;

namespace EasyInk.Engine.Services;

/// <summary>
/// Manages temporary per-user printer DEVMODE for a single print job.
/// Negotiates desired paper dimensions with the driver via DocumentProperties,
/// applies via SetPrinter Level 9, and restores the original DEVMODE on dispose.
/// </summary>
internal sealed class DevModeSession : IDisposable
{
    private readonly IntPtr _hPrinter;
    private readonly IntPtr _originalDevModeHandle;
    private readonly IntPtr _originalDevModePtr;
    private bool _disposed;

    private DevModeSession(IntPtr hPrinter, IntPtr originalDevModeHandle, IntPtr originalDevModePtr)
    {
        _hPrinter = hPrinter;
        _originalDevModeHandle = originalDevModeHandle;
        _originalDevModePtr = originalDevModePtr;
    }

    /// <summary>
    /// Attempts to negotiate a DEVMODE with the given paper dimensions and apply it
    /// as the per-user default for the printer. Returns null if any step fails.
    /// Caller must dispose the returned session to restore the original DEVMODE.
    /// </summary>
    public static DevModeSession TryCreate(string printerName, double widthMm, double heightMm)
    {
        IntPtr hPrinter = IntPtr.Zero;
        IntPtr originalHandle = IntPtr.Zero;
        IntPtr originalPtr = IntPtr.Zero;
        IntPtr newHandle = IntPtr.Zero;
        IntPtr newPtr = IntPtr.Zero;
        var success = false;

        try
        {
            // 1. Open printer
            var defaults = new NativePrintApi.PRINTER_DEFAULTS
            {
                DesiredAccess = NativePrintApi.PRINTER_ACCESS_USE
            };
            if (!NativePrintApi.OpenPrinter(printerName, out hPrinter, ref defaults))
                return null;

            // 2. Get required DEVMODE buffer size
            int devModeSize = NativePrintApi.DocumentProperties(
                IntPtr.Zero, hPrinter, printerName, IntPtr.Zero, IntPtr.Zero, 0);
            if (devModeSize < 0)
                return null;

            // 3. Allocate and read current DEVMODE (backup for restore)
            originalHandle = AllocDevMode(devModeSize);
            if (originalHandle == IntPtr.Zero)
                return null;

            originalPtr = NativePrintApi.GlobalLock(originalHandle);
            if (originalPtr == IntPtr.Zero)
                return null;

            int ret = NativePrintApi.DocumentProperties(
                IntPtr.Zero, hPrinter, printerName, originalPtr, IntPtr.Zero, NativePrintApi.DM_OUT_BUFFER);
            if (ret != NativePrintApi.IDOK)
                return null;

            // 4. Alloc new DEVMODE and copy original into it
            newHandle = AllocDevMode(devModeSize);
            if (newHandle == IntPtr.Zero)
                return null;

            newPtr = NativePrintApi.GlobalLock(newHandle);
            if (newPtr == IntPtr.Zero)
                return null;

            CopyMemory(newPtr, originalPtr, (UIntPtr)(uint)devModeSize);

            // 5. Set desired paper dimensions
            short widthTenthsMm = (short)Math.Round(widthMm * 10.0);
            short lengthTenthsMm = (short)Math.Round(heightMm * 10.0);

            Marshal.WriteInt16(newPtr, NativePrintApi.DEV_MODE_PAPER_SIZE_OFFSET, NativePrintApi.DMPAPER_USER);
            Marshal.WriteInt16(newPtr, NativePrintApi.DEV_MODE_PAPER_WIDTH_OFFSET, widthTenthsMm);
            Marshal.WriteInt16(newPtr, NativePrintApi.DEV_MODE_PAPER_LENGTH_OFFSET, lengthTenthsMm);

            int fields = Marshal.ReadInt32(newPtr, NativePrintApi.DEV_MODE_FIELDS_OFFSET);
            fields |= NativePrintApi.DM_PAPERSIZE | NativePrintApi.DM_PAPERWIDTH | NativePrintApi.DM_PAPERLENGTH;
            Marshal.WriteInt32(newPtr, NativePrintApi.DEV_MODE_FIELDS_OFFSET, fields);

            // 6. Validate with driver (no UI)
            ret = NativePrintApi.DocumentProperties(
                IntPtr.Zero, hPrinter, printerName, newPtr, newPtr,
                NativePrintApi.DM_IN_BUFFER | NativePrintApi.DM_OUT_BUFFER);

            if (ret != NativePrintApi.IDOK)
                return null;

            // Read back driver-adjusted dimensions for logging
            short actualWidth = Marshal.ReadInt16(newPtr, NativePrintApi.DEV_MODE_PAPER_WIDTH_OFFSET);
            short actualLength = Marshal.ReadInt16(newPtr, NativePrintApi.DEV_MODE_PAPER_LENGTH_OFFSET);

            // 7. Apply validated DEVMODE as per-user default (SetPrinter Level 9)
            // PRINTER_INFO_9 is just a pDevMode pointer
            IntPtr pInfo9 = Marshal.AllocHGlobal(IntPtr.Size);
            try
            {
                Marshal.WriteIntPtr(pInfo9, newPtr);
                if (!NativePrintApi.SetPrinter(hPrinter, 9, pInfo9, 0))
                    return null;
            }
            finally
            {
                Marshal.FreeHGlobal(pInfo9);
            }

            EngineApi.RaiseLog(LogLevel.Info,
                $"DEVMODE negotiation ok: {printerName}, " +
                $"requested={widthMm:0.##}x{heightMm:0.##}mm, " +
                $"actual={actualWidth / 10.0:0.##}x{actualLength / 10.0:0.##}mm");

            // Release temp new DEVMODE (keep original for restore)
            NativePrintApi.GlobalUnlock(newHandle);
            NativePrintApi.GlobalFree(newHandle);
            newHandle = IntPtr.Zero;
            newPtr = IntPtr.Zero;

            success = true;
            return new DevModeSession(hPrinter, originalHandle, originalPtr);
        }
        catch
        {
            return null;
        }
        finally
        {
            if (!success)
            {
                if (newPtr != IntPtr.Zero) NativePrintApi.GlobalUnlock(newHandle);
                if (newHandle != IntPtr.Zero) NativePrintApi.GlobalFree(newHandle);
                if (originalPtr != IntPtr.Zero) NativePrintApi.GlobalUnlock(originalHandle);
                if (originalHandle != IntPtr.Zero) NativePrintApi.GlobalFree(originalHandle);
                if (hPrinter != IntPtr.Zero) NativePrintApi.ClosePrinter(hPrinter);
            }
        }
    }

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;

        try
        {
            IntPtr pInfo9 = Marshal.AllocHGlobal(IntPtr.Size);
            try
            {
                Marshal.WriteIntPtr(pInfo9, _originalDevModePtr);
                NativePrintApi.SetPrinter(_hPrinter, 9, pInfo9, 0);
            }
            finally
            {
                Marshal.FreeHGlobal(pInfo9);
            }
        }
        catch
        {
            // Best-effort restore; next print job will re-negotiate
        }
        finally
        {
            if (_originalDevModePtr != IntPtr.Zero) NativePrintApi.GlobalUnlock(_originalDevModeHandle);
            if (_originalDevModeHandle != IntPtr.Zero) NativePrintApi.GlobalFree(_originalDevModeHandle);
            if (_hPrinter != IntPtr.Zero) NativePrintApi.ClosePrinter(_hPrinter);
        }
    }

    private static IntPtr AllocDevMode(int size)
    {
        return NativePrintApi.GlobalAlloc(NativePrintApi.GMEM_MOVEABLE, new UIntPtr((uint)size));
    }

    [DllImport("kernel32.dll", EntryPoint = "RtlMoveMemory", SetLastError = false)]
    private static extern void CopyMemory(IntPtr dest, IntPtr src, UIntPtr count);
}
