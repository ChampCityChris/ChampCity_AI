import path from "node:path";
import { spawn, execFile } from "node:child_process";
import { AgentHarnessError } from "../core/applicationErrors";

export interface RepositoryHostingCredentialStore {
  get(reference: string): Promise<string | null>;
  set(reference: string, token: string): Promise<void>;
  remove(reference: string): Promise<void>;
}
const unavailable = () => new AgentHarnessError("REPOSITORY_PROVIDER_NOT_READY", "Secure repository-provider credential storage is unavailable.");
function target(reference: string) {
  if (!/^repository-hosting:[a-z][a-z0-9_-]{0,63}:[a-f0-9]{64}$/.test(reference)) throw unavailable();
  return `ChampCityAI/${reference}`;
}

// Fixed OS API bridge. Request values travel over private stdin, never argv, project files or logs.
const bridge = String.raw`
$ErrorActionPreference = 'Stop'
try {
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Runtime.InteropServices.ComTypes;
public static class ChampCityCredentials {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public struct Credential {
    public uint Flags, Type;
    public string TargetName, Comment;
    public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
    public uint CredentialBlobSize;
    public IntPtr CredentialBlob;
    public uint Persist, AttributeCount;
    public IntPtr Attributes;
    public string TargetAlias, UserName;
  }
  [DllImport("advapi32.dll", EntryPoint="CredReadW", CharSet=CharSet.Unicode, SetLastError=true)]
  private static extern bool Read(string target, uint type, uint flags, out IntPtr credential);
  [DllImport("advapi32.dll", EntryPoint="CredWriteW", CharSet=CharSet.Unicode, SetLastError=true)]
  private static extern bool Write(ref Credential credential, uint flags);
  [DllImport("advapi32.dll", EntryPoint="CredDeleteW", CharSet=CharSet.Unicode, SetLastError=true)]
  private static extern bool Delete(string target, uint type, uint flags);
  [DllImport("advapi32.dll")] private static extern void CredFree(IntPtr credential);
  public static string Get(string target) {
    IntPtr pointer;
    if (!Read(target, 1, 0, out pointer)) {
      if (Marshal.GetLastWin32Error() == 1168) return null;
      throw new Exception("credential storage unavailable");
    }
    try {
      var item = (Credential)Marshal.PtrToStructure(pointer, typeof(Credential));
      if (item.Type != 1 || item.CredentialBlobSize > 2048 || !String.Equals(item.TargetName, target, StringComparison.OrdinalIgnoreCase)) throw new Exception("invalid credential");
      var bytes = new byte[item.CredentialBlobSize];
      try { Marshal.Copy(item.CredentialBlob, bytes, 0, bytes.Length); return Convert.ToBase64String(bytes); }
      finally { Array.Clear(bytes, 0, bytes.Length); }
    } finally { CredFree(pointer); }
  }
  public static void Set(string target, byte[] bytes) {
    if (bytes.Length == 0 || bytes.Length > 2048) throw new Exception("invalid credential");
    var pointer = Marshal.AllocHGlobal(bytes.Length);
    try {
      Marshal.Copy(bytes, 0, pointer, bytes.Length);
      var item = new Credential { Type=1, TargetName=target, CredentialBlobSize=(uint)bytes.Length, CredentialBlob=pointer, Persist=2, UserName="ChampCity repository hosting" };
      if (!Write(ref item, 0)) throw new Exception("credential storage unavailable");
    } finally { Array.Clear(bytes, 0, bytes.Length); Marshal.Copy(bytes, 0, pointer, bytes.Length); Marshal.FreeHGlobal(pointer); }
  }
  public static void Remove(string target) {
    if (!Delete(target, 1, 0) && Marshal.GetLastWin32Error() != 1168) throw new Exception("credential storage unavailable");
  }
}
'@
$request = [Console]::In.ReadToEnd() | ConvertFrom-Json
$value = $null
switch ($request.operation) {
  'get' { $value = [ChampCityCredentials]::Get($request.target) }
  'set' { [ChampCityCredentials]::Set($request.target, [Convert]::FromBase64String($request.value)) }
  'remove' { [ChampCityCredentials]::Remove($request.target) }
  default { throw 'invalid operation' }
}
[Console]::Out.Write((@{ok=$true; value=$value} | ConvertTo-Json -Compress))
} catch { [Console]::Error.Write('credential operation failed'); exit 1 }
`;

/** Windows Credential Manager scopes encrypted generic credentials to the current OS user. */
export class WindowsRepositoryHostingCredentialStore implements RepositoryHostingCredentialStore {
  private async invoke(operation: "get" | "set" | "remove", reference: string, token?: string): Promise<string | null> {
    const name = target(reference);
    if (process.platform !== "win32" || !process.env.SystemRoot) throw unavailable();
    const executable = path.join(process.env.SystemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
    return new Promise((resolve, reject) => {
      const child = (() => { try {
        return spawn(executable, ["-NoLogo", "-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-EncodedCommand", Buffer.from(bridge, "utf16le").toString("base64")], { shell: false, windowsHide: true, stdio: ["pipe", "pipe", "ignore"] });
      } catch { throw unavailable(); } })();
      let completed = false, size = 0; const chunks: Buffer[] = [];
      const finish = (value?: string | null, failed = false) => {
        if (completed) return; completed = true; clearTimeout(timer);
        if (failed) reject(unavailable()); else resolve(value ?? null);
      };
      const stop = () => {
        if (completed) return;
        if (typeof child.pid === "number") execFile("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true }, () => undefined);
        finish(undefined, true);
      };
      const timer = setTimeout(stop, 15000);
      child.on("error", () => finish(undefined, true));
      child.stdout.on("data", (chunk: Buffer) => { if (completed) return; size += chunk.length; if (size > 8192) stop(); else chunks.push(chunk); });
      child.on("close", code => {
        if (completed) return;
        if (code !== 0) { finish(undefined, true); return; }
        try {
          const result: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
          if (!result || typeof result !== "object" || Array.isArray(result)) throw unavailable();
          const body = result as { ok?: unknown; value?: unknown };
          if (body.ok !== true || Object.keys(body).some(field => !["ok", "value"].includes(field)) || body.value !== null && typeof body.value !== "string") throw unavailable();
          if (body.value === null) finish(null);
          else {
            if (typeof body.value !== "string" || !/^[a-z0-9+/]*={0,2}$/i.test(body.value) || body.value.length > 4096) throw unavailable();
            const value = Buffer.from(body.value, "base64").toString("utf8");
            if (!/^[\x21-\x7e]{1,2048}$/.test(value)) throw unavailable();
            finish(value);
          }
        } catch { finish(undefined, true); }
      });
      child.stdin.on("error", () => finish(undefined, true));
      child.stdin.end(JSON.stringify({ operation, target: name, ...(token ? { value: Buffer.from(token, "utf8").toString("base64") } : {}) }));
    });
  }
  get(reference: string) { return this.invoke("get", reference); }
  async set(reference: string, token: string) {
    if (typeof token !== "string" || !/^[\x21-\x7e]{1,2048}$/.test(token)) throw unavailable();
    await this.invoke("set", reference, token);
  }
  async remove(reference: string) { await this.invoke("remove", reference); }
}
