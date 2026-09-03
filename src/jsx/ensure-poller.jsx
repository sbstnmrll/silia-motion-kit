// ae-mcp headless poller (fallback executor). Installed into the RUNNING After
// Effects with:  AfterFX.com -r ensure-poller.jsx
// Requires Edit > Preferences > Scripting & Expressions > "Allow Scripts to Write
// Files and Access Network", because responses are written from ExtendScript.
//
// Same file protocol as the CEP executor (see cep-plugin/main.js). Uses explicit
// self-rescheduling instead of scheduleTask(repeat=true) to reduce collisions with
// modal dialogs (shaunroot PR #40 pattern).
(function () {
  var VERSION = "1";
  var POLL_MS = 250;
  var PRESENCE_MS = 5000;

  if ($.global.__aeMcpPoller && $.global.__aeMcpPoller.version === VERSION && $.global.__aeMcpPoller.alive) {
    return "already-running";
  }
  if ($.global.__aeMcpPoller && $.global.__aeMcpPoller.taskId) {
    try { app.cancelTask($.global.__aeMcpPoller.taskId); } catch (e0) {}
  }

  function bridgeRoot() {
    // Optional pointer written by the server when AE_MCP_TEMP_DIR is customised.
    var ptr = new File(Folder.temp.fsName + "/ae-mcp-root.txt");
    if (ptr.exists) {
      try { ptr.encoding = "UTF-8"; ptr.open("r"); var s = ptr.read(); ptr.close(); s = s.replace(/^\s+|\s+$/g, ""); if (s) return s; } catch (e1) {}
    }
    return Folder.temp.fsName + "/ae-mcp-bridge";
  }

  var major = parseInt(app.version, 10);
  var dir = new Folder(bridgeRoot() + "/v" + major);
  if (!dir.exists) dir.create();
  var engine = "poll" + Math.floor(Math.random() * 1e6).toString(36);

  function writeFile(path, text) {
    var staged = new File(path + "." + engine + ".staged");
    staged.encoding = "UTF-8";
    if (!staged.open("w")) return false;
    staged.write(text);
    staged.close();
    var target = new File(path);
    if (target.exists) { try { target.remove(); } catch (e2) {} }
    return staged.rename(target.name);
  }

  function readFile(f) {
    f.encoding = "UTF-8";
    if (!f.open("r")) return null;
    var s = f.read();
    f.close();
    return s;
  }

  function presence() {
    writeFile(dir.fsName + "/presence_" + engine + ".json",
      '{"protocolVersion":1,"engine":"' + engine + '","source":"poller","appVersion":"' + app.version + '","state":"running","updatedAt":"' + new Date().getTime() + '"}');
  }

  function stringify(o) {
    if (typeof JSON !== "undefined" && JSON.stringify) return JSON.stringify(o);
    return '{"success":false,"error":"' + String(o.error || o).replace(/"/g, "'") + '"}';
  }

  function runOne(cmdFile) {
    var name = cmdFile.name; // cmd_<id>.jsx
    var id = name.replace(/^cmd_/, "").replace(/\.jsx$/, "");
    var claimed = new File(dir.fsName + "/" + name + "." + engine + ".claimed.jsx");
    if (!cmdFile.rename(claimed.name)) return; // someone else claimed it
    var resPath = dir.fsName + "/res_" + id + ".json";
    var busyPath = dir.fsName + "/busy_" + id + ".json";
    writeFile(busyPath, '{"id":"' + id + '","engine":"' + engine + '","phase":"eval-start"}');
    var out;
    try {
      var result = $.evalFile(claimed);
      var text = (result === undefined || result === null) ? "" : String(result);
      if (text === "" || text === "undefined") out = stringify({ success: false, code: "EMPTY_RESULT", error: "Script returned nothing" });
      else out = text;
    } catch (e3) {
      out = stringify({ success: false, code: "SCRIPT_ERROR", error: String(e3), line: e3.line });
    }
    try { claimed.remove(); } catch (e4) {}
    try { new File(busyPath).remove(); } catch (e5) {}
    writeFile(resPath, out);
  }

  var lastPresence = 0;
  $.global.__aeMcpPoll = function () {
    var self = $.global.__aeMcpPoller;
    if (!self || !self.alive) return;
    try {
      var now = new Date().getTime();
      if (now - lastPresence > PRESENCE_MS) { presence(); lastPresence = now; }
      var files = dir.getFiles(function (f) { return f instanceof File && /^cmd_.*\.jsx$/.test(f.name) && f.name.indexOf(".claimed.") === -1; });
      files.sort(function (a, b) { return a.name < b.name ? -1 : 1; });
      for (var i = 0; i < files.length; i++) runOne(files[i]);
    } catch (e6) {
      // never let the poller die
    }
    self.taskId = app.scheduleTask("__aeMcpPoll()", POLL_MS, false);
  };

  $.global.__aeMcpPoller = { version: VERSION, alive: true, engine: engine, dir: dir.fsName, taskId: null };
  presence();
  lastPresence = new Date().getTime();
  $.global.__aeMcpPoller.taskId = app.scheduleTask("__aeMcpPoll()", POLL_MS, false);
  return "started:" + engine;
})();
