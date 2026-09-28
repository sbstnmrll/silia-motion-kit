/**
 * aerender.exe job runner + ffprobe/ffmpeg verification. Jobs run as detached
 * child processes so a render never blocks the After Effects UI or the bridge.
 * Job records are persisted to <dataDir>/jobs/<id>.json so status survives a
 * server restart (state of a running job from a dead server is reported as unknown).
 */
import { spawn, execFile, type ChildProcess } from "node:child_process";
import { createWriteStream, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
import { findAeInstalls, type AeInstall } from "../bridge/poller-transport.js";

export type JobState = "queued" | "running" | "done" | "failed" | "cancelled" | "unknown";

export interface RenderJobSpec {
  project: string;
  comp: string;
  output: string;
  rsTemplate?: string;
  omTemplate?: string;
  startFrame?: number;
  endFrame?: number;
  increment?: number;
  continueOnMissingFootage?: boolean;
  aeYear?: number;
  memUsage?: [number, number];
  sound?: boolean;
  /** Free-form metadata (e.g. variant id) echoed back in status. */
  meta?: Record<string, unknown>;
  /** When set, the job renders to `output` (a private temp path) and moves the result here on success. */
  finalOutput?: string;
}

export interface RenderJob {
  id: string;
  spec: RenderJobSpec;
  state: JobState;
  pid?: number;
  exe?: string;
  args?: string[];
  startedAt: string;
  endedAt?: string;
  exitCode?: number | null;
  progress: { percent: number | null; frame: number | null; totalFrames: number | null; fps: number | null; durationTc: string | null };
  lastLines: string[];
  errors: string[];
  outputExists?: boolean;
  outputBytes?: number;
  verify?: VerifyReport;
  serverPid: number;
  logPath?: string;
}

export interface VerifyExpectations {
  duration?: number;
  durationTolerance?: number;
  fps?: number;
  width?: number;
  height?: number;
  alpha?: boolean;
  headBlackSec?: number;
  headBlackTolerance?: number;
  minMeanLuma?: number;
  maxMeanLuma?: number;
}

export interface VerifyReport {
  path: string;
  exists: boolean;
  bytes: number;
  duration: number | null;
  fps: number | null;
  width: number | null;
  height: number | null;
  pixFmt: string | null;
  codec: string | null;
  hasAlpha: boolean | null;
  audio: boolean;
  headBlackSec: number | null;
  blackRanges: Array<{ start: number; end: number }>;
  meanLumaPerSec: number[];
  violations: string[];
  ok: boolean;
}

const jobs = new Map<string, RenderJob>();
const children = new Map<string, ChildProcess>();

function jobsDir(dataDir: string): string {
  const d = join(dataDir, "jobs");
  mkdirSync(d, { recursive: true });
  return d;
}

function persist(dataDir: string, job: RenderJob): void {
  try {
    writeFileSync(join(jobsDir(dataDir), `${job.id}.json`), JSON.stringify(job, null, 2), "utf-8");
  } catch {
    // ignore
  }
}

export function loadJobs(dataDir: string): RenderJob[] {
  const d = jobsDir(dataDir);
  const out: RenderJob[] = [];
  for (const f of readdirSync(d)) {
    if (!f.endsWith(".json")) continue;
    try {
      const j = JSON.parse(readFileSync(join(d, f), "utf-8")) as RenderJob;
      if (!jobs.has(j.id)) {
        // A job started by a previous server process: infer its state from the OS process and the output.
        if (j.state === "running" && j.serverPid !== process.pid) {
          const alive = j.pid ? isPidAlive(j.pid) : false;
          if (alive) j.state = "running";
          else {
            refreshOutput(j);
            j.state = j.outputExists && (j.outputBytes ?? 0) > 0 ? "done" : "failed";
            j.endedAt = j.endedAt ?? new Date().toISOString();
            if (j.state === "done") j.progress.percent = 100;
            persist(dataDir, j);
          }
        }
        jobs.set(j.id, j);
      }
      out.push(jobs.get(j.id)!);
    } catch {
      // ignore
    }
  }
  return out.sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
}

export function getJob(dataDir: string, id: string): RenderJob | undefined {
  if (!jobs.has(id)) loadJobs(dataDir);
  const j = jobs.get(id);
  if (j) refreshOutput(j);
  return j;
}

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === "EPERM";
  }
}

function refreshOutput(job: RenderJob): void {
  try {
    const p = resolveOutputPath(job.spec.output);
    job.outputExists = existsSync(p);
    job.outputBytes = job.outputExists ? statSync(p).size : 0;
  } catch {
    job.outputExists = false;
  }
}

/** aerender expands [#####] in sequence outputs; for verification use the folder's first file. */
function resolveOutputPath(output: string): string {
  if (!/\[#+\]/.test(output)) return output;
  const dir = output.replace(/[\\/][^\\/]*$/, "");
  const base = output.slice(dir.length + 1).replace(/\[#+\].*$/, "");
  try {
    const first = readdirSync(dir)
      .filter((f) => f.startsWith(base))
      .sort()[0];
    return first ? join(dir, first) : output;
  } catch {
    return output;
  }
}

export function pickInstall(aeYear?: number): AeInstall {
  const installs = findAeInstalls();
  const pick = aeYear ? installs.find((i) => i.year === aeYear) : installs[0];
  if (!pick) throw new Error(`No After Effects install${aeYear ? ` for ${aeYear}` : ""} found (have: ${installs.map((i) => i.year).join(", ") || "none"})`);
  if (!existsSync(pick.aerender)) throw new Error(`aerender missing at ${pick.aerender}`);
  return pick;
}

function tcToSeconds(tc: string, fps: number): number | null {
  const m = /^(\d+):(\d+):(\d+):(\d+)$/.exec(tc.trim());
  if (!m) return null;
  return parseInt(m[1], 10) * 3600 + parseInt(m[2], 10) * 60 + parseInt(m[3], 10) + parseInt(m[4], 10) / (fps || 30);
}

/**
 * MCP clients often start the server with a minimal environment. The After Effects
 * render engine hangs at "Launching After Effects..." when standard Windows variables
 * (ProgramData, CommonProgramFiles, ComSpec, TMP, windir...) are missing, so fill them in.
 */
export function renderEnvironment(base: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...base };
  if (process.platform !== "win32") return env;
  const sysDrive = env.SystemDrive || env.SYSTEMDRIVE || "C:";
  const sysRoot = env.SystemRoot || env.SYSTEMROOT || env.windir || `${sysDrive}\Windows`;
  const defaults: Record<string, string> = {
    SystemDrive: sysDrive,
    SystemRoot: sysRoot,
    windir: sysRoot,
    ComSpec: `${sysRoot}\System32\cmd.exe`,
    ProgramData: `${sysDrive}\ProgramData`,
    ALLUSERSPROFILE: `${sysDrive}\ProgramData`,
    ProgramFiles: env.ProgramFiles || env.PROGRAMFILES || `${sysDrive}\Program Files`,
    ProgramW6432: env.ProgramFiles || env.PROGRAMFILES || `${sysDrive}\Program Files`,
    "ProgramFiles(x86)": `${sysDrive}\Program Files (x86)`,
    CommonProgramFiles: `${sysDrive}\Program Files\Common Files`,
    CommonProgramW6432: `${sysDrive}\Program Files\Common Files`,
    "CommonProgramFiles(x86)": `${sysDrive}\Program Files (x86)\Common Files`,
    PUBLIC: `${sysDrive}\Users\Public`,
    OS: "Windows_NT",
    PATHEXT: ".COM;.EXE;.BAT;.CMD;.VBS;.JS;.MSC",
    NUMBER_OF_PROCESSORS: String(require("node:os").cpus().length || 4),
    PROCESSOR_ARCHITECTURE: env.PROCESSOR_ARCHITECTURE || "AMD64",
  };
  if (env.USERPROFILE) {
    defaults.HOMEDRIVE = env.HOMEDRIVE || env.USERPROFILE.slice(0, 2);
    defaults.HOMEPATH = env.HOMEPATH || env.USERPROFILE.slice(2);
    defaults.LOCALAPPDATA = env.LOCALAPPDATA || `${env.USERPROFILE}\AppData\Local`;
    defaults.APPDATA = env.APPDATA || `${env.USERPROFILE}\AppData\Roaming`;
    defaults.TEMP = env.TEMP || env.TMP || `${env.USERPROFILE}\AppData\Local\Temp`;
    defaults.TMP = env.TMP || defaults.TEMP;
    defaults.USERNAME = env.USERNAME || env.USERPROFILE.split(/[\/]/).pop() || "user";
  }
  const lowerKeys = new Set(Object.keys(env).map((k) => k.toLowerCase()));
  for (const [k, v] of Object.entries(defaults)) if (!lowerKeys.has(k.toLowerCase())) env[k] = v;
  if (!/system32/i.test(env.PATH || env.Path || "")) env.PATH = `${env.PATH || env.Path || ""};${sysRoot}\System32;${sysRoot};${sysRoot}\System32\Wbem`;
  return env;
}

export function startJob(dataDir: string, spec: RenderJobSpec): RenderJob {
  const install = pickInstall(spec.aeYear);
  const args = ["-project", spec.project, "-comp", spec.comp, "-output", spec.output];
  if (spec.rsTemplate) args.push("-RStemplate", spec.rsTemplate);
  if (spec.omTemplate) args.push("-OMtemplate", spec.omTemplate);
  if (spec.startFrame !== undefined) args.push("-s", String(spec.startFrame));
  if (spec.endFrame !== undefined) args.push("-e", String(spec.endFrame));
  if (spec.increment !== undefined) args.push("-i", String(spec.increment));
  if (spec.memUsage) args.push("-mem_usage", String(spec.memUsage[0]), String(spec.memUsage[1]));
  if (spec.sound) args.push("-sound", "ON");
  if (spec.continueOnMissingFootage !== false) args.push("-continueOnMissingFootage");
  args.push("-v", "ERRORS_AND_PROGRESS", "-close", "DO_NOT_SAVE_CHANGES");

  const outDir = spec.output.replace(/[\\/][^\\/]*$/, "");
  if (outDir && !existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  const id = `${Date.now().toString(36)}_${randomBytes(3).toString("hex")}`;
  const job: RenderJob = {
    id,
    spec,
    state: "queued",
    exe: install.aerender,
    args,
    startedAt: new Date().toISOString(),
    progress: { percent: null, frame: null, totalFrames: null, fps: null, durationTc: null },
    lastLines: [],
    errors: [],
    serverPid: process.pid,
  };
  jobs.set(id, job);

  // windowsHide MUST stay false: with a hidden console aerender stalls forever at
  // "Launching After Effects..." (verified 2026-09-03 on AE 2026). detached lets the
  // render survive the MCP server exiting (clients close servers freely).
  const child = spawn(install.aerender, args, { windowsHide: false, detached: true, stdio: ["ignore", "pipe", "pipe"], env: renderEnvironment() });
  children.set(id, child);
  const logPath = join(jobsDir(dataDir), `${id}.log`);
  const logStream = createWriteStream(logPath, { flags: "a" });
  logStream.write(`# ${install.aerender} ${args.map((x) => (x.includes(" ") ? JSON.stringify(x) : x)).join(" ")}
`);
  job.logPath = logPath;
  job.pid = child.pid;
  job.state = "running";
  persist(dataDir, job);

  let buffer = "";
  const onLine = (line: string) => {
    const l = line.replace(/\r$/, "");
    if (!l.trim()) return;
    job.lastLines.push(l);
    if (job.lastLines.length > 40) job.lastLines.shift();
    let m: RegExpExecArray | null;
    if ((m = /Frame Rate:\s*([\d.]+)/.exec(l))) job.progress.fps = parseFloat(m[1]);
    if ((m = /Duration:s*(d+:d+:d+:d+)/.exec(l))) job.progress.durationTc = m[1];
    if (job.progress.durationTc && job.progress.fps && job.progress.totalFrames === null) {
      const secs = tcToSeconds(job.progress.durationTc, job.progress.fps);
      if (secs !== null) job.progress.totalFrames = Math.round(secs * job.progress.fps);
    }
    if ((m = /PROGRESS:\s+\d+:\d+:\d+:\d+\s+\((\d+)\)/.exec(l))) {
      job.progress.frame = parseInt(m[1], 10);
      if (job.progress.totalFrames) job.progress.percent = Math.min(100, Math.round((job.progress.frame / job.progress.totalFrames) * 100));
    }
    if (/error|failed|unable|could not|missing/i.test(l) && !/continueOnMissingFootage/i.test(l)) job.errors.push(l);
    if (job.errors.length > 40) job.errors.shift();
  };
  const onData = (d: Buffer) => {
    logStream.write(d);
    buffer += d.toString("utf-8");
    const parts = buffer.split(/\n/);
    buffer = parts.pop() ?? "";
    for (const p of parts) onLine(p);
    persist(dataDir, job);
  };
  child.stdout?.on("data", onData);
  child.stderr?.on("data", onData);
  child.on("error", (e) => {
    job.state = "failed";
    job.errors.push(`spawn error: ${e.message}`);
    job.endedAt = new Date().toISOString();
    persist(dataDir, job);
  });
  child.on("close", (code) => {
    if (buffer) onLine(buffer);
    job.exitCode = code;
    job.endedAt = new Date().toISOString();
    refreshOutput(job);
    if (job.state !== "cancelled") job.state = code === 0 && job.outputExists ? "done" : "failed";
    if (job.state === "done" && job.spec.finalOutput) {
      try {
        const produced = resolveOutputPath(job.spec.output);
        mkdirSync(dirname(job.spec.finalOutput), { recursive: true });
        renameSync(produced, job.spec.finalOutput);
        job.spec.output = job.spec.finalOutput;
        refreshOutput(job);
      } catch (e) {
        job.errors.push(`move to final output failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    if (job.state === "done") job.progress.percent = 100;
    children.delete(id);
    logStream.end();
    persist(dataDir, job);
  });
  child.unref();
  return job;
}

export function cancelJob(dataDir: string, id: string): RenderJob | undefined {
  const job = getJob(dataDir, id);
  if (!job) return undefined;
  const child = children.get(id);
  if (child && !child.killed) {
    job.state = "cancelled";
    try {
      if (process.platform === "win32" && child.pid) spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
      else child.kill("SIGTERM");
    } catch {
      // ignore
    }
  } else if (job.state === "running" && job.pid) {
    job.state = "cancelled";
    try {
      if (process.platform === "win32") spawn("taskkill", ["/PID", String(job.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
      else process.kill(job.pid, "SIGTERM");
    } catch {
      // ignore
    }
  }
  job.endedAt = new Date().toISOString();
  persist(dataDir, job);
  return job;
}

// ---------------------------------------------------------------------------
// Verification (ffprobe / ffmpeg)
// ---------------------------------------------------------------------------
function run(cmd: string, args: string[], timeoutMs = 120_000): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolve) => {
    execFile(cmd, args, { windowsHide: true, maxBuffer: 64 * 1024 * 1024, timeout: timeoutMs }, (err, stdout, stderr) => {
      resolve({ stdout: String(stdout ?? ""), stderr: String(stderr ?? ""), code: err ? 1 : 0 });
    });
  });
}

export async function ffprobe(path: string): Promise<Record<string, unknown> | null> {
  const r = await run("ffprobe", ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", path]);
  try {
    return JSON.parse(r.stdout) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function parseFps(r: string | undefined): number | null {
  if (!r) return null;
  const m = /^(\d+)(?:\/(\d+))?$/.exec(r);
  if (!m) return null;
  const den = m[2] ? parseInt(m[2], 10) : 1;
  return den ? parseInt(m[1], 10) / den : null;
}

export async function verifyMedia(path: string, expect: VerifyExpectations = {}, options: { lumaSampling?: boolean; blackDetect?: boolean } = {}): Promise<VerifyReport> {
  const resolved = resolveOutputPath(path);
  const report: VerifyReport = {
    path: resolved,
    exists: existsSync(resolved),
    bytes: 0,
    duration: null,
    fps: null,
    width: null,
    height: null,
    pixFmt: null,
    codec: null,
    hasAlpha: null,
    audio: false,
    headBlackSec: null,
    blackRanges: [],
    meanLumaPerSec: [],
    violations: [],
    ok: false,
  };
  if (!report.exists) {
    report.violations.push("output file does not exist");
    return report;
  }
  report.bytes = statSync(resolved).size;
  if (report.bytes === 0) report.violations.push("output file is empty");

  const info = await ffprobe(resolved);
  if (!info) {
    report.violations.push("ffprobe could not read the file (is ffprobe on PATH?)");
    return report;
  }
  const streams = (info.streams as Array<Record<string, unknown>>) ?? [];
  const video = streams.find((s) => s.codec_type === "video");
  const format = (info.format as Record<string, unknown>) ?? {};
  report.audio = streams.some((s) => s.codec_type === "audio");
  if (video) {
    report.width = Number(video.width) || null;
    report.height = Number(video.height) || null;
    report.pixFmt = (video.pix_fmt as string) ?? null;
    report.codec = (video.codec_name as string) ?? null;
    report.fps = parseFps(video.r_frame_rate as string) ?? parseFps(video.avg_frame_rate as string);
    report.hasAlpha = report.pixFmt ? /a$|rgba|argb|bgra|abgr|yuva|gbrap|ya/.test(report.pixFmt) : null;
  }
  const dur = parseFloat(String(format.duration ?? (video?.duration as string) ?? ""));
  report.duration = Number.isFinite(dur) ? Math.round(dur * 1000) / 1000 : null;

  if (options.blackDetect !== false && video) {
    const bd = await run("ffmpeg", ["-hide_banner", "-nostats", "-i", resolved, "-vf", "blackdetect=d=0.05:pix_th=0.10", "-an", "-f", "null", "-"]);
    const re = /black_start:([\d.]+)\s+black_end:([\d.]+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(bd.stderr))) report.blackRanges.push({ start: parseFloat(m[1]), end: parseFloat(m[2]) });
    const head = report.blackRanges.find((r) => r.start <= 0.05);
    report.headBlackSec = head ? Math.round((head.end - head.start) * 1000) / 1000 : 0;
  }
  if (options.lumaSampling !== false && video) {
    const ss = await run("ffmpeg", ["-hide_banner", "-nostats", "-i", resolved, "-vf", "fps=1,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-", "-an", "-f", "null", "-"]);
    const re2 = /lavfi\.signalstats\.YAVG=([\d.]+)/g;
    let m2: RegExpExecArray | null;
    while ((m2 = re2.exec(ss.stdout + ss.stderr))) report.meanLumaPerSec.push(Math.round(parseFloat(m2[1]) * 10) / 10);
  }

  const tol = expect.durationTolerance ?? 0.05;
  if (expect.duration !== undefined && report.duration !== null && Math.abs(report.duration - expect.duration) > tol) report.violations.push(`duration ${report.duration}s, expected ${expect.duration}s ±${tol}`);
  if (expect.fps !== undefined && report.fps !== null && Math.abs(report.fps - expect.fps) > 0.01) report.violations.push(`fps ${report.fps}, expected ${expect.fps}`);
  if (expect.width !== undefined && report.width !== expect.width) report.violations.push(`width ${report.width}, expected ${expect.width}`);
  if (expect.height !== undefined && report.height !== expect.height) report.violations.push(`height ${report.height}, expected ${expect.height}`);
  if (expect.alpha !== undefined && report.hasAlpha !== null && report.hasAlpha !== expect.alpha) report.violations.push(`alpha ${report.hasAlpha}, expected ${expect.alpha} (pix_fmt ${report.pixFmt})`);
  if (expect.headBlackSec !== undefined && report.headBlackSec !== null) {
    const t = expect.headBlackTolerance ?? 0.08;
    if (Math.abs(report.headBlackSec - expect.headBlackSec) > t) report.violations.push(`head black ${report.headBlackSec}s, expected ${expect.headBlackSec}s ±${t}`);
  }
  if (report.meanLumaPerSec.length) {
    const mean = report.meanLumaPerSec.reduce((a, b) => a + b, 0) / report.meanLumaPerSec.length;
    if (expect.minMeanLuma !== undefined && mean < expect.minMeanLuma) report.violations.push(`mean luma ${mean.toFixed(1)} below ${expect.minMeanLuma}`);
    if (expect.maxMeanLuma !== undefined && mean > expect.maxMeanLuma) report.violations.push(`mean luma ${mean.toFixed(1)} above ${expect.maxMeanLuma}`);
    const whiteFlash = report.meanLumaPerSec.findIndex((v) => v > 235);
    if (whiteFlash >= 0) report.violations.push(`near-white frame(s) around ${whiteFlash}s (mean luma ${report.meanLumaPerSec[whiteFlash]}); a missing-footage layer renders opaque white`);
  }
  report.ok = report.violations.length === 0;
  return report;
}
