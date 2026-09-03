/* Silia AE MCP - CEP bridge executor
 *
 * Polls a per-AE-version bridge directory for command files (cmd_<id>.jsx), executes
 * each one inside After Effects' ExtendScript engine via $.evalFile(), and publishes
 * the JSON result as res_<id>.json. Both the visible panel and the invisible
 * "headless" extension run this same file; an atomic rename decides who owns a command.
 *
 * Protocol (shared with the MCP server and with the headless poller fallback):
 *   cmd_<id>.jsx                         request  (written by the server)
 *   cmd_<id>.jsx.<ENGINE>.claimed.jsx    claimed  (renamed by the executor that won)
 *   busy_<id>.json                       heartbeat while evalScript is in flight (every 2 s after 2 s)
 *   res_<id>.json                        response {success, data} | {success:false, error}
 *   presence_<ENGINE>.json               executor liveness (every 5 s)
 *   panel.log                            rolling text log
 *
 * Adapted from premiere-pro-mcp (MIT, leancoderkavy). See THIRD_PARTY_NOTICES.md.
 */

var cs = new CSInterface();
var POLL_MS = 200;
var PRESENCE_MS = 5000;
var BUSY_MS = 2000;
var LOG_MAX_BYTES = 512 * 1024;

var ENGINE_ID = Math.random().toString(36).slice(2, 8);
var bridgeRunning = false;
var pollTimer = null;
var presenceTimer = null;
var commandCount = 0;
var inFlight = 0;
var appVersion = "";
var appMajor = 0;
var bridgeRoot = "";
var tempDir = "";
var source = "cep-panel";

// ---- Node access -------------------------------------------------------------
// --enable-nodejs puts `require` in the global scope on most hosts; on some it lands
// on cep_node. Try both and fail loudly instead of surfacing "fs is undefined" later.
function nodeRequire(moduleName) {
  if (typeof require !== "undefined") return require(moduleName);
  var cepNode = typeof cep_node !== "undefined" ? cep_node : typeof window !== "undefined" ? window.cep_node : null;
  if (cepNode && typeof cepNode.require === "function") return cepNode.require(moduleName);
  throw new Error(
    'Node.js is not available in this CEP panel, so "' + moduleName + '" could not be loaded. ' +
      "Check that CSXS/manifest.xml has <Parameter>--enable-nodejs</Parameter>, then fully quit and reopen After Effects."
  );
}

var fs = nodeRequire("fs");
var path = nodeRequire("path");
var os = nodeRequire("os");

// ---- UI helpers (both extensions load index.html, so the DOM always exists) ----
function $id(id) {
  return document.getElementById(id);
}

function uiLog(msg, cls) {
  var el = $id("log");
  if (!el) return;
  var entry = document.createElement("div");
  entry.className = "log-entry " + (cls || "");
  entry.textContent = "[" + new Date().toLocaleTimeString() + "] " + msg;
  el.appendChild(entry);
  el.scrollTop = el.scrollHeight;
  while (el.children.length > 100) el.removeChild(el.firstChild);
}

function fileLog(msg) {
  if (!tempDir) return;
  var p = path.join(tempDir, "panel.log");
  try {
    try {
      var st = fs.statSync(p);
      if (st.size > LOG_MAX_BYTES) fs.writeFileSync(p, "", "utf-8");
    } catch (e0) {}
    fs.appendFileSync(p, new Date().toISOString() + " [" + source + ":" + ENGINE_ID + "] " + msg + "\n", "utf-8");
  } catch (e) {}
}

function log(msg, cls) {
  uiLog(msg, cls);
  fileLog(msg);
}

function setStatus(state, text, detail) {
  var dot = $id("statusDot");
  if (dot) dot.className = "status-dot " + state;
  var t = $id("statusText");
  if (t) {
    t.textContent = text;
    t.setAttribute("data-state", state || "stopped");
  }
  var d = $id("statusDetail");
  if (d && detail) d.textContent = detail;
}

// ---- Directories ----------------------------------------------------------------
function envValue(name) {
  try {
    var proc = nodeRequire("process");
    var v = proc && proc.env && proc.env[name];
    if (typeof v === "string" && v.trim()) return v.trim();
  } catch (e) {}
  return "";
}

function resolveBridgeRoot() {
  return envValue("AE_MCP_TEMP_DIR") || path.join(os.tmpdir(), "ae-mcp-bridge");
}

function ensureDir(dir) {
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true, mode: 448 /* 0o700 */ });
    return true;
  } catch (e) {
    log("Error creating dir " + dir + ": " + e.message, "err");
    return false;
  }
}

function deleteFile(p) {
  try {
    if (fs.existsSync(p)) fs.unlinkSync(p);
  } catch (e) {}
}

// Publish JSON atomically so the server never reads a half-written file.
function publishJson(filePath, content) {
  var staged = filePath + "." + ENGINE_ID + ".staged";
  try {
    fs.writeFileSync(staged, content, "utf-8");
    fs.renameSync(staged, filePath);
    return true;
  } catch (e) {
    deleteFile(staged);
    log("Error publishing " + path.basename(filePath) + ": " + e.message, "err");
    return false;
  }
}

// ---- Presence -------------------------------------------------------------------
function writePresence() {
  if (!tempDir) return;
  publishJson(
    path.join(tempDir, "presence_" + ENGINE_ID + ".json"),
    JSON.stringify({
      protocolVersion: 1,
      engine: ENGINE_ID,
      source: source,
      appVersion: appVersion,
      state: bridgeRunning ? "running" : "stopped",
      inFlight: inFlight,
      commands: commandCount,
      updatedAt: new Date().toISOString(),
    })
  );
}

function removePresence() {
  if (tempDir) deleteFile(path.join(tempDir, "presence_" + ENGINE_ID + ".json"));
}

// ---- Command processing ---------------------------------------------------------
function listCommandFiles() {
  try {
    if (!fs.existsSync(tempDir)) return [];
    return fs
      .readdirSync(tempDir)
      .filter(function (f) {
        return f.indexOf("cmd_") === 0 && f.slice(-4) === ".jsx" && f.indexOf(".claimed.") === -1;
      })
      .sort();
  } catch (e) {
    return [];
  }
}

function toExtendScriptPath(p) {
  // ExtendScript's File accepts forward slashes on Windows; escape for a JS string literal.
  return p.replace(/\\/g, "/").replace(/"/g, '\\"');
}

function processCommands() {
  var files = listCommandFiles();
  for (var i = 0; i < files.length; i++) processOneCommand(files[i]);
}

function processOneCommand(cmdFileName) {
  var cmdPath = path.join(tempDir, cmdFileName);
  // Keep the .jsx extension on the claimed file so $.evalFile treats it as script.
  var claimedPath = cmdPath + "." + ENGINE_ID + ".claimed.jsx";
  try {
    fs.renameSync(cmdPath, claimedPath);
  } catch (e) {
    return; // the other engine claimed it first
  }

  var id = cmdFileName.replace(/^cmd_/, "").replace(/\.jsx$/, "");
  var resPath = path.join(tempDir, "res_" + id + ".json");
  var busyPath = path.join(tempDir, "busy_" + id + ".json");
  var startedAt = Date.now();
  inFlight++;
  log("Executing " + cmdFileName, "cmd");

  var busyTimer = setInterval(function () {
    publishJson(
      busyPath,
      JSON.stringify({ id: id, engine: ENGINE_ID, elapsedMs: Date.now() - startedAt, phase: "eval" })
    );
  }, BUSY_MS);

  var script = '$.evalFile(new File("' + toExtendScriptPath(claimedPath) + '"))';

  cs.evalScript(script, function (result) {
    clearInterval(busyTimer);
    deleteFile(busyPath);
    deleteFile(claimedPath);
    inFlight--;
    commandCount++;
    var counter = $id("cmdCount");
    if (counter) counter.textContent = String(commandCount);

    var response;
    var text = result === undefined || result === null ? "" : String(result);
    if (text === "" || text === "undefined" || text === "null") {
      // An empty result means evalScript gave us nothing back: a bridge failure, not
      // a successful command with no data.
      response = JSON.stringify({
        success: false,
        code: "EMPTY_RESULT",
        error:
          "The bridge received an empty result from evalScript (got " + typeof result + "). " +
          "The script may not have run. If every command does this, close and reopen the Silia AE MCP panel, or reinstall the extension.",
      });
      log("Result: EMPTY", "err");
    } else if (text.indexOf("EvalScript error") === 0 || text.indexOf("EvalScript Error") === 0) {
      response = JSON.stringify({ success: false, code: "SCRIPT_ERROR", error: text });
      log("Result: " + text, "err");
    } else {
      try {
        var parsed = JSON.parse(text);
        if (parsed && typeof parsed === "object" && typeof parsed.success === "boolean") {
          response = text;
        } else {
          response = JSON.stringify({ success: true, data: parsed });
        }
        log("Result: OK (" + (Date.now() - startedAt) + " ms)", "ok");
      } catch (e) {
        response = JSON.stringify({ success: false, code: "PARSE", error: "Script returned non-JSON: " + text.slice(0, 500) });
        log("Result: non-JSON", "err");
      }
    }
    publishJson(resPath, response);
  });
}

// ---- Bridge control -------------------------------------------------------------
function startBridge() {
  if (!tempDir || !ensureDir(tempDir)) {
    setStatus("error", "Bridge directory unavailable", tempDir);
    return;
  }
  bridgeRunning = true;
  writePresence();
  if (presenceTimer) clearInterval(presenceTimer);
  presenceTimer = setInterval(writePresence, PRESENCE_MS);
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(function () {
    if (bridgeRunning) processCommands();
  }, POLL_MS);
  setStatus("connected", "Bridge running", "After Effects " + appVersion + " · " + source);
  log("Bridge started in " + tempDir, "ok");
  var b1 = $id("btnStart"), b2 = $id("btnStop");
  if (b1) b1.disabled = true;
  if (b2) b2.disabled = false;
}

function stopBridge() {
  bridgeRunning = false;
  if (pollTimer) clearInterval(pollTimer);
  if (presenceTimer) clearInterval(presenceTimer);
  pollTimer = presenceTimer = null;
  removePresence();
  setStatus("", "Stopped", "Click Start to resume");
  log("Bridge stopped");
  var b1 = $id("btnStart"), b2 = $id("btnStop");
  if (b1) b1.disabled = false;
  if (b2) b2.disabled = true;
}

// ---- Init -------------------------------------------------------------------------
function detectSource() {
  try {
    var ext = cs.getExtensionID ? cs.getExtensionID() : "";
    if (ext && ext.indexOf("headless") !== -1) return "cep-headless";
  } catch (e) {}
  return "cep-panel";
}

function detectVersion(done) {
  var env = null;
  try {
    env = cs.getHostEnvironment();
  } catch (e) {}
  if (env && env.appVersion) {
    done(String(env.appVersion));
    return;
  }
  cs.evalScript("app.version", function (v) {
    done(v && v !== "undefined" ? String(v) : "0.0");
  });
}

(function init() {
  source = detectSource();
  bridgeRoot = resolveBridgeRoot();
  log("Silia AE MCP bridge loaded (" + source + ", engine " + ENGINE_ID + ")");
  setStatus("waiting", "Starting…", "Detecting After Effects version");

  // aerender / the render engine also loads CEP extensions. Never bridge there: it
  // would execute commands against the render project instead of the user session.
  cs.evalScript("(function(){ try { return app.isRenderEngine ? \"1\" : \"0\"; } catch (e) { return \"0\"; } })()", function (isRender) {
    if (String(isRender) === "1") {
      log("Render engine detected (aerender); bridge disabled in this instance.");
      setStatus("", "Disabled", "Render engine instance");
      return;
    }
    startAfterVersion();
  });
  function startAfterVersion() { detectVersion(function (v) {
    appVersion = v;
    appMajor = parseInt(v, 10) || 0;
    tempDir = path.join(bridgeRoot, "v" + appMajor);
    var input = $id("tempDir");
    if (input) input.value = tempDir;
    var ver = $id("aeVersion");
    if (ver) ver.textContent = "AE " + appVersion;
    ensureDir(tempDir);
    log("After Effects " + appVersion + " → " + tempDir);
    // Always auto-start: the headless instance has nobody to click Start.
    setTimeout(startBridge, 300);
  }); }

  window.addEventListener("beforeunload", function () {
    removePresence();
  });

  // Debug handle for Chrome DevTools (see .debug for the port).
  window.__aeMcp = {
    engine: ENGINE_ID,
    get tempDir() { return tempDir; },
    get running() { return bridgeRunning; },
    start: startBridge,
    stop: stopBridge,
    processCommands: processCommands,
  };
})();
