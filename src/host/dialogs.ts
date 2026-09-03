/**
 * After Effects modal dialogs block the scripting engine (and therefore the bridge).
 * This helper lists them and can answer known-safe ones from the outside via a small
 * PowerShell/Win32 script. Windows only.
 */
import { execFile } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const SCRIPT = resolve(here, "../../scripts/ae-dialogs.ps1");

export interface AeDialog {
  hwnd: number;
  text: string;
  acted: string | null;
}

export interface DialogResult {
  dialogs: AeDialog[];
  remaining: number;
  pid: number | null;
}

function ps(args: string[]): Promise<string> {
  return new Promise((resolveP, reject) => {
    execFile("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", SCRIPT, ...args], { windowsHide: true, timeout: 20_000 }, (e, stdout, stderr) => {
      if (e) reject(new Error(String(stderr || e.message)));
      else resolveP(String(stdout));
    });
  });
}

export async function findAfterFxPid(): Promise<number | null> {
  return new Promise((resolveP) => {
    execFile("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", "Get-Process AfterFX -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -ne '' } | Select-Object -First 1 -ExpandProperty Id"], { windowsHide: true, timeout: 15_000 }, (e, stdout) => {
      const n = parseInt(String(stdout).trim(), 10);
      resolveP(!e && Number.isFinite(n) ? n : null);
    });
  });
}

export async function aeDialogs(action: "list" | "ok" | "cancel" | "close" = "list", hwnd?: number, pid?: number | null): Promise<DialogResult> {
  if (process.platform !== "win32") return { dialogs: [], remaining: 0, pid: null };
  const p = pid ?? (await findAfterFxPid());
  if (!p) return { dialogs: [], remaining: 0, pid: null };
  const args = ["-ProcessId", String(p), "-Action", action];
  if (hwnd) args.push("-Hwnd", String(hwnd));
  const out = await ps(args);
  try {
    const parsed = JSON.parse(out.trim()) as { dialogs: AeDialog[] | AeDialog | null; remaining: number };
    const dialogs = Array.isArray(parsed.dialogs) ? parsed.dialogs : parsed.dialogs ? [parsed.dialogs] : [];
    return { dialogs, remaining: parsed.remaining, pid: p };
  } catch {
    return { dialogs: [], remaining: 0, pid: p };
  }
}

/** Dialog texts this server may answer automatically (informational warnings only). */
export const AUTO_OK_PATTERNS: RegExp[] = [
  /fonts were not synced from Adobe/i, // MOGRT export: non-Adobe fonts warning
  /will be marked as requiring fonts/i,
];

/**
 * While `work` runs, poll for AE dialogs; press OK on known-safe informational ones.
 * Returns the work result plus the dialogs seen. Never answers unknown dialogs.
 */
export async function withAutoDialogs<T>(work: Promise<T>, options: { pollMs?: number; patterns?: RegExp[] } = {}): Promise<{ result: T; dialogs: AeDialog[] }> {
  const seen: AeDialog[] = [];
  let done = false;
  const patterns = options.patterns ?? AUTO_OK_PATTERNS;
  const pid = await findAfterFxPid();
  const poller = (async () => {
    while (!done) {
      await new Promise((r) => setTimeout(r, options.pollMs ?? 1000));
      if (done) break;
      try {
        const r = await aeDialogs("list", undefined, pid);
        for (const d of r.dialogs) {
          if (seen.some((s) => s.hwnd === d.hwnd)) continue;
          seen.push(d);
          if (patterns.some((re) => re.test(d.text))) {
            await aeDialogs("ok", d.hwnd, pid);
            d.acted = "ok (auto)";
          }
        }
      } catch {
        // ignore polling errors
      }
    }
  })();
  try {
    const result = await work;
    return { result, dialogs: seen };
  } finally {
    done = true;
    await poller.catch(() => undefined);
  }
}
