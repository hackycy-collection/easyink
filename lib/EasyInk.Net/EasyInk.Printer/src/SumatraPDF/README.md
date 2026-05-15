# SumatraPDF bundle

Place the tested portable `SumatraPDF.exe` here before building packages.

The build copies this file to the publish output as:

```text
SumatraPDF\SumatraPDF.exe
```

From the `EasyInk.Printer` project folder, use:

```powershell
powershell -ExecutionPolicy Bypass -File tools\download-sumatra.ps1
```

to download the pinned version.
