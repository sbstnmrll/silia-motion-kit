# Plan: Build our own After Effects MCP server ("ae-mcp")

> **Status 2026-09-03:** BUILT AND LIVE-VERIFIED on AE 2026. Repo `C:\Users\User\silia-os\editorial\projects\ae-mcp` (7 commits). 44 tools registered in Claude Code as `ae`. Verified live: M0 (unsigned CEP loads), M1–M3 (core tools, ae_frame, ae_render + verify), checkpoint/library/MOGRT/handoff/audio, Silia layer, ae_versions (2 variants in parallel), silia_outro plan on the real outro .aep. Not live-tested: poller transport (needs AE closed), silia_outro render, ae_lottie (not built). Deviations from plan: `ae_dialogs` tool + auto-answer of informational AE modals added; ES3 reserved-word validator added; no WebSocket transport.

## Context

The user researched Synthetic's paid `@synthetic-ai/ae-mcp` ($15/mo, Windows-only, closed/obfuscated, 220+ tools, single maintainer, 3 months old) and asked whether we can build our own. Answer: yes. This plan is to actually build it, forking/copying whatever open-source code is useful, and adding value Synthetic does not have.

Why it matters for this workspace: `silia-os/editorial/` already does Premiere Pro post-production via an MCP (`premiere-pro-mcp` v1.13.0, MIT, installed globally) and motion-graphics overlays via HyperFrames. An After Effects MCP closes the loop: Claude can build motion graphics, titles, lower thirds, MOGRTs, and versioned renders for Silia/Creai video work.

## Facts established during exploration

**Local environment**
- Windows 11, Node 24.14, npm 11.9, git 2.53. No git repo in `research/`.
- After Effects 2025 (25.6.6) and 2026 (26.3) installed at `C:\Program Files\Adobe\Adobe After Effects <year>\Support Files\` with `AfterFX.exe`, `AfterFX.com`, `aerender.exe`, `Scripts\ScriptUI Panels\`.
- CEP `PlayerDebugMode=1` already set for `HKCU\Software\Adobe\CSXS.9..13` (REG_SZ "1").
- No AE UXP plugins installed; no AE CEP extensions installed yet.
- Existing CEP extension `%APPDATA%\Adobe\CEP\extensions\MCPBridgeCEP` (Premiere's bridge). Its manifest pattern is directly reusable: two extensions in one bundle, a visible `Panel` plus an invisible `Custom` 1x1 "headless" extension with `<StartOn>` on `ApplicationActivate` so the bridge is live without opening a panel. CEF flags `--enable-nodejs --allow-file-access-from-files`.

**Reference architecture: `premiere-pro-mcp` v1.13.0** (`C:\Users\User\AppData\Roaming\npm\node_modules\premiere-pro-mcp`, MIT, readable compiled TS in `dist/`, repo `github.com/leancoderkavy/premiere-pro-mcp`)
- Deps: `@modelcontextprotocol/sdk ^1.30`, `zod ^4`, `ws`, optional `posthog-node`.
- File bridge (`dist/bridge/file-bridge.js` + `cep-plugin/main.js`): temp dir (`PREMIERE_TEMP_DIR`), request `cmd_<id>.jsx`, response `res_<id>.json`, heartbeat `busy_<id>.json` every 2 s; panel polls every 200 ms and claims via atomic rename `cmd_<id>.<ENGINE_ID>.claimed` (prevents panel + headless double execution); server uses `fs.watch` + 250 ms fallback timer; default timeout 30 s, hard cap `max(4x, 120 s)`, and if a fresh busy file exists it reports "a modal dialog is likely blocking the scripting engine".
- Helpers written once to `helpers_<md5-12>.jsx`, loaded via `$.evalFile` with a version guard (inlining 14 KB per call caused stack overruns).
- `buildScript` wraps code in `(function(){try{...}catch(e){return __error(e.toString())}})()`; `escapeForExtendScript` for strings; `validateScript` blocks `eval(`/`new Function(`/`System.callSystem(` except for the raw-script tool.
- Tools: one module per category exporting `getXTools(bridgeOptions)` -> record of `{description, parameters(JSON Schema), handler, operationalCapability?}`; 288 tools + 4 resources + 11 prompts. Consolidated multi-action tools (`action` enum) keep `tools/list` small.
- Security: capability profiles (`inspect, edit, export, filesystem, unsafe-script`), fail-closed default for unknown tools, `execute_extendscript` withheld unless `unsafe-script` enabled; JSONL audit on stderr; `--doctor`, `--support-bundle`.
- Agentic layer: `create_*_plan -> preview_* (mints confirmation token) -> apply_*` with fingerprint + token + revision revalidation + per-item `expected_*` guards; verified read-back after mutations.
- Install: `--install-cep` (PowerShell script copies bundle to `%APPDATA%\Adobe\CEP\extensions\`, sets PlayerDebugMode REG_SZ for CSXS 9..14), `--diagnose-cep`.
- `docs:supported-actions` script generates the tool catalog from the live registry.

**Workspace context (from `editorial/` and `video/`)**
- `editorial/` owns all Adobe/motion work. `video/` explicitly routes AE work to `editorial/` (`video/paquete-retro-90s/02-KREA.md:92`) and its DNA bans text overlays. Placement: **`editorial/projects/ae-mcp/`** plus a future skill `editorial/.claude/skills/ae-motion/`, plus one "Permanent facts" bullet in `editorial/CLAUDE.md`. No new root.
- AE knowledge already there: `editorial/paquete-produccion-video/02-MCPS-Y-HERRAMIENTAS.md:109-122` (aerender command that works; `AfterFX.exe -noui -r` cannot render, exit 3018; ExtendScript is ES3 with no `JSON`; output-module templates vary per install, list `outputModule.templates` first). `editorial/.claude/skills/demo-agente-voz/references/outro.md` (per-layer inventory of `Horizontal_outro_Precomp`, missing-footage layer renders opaque white, save-modified-copy-then-aerender pattern).
- `editorial/tools/zxp-signing/` has Adobe's `ZXPSignCmd.exe` v4.1.3 + a working self-signed `.p12` (README says kept for "Premiere, After Effects, etc.").
- Risk recorded in `editorial/SETUP-LOG-2026-08-26.md:32`: Premiere 2026 dropped CEP for some extensions (UXP migration); a self-signed `.zxp` was rejected by Premiere's PlugPlug loader even with PlayerDebugMode. Only the fork's own production-signed `.zxp` loaded. **AE 2026 CEP loading must be verified on this machine before committing to a CEP bridge.**
- The idea is already filed: `editorial/.claude/skills/isom-motion/ISOM-Tutorial-Context.md:23` names "After Effects MCP" for native AE comps + Dynamic Link back into Premiere when true keyframing is needed.
- Premiere MCP lesson that must shape the AE design: the connector "reports success on writes it did not perform" (`editorial/CLAUDE.md` gotchas). Every AE mutation tool must read back state and the model must be able to see a rendered frame.
- `.gitignore` in `editorial/` ignores `**/*.aep`; template `.aep`/`.aet` shipped by the MCP need an explicit un-ignore.
- Concrete unbuilt AE workflows the tool should serve: MOGRT authoring and `import_mogrt` into Premiere (Premiere MCP already has `import_mogrt`, `import_ae_comps`, unused); 2.5D push on stills (4.5 to 6%, currently ffmpeg zoompan); compositing Silia UI over blank generated plates (project-003 S05B/S06B); retro grade on shot head dissolving off; regenerating outro in both orientations (0.43 s head black); typographic alpha overlay layer (now HyperFrames `tipografia-v3-alpha.mov`); frame-rate conform across 59.94/60/30/24.
- Brand facts an AE skill must encode: video font is **ES Klarheit Grotesk** (Bk/Md `.otf` in `editorial/paquete-produccion-video/assets-compartidos/fuentes/`), not ABC Monument Grotesk (web). Colors: Lime `#DEFF38` (text on it always black), Violeta `#7A5BF5`, Rosa `#F3B9FA`, Grafito `#0A0A0B`. Five orb color ramps in `editorial/.claude/skills/demo-agente-voz/references/orbe-estados-y-colores.md` are immutable. Motion: transforms + opacity only; entry pattern opacity 0→1 + translateY 18px→0; no named easing/duration tokens exist yet. Shipped formats: 1920x1080@30, 1080x1920@60, 1080x1920@30. No logo vector files exist anywhere except inside the git-ignored outro `.aep`.

**AE platform facts (web research, verified against docs)**
- UXP panels do not exist for After Effects as of 2026 (only Photoshop, InDesign, Premiere 25.6+). CEP 12 (Node 17.7.1, CEF 99) is the only panel path; host id `AEFT`, AE 2025 = CSXS.12. Registry key must be REG_SZ "1" (already set here). Extensions folder `%APPDATA%\Adobe\CEP\extensions\`. Manifest: `<Host Name="AEFT" Version="[22.0,99.9]"/>`, `<RequiredRuntime Name="CSXS" Version="11.0"/>`, CEF flags `--enable-nodejs`.
- `AfterFX.exe -r script.jsx` executes inside the already running instance (Adobe docs). Each AE version's own exe targets its own instance. `aerender -reuse` uses a running instance (fixed since 22.6).
- ExtendScript is ES3: vendor `json2`; no `Date.toISOString`. `Pref_SCRIPTING_FILE_NETWORK_SECURITY` must be 1 for ExtendScript File I/O (Edit > Preferences > Scripting & Expressions); not needed when a CEP panel's Node does the file I/O.
- `comp.saveFrameToPng(time, File)` undocumented, works through 2026; black fringing on alpha; needs render-queue fallback. `RenderQueue.render()` blocks the UI. `app.scheduleTask` and `evalScript` are blocked while a modal dialog is open.
- Property access must be by matchName (`ADBE Transform Group` > `ADBE Position`); display names are locale dependent. Easing via `new KeyframeEase(speed, influence)` + `setTemporalEaseAtKey`; `setValuesAtTimes` for batch keyframes. MOGRT: `comp.exportAsMotionGraphicsTemplate()` (AE 15+), controller naming APIs (16.1+).
- Adobe ships an AI Assistant beta inside AE (Window > Assistant): project organisation, expressions, gen images/video. We should not compete there; compete on headless/batch/render, MOGRT + Premiere handoff, data-driven versioning, visual feedback loop, brand-aware motion.

**Open-source landscape (all MIT unless noted)**
| Repo | Stars | Bridge | Take |
|---|---|---|---|
| Dakkshin/after-effects-mcp | 585 | ScriptUI panel, `app.scheduleTask` 2000 ms, single `~/Documents/ae-mcp-bridge/ae_command.json`, no request ids, eval-JSON | Harvest JSX functions; do not reuse transport. Stale since 2026-04-01, 22 open issues, 15 unmerged PRs |
| juansilvadesign@feat/community-tools-bundle (PR #34) | fork | same | Best AE ExtendScript harvest: render queue, saveFrameToPng, KeyframeEase, text animators, trim paths, precompose, import, setTrackMatte (AE 23+ API + fallback), lights, removeKeyframe, renderer |
| sneakersk18 PR #38, shaunroot PR #40 | forks | same | Bug fixes to port: matchNames `ADBE Glo2`, `ADBE Motion Blur`; array values as strings; OneDrive KFM path mismatch; self-rescheduling instead of repeat to avoid modal collisions |
| Fansist/MCP | 0 | authenticated loopback WebSocket :19728 to CEP panel | Cleanest TS/zod/tests, undo discipline, matchNames, 24 tools |
| JUNKDOGE-JOE/after-effects-mcp | 53 | MCP HTTP server inside CEP panel + native AEGP | Ideas: `ae_toolSave` self-growing library, checkpoint/revert, `ae_validateExpressions` |
| HeroicSwan/after-effects-mcp | 2 | `AfterFX.exe -r` bootstraps a poller, per-instance dirs, request ids, watchdog | Headless fallback pattern without a panel |
| ishu86/after-effects-mcp | 23 | CEP, 100 ms file poll | Content library: lower thirds, titles, logo reveals, expression presets |
| TheLlamainator/after-effects-mcp | 16 | Dakkshin fork | Audio waveform to markers, preset search |
| Engine-Room-Games/after-effects-mcp | 6 | unsigned panel | Contact-sheet vision tool |
| kumoproductions/mcp-aftereffects | 52 | no panel, file IPC | npx zero-install UX, Node 24 |
| nexrender | 1.8k | aerender job runner | JSON job spec for data-driven renders; no MCP exists yet |
| premiere-pro-mcp (leancoderkavy) | 228 | CEP file bridge, proven here | **Skeleton to fork** |

**Corrections found during design (verified locally)**
- The Premiere `.zxp` that loads on Premiere 2025/2026 is **self-signed** (`%APPDATA%\Adobe\CEP\extensions\MCPBridgeCEP\META-INF\signatures.xml`: CN/O "MCP for Adobe Premiere Pro", 1024-bit RSA, notBefore 2026-08-23), produced by upstream `scripts/build-signed-cep.ps1` via `ZXPSignCmd -selfSignedCert`. What matters is installing the extracted `.zxp` with `META-INF/signatures.xml` + `mimetype` intact. `editorial/CLAUDE.md` must be corrected once M0 confirms the same on AE.
- `%TEMP%\CEP12-AEFT.log` shows AE 2026 scanning `%APPDATA%\Adobe\CEP\extensions` (rejects the Premiere learning panel as "not supported for this host"), so user-level discovery works; only signature acceptance is unknown. CSXS.12 is the live runtime for both 25.6 and 26.3. Set `LogLevel` to "6" during M0, restore to "1".
- `%APPDATA%\Adobe\After Effects\26.3\Scripts\Startup\` exists (user level, empty): a headless poller can be auto-started without admin.
- `claude mcp get premiere-pro`: user scope, command `C:\Program Files\nodejs\node.exe`, args `<pkg>\dist\index.js`, env `PREMIERE_TEMP_DIR`. Mirror for `ae`.
- Upstream `cep-plugin/CSInterface.js` is a 70-line shim (evalScript, getHostEnvironment, getSystemPath); copy as-is.

## User decisions (asked 2026-09-02)
- Ambition: **internal Silia/Creai tool first**, built so a later public release stays possible (brand layer separate from core).
- Scope of first pass: **everything, including the Silia brand layer** and Premiere handoff.
- Live test target: **AE 2026 (26.3)** primary; 2025 verified at the end.

## Architecture (recommended)

**Transport**: file bridge shared by two executors, chosen by `AE_MCP_TRANSPORT=cep|poller|auto`.
- Primary executor: CEP bundle `AeMcpCEP` (bundle id `com.silia.ae.mcp`, extensions `.panel` visible + `.headless` Custom 1x1 auto-start on `ApplicationActivate`), CEF `--enable-nodejs --allow-file-access-from-files`. Panel Node polls `cmd_*.jsx` every 200 ms, claims by atomic rename to `cmd_<id>.<ENGINE>.claimed.jsx`, runs `cs.evalScript('$.evalFile("<claimed>")')` (avoids evalScript string-size/UTF-8 issues with Spanish text), writes `busy_<id>.json` every 2 s, `res_<id>.json`, `presence_<ENGINE>.json` every 5 s, `panel.log`. No AE scripting pref needed because Node does the file I/O.
- Fallback executor: headless poller installed by `AfterFX.com -r ensure-poller.jsx` (runs inside the running instance), self-rescheduling `app.scheduleTask("__aeMcpPoll()", 250, false)`, same files; requires `Pref_SCRIPTING_FILE_NETWORK_SECURITY=1` (enable via prefs file with AE closed, or `app.preferences.savePrefAsLong("Main Pref Section v2", ...)` through the CEP bridge). Optional user-level Startup bootstrap.
- No WebSocket in v1; `Transport` interface (`send`, `status`, `ensureReady`) leaves the slot open.
- Bridge root `%LOCALAPPDATA%\Temp\ae-mcp-bridge\v<major>\` (or `AE_MCP_TEMP_DIR`), per AE major so 2025 and 2026 never see each other's commands; `AE_MCP_TARGET=2026|26|auto` (auto = freshest presence file). Ids `${Date.now()}_${counter}_${hex4}` (two servers, Claude Code + Desktop, may share a dir). Single-flight queue per server process. Orphan cleanup of `res_*` older than 10 min.
- Helpers: build concatenates `jsx/vendor/json2.js` + `jsx/helpers.jsx` into `dist/jsx/helpers.jsx`, written once as `helpers_<md5-12>.jsx` (UTF-8 with BOM), loaded by a bootstrap line guarded by `__AE_MCP_HELPERS_V`. Helpers as real `.jsx` files (not TS template strings) so `types-for-adobe` can check them.
- Timeouts: default 30 s (`AE_MCP_TIMEOUT_MS`), hard cap max(4x, 120 s). Fresh busy file at deadline => error code `ENGINE_BUSY` "a dialog inside After Effects is probably blocking the scripting engine". No presence => `NO_LISTENER` listing dirs seen. Codes: `TIMEOUT | ENGINE_BUSY | NO_LISTENER | SCRIPT_ERROR | PARSE`.
- Rendering: never `renderQueue.render()` by default (blocks evalScript). `render_start` saves project (requires `app.project.file` or `save_as`), spawns `aerender.exe -project -comp -RStemplate -OMtemplate -output -continueOnMissingFootage` as an async job; `render_status(jobId)` parses `PROGRESS:` lines; `render_cancel`. Never `-reuse`. A clearly named blocking RQ tool exists for tiny comps with explicit `timeout_ms`.
- Frame capture: `__saveFrame(comp, time, path, {background})`: inside an undo group add a bottom solid when a background is given (hides `saveFrameToPng` black alpha fringe), `saveFrameToPng`, remove solid, verify file; fallback to render-queue single frame with a PNG output template (error `NO_PNG_TEMPLATE` if none, since this install has none). Node reads the PNG → base64 → MCP `image/png` content block (upstream `capture_frame` pattern).

**helpers.jsx blocks**: json2 (guarded); `__result/__error(e, code)` with `line/fileName`; `__ver()`/`__need(min, feature)` gating (`layer.id` 22.0, `setTrackMatte` 23.0 else `trackMatteType`, `saveFrameToPng` probed, `queueInAME` 22.0, `app.fonts` 24.0); `__comp(ref)` (`"active"`, id, name, `{id}|{name}`), `__layer(comp, ref)` (index, id, name), `__prop(root, "ADBE Transform Group/ADBE Position")` matchName walk with effects via `ADBE Effect Parade`; serializers `__propInfo`, `__value` (arrays, TextDocument, Shape, MarkerValue), `__layerInfo`, `__compInfo`; `__mutate(name, fn)` = one `app.beginUndoGroup("AE MCP: "+name)` per tool call; `__changed(read, mutate)` returns `{before, after}` (read-back, the Premiere lesson); `__setKeys(prop, keys[])` with `KeyframeEase`, `setInterpolationTypeAtKey`, string-array coercion (PR #38); `MATCHNAME_FIXES` table kept in TS; `__warn` accumulates `data.warnings`; `$.locale`/`app.isoLanguage` reported by `verify_ae_connection`.

**Repo** `C:\Users\User\silia-os\editorial\projects\ae-mcp\` (own git repo, own `.gitignore` so `.aep/.aet` templates are not swallowed by editorial's `**/*.aep`):
```
package.json (@silia/ae-mcp, type module, bin ae-mcp, node >=20.19)   tsconfig.json (NodeNext/ES2022/strict)   vitest.config.ts
LICENSE (MIT)  THIRD_PARTY_NOTICES.md (upstream MIT notice + commit)  README.md (EN)  docs/*.md (ES)
src/index.ts  src/server.ts  src/config.ts
src/bridge/{transport,protocol,bridge-dir,file-transport,poller-transport,script-builder,helpers-loader}.ts
src/jsx/{vendor/json2.js, helpers.jsx, ensure-poller.jsx, poller-startup.jsx}   (copied to dist/jsx at build)
src/tools/*.ts (one module per category, getXTools(ctx))   src/render/aerender.ts
src/security/{capabilities,audit,index}.ts   src/diagnostics/{doctor,cep-logs,first-run}.ts   src/workflows/tool-metadata.ts
cep-plugin/{CSXS/manifest.xml,.debug,index.html,main.js,styles.css,host.jsx,CSInterface.js}
scripts/{install-cep,uninstall-cep,build-signed-cep,enable-scripting-pref}.ps1  scripts/{generate-supported-actions,copy-jsx}.mjs
presets/silia/ (brand layer: tokens, templates, fonts pointer)   templates/ (.aep/.aet)   tests/{unit,integration,fixtures}
```
Deps: `@modelcontextprotocol/sdk ^1.30`, `zod ^4.4`. Dev: `typescript ^5.9`, `vitest ^4`, `@types/node`, `types-for-adobe`. No `ws`, no `posthog-node`.

**Vendoring map** (clone `leancoderkavy/premiere-pro-mcp` depth 1 into scratchpad; copy files, not a fork; record commit in THIRD_PARTY_NOTICES):
| From upstream | To | Keep / change |
|---|---|---|
| `src/bridge/file-bridge.ts` | `bridge/file-transport.ts`, `bridge-dir.ts` | keep ensureDir, pollForResponse (fs.watch + 250 ms), busy freshness, hard cap, validateScript, cleanup; rename env/dirs; ids with random suffix |
| `src/bridge/script-builder.ts` | `bridge/script-builder.ts` | keep buildScript, escapeForExtendScript (+`\u2028/\u2029`), bootstrap; delete Premiere HELPERS string |
| `src/security/*` | `security/*` | keep logic; AE tool-name tables; audit type `ae-mcp-audit`; fail closed to `edit`; `export` regex `^(render_|save_frame|export_)` |
| `src/server.ts` | `server.ts` | keep jsonSchema→zod, registration loop, permission guard, image block; drop telemetry/UXP/context/intake; instructions resource `config://ae-instructions` |
| `src/index.ts` | `index.ts` | keep flags + PowerShell dispatch; add `--uninstall-cep --sign-cep --enable-scripting-pref --install-poller --print-mcp-config` |
| `src/diagnostics.ts` | `diagnostics/doctor.ts` | AE paths, registry kinds, AE installs, aerender, pref state, last CEP signature failure |
| `src/workflows/tool-metadata.ts` | same | verbatim; AE destructive prefixes |
| `src/tools/{health,scripting,edit-plans}.ts` | `tools/{health,scripting,plans}.ts` | pattern only |
| `cep-plugin/main.js` | same | keep nodeRequire, ENGINE_ID claim, heartbeat, empty-result detection; strip updater + Premiere evalScript; switch to `$.evalFile`; per-version dir from `getHostEnvironment().appVersion`; presence file |
| `cep-plugin/{CSXS/manifest.xml,.debug,index.html,styles.css,host.jsx,CSInterface.js}` | same | AEFT host `[17.0,99.9]`, CSXS 9.0 runtime, ids `com.silia.ae.mcp.*`, menu "Silia AE MCP", panel 400x300; `.debug` ports 8092/8093; strip updater UI |
| `scripts/install-cep.ps1`, `build-signed-cep.ps1` | same | dest `AeMcpCEP`; logs `CEP*-AEFT.log`; ZXPSignCmd from `editorial/tools/zxp-signing/`; fresh cert CN "Silia AE MCP", password in `.env.local` (never committed) |
| not copied | | telemetry, http-*, uxp-*, context/, intake/, ai/, Premiere tools, updater.cjs, build-chat-*, publish scripts |

**CLI**: `--install-cep [--unsigned]` (prefers `artifacts/AeMcpCEP.zxp`, Expand-Archive, PlayerDebugMode REG_SZ on CSXS.9..14, then diagnose) · `--diagnose-cep` · `--uninstall-cep` (folder only) · `--sign-cep` · `--enable-scripting-pref --ae 26.3` (refuses if AfterFX running; backs up prefs) · `--install-poller [--startup] --ae 2026` · `--doctor [--json]` · `--support-bundle` · `--print-mcp-config`.
Registration: `claude mcp add ae -s user -e AE_MCP_TARGET=2026 -- "C:\Program Files\nodejs\node.exe" "C:\Users\User\silia-os\editorial\projects\ae-mcp\dist\index.js"`; Claude Desktop JSON equivalent.

## Milestone 0: prove the CEP bundle loads on AE 2026 (before server code)
1. Minimal bundle (manifest, .debug, index.html, main.js that writes `presence_*.json` and logs `app.version`, CSInterface shim, host.jsx).
2. Set `HKCU\Software\Adobe\CSXS.12\LogLevel`="6"; ensure PlayerDebugMode REG_SZ "1" on CSXS.9..14. AE fully closed between installs.
3. Attempt A unsigned: copy to `%APPDATA%\Adobe\CEP\extensions\AeMcpCEP`, launch AE 2026, check Window > Extensions > Silia AE MCP, read `%TEMP%\CEP12-AEFT.log` and `CEPHtmlEngine12-AEFT-26.3-com.silia.ae.mcp.*.log`, presence file in `v26\`.
4. Attempt B self-signed: `build-signed-cep.ps1` → `artifacts/AeMcpCEP.zxp`, `ZXPSignCmd -verify`, remove unsigned folder, Expand-Archive keeping META-INF, relaunch, re-read logs. B2: same with the existing Premiere cert to rule out cert differences.
5. Also verify: headless auto-start (presence with `source:"cep-headless"` without opening the panel), evalScript round trip, `nodeRequire("fs")` works.
Decision tree: A loads → dev unsigned, ship signed. A fails/B loads → CEP with signed artifact, correct `editorial/CLAUDE.md`. Both fail → poller transport primary, enable scripting pref, Startup bootstrap, keep CEP behind flag; record log lines in `docs/SETUP-LOG-ae-mcp.md`. Headless not auto-starting → dock panel once (AE restores it), try `ApplicationInitialized`. `nodeRequire` undefined → try `--mixed-context`, else ExtendScript-side writes (needs pref).
Exit criterion: refreshing presence file plus one hand-made `cmd_` → `res_` round trip.

## Milestones after M0
- **M1** skeleton + vendored TS + helpers.jsx/json2 + file transport + `verify_ae_connection`, `ping`, `execute_extendscript` (gated) + unit tests green + `claude mcp add ae`.
- **M2** core tools (surface below) with `__mutate` + read-back, capability tables, `docs:supported-actions`.
- **M3** `save_frame` image block + contact sheet, aerender jobs, blocking RQ tool, `get_bridge_status`, modal handling.
- **M4** poller transport + `--enable-scripting-pref` + Startup bootstrap (kept even if CEP works, as the AE 2027 hedge).
- **M5** plans (create/preview/apply), signed `.zxp`, install/diagnose/doctor, live integration suite, README (EN) + docs (ES), `editorial/CLAUDE.md` update.
- **M6** Silia brand layer + Premiere handoff (surface below).

## Tool surface (44 consolidated tools; `action` enum per tool keeps tools/list small)

Design rules for every tool: matchName paths only; every mutation runs in one undo group (`try/finally`) and returns a read-back snapshot of the touched object, never a bare `{success:true}`; vision tools return MCP `image` content (JPEG for sheets, PNG when alpha matters, max 1280 px wide); files go to caller paths or `~/.ae-mcp/scratch/<session>/`. Snapshot shapes: `LayerRef {index,id,name,type,in,out,start,enabled,parentIndex,is3D,blend,matte}`, `CompRef {id,name,w,h,fps,duration,workArea,bg,layerCount,renderer}`, `PropSnapshot {path,matchName,valueType,value,numKeys,expression,expressionError,isSpatial,dims}`, `KeyList [{i,t,value,inInterp,outInterp,inEase,outEase,roving}]`, `ItemRef {id,name,type,path,missing,w,h,fps,duration,hasAlpha}`.

| Module | Tools (actions) |
|---|---|
| core | `ae_status` (deep: CEP install, RS/OM templates, fonts incl. ES Klarheit, aerender, ffmpeg, missing footage) · `ae_undo` (undo/redo N groups) |
| project | `ae_project` (info/new/open/save/save_copy/close/set_settings) · `ae_items` (list/get/import/import_sequence/replace/relink_missing/interpret/create_folder/move/rename/delete/find_missing) |
| comps | `ae_comp` (list/get/create/update/duplicate/delete/set_active/open; presets `h1080p30`, `v1080x1920p60`, `v1080x1920p30`) · `ae_markers` (comp/layer; list/add/add_bulk/update/remove/clear) · `ae_precompose` |
| layers | `ae_layer_create` (kind: text/box_text/shape/solid/adjustment/null/camera/light/footage/comp) · `ae_layer_query` (list/get with depth, effects, masks, textDoc, at t) · `ae_layer_update` (rename/set_timing/set_parent/set_blend/set_matte [AE 23+ `setTrackMatte` + legacy]/set_3d/set_flags/reorder/duplicate/delete/set_quality/set_time_remap/set_label) · `ae_layer_transform` (set/keyframe/fit/center/reset) · `ae_masks` (list/add/update/remove) |
| properties | `ae_property_get` (value/tree/search) · `ae_property_set` (multi-set with coercion: hex→0..1, enum labels, `"50%"`, 2D/3D by dims) · `ae_keyframes` (set_values_at_times/add/remove/list/offset/scale_time/copy) · `ae_ease` (preset/custom/interpolation/spatial/roving/from_cubic_bezier; presets linear, ease, ease_in/out/in_out, power2_out, power3_out, power3_in_out, expo_out, `silia.<token>`) · `ae_expression` (get/set/set_batch/remove/validate/validate_all; dryRun restores; `evalAt` forces runtime errors; `library:` wiggle/loop/inertia/spring/link) |
| effects | `ae_effects_catalog` (effects/presets/resolve with corrections table) · `ae_effect` (list/apply/set_params/get_params/remove/reorder/toggle/duplicate/apply_preset .ffx; templates as data in `effects.json`) |
| text/shapes | `ae_text` (get/set/set_keyframes hold source text/fonts via `app.fonts` 24+) · `ae_text_animator` (list/add/set_selector/set_property/remove/preset letter_stagger, word_stagger, line_rise, typewriter, blur_in) · `ae_shape` (list/add_group/add_path/add_fill/add_stroke/add_trim/add_repeater/add_round_corners/set/remove) |
| render/vision | `ae_render_queue` (list/add/update/remove/clear/templates/save_om_template/queue_in_ame/render[blocking, warns]) · `ae_render` (start/status/cancel/list/verify; aerender job on a `save_copy`; verify = ffprobe + `blackdetect` + `signalstats`, expectations → `violations[]`) · `ae_frame` (capture/contact_sheet/stats/compare; times[], every, atMarkers, atKeyframes; soloLayers/hideLayers; labels) |
| MOGRT/handoff | `ae_mogrt` (controllers/add/rename/set_template_name/remove/export/open_panel/validate) · `ae_handoff` (mogrt/dynamic_link_comps/alpha_render → returns artifact + the exact `premiere-pro` MCP call, e.g. `import_mogrt`/`import_ae_comps`/`import_media`, plus `verifyWith: get_full_sequence_info`) |
| audio | `ae_audio` (info/set_levels/envelope/to_markers onsets|beats|turns/silences; analysis Node-side with ffmpeg) |
| batch/safety/library | `ae_batch` (ops[] in one undo group + one round trip; onError stop/continue/rollback) · `ae_execute_extendscript` (needs `confirm:true` AND `AE_MCP_ALLOW_RAW=1`; wrapped; 200 KB limit) · `ae_checkpoint` (create/list/revert/delete/diff via save-copy-and-reopen) · `ae_tool_library` (save/list/get/run/update/delete/promote; `{{param}}` binding; SHA-256 dedup; `promote` registers `lib_<name>` and emits `tools/list_changed`) |
| silia | `silia_tokens` (get/resolve_ease) · `silia_comp` · `silia_lower_third` (create/update; variants lime/violeta/rosa/dark; entry "confirmed") · `silia_type` (title/kinetic/word_reveal) · `silia_captions` (build/preview/to_markers; accepts Whisper JSONL ms `{"start","end","text"}` and `TURNS_TIMED` seconds `{who,start,end,words:[{w,t}]}`; default mode `accumulate_turn` = only spoken words on screen; reports `overlaps[]`) · `silia_push_25d` (4.5..6 %, preScale 2 via collapsed precomp) · `silia_outro` (plan/render; disables missing-footage layers; head black 0.43 s verified) · `silia_conform` (analyze/apply 59.94/60/30/24) · `silia_grade` (retro look as `.ffx` applied to adjustment layer, hold then dissolve) · `silia_ui_composite` (Figma-exported spec over plate) |
| versioning/lottie | `ae_versions` (plan/run/status/cancel; nexrender-style spec: template, assets by layerName, variants, output nameTemplate; each job auto-verified) · `ae_lottie` (detect/export; Bodymovin is NOT installed here, so experimental only) |

**Silia motion tokens (first written definition, served by `silia_tokens` and `ae://silia/tokens`)**: durations `xs 0.16, sm 0.20, md 0.32, lg 0.50, xl 0.85`; eases as cubic-bezier converted to `KeyframeEase` (`power3.out` (0.215,0.61,0.355,1), `power3.inOut` (0.645,0.045,0.355,1), `power2.out` (0.25,0.46,0.45,0.94), `expo.out` (0.19,1,0.22,1); `back.out`/spring → 3-key overshoot or library expression). Conversion: out-influence = x1·100, out-speed = (y1/x1)·Δv/Δt; in-influence = (1−x2)·100, in-speed = ((1−y2)/(1−x2))·Δv/Δt. Named patterns: `confirmed_entry` (opacity 0→1, Y +18→0, md, power3.out), `card_travel` (+630 px, 0.85 s, power3.inOut), `zoom_punch` (1→1.09→1, 0.33 s), `word_reveal` (latency 0.16, fade 0.20 to 0.95). Colors, fonts (PostScript `ESKlarheitGrotesk-Bk/-Md`, verified via `app.fonts`; both installed system-wide), five orb ramps, formats, rule "text on Lime is always black".

**Resources**: `ae://status`, `ae://project`, `ae://comps`, `ae://comp/{name}`, `ae://effects/catalog`, `ae://matchnames` (curated cheat sheet), `ae://render/templates`, `ae://render/jobs`, `ae://library`, `ae://silia/tokens`, `ae://silia/templates`, `config://ae-instructions`.
**Prompts**: `ae-safe-edit` (checkpoint → edit → read-back → frame → accept/revert), `visual-qa`, `build-lower-third`, `captions-from-transcript`, `regen-outro`, `export-mogrt-to-premiere`, `version-matrix`, `push-25d`.

## Code-harvest map
Global fixes done once in `helpers.jsx`: json2 for JSON; `__arr.each/map/indexOf`, `__str.trim` (ES3 has none); `__coerce(value, prop)` (string arrays → numbers, colors → 0..1, 2D/3D by `threeDLayer`); `__withUndo` with try/finally; `__prop` matchName chain with `[i]` for duplicate effects and display-name fallback; `matchnames.json` corrections (Glow `ADBE Glo2`, Directional Blur `ADBE Motion Blur`, Gaussian Blur `ADBE Gaussian Blur 2`, Levels `ADBE Pro Levels2`/`ADBE Easy Levels2`, Hue/Sat `ADBE HUE SATURATION`, Dropdown `ADBE Dropdown Control`, Round Corners `ADBE Vector Filter - RC`, Trim `ADBE Vector Filter - Trim`, Repeater `ADBE Vector Filter - Repeater`) validated against `app.effects` at runtime; `setInterpolationTypeAtKey(BEZIER)` before `setTemporalEaseAtKey`; `__easeArrays` builds correct arity (spatial props take 1 `KeyframeEase` per side, non-spatial multi-dim take one per dimension); `__comp` with `instanceof CompItem`; paths via `File(p.replace(/\\/g,'/'))`.

| Tool | Harvest from | Fix while porting |
|---|---|---|
| `ae_comp`, `ae_layer_create` (text/shape/solid/adj/camera/null), `ae_layer_transform`, `ae_masks`, `ae_property_set`, `ae_keyframes`, `ae_expression set`, `ae_effect apply/templates`, `ae_layer_query list` | Dakkshin `mcp-bridge-auto.jsx` | matchNames, undo, coercion, read-back, templates → data |
| `ae_render_queue`, `ae_frame capture`, `ae_ease`, `ae_text_animator`, `ae_shape add_trim`, `ae_precompose`, `ae_items import`, `ae_layer_update set_matte/set_parent/reorder/set_blend/set_3d`, `ae_layer_create light/null`, `ae_layer_query get`, `ae_keyframes remove`, `ae_comp renderer/delete`, `ae_project save` | juansilvadesign bundle (`feat/community-tools-bundle`) | non-blocking RQ by default, ease arity, selector advanced group, save_copy reopen semantics |
| `ae_effects_catalog`, `ae_audio`, `ae_markers add_bulk` | TheLlamainator | analysis moved to Node ffmpeg (AE can't read samples) |
| `ae_frame` see-frame, aerender background, per-command ids, RTL text | a-y-ibrahim | fold into transport + `ae_render` |
| `ae_expression validate`, `ae_checkpoint`, `ae_tool_library` | JUNKDOGE-JOE (ideas) | write new |
| `ae_frame contact_sheet` | Engine-Room-Games (idea) | Node `sharp` grid + timecode labels |
| `silia_lower_third/type` structure | ishu86 (structural reference only) | rewrite with Silia tokens; never ship generic looks |
| `ae_versions` | nexrender job spec (concept) | write new |
| bug fixes | sneakersk18 PR #38, shaunroot PR #40 | matchNames, string arrays, self-rescheduling poller |
| `silia_outro` | `editorial/.claude/skills/demo-agente-voz/references/outro.md` + `02-MCPS-Y-HERRAMIENTAS.md` | codify existing aerender + toggle-layers-save-copy recipe |
| `silia_captions` | `editorial/projects/demo-agente-voz/_comun/tools/sincronizar.js`, `.../02-finanzas/work/audio/palabras.json` | normalize both transcript shapes to seconds |

## Value-add ranking (what beats Synthetic and avoids Adobe's Assistant)
1. Visual feedback loop (`ae_frame`) 2. Expression validation 3. aerender jobs + verify 4. Transcript → captions 5. Silia tokens + templates 6. MOGRT → Premiere handoff 7. Data-driven versioning 8. Checkpoint/revert + batch rollback 9. Self-growing tool library 10. Audio → markers 11. outro/push/conform/grade 12. UI composite 13. Lottie (only if Bodymovin gets installed).

## Delivery order (maps to milestones above; ~S 0.5 d, M 1–2 d, L 3–5 d)
| Phase | Tools | Effort |
|---|---|---|
| M0 | CEP load proof | S |
| M1 | skeleton, transport, helpers, `ae_status`, `ae_execute_extendscript` | M |
| M2 (Phase 1 core) | `ae_undo ae_project ae_items ae_comp ae_precompose ae_layer_* ae_property_get/set ae_keyframes ae_effects_catalog ae_effect ae_text ae_batch ae_checkpoint`, resources status/project/comps/matchnames | ~9–11 d |
| M3 (Phase 2) | `ae_ease ae_expression ae_text_animator ae_shape ae_masks ae_markers ae_render_queue ae_render ae_frame ae_audio`, prompts ae-safe-edit, visual-qa | ~8–9 d |
| M4 | poller transport, scripting pref, Startup bootstrap | M |
| M5 | plans, signed .zxp, install/diagnose/doctor, live suite, docs, `editorial/CLAUDE.md` correction + new Permanent-facts bullet, `editorial/.claude/skills/ae-motion/SKILL.md` | M–L |
| M6 (Phase 3) | `silia_*`, `ae_mogrt`, `ae_handoff`, Silia prompts | ~9–11 d |
| M7 (Phase 4) | `ae_tool_library`, `ae_versions`, `silia_ui_composite`, `ae_lottie` (conditional) | ~8–12 d |
Dependencies: `ae_frame` before any Silia template; `ae_render verify` before `silia_outro`; `ae_ease from_cubic_bezier` before `silia_tokens`; `ae_checkpoint` before `ae_versions`; `ae_execute_extendscript` before `ae_tool_library`.

## Verification
**Unit (vitest, no AE)**: script-builder escaping (quotes, backslash, newlines, ` `, Spanish accents, emoji) and `validateScript` gating; helpers-loader writes once with BOM; `jsx-helpers.test` runs `dist/jsx/helpers.jsx` in `node:vm` with `JSON` deleted and a stub `app` (json2 installs, envelopes, `__prop` walk, `__coerce`, `__easeArrays` arity for Position/Anchor/Scale/Opacity/Color); file-transport with a fake executor (claim, busy → `ENGINE_BUSY`, no presence → `NO_LISTENER`, orphan cleanup, single-flight); bridge-dir target selection; capabilities fail-closed; aerender stdout parsing; transcript normalizer for both shapes; cubic-bezier → KeyframeEase numbers.
**Live (`AE_MCP_LIVE=1`, AE 2026 open, InMemoryTransport client)**: `ae_status` reachable under 2 s with version and transport; create 1920x1080@30 1 s comp → read-back; text layer "Silia — prueba ñ" round-trips; keyframes with ease → `numKeys 2`, values match, ease read back; `ae_frame capture` at 0.5 s → `image/png` block, PNG IHDR 1920x1080; `ae_render start` on save_copy → `status done` → `verify` passes; `ae_checkpoint create/revert`; `ae_expression validate` catches a deliberate error; `silia_lower_third create` → contact sheet; `silia_outro plan` on the real outro `.aep` lists the missing-footage layers; `ae_mogrt export` produces a `.mogrt` and `ae_handoff mogrt` returns an `import_mogrt` call; then run that call through the existing `premiere-pro` MCP and confirm with `get_full_sequence_info`. Manual once: one undo step per tool call in Edit > Undo.
**Logs**: `Get-Content "$env:TEMP\CEP12-AEFT.log" -Tail 40`; `CEPHtmlEngine12-AEFT-*.log`; `%LOCALAPPDATA%\Temp\ae-mcp-bridge\v26\panel.log`; `ae-mcp --diagnose-cep`; `ae-mcp --doctor --json`. Finally verify on AE 2025 (`AE_MCP_TARGET=2025`).

## Workspace edits outside the new repo
- `editorial/CLAUDE.md`: new Permanent-facts bullet for the AE MCP (registration, first call `ae_status`, bridge dir, `ae_handoff` → Premiere discipline); correct the ZXP-signing paragraph per the self-signed finding; add the outro/`-noui` facts pointer.
- `editorial/.claude/skills/ae-motion/SKILL.md`: procedural workflow (safe-edit loop, captions, lower thirds, outro regen, MOGRT handoff), gotchas table seeded from research (`saveFrameToPng` fringe, modal blocks bridge, `render()` blocks, fonts substitute silently, spatial ease arity).
- `editorial/tools/zxp-signing/README.md`: note the fresh `ae-mcp` cert and password location (`.env.local`, not committed).
- Memory: save a project memory pointing at the repo and M0 outcome once known.

## Risks
| Risk | Mitigation |
|---|---|
| AE 2026 rejects unsigned/self-signed CEP | M0 decision tree; poller transport shares protocol |
| Headless `StartOn` not honoured | dock panel once; try `ApplicationInitialized`; Startup poller |
| Modal dialog wedges bridge | busy heartbeat → `ENGINE_BUSY`; `get_bridge_status`; never call UI-opening APIs without explicit confirm |
| `renderQueue.render()` blocks | aerender jobs default |
| `saveFrameToPng` absent/black fringe | probe + solid background + RQ fallback (`NO_PNG_TEMPLATE` error since no PNG template exists here) |
| Fonts substitute silently | read back `font` after `ae_text set`; `ae_mogrt validate` checks `app.fonts` |
| Two AE versions / two MCP clients | per-version dirs, `AE_MCP_TARGET`, random id suffix, orphan cleanup |
| UTF-8 mangling | BOM + `$.evalFile`; live test with ñ/accents |
| `save_copy` switches open project | save → `app.open(original)`; documented |
| Prefs file edit corrupts prefs | backup + AE-closed check; prefer in-app `savePrefAsLong` |
| Bodymovin absent | `ae_lottie detect` first; never a dependency |

---

# Plan 2 (2026-09-03): make Claude + AE smarter — skills, knowledge, plugins

> **Status 2026-09-03 (later):** P1 + P2 BUILT (commit b99e899, 77 unit tests): 1.1–1.6, 2.1–2.3, 2.5 (skills in progress). Not built: 2.4 preset registry (no free .ffx packs installed), P3 (no purchases per user; SVG import / Figma tool / SRT / ProRes deferred), P4. Not live-tested in AE yet: critique/keyframe_dump/legibility JSX.

## Context
The 44-tool server drives AE reliably but knows nothing about *good* motion: its ease table has 7 entries (and `SILIA_EASES` in `src/silia/tokens.ts` disagrees with `__EASE_PRESETS` in `src/jsx/helpers.jsx`), it has no duration/stagger/legibility rules, and `ae_frame` shows pixels without any rubric for judging them. Research (3 agents, verified URLs) found: (a) MIT/Apache skills and references worth adapting (LobzyJay/motion-design-with-claude, pushREC/after-effects-sdk-kb, TerminalSkills, LottieFiles archetypes); (b) AE 2026 native SVG import + `Layer.applyPreset(.ffx)` make Figma→AE and free preset packs drivable without Overlord/AEUX; (c) design-system motion tokens with permissive licenses (Carbon Apache-2.0, Material CC BY, Polaris MIT, easings.net MIT) plus numeric facts from Fluent/Atlassian/Apple/Val Head/Netflix/BBC/legibility.info; (d) VLM research (AniMINT arXiv 2604.26148, WebVR arXiv 2603.13391, CC BY 4.0) showing frames alone cannot judge easing: atomic binary rubrics + onion-skin composites + numeric keyframe dumps lift judge agreement from ~60% to 96%. The machine has zero third-party plugins; the user will buy if worth it.

## Architecture additions
1. `src/motion/` typed data (single source of truth): `eases.ts`, `durations.ts` (+`durationFor(distancePx, register)`), `staggers.ts`, `typography.ts`, `taxonomy.ts` (registers functional_ui|product_video, 7 AniMINT intents, 12 UX-in-Motion devices, 4 LottieFiles archetypes), `rubric.ts` (atomic binary checks), `house-style.ts` (SaaS-video sheet, labelled house opinion).
2. `data/` vendored markdown: `data/sdk/<object>.md` (pushREC chunks), `data/expressions/*.md`, `data/LICENSES/*`; add `data/**` to package `files`.
3. `src/resources.ts` → `src/resources/{index,motion,sdk,presets}.ts`; `ResourceTemplate` for `ae://sdk/{object}` and `motion://taxonomy/{kind}`.
4. `server.ts`: accept `data.images[]` (sheet + onion skin in one result) in addition to `data.base64`.
5. `presets/registry.json` + `src/presets/registry.ts` (name → file, source, license, appliesTo).
6. `tests/integration/*.live.test.ts` gated by `AE_MCP_LIVE=1`, one per item.
Every new tool/action also goes into `src/security/capabilities.ts` and `src/workflows/tool-metadata.ts`; regen `docs/supported-actions.md`; fix README tool count (says 37, registry has 44).

## P1 quick wins (knowledge in, drift out)
| # | Item | Files | Effort |
|---|---|---|---|
| 1.1 | Cross-system named eases in `ae_ease preset` (Carbon 6, Material 6, Fluent 3, Atlassian 4, easings.net, GSAP 23) resolved in TS to `{x1,y1,x2,y2}` → existing `__bezierToEase`; generate `__EASE_PRESETS` from the same table in `scripts/copy-jsx.mjs` | `src/motion/eases.ts`, `src/tools/properties.ts`, `src/silia/tokens.ts`, `src/jsx/helpers.jsx`, `scripts/copy-jsx.mjs` | M |
| 1.2 | Resources `motion://tokens/{durations,easings,staggers,distance-duration}`, `motion://ae/ease-conversion`, `motion://typography/legibility`, `motion://taxonomy/{kind}`, `motion://house-style/saas-video`, `motion://rubric/contact-sheet` | `src/resources/motion.ts` | S |
| 1.3 | Silia registers + archetype (`premium`); `silia_tokens action=plan_motion {intent, device, distancePx, register}` → duration/ease/stagger | `src/silia/tokens.ts`, `src/tools/silia.ts` | S |
| 1.4 | Expression library with tuned ranges (inertia amp 0.04–0.12 / freq 2–4 / decay 4–8, drift vs jitter wiggle, eKeys-style, eBox responsive box) with `{{param}}` placeholders | `src/motion/expressions.ts`, `src/tools/properties.ts` | S |
| 1.5 | `ae://sdk` + `ae://sdk/{object}` from pushREC (MIT) | `data/sdk/`, `src/resources/sdk.ts` | S |
| 1.6 | Frame numbers burned into contact sheets; default `every`=0.1 s when range ≤ 2 s | `src/tools/vision.ts` | S |

## P2 seeing and judging
| # | Item | Files | Effort |
|---|---|---|---|
| 2.1 | `ae_frame action=onion_skin` (decaying alpha + per-time tint + changed-pixel ROI boxes) | `src/tools/vision.ts` | M |
| 2.2 | `ae_frame action=critique`: images [sheet, onion] + `keyframeDump` (keys, eases, per-layer duration, stagger deltas) + auto-evaluated rubric (entrance ease-out, exit ease-in, durations in register, no uniform 300 ms, stagger in range, keys inside in/out, glow never to 0) + numeric `fixes` + `unverifiable` list for the VLM; prompt `motion-critique` replaces `visual-qa` | `src/tools/vision.ts`, `src/motion/rubric.ts`, `src/server.ts`, `src/prompts.ts` | M |
| 2.3 | `ae_text action=legibility` (≥40 px@1080p scaled, ≤30 chars/line body / ≤42 captions, ≤3 lines, CPS ≤13 / 17–20 captions, hold ≥1 s per 13 chars, title-safe 80% via `sourceRectAtTime`); `silia_captions` gains `warnings.legibility` | `src/tools/text.ts`, `src/motion/typography.ts`, `src/tools/silia2.ts` | S |
| 2.4 | Preset registry + `ae_effect apply_preset preset=<name>` (set `comp.time` to `at` first; read back added effects + new keys); seed with free .ffx packs after verifying they ship .ffx | `presets/registry.json`, `src/presets/registry.ts`, `src/tools/effects.ts` | M |
| 2.5 | Skill `editorial/.claude/skills/motion-intelligence/` (decision chain register→intent→device→duration→easing→choreography→critique; references generated from `src/motion/*` to avoid drift) + rewrite `ae-motion/SKILL.md` (Mode A live vs Mode B batch/`ae_tool_library`; points to `motion://` resources) | skills dir | M |

## P3 pipelines in/out
| # | Item | Files | Effort |
|---|---|---|---|
| 3.1 | `ae_items action=import_svg` (AE 2026 native; fix 1-frame comp duration/fps; `add_to_comp`) | `src/tools/project.ts` | S |
| 3.2 | `ae_figma_import` plan/import: SVG + Figma MCP text nodes/variables → shape layers + real text layers (ES Klarheit substitution warning) + variable→fill map; verify with `ae_frame compare reference_png=<Figma screenshot>` | `src/tools/figma.ts` (new), prompt `figma-to-ae` | L |
| 3.3 | SRT/VTT + ElevenLabs alignment JSON in `transcript.ts` → `silia_captions` | `src/silia/transcript.ts`, tests | S |
| 3.4 | Deep Glow 2 (paid): matchName via `app.effects`, guarded `deep_glow` template (`PLUGIN_MISSING` otherwise); removes the outro missing-effect path | `src/tools/effects.ts` | S |
| 3.5 | Pins & Boxes (paid, $39.99): API spike first, then `silia_lower_third box=responsive` | `src/tools/silia.ts`, `src/jsx/pinsboxes.jsx` | M |
| 3.6 | `ae://render/recipes` + `ae_render action=to_prores4444` (TIFF/PNG alpha sequence → ffmpeg ProRes 4444) | `src/tools/render.ts`, `src/render/aerender.ts` | M |

## P4 optional
4.1 `ae_lottie` detect/export via Bodymovin parser (free ZXP) + `puppeteer-lottie-cli` preview compare (L) · 4.2 `ae_comp dump_json` for `ae_checkpoint diff` (M) · 4.3 aequery-style selectors in `ae_layer_query` (M) · 4.4 harvest aedev-tools JSX idioms into `ae_tool_library` seeds (M).

## Plugins / servers
Buy: Deep Glow 2 (outro dependency), Pins & Boxes after spike. Defer: Animation Composer until 2.4 proves its presets are .ffx-drivable. Skip: Overlord, AEUX, Flow, Motion 4, GifGun, Ray Dynamic Color, KBar, Duik. Free installs: Bodymovin ZXP (P4), free text .ffx packs (P2).
Add MCP servers (user scope): ElevenLabs hosted (VO with word timings → captions/markers; key supplied by user, never in repo), Lottie Creator (P4). Figma and Premiere MCPs already present.

## Licensing
Verbatim OK: Carbon (Apache-2.0 NOTICE), Material (CC BY, attribution), Polaris/easings.net/pushREC/LobzyJay/eKeys/eBox (MIT), arXiv rubrics (CC BY 4.0, cite). Numbers only, own prose: Fluent 2, Atlassian, Apple HIG, Val Head, UX in Motion, Netflix, BBC, legibility.info, Adobe docs. Never: Devouring Details, Flow presets, studio commentary. Record all in `THIRD_PARTY_NOTICES.md` and `data/LICENSES/`.

## Verification
Unit: `src/motion/*` pure functions, bezier→KeyframeEase numbers vs Easy Ease (33.33/0), transcript SRT/VTT/ElevenLabs shapes, helpers.jsx in `node:vm`. Live (AE 2026): 1.1 read back influences after `ae_ease preset=material_emphasized_decelerate`; 2.2 deliberately wrong comp (uniform 300 ms, linear, ease-in entrance) → ≥3 rubric fails with numeric fixes → fix → pass; 2.3 caption comp CPS per keyframe; 2.4 preset keys start at `at`; 3.1 Figma SVG → editable shape layers with correct comp duration; 3.2 `meanAbsDiff` < 8 vs Figma screenshot; 3.4 `silia_outro plan` reports 0 missing effects.

## Risks to check live before investing
`applyPreset` keyframe placement and whether free packs ship .ffx; SVG `ImportOptions` duration behaviour on 26.3; sharp 0.35 `ensureAlpha`/`tint` semantics; Pins & Boxes API is advertised, not documented; Bodymovin parser contract varies by version.
