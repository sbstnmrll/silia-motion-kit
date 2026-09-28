/**
 * Per-OS locations of the things ae-mcp touches outside its own bridge dir: the
 * CEP extensions folder, the CEP logs, and the After Effects prefs root. Keep every
 * Windows/macOS path fork here so tools and diagnostics stay platform-agnostic.
 */
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

export const isMac = process.platform === "darwin";
export const isWindows = process.platform === "win32";

/** Per-user CEP extensions folder (where AeMcpCEP is installed). */
export function cepExtensionsDir(): string {
  if (isMac) return join(homedir(), "Library", "Application Support", "Adobe", "CEP", "extensions");
  return join(process.env.APPDATA ?? "", "Adobe", "CEP", "extensions");
}

export function cepBundleDir(): string {
  return join(cepExtensionsDir(), "AeMcpCEP");
}

/** Folders where CEP writes CEP<n>-AEFT.log. */
export function cepLogDirs(): string[] {
  if (isMac) return [join(homedir(), "Library", "Logs", "CSXS")];
  return [process.env.TEMP ?? tmpdir()];
}

/** Root that holds one prefs folder per AE version ("26.5", ...). */
export function aePrefsRoot(): string {
  if (isMac) return join(homedir(), "Library", "Preferences", "Adobe", "After Effects");
  return join(process.env.APPDATA ?? "", "Adobe", "After Effects");
}

/** Where the scripts/ helpers live for this OS, and how to run them. */
export function helperScript(name: "install-cep" | "uninstall-cep" | "enable-scripting-pref"): { file: string; runner: string; runnerArgs: string[] } {
  if (isWindows) return { file: `${name}.ps1`, runner: "powershell.exe", runnerArgs: ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File"] };
  return { file: `${name}.sh`, runner: "/bin/bash", runnerArgs: [] };
}
