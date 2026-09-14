import { execFileSync } from "node:child_process";
import { win32 } from "node:path";

export type WindowsRunObservation =
  | { state: "present"; command: string }
  | { state: "absent" }
  | { state: "unverifiable"; reason: "unsupported-platform" | "invalid-name" | "tool-failure" |
      "timeout" | "invalid-output" | "read-failure" | "unsupported-value-type" };

// Fixed code, never interpolated with a value name or executable path. The name
// travels only as process environment data. OpenSubKey(false) is read-only and
// DoNotExpandEnvironmentNames prevents REG_EXPAND_SZ from becoming executable command input.
const observationScript = `
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$key = $null
try {
  $key = [Microsoft.Win32.Registry]::CurrentUser.OpenSubKey('Software\\Microsoft\\Windows\\CurrentVersion\\Run', $false)
  $name = $env:CHAMPCITY_RUN_OBSERVATION_NAME
  if ($null -eq $key -or $key.GetValueNames() -inotcontains $name) {
    @{ state = 'absent' } | ConvertTo-Json -Compress
  } elseif ($key.GetValueKind($name) -ne [Microsoft.Win32.RegistryValueKind]::String) {
    @{ state = 'unverifiable'; reason = 'unsupported-value-type' } | ConvertTo-Json -Compress
  } else {
    $value = $key.GetValue($name, $null, [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames)
    if ($value -isnot [string]) { throw 'Value changed during observation' }
    @{ state = 'present'; command = $value } | ConvertTo-Json -Compress
  }
} catch {
  @{ state = 'unverifiable'; reason = 'read-failure' } | ConvertTo-Json -Compress
} finally {
  if ($null -ne $key) { $key.Dispose() }
}
`;

export function observeCurrentUserWindowsRunValue(name: string): WindowsRunObservation {
  if (process.platform !== "win32") return { state: "unverifiable", reason: "unsupported-platform" };
  if (!name || name.length > 256 || /[\x00-\x1f]/.test(name)) {
    return { state: "unverifiable", reason: "invalid-name" };
  }
  let output: string;
  try {
    const systemRoot = process.env.SystemRoot;
    if (!systemRoot || !win32.isAbsolute(systemRoot)) {
      return { state: "unverifiable", reason: "tool-failure" };
    }
    output = execFileSync(win32.join(systemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe"), [
      "-NoLogo", "-NoProfile", "-NonInteractive", "-EncodedCommand",
      Buffer.from(observationScript, "utf16le").toString("base64"),
    ], {
      encoding: "utf8", windowsHide: true, timeout: 5_000, maxBuffer: 128 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, CHAMPCITY_RUN_OBSERVATION_NAME: name },
    });
  } catch (error) {
    return { state: "unverifiable", reason:
      (error as NodeJS.ErrnoException)?.code === "ETIMEDOUT" ? "timeout" : "tool-failure" };
  }
  try {
    const value = JSON.parse(output);
    if (value?.state === "absent") return { state: "absent" };
    if (value?.state === "present" && typeof value.command === "string" && value.command.length <= 32_767) {
      return { state: "present", command: value.command };
    }
    if (value?.state === "unverifiable" &&
      (value.reason === "read-failure" || value.reason === "unsupported-value-type")) {
      return { state: "unverifiable", reason: value.reason };
    }
  } catch { /* An invalid helper response is never absence. */ }
  return { state: "unverifiable", reason: "invalid-output" };
}
