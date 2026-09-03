param(
  [Parameter(Mandatory = $true)][int]$ProcessId,
  [ValidateSet("list", "ok", "cancel", "close")][string]$Action = "list",
  [long]$Hwnd = 0
)
# Enumerates visible modal dialogs (#32770) of an After Effects process and can answer them.
# ok -> Enter key, cancel -> Escape key, close -> WM_CLOSE. Output: JSON.
$ErrorActionPreference = "Stop"
Add-Type @"
using System; using System.Text; using System.Runtime.InteropServices; using System.Collections.Generic;
public class AeDlg {
  [DllImport("user32.dll")] static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
  [DllImport("user32.dll")] static extern bool EnumChildWindows(IntPtr hWndParent, EnumWindowsProc lpEnumFunc, IntPtr lParam);
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] static extern int GetClassName(IntPtr hWnd, StringBuilder text, int count);
  [DllImport("user32.dll", CharSet=CharSet.Auto)] static extern IntPtr SendMessage(IntPtr hWnd, uint Msg, IntPtr wParam, StringBuilder lParam);
  [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool IsWindow(IntPtr hWnd);
  delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  public class Dialog { public long hwnd; public List<string> texts = new List<string>(); }
  public static List<Dialog> List(uint targetPid) {
    var list = new List<Dialog>();
    EnumWindows((h, l) => { uint pid; GetWindowThreadProcessId(h, out pid); var cn = new StringBuilder(256); GetClassName(h, cn, 256);
      if (pid == targetPid && IsWindowVisible(h) && cn.ToString() == "#32770") {
        var d = new Dialog(); d.hwnd = h.ToInt64();
        EnumChildWindows(h, (c, l2) => { var sb = new StringBuilder(4096); SendMessage(c, 0x000D, (IntPtr)4096, sb); var s = sb.ToString().Trim(); if (s.Length > 0 && !s.StartsWith("OS_")) d.texts.Add(s.Replace("\r"," ").Replace("\n"," ")); return true; }, IntPtr.Zero);
        list.Add(d);
      } return true; }, IntPtr.Zero);
    return list;
  }
}
"@
$dialogs = [AeDlg]::List([uint32]$ProcessId)
$out = @()
foreach ($d in $dialogs) {
  $acted = $null
  if ($Action -ne "list" -and ($Hwnd -eq 0 -or $Hwnd -eq $d.hwnd)) {
    $h = [IntPtr]$d.hwnd
    # After Effects dialogs use custom (DroverLord) buttons: WM_COMMAND IDOK is ignored, but
    # the dialog handles Enter/Escape as default/cancel. Post WM_KEYDOWN/WM_KEYUP.
    if ($Action -eq "ok") { [AeDlg]::PostMessage($h, 0x0100, [IntPtr]0x0D, [IntPtr]::Zero) | Out-Null; [AeDlg]::PostMessage($h, 0x0101, [IntPtr]0x0D, [IntPtr]::Zero) | Out-Null; $acted = "ok" }
    elseif ($Action -eq "cancel") { [AeDlg]::PostMessage($h, 0x0100, [IntPtr]0x1B, [IntPtr]::Zero) | Out-Null; [AeDlg]::PostMessage($h, 0x0101, [IntPtr]0x1B, [IntPtr]::Zero) | Out-Null; $acted = "cancel" }
    else { [AeDlg]::PostMessage($h, 0x0010, [IntPtr]::Zero, [IntPtr]::Zero) | Out-Null; $acted = "close" }
  }
  $out += [pscustomobject]@{ hwnd = $d.hwnd; text = ($d.texts -join " | "); acted = $acted }
}
if ($Action -ne "list") { Start-Sleep -Milliseconds 400; $remaining = @([AeDlg]::List([uint32]$ProcessId)).Count } else { $remaining = $out.Count }
[pscustomobject]@{ dialogs = $out; remaining = $remaining } | ConvertTo-Json -Compress -Depth 4
