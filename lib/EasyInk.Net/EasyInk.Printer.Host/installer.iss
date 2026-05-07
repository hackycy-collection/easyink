[Setup]
AppId={{E7A3B2C1-D4F5-4E6A-9B8C-1A2B3C4D5E6F}
AppName=EasyInk Printer Host
AppVersion=1.0.0
AppPublisher=EasyInk
DefaultDirName={autopf}\EasyInk Printer Host
DefaultGroupName=EasyInk Printer Host
OutputDir=output
OutputBaseFilename=EasyInkPrinterHost-Setup
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
ArchitecturesInstallIn64BitMode=x64compatible
UninstallDisplayIcon={app}\EasyInk.Printer.Host.exe
SetupIconFile=src\app.ico
; 需要管理员权限写入 Program Files
PrivilegesRequired=admin

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create desktop shortcut"; GroupDescription: "Additional options:"
Name: "autostart"; Description: "Start on Windows startup"; GroupDescription: "Additional options:"

[Files]
; 发布产物 - 先手动执行 dotnet publish -c Release 再打包
Source: "src\bin\Release\net48\publish\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs

[Icons]
Name: "{group}\EasyInk Printer Host"; Filename: "{app}\EasyInk.Printer.Host.exe"
Name: "{group}\Uninstall EasyInk Printer Host"; Filename: "{uninstallexe}"
Name: "{autodesktop}\EasyInk Printer Host"; Filename: "{app}\EasyInk.Printer.Host.exe"; Tasks: desktopicon

[Registry]
; 开机自启动
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "EasyInkPrinterHost"; ValueData: """{app}\EasyInk.Printer.Host.exe"""; Flags: uninsdeletevalue; Tasks: autostart

[Run]
Filename: "{app}\EasyInk.Printer.Host.exe"; Description: "Launch EasyInk Printer Host"; Flags: nowait postinstall skipifsilent
