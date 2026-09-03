# ae-mcp — After Effects MCP server (Silia)

An MCP server that lets Claude (Claude Code, Claude Desktop, or any MCP client) drive Adobe After Effects on Windows: build comps and layers, animate with proper easing, apply effects by matchName, validate expressions, **see rendered frames**, render in the background with `aerender` and verify the output with ffprobe, export MOGRTs and hand them to the Premiere Pro MCP, and build on-brand Silia elements (lower thirds, titles, word-synced captions, 2.5D pushes, the outro).

Built for Silia / Creai as an internal tool; MIT licensed; adapted in part from [`premiere-pro-mcp`](https://github.com/leancoderkavy/premiere-pro-mcp) and the open-source After Effects MCP ecosystem (see `THIRD_PARTY_NOTICES.md`).

## Requirements

- Windows 10/11, After Effects 2025 or 2026 (verified on 26.3), Node 20.19+
- `ffmpeg` / `ffprobe` on PATH for render verification and audio analysis (WinGet build works)
- No ZXP signing needed: After Effects loads the unsigned CEP bridge when `PlayerDebugMode` is set (the installer does this)

## Install

```bash
npm install
npm run build
node dist/index.js --install-cep      # copies cep-plugin to %APPDATA%\Adobe\CEP\extensions\AeMcpCEP, sets PlayerDebugMode
node dist/index.js --doctor           # checks installs, registry, bridge dirs, ffmpeg
```

Restart After Effects fully. The bridge auto-starts (an invisible "headless" extension); `Window > Extensions > Silia AE MCP` shows a status panel.

Register the server:

```bash
claude mcp add ae -s user -e AE_MCP_TARGET=auto -- "C:\Program Files\nodejs\node.exe" "C:\<path>\ae-mcp\dist\index.js"
```

Claude Desktop: `node dist/index.js --print-mcp-config` prints the JSON snippet.

First call in every session: `ae_status`.

## How it works

```
MCP client ──stdio──> ae-mcp (Node) ──cmd_<id>.jsx──> %TEMP%\ae-mcp-bridge\v26\ <──poll 200 ms── CEP headless extension inside AE
                                     <──res_<id>.json──                                        (Node in CEP: $.evalFile → ExtendScript)
```

- One bridge directory per After Effects major version, so 2025 and 2026 never see each other's commands (`AE_MCP_TARGET=2026|26|auto`).
- Helpers (`src/jsx/helpers.jsx` + json2) are loaded once per engine, versioned by hash.
- Every mutating tool runs in **one undo group** and returns a **read-back snapshot** of what changed.
- Properties are addressed by **matchName** (`ADBE Transform Group/ADBE Position`) or aliases (`position`, `scale`, `opacity`, …); display names are locale dependent.
- Renders never block the UI: `ae_render` saves a copy and runs `aerender.exe` as a detached job, then verifies the file (duration, fps, size, alpha, head black, luma).
- Modal dialogs block the scripting engine. Calls return `ENGINE_BUSY`; `ae_dialogs` lists and answers them (the MOGRT font warning is answered automatically).

## Tools (44)

| Area | Tools |
|---|---|
| Core | `ae_status`, `ae_dialogs`, `ae_undo`, `ae_batch`, `ae_execute_extendscript` (gated: `AE_MCP_ALLOW_RAW=1`) |
| Project | `ae_project`, `ae_items` |
| Comps | `ae_comp`, `ae_markers`, `ae_precompose` |
| Layers | `ae_layer_create`, `ae_layer_query`, `ae_layer_update`, `ae_layer_transform`, `ae_masks` |
| Animation | `ae_property_get`, `ae_property_set`, `ae_keyframes`, `ae_ease` (57 named eases from Silia/GSAP, easings.net, Carbon, Material, Fluent, Atlassian + cubic-bezier; `list`), `ae_expression` (validate, parametrised library, `library_info`) |
| Effects / text / shapes | `ae_effects_catalog`, `ae_effect`, `ae_text`, `ae_text_animator`, `ae_shape` |
| Render & vision | `ae_render` (aerender jobs + verify), `ae_render_queue`, `ae_frame` (capture, contact sheet, stats, compare) |
| Safety & growth | `ae_checkpoint`, `ae_tool_library` (save working scripts; `promote` registers `lib_*` tools) |
| Handoff | `ae_mogrt`, `ae_handoff` (exact `premiere-pro` MCP calls), `ae_audio` |
| Silia | `silia_tokens` (tokens, `resolve_ease`, `plan_motion`: intent → register, duration, ease, stagger), `silia_comp`, `silia_lower_third`, `silia_type`, `silia_captions`, `silia_push_25d`, `silia_grade`, `silia_outro`, `silia_conform`, `silia_ui_composite` |
| Batch | `ae_versions` (nexrender-style data-driven renders) |

Full parameter reference: `docs/supported-actions.md` (`npm run docs:supported-actions`).

## Resources

| URI | Content |
|---|---|
| `config://ae-instructions`, `ae://matchnames`, `ae://status`, `ae://project`, `ae://comps` | Instructions, matchName cheat sheet, live bridge/project state |
| `motion://tokens/easings` | Every named ease: cubic-bezier, CSS, AE influences, GSAP name, role, source, license |
| `motion://tokens/durations`, `motion://tokens/staggers`, `motion://tokens/distance-duration` | Duration scales (Carbon, Material 3, Fluent 2, Atlassian, Val Head, Silia), stagger table, distance → duration formula |
| `motion://ae/ease-conversion` | cubic-bezier → KeyframeEase formulas, clamp, units, spatial arity caveat |
| `motion://taxonomy/{registers\|intents\|devices\|archetypes}` | Motion taxonomy (`src/motion/taxonomy.ts`) |
| `motion://house-style/saas-video` | Silia SaaS-video house style (opinion) |
| `ae://sdk`, `ae://sdk/{object}` | ExtendScript API reference per object (AE 26.0; `data/sdk`, from pushREC/after-effects-sdk-kb, MIT) |

Named eases live in `src/motion/eases.ts`; the build regenerates the `__EASE_PRESETS` block in `dist/jsx/helpers.jsx` from it.

## Environment

| Variable | Default | Meaning |
|---|---|---|
| `AE_MCP_TARGET` | `auto` | `2026`, `26`, `26.3` or `auto` (freshest live listener) |
| `AE_MCP_TEMP_DIR` | `%TEMP%\ae-mcp-bridge` | Bridge root (per-version `v<major>` subdirs) |
| `AE_MCP_TRANSPORT` | `auto` | `cep`, `poller` (headless `AfterFX -r` fallback), `auto` |
| `AE_MCP_TIMEOUT_MS` | `30000` | Default command timeout |
| `AE_MCP_ALLOW_RAW` | off | `1` enables `ae_execute_extendscript` and un-promoted library scripts |
| `AE_MCP_CAPABILITIES` | `inspect,edit,export,filesystem` | Authority profile; add `unsafe-script` for raw scripting |
| `AE_MCP_DATA_DIR` | `~/.ae-mcp` | Jobs, checkpoints, library, scratch frames |
| `AE_MCP_DEBUG` | off | Verbose stderr |

## CLI

`--install-cep [--unsigned]`, `--diagnose-cep`, `--uninstall-cep`, `--sign-cep`, `--install-poller [--ae 2026] [--startup]`, `--enable-scripting-pref --ae 26.3`, `--doctor [--json]`, `--print-mcp-config`, `--version`.

## Development

```bash
npm run build        # tsc + copy jsx
npm test             # unit tests (no AE needed; vitest, tests/unit)
npm run test:live    # integration against a running AE (AE_MCP_LIVE=1)
```

Lessons that cost time (all verified on AE 2026):

- `ShapeLayer`/`TextLayer` fail `instanceof AVLayer` in the shared engine: duck-type (`__isAV`).
- `app.effects[i]` is very slow to index: snapshot once per engine.
- `comp.saveFrameToPng` writes asynchronously (~100 ms): poll the file size before restoring layers.
- `aerender.exe` hangs at "Launching After Effects…" when spawned with a hidden console or a minimal environment; never render an `.aep` the GUI has open.
- The render engine also loads CEP extensions: the panel disables itself when `app.isRenderEngine`.
- `exportAsMotionGraphicsTemplate` shows a font-sync warning for non-Adobe fonts; `ae_dialogs` answers it with an Enter key message (`WM_COMMAND IDOK` is ignored by AE's custom buttons).
