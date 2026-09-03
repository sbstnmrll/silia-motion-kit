# ae-mcp supported tools

Generated 2026-09-03 from the tool registry. 44 tools.

| Tool | Authority | Actions | Description |
|---|---|---|---|
| `ae_audio` | edit | `info`, `envelope`, `to_markers`, `silences`, `set_levels` | Audio inspection and audio-driven markers (analysis runs in Node with ffmpeg; AE cannot read samples). info: audio layers in a comp with source file and levels. envelope: RMS envelope of a layer's source (or any file pat |
| `ae_batch` | edit | — | Run several tool calls as one unit. ops: [{tool, args}] executed in order; on_error stop (default) \| continue \| rollback (undo everything done so far). Because each op is its own undo group in AE, rollback undoes N gro |
| `ae_checkpoint` | filesystem | `create`, `list`, `revert`, `diff`, `delete` | Transactional safety for the open project. create: save a full copy of the project (with a label) plus a structural inventory, then continue working on the original. list: checkpoints for this project. revert: close the  |
| `ae_comp` | edit | `list`, `get`, `create`, `update`, `duplicate`, `delete`, `set_active`, `open` | Compositions. list: all comps. get: one comp with its layers. create: new comp (preset h1080p30\|v1080x1920p60\|v1080x1920p30\|... or explicit width/height/frame_rate; duration seconds; bg color). update: rename, duratio |
| `ae_dialogs` | inspect | `list`, `ok`, `cancel`, `close` | List or answer modal dialogs open in After Effects (Windows). A modal blocks the scripting engine, so tool calls return ENGINE_BUSY until it is dismissed. list: dialogs with their text. ok / cancel / close: answer one (h |
| `ae_ease` | edit | `preset`, `custom`, `from_cubic_bezier`, `interpolation`, `spatial`, `roving`, `list` | Easing and interpolation on existing keyframes. preset: apply a named ease to keys (indices or all); preset accepts any name from motion://tokens/easings — categories silia/gsap (ease, ease_in_out, power2_out, power3_out |
| `ae_effect` | edit | `list`, `apply`, `get_params`, `set_params`, `remove`, `reorder`, `toggle`, `duplicate`, `apply_preset` | Effects on a layer (effect parade). list; apply (matchName, display name, alias, or template name from ae_effects_catalog templates) with optional params {paramMatchNameOrName: value} and position; get_params (all parame |
| `ae_effects_catalog` | inspect | `effects`, `resolve`, `templates`, `presets` | Installed effects and presets. effects: search app.effects by regex on display name or matchName (category included). resolve: map a display name or alias to the canonical matchName (includes corrections: Glow=ADBE Glo2, |
| `ae_execute_extendscript` | unsafe-script | — | Run arbitrary ExtendScript inside After Effects (escape hatch when no dedicated tool fits). Gated: requires confirm=true AND the server started with AE_MCP_ALLOW_RAW=1 (or the unsafe-script capability). The code is wrapp |
| `ae_expression` | edit | `get`, `set`, `set_batch`, `remove`, `validate`, `validate_all`, `library_info` | Expressions with validation. get; set (expression text, or library=<name> with params={...} filling the {{param}} placeholders; library: wiggle, wiggle_slow, wiggle_drift, wiggle_jitter, loop_cycle, loop_pingpong, loop_o |
| `ae_frame` | export | `capture`, `contact_sheet`, `onion_skin`, `stats`, `compare`, `keyframe_dump`, `critique` | See what a comp actually renders, and judge it. capture: one frame at time t as an image (PNG, or JPEG for smaller payloads); background '#0A0A0B' flattens alpha (recommended). contact_sheet: several frames tiled into on |
| `ae_handoff` | filesystem | `mogrt`, `dynamic_link`, `alpha_render` | Prepare a Premiere Pro handoff. mogrt: given an exported .mogrt (or comp to export first) return the premiere-pro MCP call import_mogrt {mogrt_path, time_seconds, video_track_index}. dynamic_link: return the call import_ |
| `ae_items` | edit | `list`, `get`, `import`, `import_sequence`, `replace`, `relink_missing`, `interpret`, `create_folder`, `move`, `rename`, `delete`, `find_missing` | Project panel items (footage, comps, folders, solids). list: with filter {type, nameRegex, folder, missingOnly}. get: one item by id or name. import: file (or folder path) with import_as footage\|comp\|comp_cropped\|proj |
| `ae_keyframes` | edit | `set`, `add`, `remove`, `list`, `offset`, `scale_time`, `copy` | Keyframe CRUD on one property. set: write keys [{time, value, ease?, interpolation?}] (batched via setValuesAtTimes; existing keys at other times are kept). add: alias of set. remove: by times[], indices[], range {from,t |
| `ae_layer_create` | edit | — | Create a layer of any kind in a comp: text (point text), box_text (paragraph box), shape (with primitives rect\|ellipse\|polygon\|star), solid, adjustment, null, camera, light, footage (from item id/name), comp (nested c |
| `ae_layer_query` | inspect | `list`, `get` | Read layers. list: LayerRef[] for a comp with optional filter {nameRegex, kind, selected, enabled, hasAudio}. get: full detail for one layer: transform at time, effects (with params if include_effect_params), masks, text |
| `ae_layer_transform` | edit | `set`, `keyframe`, `fit`, `center`, `reset` | Transform ergonomics. set: static anchor/position/scale/rotation/opacity/orientation (arrays sized to the property; scale as percent, uniform number allowed). keyframe: same fields but written as keyframes at time t (wit |
| `ae_layer_update` | edit | `rename`, `set_timing`, `set_parent`, `set_blend`, `set_matte`, `set_3d`, `set_flags`, `reorder`, `duplicate`, `delete`, `set_quality`, `set_time_remap`, `set_label`, `set_comment` | Layer settings other than transform. rename; set_timing {in,out,start_time,stretch}; set_parent (parent layer or null, jump_to_parent keeps position); set_blend (mode name); set_matte {matte_layer, matte_type alpha\|alph |
| `ae_markers` | edit | `list`, `add`, `add_bulk`, `update`, `remove`, `clear` | Comp or layer markers. list; add one {time, comment, duration, label, chapter, url}; add_bulk many; update by index or time; remove by index or time; clear all. Target a layer by passing layer, otherwise the comp marker  |
| `ae_masks` | edit | `list`, `add`, `update`, `remove` | Layer masks. list; add a mask from shape {rect:[x,y,w,h]} \| {ellipse:[cx,cy,rx,ry]} \| {path:{vertices,inTangents,outTangents,closed}} with mode add\|subtract\|intersect\|lighten\|darken\|difference\|none, feather [x,y] |
| `ae_mogrt` | export | `controllers`, `add`, `rename`, `set_template_name`, `remove`, `validate`, `export`, `open_panel` | Essential Graphics / Motion Graphics Templates. controllers: list the comp's EGP controllers. add: expose a layer property as a controller (name). rename; set_template_name; remove (by index); validate: checks controller |
| `ae_precompose` | edit | — | Precompose layers into a new nested comp. move_all_attributes=true moves keyframes/effects into the precomp; false leaves them on the new layer. After Effects only allows false for a SINGLE layer (several layers always m |
| `ae_project` | edit | `info`, `new`, `open`, `save`, `save_copy`, `close`, `set_settings` | Project lifecycle. info: summary (path, dirty, comps, missing footage). new: new empty project (fails if the current one is dirty unless force). open: open an .aep. save: save (optionally save-as to a new path). save_cop |
| `ae_property_get` | inspect | `value`, `tree`, `search` | Read properties by matchName path. value: one property snapshot (value at time, keys, expression). tree: the property tree under a layer or a group path, to depth. search: find properties whose matchName or name matches  |
| `ae_property_set` | edit | — | Set one or more property values statically (removes nothing; if the property has keyframes the value is written at time at or the comp time as a keyframe). Values are coerced: "#RRGGBB" for colors, "50%" -> 50, stringifi |
| `ae_render` | export | `start`, `status`, `cancel`, `list`, `verify` | Background renders with aerender.exe (never blocks After Effects). start: saves a copy of the current project (save_copy_first, default true) and renders comp with rs_template/om_template to output; returns a job id. sta |
| `ae_render_queue` | export | `list`, `add`, `update`, `remove`, `clear`, `templates`, `queue_in_ame`, `render` | In-app render queue. list items; add a comp (rs_template, om_template, output path, optional frame range or work_area); update an item; remove; clear; templates (render settings and output module template names on this m |
| `ae_shape` | edit | `list`, `add_group`, `add_path`, `add_fill`, `add_stroke`, `add_trim`, `add_repeater`, `add_round_corners`, `set`, `remove` | Shape layer contents. list: tree of groups/paths/fills/strokes/operators with matchName paths. add_group (name, optional group_path parent). add_path {rect\|ellipse\|polystar\|custom} into a group. add_fill/add_stroke (c |
| `ae_status` | inspect | — | Health check and orientation. Always call this first. Reports whether the After Effects bridge is live (which AE version, which transport), the open project summary (path, dirty, comps, missing footage), the active comp, |
| `ae_text` | edit | `get`, `set`, `set_keyframes`, `fonts`, `legibility` | Text layer document. get: TextDocument snapshot (text, font, size, fill, stroke, tracking, leading, justification, box). set: change any of those (font by PostScript name; read-back flags silent font substitution). set_k |
| `ae_text_animator` | edit | `list`, `add`, `set_selector`, `set_property`, `remove`, `preset` | Text animators and range selectors. list; add an animator with properties {opacity, position:[x,y], scale:[x,y], rotation, tracking, blur:[x,y], fill:'#hex', line_spacing} and a range selector {start,end,offset, based_on |
| `ae_tool_library` | filesystem | `save`, `update`, `list`, `get`, `run`, `delete`, `promote` | Self-growing tool library. After a raw ExtendScript works (ae_execute_extendscript), save it here with a name, description and param schema so it can be re-run by name (and promoted to a first-class MCP tool). save/updat |
| `ae_undo` | edit | `undo`, `redo` | Undo or redo the last N undo groups in After Effects (each tool call is one group). Returns the active comp read-back after the operation. |
| `ae_versions` | filesystem | `plan`, `run`, `status`, `cancel` | Data-driven versions: render N variants of one template comp. spec: {template:{aep?, comp}, assets:[{layer, type text\|color\|toggle\|image\|video\|number\|audio, value, property?}], variants:[{id, ...fields}], output:{d |
| `silia_captions` | edit | `preview`, `build`, `to_markers` | Word-synced captions from a transcript. preview: parse the file (Whisper word JSON/JSONL in ms or seconds, or TURNS_TIMED in seconds), report format, speakers, word count, duration and turn overlaps without touching AE.  |
| `silia_comp` | edit | — | Create an on-brand Silia comp: format h1080p30 \| v1080x1920p60 \| v1080x1920p30, grafito background solid (or transparent), optional safe-margin guide layers (shy, guide) and an optional head-black solid of head_black_s |
| `silia_conform` | edit | `analyze`, `apply` | Frame-rate conform helper for mixed sources (59.94 / 60 / 30 / 24 fps). analyze: ffprobe each source file (or every footage item in the project) and report native fps, VFR, drift per minute against target_fps and the rec |
| `silia_grade` | edit | — | Retro/mono grade on a shot head that dissolves off: adds an adjustment layer over the target layer's span with a look (retro_90s: lifted blacks, warm bias, desaturation via Levels + Tint + Hue/Saturation + Noise; mono: T |
| `silia_lower_third` | edit | — | Build an on-brand lower third: rounded card (variant lime \| violeta \| rosa \| dark) with name (ES Klarheit Md) and optional role (Bk), positioned bottom-left or bottom-right inside the safe margin, with the confirmed e |
| `silia_outro` | export | `plan`, `render` | Regenerate the Silia outro from its .aep (the source references ~40 files on an external drive; missing-footage layers render opaque white). plan: open the project (as a copy), list comps and every layer with missing foo |
| `silia_push_25d` | edit | — | 2.5D push on a still/plate: precomposes the layer at 2x (pre-scale for subpixel motion, collapse transformations), then animates scale from 100 to 100+amount_pct (direction in) or the reverse (out) across the layer's dur |
| `silia_tokens` | inspect | `get`, `resolve_ease`, `plan_motion` | Silia brand and motion tokens as data (no AE round trip): colors (Lime #DEFF38 with black text, Violeta, Rosa, Grafito), video fonts (ES Klarheit Grotesk Bk/Md), formats (h1080p30, v1080x1920p60/30), durations (xs..xl),  |
| `silia_type` | edit | `title`, `kinetic`, `word_reveal` | On-brand typography. title: headline (Md, title_l/m/s) + optional sub (Bk) centered or aligned, with confirmed entry. kinetic: text layer with letter stagger (0.032 s per letter, 0.32 s, power3_out, rise 18 px). word_rev |
| `silia_ui_composite` | edit | — | Composite Silia product UI over a plate from a spec (e.g. exported from Figma): rows (text lines), pills (rounded lime/violeta chips) and an optional cursor path, each as its own layer, stacked above plate_layer, enterin |

## Parameters

### ae_audio

Audio inspection and audio-driven markers (analysis runs in Node with ffmpeg; AE cannot read samples). info: audio layers in a comp with source file and levels. envelope: RMS envelope of a layer's source (or any file path) in windows of window_ms; returns a downsampled curve plus peak/duration. to_markers: place comp markers at detected onsets (threshold relative to mean, min_gap seconds) or at silences' ends. silences: ffmpeg silencedetect (noise_db, min_duration). set_levels: audio levels in dB (static or keyframes [{time, db}]).

| Param | Type | Notes |
|---|---|---|
| `action` | enum: info \| envelope \| to_markers \| silences \| set_levels |  |
| `comp` | union (optional) | Composition: "active" (default), numeric item id, comp name, or {id}\|{name}. |
| `layer` | union (optional) | Layer: 1-based index, layer name, or {id} (AE 22+), {index}, {name}. |
| `file` | string (optional) | Analyse this file instead of a layer's source. |
| `window_ms` | number (optional) |  |
| `max_points` | number (optional) | envelope: downsample to this many points (default 400). |
| `threshold` | number (optional) | to_markers: onset sensitivity as a fraction above the mean RMS (default 0.8). |
| `min_gap` | number (optional) | to_markers: min seconds between markers (default 0.25). |
| `mode` | enum: onsets \| silence_ends (optional) |  |
| `label` | number (optional) |  |
| `comment_prefix` | string (optional) |  |
| `noise_db` | number (optional) | silences: threshold (default -35 dB). |
| `min_duration` | number (optional) | silences: min silence length (default 0.4 s). |
| `db` | number (optional) | set_levels: static level in dB. |
| `keyframes` | array (optional) |  |

### ae_batch

Run several tool calls as one unit. ops: [{tool, args}] executed in order; on_error stop (default) | continue | rollback (undo everything done so far). Because each op is its own undo group in AE, rollback undoes N groups. Returns per-op results plus the final active comp. Use for multi-step builds so a human can undo them in one gesture per step and you get one round trip of reporting.

| Param | Type | Notes |
|---|---|---|
| `ops` | array |  |
| `on_error` | enum: stop \| continue \| rollback (optional) |  |
| `comp` | union (optional) | Comp used for the final read-back (default active). |

### ae_checkpoint

Transactional safety for the open project. create: save a full copy of the project (with a label) plus a structural inventory, then continue working on the original. list: checkpoints for this project. revert: close the current project WITHOUT saving and reopen the checkpoint copy (pass overwrite_original=true to also save it back over the original file path). diff: compare the current project structure (comps, layers, effects, keyframe counts) against a checkpoint. delete: remove a checkpoint. Use before risky multi-step edits; ae_undo covers small steps.

| Param | Type | Notes |
|---|---|---|
| `action` | enum: create \| list \| revert \| diff \| delete |  |
| `label` | string (optional) |  |
| `id` | string (optional) | Checkpoint id (revert/diff/delete). Default: most recent. |
| `overwrite_original` | boolean (optional) | revert: also save the checkpoint back to the original file path. |
| `force` | boolean (optional) | revert: discard unsaved changes without asking (required if the project is dirty). |

### ae_comp

Compositions. list: all comps. get: one comp with its layers. create: new comp (preset h1080p30|v1080x1920p60|v1080x1920p30|... or explicit width/height/frame_rate; duration seconds; bg color). update: rename, duration, frame_rate, size, bg, work area, motion blur settings, renderer, resolution. duplicate, delete, set_active (open in viewer), open. All mutations return the CompRef read-back.

| Param | Type | Notes |
|---|---|---|
| `action` | enum: list \| get \| create \| update \| duplicate \| delete \| set_active \| open |  |
| `comp` | union (optional) | Composition: "active" (default), numeric item id, comp name, or {id}\|{name}. |
| `name` | string (optional) | create: comp name; update/duplicate: new name. |
| `preset` | enum: h1080p30 \| h1080p25 \| h1080p24 \| h1080p60 \| v1080x1920p30 \| v1080x1920p60 \| square1080p30 \| uhd2160p30 (optional) |  |
| `width` | number (optional) |  |
| `height` | number (optional) |  |
| `pixel_aspect` | number (optional) |  |
| `frame_rate` | number (optional) |  |
| `duration` | number (optional) | Seconds. |
| `bg_color` | union (optional) | "#RRGGBB" or [r,g,b] (0..1 or 0..255) |
| `folder` | string (optional) | create: put the comp in this folder (created if missing). |
| `work_area` | object (optional) |  |
| `display_start_time` | number (optional) |  |
| `motion_blur` | object (optional) |  |
| `renderer` | enum: classic \| advanced3d \| cinema4d (optional) |  |
| `resolution_factor` | array (optional) | [x,y] downsample, e.g. [2,2] = Half. |
| `hide_shy` | boolean (optional) |  |
| `include_layers` | boolean (optional) | get: include layer list (default true). |

### ae_dialogs

List or answer modal dialogs open in After Effects (Windows). A modal blocks the scripting engine, so tool calls return ENGINE_BUSY until it is dismissed. list: dialogs with their text. ok / cancel / close: answer one (hwnd) or all. Only answer dialogs whose text you have read and understood; prefer cancel/close for anything destructive.

| Param | Type | Notes |
|---|---|---|
| `action` | enum: list \| ok \| cancel \| close (optional) |  |
| `hwnd` | number (optional) | Target one dialog (from list). Default: all. |

### ae_ease

Easing and interpolation on existing keyframes. preset: apply a named ease to keys (indices or all); preset accepts any name from motion://tokens/easings — categories silia/gsap (ease, ease_in_out, power2_out, power3_out, power3_in_out, expo_out, snappy, sine_/circ_/expo_/power1..4_ in|out|in_out, gsap_power2_out …), easings.net (ease_out_quart, ease_out_quint, ease_out_expo, ease_in_out_quint, ease_out_back), carbon (carbon_productive_standard|entrance|exit, carbon_expressive_*), material (material_standard, material_standard_decelerate|accelerate, material_emphasized_decelerate|accelerate), fluent (fluent_ease_out|in|in_out), atlassian (atlassian_ease_out_bold, atlassian_ease_in_out_bold, …), plus linear and hold. Named presets are cubic-beziers converted to KeyframeEase (influence AND speed from the neighbouring keys). list: names grouped by source with bezier, role and AE influences (no AE round trip). custom: {inInfluence,outInfluence,inSpeed,outSpeed}. from_cubic_bezier: {x1,y1,x2,y2} applied across each consecutive key pair (out ease on key n, in ease on key n+1). interpolation: set in/out interpolation type. spatial: auto_bezier|continuous|linear tangents for spatial props. roving: set roving on interior keys. Returns the KeyList with eases.

| Param | Type | Notes |
|---|---|---|
| `action` | enum: preset \| custom \| from_cubic_bezier \| interpolation \| spatial \| roving \| list |  |
| `comp` | union (optional) | Composition: "active" (default), numeric item id, comp name, or {id}\|{name}. |
| `layer` | union (optional) | Layer: 1-based index, layer name, or {id} (AE 22+), {index}, {name}. |
| `path` | string (optional) | Property path by matchName, e.g. "ADBE Transform Group/ADBE Position" or "Effects/ADBE Gaussian Blur 2/ADBE Gaussian Blur 2-0001". Aliases: position, scale, rotation, opacity, anchor, orientation, "source text", contents. |
| `keys` | array (optional) | 1-based key indices; default all. |
| `preset` | string (optional) | preset: a name from motion://tokens/easings (ae_ease action=list), or linear \| hold. |
| `category` | string (optional) | list: only this category (silia/gsap, easings.net, carbon, material, fluent, atlassian, polaris). |
| `custom` | object (optional) |  |
| `bezier` | object (optional) |  |
| `in_type` | enum: linear \| bezier \| hold (optional) |  |
| `out_type` | enum: linear \| bezier \| hold (optional) |  |
| `spatial` | enum: auto_bezier \| continuous \| linear (optional) |  |
| `roving` | boolean (optional) |  |

### ae_effect

Effects on a layer (effect parade). list; apply (matchName, display name, alias, or template name from ae_effects_catalog templates) with optional params {paramMatchNameOrName: value} and position; get_params (all parameters of one effect with values); set_params; remove; reorder (to index); toggle (enabled); duplicate; apply_preset (.ffx path via layer.applyPreset). Effects are addressed by effect index, name, or matchName[instance]. Accepts several layers via layers.

| Param | Type | Notes |
|---|---|---|
| `action` | enum: list \| apply \| get_params \| set_params \| remove \| reorder \| toggle \| duplicate \| apply_preset |  |
| `comp` | union (optional) | Composition: "active" (default), numeric item id, comp name, or {id}\|{name}. |
| `layer` | union (optional) | Layer: 1-based index, layer name, or {id} (AE 22+), {index}, {name}. |
| `layers` | array (optional) | One or more layer references. |
| `effect` | union (optional) | Effect index, display name, or matchName (append [n] for the nth instance). |
| `name` | string (optional) | apply: effect display name / alias / matchName. |
| `template` | string (optional) | apply: curated template name (see ae_effects_catalog templates). |
| `params` | record (optional) | apply/set_params: {paramMatchNameOrName: value}. |
| `at` | number (optional) | set_params: write keyframes at this time instead of static values. |
| `rename` | string (optional) | apply: custom effect instance name. |
| `to` | number (optional) | reorder: target index. |
| `enabled` | boolean (optional) |  |
| `preset_path` | string (optional) | apply_preset: absolute .ffx path. |

### ae_effects_catalog

Installed effects and presets. effects: search app.effects by regex on display name or matchName (category included). resolve: map a display name or alias to the canonical matchName (includes corrections: Glow=ADBE Glo2, Directional Blur=ADBE Motion Blur, Gaussian Blur=ADBE Gaussian Blur 2). templates: list the curated templates usable with ae_effect action=apply template=... presets: list .ffx animation presets under the AE Presets folder (optional filter).

| Param | Type | Notes |
|---|---|---|
| `action` | enum: effects \| resolve \| templates \| presets |  |
| `regex` | string (optional) |  |
| `name` | string (optional) | resolve: display name or alias. |
| `limit` | number (optional) |  |

### ae_execute_extendscript

Run arbitrary ExtendScript inside After Effects (escape hatch when no dedicated tool fits). Gated: requires confirm=true AND the server started with AE_MCP_ALLOW_RAW=1 (or the unsafe-script capability). The code is wrapped in try/catch and must return __result(...) or __error(...).

Write ES3 ExtendScript (var, function expressions; no let/const, arrows, template literals, destructuring, trailing commas).
The code runs inside an IIFE with try/catch and MUST end with  return __result({...})  or  return __error("message").
JSON.parse/JSON.stringify are available (json2). Wrap mutations in __mutate("Label", function () { ... }) for a single undo step.

Helpers (already loaded):
  __comp(ref)            "active" | id | "name" | {id}|{name}  -> CompItem
  __layer(comp, ref)     1-based index | "name" | {id} | {index} -> Layer
  __prop(root, path)     matchName path, e.g. "ADBE Transform Group/ADBE Position", "Effects/ADBE Gaussian Blur 2/ADBE Gaussian Blur 2-0001", aliases: position, scale, rotation, opacity, anchor, effects, masks, text, contents
  __propInfo(p) __layerInfo(l) __compInfo(c) __itemInfo(it) __projectInfo() __missingFootage()
  __setKeys(prop, [{time, value, ease?, interpolation?}])   __applyEase(prop, keyIndex, "power3_out" | {inInfluence,outInfluence,inSpeed,outSpeed} | {x1,y1,x2,y2})
  __coerce(prop, value)  __color("#DEFF38") -> [r,g,b]  __hex([r,g,b])  __effectMatchName("Gaussian Blur")
  __saveFrame(comp, time, path, {background})  __warn(msg)  __need(minVersion, feature)  __ver()
Always address properties by matchName (display names are locale-dependent).
API reference: read the ae://sdk resource (index) and ae://sdk/{object} (e.g. ae://sdk/CompItem, ae://sdk/Property, ae://sdk/TextDocument, ae://sdk/MatchNames) for the full ExtendScript object reference (AE 26.0).

| Param | Type | Notes |
|---|---|---|
| `code` | string | ES3 ExtendScript body. Must end with return __result({...}). |
| `confirm` | boolean | Must be true. Acknowledges that this runs unreviewed code inside After Effects. |
| `undo_group` | string (optional) | Wrap the whole body in one undo group with this label. |
| `timeout_ms` | number (optional) | Default 30000. Raise for long operations. |

### ae_expression

Expressions with validation. get; set (expression text, or library=<name> with params={...} filling the {{param}} placeholders; library: wiggle, wiggle_slow, wiggle_drift, wiggle_jitter, loop_cycle, loop_pingpong, loop_offset, loop_continue, loop_in_cycle, inertia, bounce, bounce_physics, spring, time_offset, ekeys_style, ebox_responsive, ebox_center, typewriter, counter, link_position, follow_with_delay, posterize_12, text_bounds_width, time_seconds_counter, auto_fade_in_out, slider_driven; every library entry has defaults and suggested ranges per param — see library_info); library_info: describe one or all library expressions (params, defaults, ranges, filled text; no AE round trip); set_batch [{layer,path,expression}]; remove; validate (dry-run: applies, reads expressionError, evaluates at eval_at, restores); validate_all (every expression in the comp or project, returns errors). Returns expression, enabled and expressionError read-back.

| Param | Type | Notes |
|---|---|---|
| `action` | enum: get \| set \| set_batch \| remove \| validate \| validate_all \| library_info |  |
| `comp` | union (optional) | Composition: "active" (default), numeric item id, comp name, or {id}\|{name}. |
| `layer` | union (optional) | Layer: 1-based index, layer name, or {id} (AE 22+), {index}, {name}. |
| `path` | string (optional) | Property path by matchName, e.g. "ADBE Transform Group/ADBE Position" or "Effects/ADBE Gaussian Blur 2/ADBE Gaussian Blur 2-0001". Aliases: position, scale, rotation, opacity, anchor, orientation, "source text", contents. |
| `expression` | string (optional) |  |
| `library` | enum: wiggle \| wiggle_slow \| wiggle_drift \| wiggle_jitter \| loop_cycle \| loop_pingpong \| loop_offset \| loop_continue \| loop_in_cycle \| inertia \| bounce \| bounce_physics \| spring \| time_offset \| ekeys_style \| ebox_responsive \| ebox_center \| typewriter \| counter \| link_position \| follow_with_delay \| posterize_12 \| text_bounds_width \| time_seconds_counter \| auto_fade_in_out \| slider_driven (optional) | set / library_info: library expression name. |
| `params` | record (optional) | set / library_info: values for the library's {{param}} placeholders (missing ones use defaults), e.g. {amp: 0.1, freq: 3, decay: 6} or {target: 'Title', padding: 32}. |
| `target_layer` | string (optional) | Shorthand for params.target (layer name used by link_position, follow_with_delay, ebox_*). |
| `enabled` | boolean (optional) |  |
| `eval_at` | number (optional) | validate: evaluate at this time to surface runtime errors. |
| `batch` | array (optional) |  |
| `scope` | enum: comp \| project (optional) | validate_all: default comp. |

### ae_frame

See what a comp actually renders, and judge it. capture: one frame at time t as an image (PNG, or JPEG for smaller payloads); background '#0A0A0B' flattens alpha (recommended). contact_sheet: several frames tiled into one labeled JPEG grid (labels: timecode · f<frame> · seconds); times[], every N seconds, at_markers, or at_keyframes of a layer property; ranges <= 2 s default to every 0.1 s (~10 fps). onion_skin: the same frames composited into ONE spacing chart (latest frame untinted, earlier frames as hue-tinted ghosts of changed pixels with decaying alpha, change bounding boxes, legend with frame numbers) plus spacing[] = per-sample centroid displacement in px. stats: per-frame mean/max luma and alpha coverage (flash/black detection). compare: mean absolute difference between two times or a time and a reference PNG. keyframe_dump: no images; every animated property of the layers (default all, cap 60) with keys {t, frame, value, in/out interpolation, influences, speeds}, glow effects, and first-key stagger deltas. critique: contact_sheet + onion_skin + keyframe_dump, then the motion rubric for a register (product_video | functional_ui): failed items carry numeric fixes, unverifiable items are for you to judge from the two images. hide_layers/solo_layers isolate parts of the comp during capture (restored afterwards).

| Param | Type | Notes |
|---|---|---|
| `action` | enum: capture \| contact_sheet \| onion_skin \| stats \| compare \| keyframe_dump \| critique |  |
| `comp` | union (optional) | Composition: "active" (default), numeric item id, comp name, or {id}\|{name}. |
| `time` | number (optional) | capture/compare: seconds (default comp time). |
| `times` | array (optional) |  |
| `every` | number (optional) | contact_sheet/onion_skin/stats/critique: sample every N seconds across the range (default 0.1 s when the range is <= 2 s, else range/12). |
| `range` | object (optional) | Sampling range (default whole comp; critique defaults to the animated span). |
| `at_markers` | boolean (optional) |  |
| `at_keyframes` | object (optional) |  |
| `max_frames` | number (optional) | Cap for every/at_* (default 16; 24 for short ranges at 0.1 s). |
| `max_width` | number (optional) | Output width cap (default 1280 for capture/onion_skin, 1600 for sheets). |
| `format` | enum: png \| jpeg (optional) |  |
| `background` | nullable (optional) | Flatten onto this color (default #0A0A0B). null keeps alpha (PNG only). |
| `region` | array (optional) | Crop [x,y,w,h] in comp pixels before scaling. |
| `hide_layers` | array (optional) | One or more layer references. |
| `solo_layers` | array (optional) | One or more layer references. |
| `labels` | boolean (optional) | contact_sheet: draw labels (default true). |
| `columns` | number (optional) |  |
| `boxes` | boolean (optional) | onion_skin/critique: outline the changed region per sample (default true). |
| `reference_png` | string (optional) | compare: path of a reference image (else compare time vs time_b). |
| `time_b` | number (optional) |  |
| `keep_files` | boolean (optional) | Keep the PNG files on disk and return their paths (default true). |
| `layers` | array (optional) | keyframe_dump/critique: layers to inspect (default all, cap 60). |
| `max_layers` | number (optional) |  |
| `register` | enum: product_video \| functional_ui (optional) | critique: motion register (default product_video). |
| `intent` | enum: transition \| demonstration \| guidance \| feedback \| visualization \| highlight \| aesthetic (optional) | critique: declared animation intent (AniMINT). |

### ae_handoff

Prepare a Premiere Pro handoff. mogrt: given an exported .mogrt (or comp to export first) return the premiere-pro MCP call import_mogrt {mogrt_path, time_seconds, video_track_index}. dynamic_link: return the call import_ae_comps {aep_path, comp_names} to Dynamic Link comps from the saved project (saves first). alpha_render: start an aerender job with an alpha-capable output module (default 'Lossless with Alpha', .avi; or 'TIFF Sequence with Alpha') and return the import_media call for the result. Every answer includes verify_with: get_full_sequence_info, because the Premiere connector has reported success on writes it did not perform.

| Param | Type | Notes |
|---|---|---|
| `action` | enum: mogrt \| dynamic_link \| alpha_render |  |
| `comp` | string (optional) | Comp name (export/render/link source). |
| `comps` | array (optional) | dynamic_link: several comps. |
| `mogrt_path` | string (optional) | mogrt: existing .mogrt (else exported from comp to this path). |
| `output` | string (optional) | alpha_render: output path (.avi for Lossless with Alpha, folder/name_[#####].tif for TIFF). |
| `om_template` | string (optional) |  |
| `time_seconds` | number (optional) | Placement time in the Premiere sequence. |
| `video_track_index` | number (optional) |  |
| `sequence_name` | string (optional) |  |

### ae_items

Project panel items (footage, comps, folders, solids). list: with filter {type, nameRegex, folder, missingOnly}. get: one item by id or name. import: file (or folder path) with import_as footage|comp|comp_cropped|project, optional sequence=true for image sequences, add_to_comp to also place it as a layer. replace: swap an item's source file. relink_missing: search dirs for missing footage by file name. interpret: set conformFrameRate, alphaMode, loop, premulColor. create_folder, move (to folder), rename, delete, find_missing.

| Param | Type | Notes |
|---|---|---|
| `action` | enum: list \| get \| import \| import_sequence \| replace \| relink_missing \| interpret \| create_folder \| move \| rename \| delete \| find_missing |  |
| `item` | union (optional) | Item id or name (get/replace/interpret/move/rename/delete). |
| `filter` | object (optional) |  |
| `path` | string (optional) | import/import_sequence/replace: absolute file path (first frame for sequences). |
| `import_as` | enum: footage \| comp \| comp_cropped \| project (optional) |  |
| `sequence` | boolean (optional) | import: treat as image sequence. |
| `force_alphabetical` | boolean (optional) |  |
| `folder` | string (optional) | import/create_folder/move: destination folder name (created if missing for import). |
| `add_to_comp` | union (optional) | import: also add the item as a layer to this comp. |
| `name` | string (optional) | create_folder/rename: new name. |
| `search_dirs` | array (optional) | relink_missing: directories to search recursively. |
| `interpret` | object (optional) |  |

### ae_keyframes

Keyframe CRUD on one property. set: write keys [{time, value, ease?, interpolation?}] (batched via setValuesAtTimes; existing keys at other times are kept). add: alias of set. remove: by times[], indices[], range {from,to}, or all=true. list: KeyList. offset: shift all keys by dt. scale_time: scale key times by factor around pivot. copy: copy keys to another layer/path with optional dt. Returns the resulting KeyList.

| Param | Type | Notes |
|---|---|---|
| `action` | enum: set \| add \| remove \| list \| offset \| scale_time \| copy |  |
| `comp` | union (optional) | Composition: "active" (default), numeric item id, comp name, or {id}\|{name}. |
| `layer` | union | Layer: 1-based index, layer name, or {id} (AE 22+), {index}, {name}. |
| `path` | string | Property path by matchName, e.g. "ADBE Transform Group/ADBE Position" or "Effects/ADBE Gaussian Blur 2/ADBE Gaussian Blur 2-0001". Aliases: position, scale, rotation, opacity, anchor, orientation, "source text", contents. |
| `keys` | array (optional) |  |
| `times` | array (optional) |  |
| `indices` | array (optional) |  |
| `range` | object (optional) |  |
| `all` | boolean (optional) |  |
| `dt` | number (optional) |  |
| `factor` | number (optional) |  |
| `pivot` | number (optional) |  |
| `to_layer` | union (optional) | Layer: 1-based index, layer name, or {id} (AE 22+), {index}, {name}. |
| `to_path` | string (optional) | Property path by matchName, e.g. "ADBE Transform Group/ADBE Position" or "Effects/ADBE Gaussian Blur 2/ADBE Gaussian Blur 2-0001". Aliases: position, scale, rotation, opacity, anchor, orientation, "source text", contents. |
| `clear_existing` | boolean (optional) | set: remove existing keys first. |

### ae_layer_create

Create a layer of any kind in a comp: text (point text), box_text (paragraph box), shape (with primitives rect|ellipse|polygon|star), solid, adjustment, null, camera, light, footage (from item id/name), comp (nested comp). Common options: name, in/out points, start_time, position, parent. Text options: text, font (PostScript name e.g. ESKlarheitGrotesk-Md), size, fill, stroke, tracking, leading, justify. Returns the LayerRef read-back including transform.

| Param | Type | Notes |
|---|---|---|
| `comp` | union (optional) | Composition: "active" (default), numeric item id, comp name, or {id}\|{name}. |
| `kind` | enum: text \| box_text \| shape \| solid \| adjustment \| null \| camera \| light \| footage \| comp |  |
| `name` | string (optional) |  |
| `position` | array (optional) | [x,y] or [x,y,z] in comp pixels. |
| `in_point` | number (optional) |  |
| `out_point` | number (optional) |  |
| `start_time` | number (optional) |  |
| `duration` | number (optional) | Sets out_point = in_point + duration. |
| `parent` | union (optional) | Layer: 1-based index, layer name, or {id} (AE 22+), {index}, {name}. |
| `three_d` | boolean (optional) |  |
| `text` | string (optional) |  |
| `font` | string (optional) | PostScript font name, e.g. ESKlarheitGrotesk-Md. |
| `size` | number (optional) |  |
| `fill` | union (optional) | "#RRGGBB" or [r,g,b] (0..1 or 0..255) |
| `stroke` | union (optional) | "#RRGGBB" or [r,g,b] (0..1 or 0..255) |
| `stroke_width` | number (optional) |  |
| `tracking` | number (optional) |  |
| `leading` | number (optional) |  |
| `justify` | enum: left \| center \| right (optional) |  |
| `box_size` | array (optional) | box_text: [w,h]. |
| `color` | union (optional) | solid: color. |
| `width` | number (optional) | solid/adjustment: default comp width. |
| `height` | number (optional) |  |
| `primitives` | array (optional) | shape: one group per primitive. |
| `item` | union (optional) | footage/comp: project item id or name. |
| `camera_type` | enum: one_node \| two_node (optional) |  |
| `zoom` | number (optional) |  |
| `light_type` | enum: parallel \| spot \| point \| ambient (optional) |  |
| `intensity` | number (optional) |  |
| `point_of_interest` | array (optional) |  |
| `casts_shadows` | boolean (optional) |  |

### ae_layer_query

Read layers. list: LayerRef[] for a comp with optional filter {nameRegex, kind, selected, enabled, hasAudio}. get: full detail for one layer: transform at time, effects (with params if include_effect_params), masks, text document, and the property tree to depth.

| Param | Type | Notes |
|---|---|---|
| `action` | enum: list \| get |  |
| `comp` | union (optional) | Composition: "active" (default), numeric item id, comp name, or {id}\|{name}. |
| `layer` | union (optional) | Layer: 1-based index, layer name, or {id} (AE 22+), {index}, {name}. |
| `filter` | object (optional) |  |
| `at` | number (optional) | get: sample values at this time (default comp time). |
| `depth` | number (optional) | get: property tree depth (default 0 = none). |
| `include_effect_params` | boolean (optional) |  |
| `only_animatable` | boolean (optional) |  |

### ae_layer_transform

Transform ergonomics. set: static anchor/position/scale/rotation/opacity/orientation (arrays sized to the property; scale as percent, uniform number allowed). keyframe: same fields but written as keyframes at time t (with optional ease). fit: scale layer to contain|cover|width|height of the comp (uses sourceRectAtTime for text/shape). center: position at comp center (and optionally anchor at layer center). reset: transform defaults. Returns the transform after the change plus key counts.

| Param | Type | Notes |
|---|---|---|
| `action` | enum: set \| keyframe \| fit \| center \| reset |  |
| `comp` | union (optional) | Composition: "active" (default), numeric item id, comp name, or {id}\|{name}. |
| `layer` | union (optional) | Layer: 1-based index, layer name, or {id} (AE 22+), {index}, {name}. |
| `layers` | array (optional) | One or more layer references. |
| `anchor` | array (optional) |  |
| `position` | array (optional) |  |
| `scale` | union (optional) | Percent. Number = uniform. |
| `rotation` | number (optional) |  |
| `orientation` | array (optional) |  |
| `opacity` | number (optional) |  |
| `at` | number (optional) | keyframe: time in seconds (default comp time). |
| `ease` | union (optional) | Ease: preset name (linear, hold, ease, ease_in, ease_out, ease_in_out, power2_out, power3_out, power3_in_out, expo_out, snappy), {inInfluence,outInfluence,inSpeed,outSpeed}, or cubic-bezier {x1,y1,x2,y2}. |
| `mode` | enum: contain \| cover \| width \| height (optional) | fit mode (default contain). |
| `padding` | number (optional) | fit: pixels of margin. |
| `anchor_to_center` | boolean (optional) | center: also move the anchor to the layer's visual center. |

### ae_layer_update

Layer settings other than transform. rename; set_timing {in,out,start_time,stretch}; set_parent (parent layer or null, jump_to_parent keeps position); set_blend (mode name); set_matte {matte_layer, matte_type alpha|alpha_inverted|luma|luma_inverted|none} (AE 23+ API, legacy fallback); set_3d; set_flags {enabled,solo,shy,locked,motion_blur,collapse,audio_enabled,guide,frame_blending}; reorder {to: index|top|bottom|before|after (+ reference layer)}; duplicate; delete; set_quality best|draft|wireframe; set_time_remap {enabled}; set_label (0..16); set_comment. Accepts one layer or several (layers).

| Param | Type | Notes |
|---|---|---|
| `action` | enum: rename \| set_timing \| set_parent \| set_blend \| set_matte \| set_3d \| set_flags \| reorder \| duplicate \| delete \| set_quality \| set_time_remap \| set_label \| set_comment |  |
| `comp` | union (optional) | Composition: "active" (default), numeric item id, comp name, or {id}\|{name}. |
| `layer` | union (optional) | Layer: 1-based index, layer name, or {id} (AE 22+), {index}, {name}. |
| `layers` | array (optional) | One or more layer references. |
| `name` | string (optional) |  |
| `in_point` | number (optional) |  |
| `out_point` | number (optional) |  |
| `start_time` | number (optional) |  |
| `stretch` | number (optional) | Percent (100 = normal). |
| `parent` | nullable (optional) |  |
| `jump_to_parent` | boolean (optional) |  |
| `blend` | string (optional) | normal, add, multiply, screen, overlay, soft_light, hard_light, ... |
| `matte_layer` | union (optional) | Layer: 1-based index, layer name, or {id} (AE 22+), {index}, {name}. |
| `matte_type` | enum: none \| alpha \| alpha_inverted \| luma \| luma_inverted (optional) |  |
| `enabled` | boolean (optional) |  |
| `flags` | object (optional) |  |
| `to` | union (optional) |  |
| `reference` | union (optional) | reorder before/after: the reference layer. |
| `quality` | enum: best \| draft \| wireframe (optional) |  |
| `label` | number (optional) |  |
| `comment` | string (optional) |  |
| `count` | number (optional) | duplicate: how many copies. |

### ae_markers

Comp or layer markers. list; add one {time, comment, duration, label, chapter, url}; add_bulk many; update by index or time; remove by index or time; clear all. Target a layer by passing layer, otherwise the comp marker track.

| Param | Type | Notes |
|---|---|---|
| `action` | enum: list \| add \| add_bulk \| update \| remove \| clear |  |
| `comp` | union (optional) | Composition: "active" (default), numeric item id, comp name, or {id}\|{name}. |
| `layer` | union (optional) | Layer: 1-based index, layer name, or {id} (AE 22+), {index}, {name}. |
| `marker` | object (optional) |  |
| `markers` | array (optional) |  |
| `index` | number (optional) | update/remove: 1-based marker index. |
| `time` | number (optional) | update/remove: nearest marker to this time (within half a frame). |

### ae_masks

Layer masks. list; add a mask from shape {rect:[x,y,w,h]} | {ellipse:[cx,cy,rx,ry]} | {path:{vertices,inTangents,outTangents,closed}} with mode add|subtract|intersect|lighten|darken|difference|none, feather [x,y], opacity, expansion, inverted; update by mask index; remove.

| Param | Type | Notes |
|---|---|---|
| `action` | enum: list \| add \| update \| remove |  |
| `comp` | union (optional) | Composition: "active" (default), numeric item id, comp name, or {id}\|{name}. |
| `layer` | union | Layer: 1-based index, layer name, or {id} (AE 22+), {index}, {name}. |
| `index` | number (optional) | update/remove: 1-based mask index. |
| `name` | string (optional) |  |
| `shape` | object (optional) |  |
| `mode` | enum: add \| subtract \| intersect \| lighten \| darken \| difference \| none (optional) |  |
| `feather` | array (optional) |  |
| `opacity` | number (optional) |  |
| `expansion` | number (optional) |  |
| `inverted` | boolean (optional) |  |
| `at` | number (optional) | Write shape/feather/opacity as keyframes at this time instead of static values. |

### ae_mogrt

Essential Graphics / Motion Graphics Templates. controllers: list the comp's EGP controllers. add: expose a layer property as a controller (name). rename; set_template_name; remove (by index); validate: checks controller count, unsupported property types, fonts installed, and comp format before export; export: write a .mogrt to path (validate first). open_panel: open the comp in the Essential Graphics panel. Returns controllers and the .mogrt path/size.

| Param | Type | Notes |
|---|---|---|
| `action` | enum: controllers \| add \| rename \| set_template_name \| remove \| validate \| export \| open_panel |  |
| `comp` | union (optional) | Composition: "active" (default), numeric item id, comp name, or {id}\|{name}. |
| `layer` | union (optional) | Layer: 1-based index, layer name, or {id} (AE 22+), {index}, {name}. |
| `path` | string (optional) | add: property path to expose. |
| `name` | string (optional) | add/rename: controller name; set_template_name: template name. |
| `index` | number (optional) | rename/remove: controller index. |
| `mogrt_path` | string (optional) | export: absolute .mogrt path (folder created). |
| `overwrite` | boolean (optional) |  |

### ae_precompose

Precompose layers into a new nested comp. move_all_attributes=true moves keyframes/effects into the precomp; false leaves them on the new layer. After Effects only allows false for a SINGLE layer (several layers always move their attributes), so the flag is forced to true when more than one layer is given.

| Param | Type | Notes |
|---|---|---|
| `comp` | union (optional) | Composition: "active" (default), numeric item id, comp name, or {id}\|{name}. |
| `layers` | array | One or more layer references. |
| `name` | string | Name of the new precomp. |
| `move_all_attributes` | boolean (optional) | Single layer only (default true). Ignored (forced true) for several layers, as AE requires. |
| `open_in_viewer` | boolean (optional) |  |

### ae_project

Project lifecycle. info: summary (path, dirty, comps, missing footage). new: new empty project (fails if the current one is dirty unless force). open: open an .aep. save: save (optionally save-as to a new path). save_copy: write a copy to path and keep working on the original (used before renders). close: close with close_mode save|discard. set_settings: bitsPerChannel 8|16|32, timeDisplay timecode|frames, framesCountType.

| Param | Type | Notes |
|---|---|---|
| `action` | enum: info \| new \| open \| save \| save_copy \| close \| set_settings |  |
| `path` | string (optional) | open/save/save_copy: absolute .aep path. |
| `force` | boolean (optional) | new/open/close: proceed even if the current project has unsaved changes (they are discarded). |
| `close_mode` | enum: save \| discard (optional) | close: default discard requires force=true when dirty. |
| `bitsPerChannel` | union (optional) |  |
| `timeDisplay` | enum: timecode \| frames (optional) |  |
| `framesCountType` | enum: start_0 \| start_1 \| timecode_conversion (optional) |  |

### ae_property_get

Read properties by matchName path. value: one property snapshot (value at time, keys, expression). tree: the property tree under a layer or a group path, to depth. search: find properties whose matchName or name matches a regex anywhere under the layer (returns paths). Use this to discover paths before setting anything.

| Param | Type | Notes |
|---|---|---|
| `action` | enum: value \| tree \| search |  |
| `comp` | union (optional) | Composition: "active" (default), numeric item id, comp name, or {id}\|{name}. |
| `layer` | union | Layer: 1-based index, layer name, or {id} (AE 22+), {index}, {name}. |
| `path` | string (optional) | value: the property. tree: group path to start at (default the layer). |
| `at` | number (optional) |  |
| `depth` | number (optional) | tree: default 2. |
| `only_animatable` | boolean (optional) |  |
| `regex` | string (optional) | search: case-insensitive regex on matchName or display name. |
| `limit` | number (optional) |  |

### ae_property_set

Set one or more property values statically (removes nothing; if the property has keyframes the value is written at time at or the comp time as a keyframe). Values are coerced: "#RRGGBB" for colors, "50%" -> 50, stringified arrays, uniform scale numbers. Returns PropSnapshot[] read-back.

| Param | Type | Notes |
|---|---|---|
| `comp` | union (optional) | Composition: "active" (default), numeric item id, comp name, or {id}\|{name}. |
| `sets` | array |  |
| `at` | number (optional) | If the property is animated, write at this time (default comp time). |

### ae_render

Background renders with aerender.exe (never blocks After Effects). start: saves a copy of the current project (save_copy_first, default true) and renders comp with rs_template/om_template to output; returns a job id. status: progress percent, last log lines, output existence; when done, includes a verify report if verify=true (default). cancel; list all jobs. verify: run ffprobe + blackdetect + luma sampling on any media path against expectations (duration, fps, size, alpha, headBlackSec, luma bounds). Requires a saved project (or project path).

| Param | Type | Notes |
|---|---|---|
| `action` | enum: start \| status \| cancel \| list \| verify |  |
| `comp` | string (optional) | start: comp name. |
| `project` | string (optional) | start: .aep path (default: the open project, saved as a copy first). |
| `save_copy_first` | boolean (optional) | start: default true; writes <dataDir>/jobs/<id>.aep and renders that. |
| `output` | string (optional) | start: absolute output path. Use [#####] for sequences. |
| `rs_template` | string (optional) | default "Best Settings" |
| `om_template` | string (optional) | default "H.264 - Match Render Settings - 40 Mbps" |
| `start_frame` | number (optional) |  |
| `end_frame` | number (optional) |  |
| `continue_on_missing_footage` | boolean (optional) |  |
| `ae_year` | number (optional) | Force aerender from this AE year (default newest). |
| `job_id` | string (optional) |  |
| `path` | string (optional) | verify: media file path. |
| `expect` | object (optional) | Expectations checked by verify; each mismatch becomes a violation. |
| `wait_ms` | number (optional) | start/status: wait up to this long (max 45 s, below MCP client timeouts) before returning; poll status for longer renders. |
| `verify` | boolean (optional) |  |

### ae_render_queue

In-app render queue. list items; add a comp (rs_template, om_template, output path, optional frame range or work_area); update an item; remove; clear; templates (render settings and output module template names on this machine); queue_in_ame (send queue to Media Encoder); render (BLOCKING: freezes AE until done, only for tiny comps; prefer ae_render). Output paths with [#####] produce image sequences.

| Param | Type | Notes |
|---|---|---|
| `action` | enum: list \| add \| update \| remove \| clear \| templates \| queue_in_ame \| render |  |
| `comp` | union (optional) | Composition: "active" (default), numeric item id, comp name, or {id}\|{name}. |
| `index` | number (optional) | update/remove: render queue item index. |
| `rs_template` | string (optional) | e.g. "Best Settings" |
| `om_template` | string (optional) | e.g. "H.264 - Match Render Settings - 40 Mbps", "Lossless with Alpha", "TIFF Sequence with Alpha" |
| `output` | string (optional) | Absolute output path (folder created). |
| `time_span` | enum: comp \| work_area \| custom (optional) |  |
| `start` | number (optional) |  |
| `duration` | number (optional) |  |
| `skip_frames` | number (optional) |  |
| `remove_after_render` | boolean (optional) |  |
| `timeout_ms` | number (optional) | render: wait this long (default 300000). |

### ae_shape

Shape layer contents. list: tree of groups/paths/fills/strokes/operators with matchName paths. add_group (name, optional group_path parent). add_path {rect|ellipse|polystar|custom} into a group. add_fill/add_stroke (color, opacity, width, caps, dashes). add_trim (start,end,offset; draw_on {from,to,duration,start_time,ease} animates end). add_repeater (copies, offset, transform {position,rotation,scale,start_opacity,end_opacity}). add_round_corners (radius). set: set any content property by path under contents. remove: remove a content item by path. Paths are relative to ADBE Root Vectors Group, e.g. 'ADBE Vector Group/ADBE Vectors Group/ADBE Vector Graphic - Fill'.

| Param | Type | Notes |
|---|---|---|
| `action` | enum: list \| add_group \| add_path \| add_fill \| add_stroke \| add_trim \| add_repeater \| add_round_corners \| set \| remove |  |
| `comp` | union (optional) | Composition: "active" (default), numeric item id, comp name, or {id}\|{name}. |
| `layer` | union | Layer: 1-based index, layer name, or {id} (AE 22+), {index}, {name}. |
| `group_path` | string (optional) | Path of the target group (default: first group, created if none). |
| `name` | string (optional) |  |
| `path` | object (optional) |  |
| `color` | union (optional) | "#RRGGBB" or [r,g,b] (0..1 or 0..255) |
| `opacity` | number (optional) |  |
| `width` | number (optional) |  |
| `line_cap` | enum: butt \| round \| square (optional) |  |
| `line_join` | enum: miter \| round \| bevel (optional) |  |
| `dashes` | array (optional) | [dash, gap, ...] |
| `trim` | object (optional) |  |
| `draw_on` | object (optional) |  |
| `repeater` | object (optional) |  |
| `radius` | number (optional) |  |
| `content_path` | string (optional) | set/remove: path under contents. |
| `value` | union (optional) |  |
| `at` | number (optional) |  |

### ae_status

Health check and orientation. Always call this first. Reports whether the After Effects bridge is live (which AE version, which transport), the open project summary (path, dirty, comps, missing footage), the active comp, the enabled authority profile, and with deep=true also the render/output templates, fonts of interest, aerender/ffmpeg availability and CEP install state.

| Param | Type | Notes |
|---|---|---|
| `deep` | boolean (optional) | Also probe render templates, fonts (ES Klarheit Grotesk), saveFrameToPng, aerender and ffmpeg. Slower (~1 s). |

### ae_text

Text layer document. get: TextDocument snapshot (text, font, size, fill, stroke, tracking, leading, justification, box). set: change any of those (font by PostScript name; read-back flags silent font substitution). set_keyframes: hold keyframes of source text [{time, text}] (captions, counters). fonts: list installed fonts (AE 24+) with optional regex filter (postScriptName, family, style). legibility: inspect-only check of one text layer (or every text layer of the comp) against reading rules — min size for the comp height, chars per line, line count, CPS / hold time, title-safe box — at time `at` or at every source-text keyframe (hold = next key time − this key time); kind body|caption|title (default: 'caption' when the layer name contains caption, else body).

| Param | Type | Notes |
|---|---|---|
| `action` | enum: get \| set \| set_keyframes \| fonts \| legibility |  |
| `comp` | union (optional) | Composition: "active" (default), numeric item id, comp name, or {id}\|{name}. |
| `layer` | union (optional) | Layer: 1-based index, layer name, or {id} (AE 22+), {index}, {name}. |
| `kind` | enum: body \| caption \| title (optional) | legibility: rule set (default inferred from the layer name). |
| `text` | string (optional) |  |
| `font` | string (optional) | PostScript name, e.g. ESKlarheitGrotesk-Bk / ESKlarheitGrotesk-Md. |
| `size` | number (optional) |  |
| `fill` | nullable (optional) | null disables fill. |
| `stroke` | nullable (optional) |  |
| `stroke_width` | number (optional) |  |
| `tracking` | number (optional) |  |
| `leading` | number (optional) | Line spacing in px; use auto_leading=true to reset. |
| `auto_leading` | boolean (optional) |  |
| `justify` | enum: left \| center \| right \| justify_full \| justify_last_left \| justify_last_center \| justify_last_right (optional) |  |
| `box_size` | array (optional) |  |
| `all_caps` | boolean (optional) |  |
| `faux_bold` | boolean (optional) |  |
| `faux_italic` | boolean (optional) |  |
| `baseline_shift` | number (optional) |  |
| `at` | number (optional) | set: write as a keyframe at this time (if animated). |
| `keyframes` | array (optional) |  |
| `clear_existing` | boolean (optional) |  |
| `regex` | string (optional) | fonts: filter. |
| `limit` | number (optional) |  |

### ae_text_animator

Text animators and range selectors. list; add an animator with properties {opacity, position:[x,y], scale:[x,y], rotation, tracking, blur:[x,y], fill:'#hex', line_spacing} and a range selector {start,end,offset, based_on chars|chars_no_spaces|words|lines, shape square|ramp_up|ramp_down|triangle|round|smooth, ease_high, ease_low, randomize}; set_selector keyframes {start|end|offset: [{time,value,ease}]}; set_property; remove; preset: letter_stagger | word_stagger | line_rise | typewriter | blur_in with {duration_per_unit, stagger, ease, start_time} (builds animator + offset keyframes).

| Param | Type | Notes |
|---|---|---|
| `action` | enum: list \| add \| set_selector \| set_property \| remove \| preset |  |
| `comp` | union (optional) | Composition: "active" (default), numeric item id, comp name, or {id}\|{name}. |
| `layer` | union | Layer: 1-based index, layer name, or {id} (AE 22+), {index}, {name}. |
| `animator` | union (optional) | Animator index or name (set_selector/set_property/remove). |
| `name` | string (optional) |  |
| `properties` | object (optional) |  |
| `selector` | object (optional) |  |
| `keyframes` | object (optional) |  |
| `preset` | enum: letter_stagger \| word_stagger \| line_rise \| typewriter \| blur_in (optional) |  |
| `duration_per_unit` | number (optional) | preset: seconds each unit takes to appear (default 0.32). |
| `stagger` | number (optional) | preset: seconds between units (default 0.032). |
| `ease` | union (optional) | Ease: preset name (linear, hold, ease, ease_in, ease_out, ease_in_out, power2_out, power3_out, power3_in_out, expo_out, snappy), {inInfluence,outInfluence,inSpeed,outSpeed}, or cubic-bezier {x1,y1,x2,y2}. |
| `start_time` | number (optional) |  |
| `rise_px` | number (optional) | letter_stagger/line_rise: vertical travel (default 18). |

### ae_tool_library

Self-growing tool library. After a raw ExtendScript works (ae_execute_extendscript), save it here with a name, description and param schema so it can be re-run by name (and promoted to a first-class MCP tool). save/update: {name, description, jsx, params:{p:{type,description,required,default}}, tags}; the jsx runs inside one undo group with `params.<p>` available and {{p}} placeholders replaced; it must return __result(...). list (optional tag/regex filter); get; run {name, params}; delete; promote {name, promoted:true|false} registers lib_<name> as a tool (available next session, or immediately when the server supports dynamic registration). Entries are deduplicated by content hash.

| Param | Type | Notes |
|---|---|---|
| `action` | enum: save \| update \| list \| get \| run \| delete \| promote |  |
| `name` | string (optional) |  |
| `description` | string (optional) |  |
| `jsx` | string (optional) |  |
| `params` | record (optional) |  |
| `tags` | array (optional) |  |
| `example` | record (optional) |  |
| `run_params` | record (optional) | run: parameter values. |
| `promoted` | boolean (optional) |  |
| `filter` | string (optional) | list: regex on name/description/tags. |

### ae_undo

Undo or redo the last N undo groups in After Effects (each tool call is one group). Returns the active comp read-back after the operation.

| Param | Type | Notes |
|---|---|---|
| `action` | enum: undo \| redo |  |
| `count` | number (optional) |  |

### ae_versions

Data-driven versions: render N variants of one template comp. spec: {template:{aep?, comp}, assets:[{layer, type text|color|toggle|image|video|number|audio, value, property?}], variants:[{id, ...fields}], output:{dir, om_template, name_template e.g. 'outro-{{id}}.mp4', rs_template}}. Asset values may contain {{field}} placeholders replaced per variant. plan: validate the spec against the open project (layer names, asset files, fonts) without changing anything. run: for each variant apply overrides, save a copy, start aerender (parallel up to `parallel`), then poll status with job ids. status: aggregate job states for a run id. Requires a saved project (or template.aep).

| Param | Type | Notes |
|---|---|---|
| `action` | enum: plan \| run \| status \| cancel |  |
| `spec` | object (optional) |  |
| `run_id` | string (optional) |  |
| `parallel` | number (optional) | Concurrent aerender processes (default 2; each renders into a private folder). |
| `force` | boolean (optional) | run: discard unsaved changes when opening template.aep. |

### silia_captions

Word-synced captions from a transcript. preview: parse the file (Whisper word JSON/JSONL in ms or seconds, or TURNS_TIMED in seconds), report format, speakers, word count, duration and turn overlaps without touching AE. build: create caption layers in the comp. mode accumulate_turn (default, one box-text layer per turn whose source text grows word by word with hold keyframes at word onset + latency; only spoken words are ever on screen) | per_turn_hold (full turn text appears at turn start) | per_word_layers (one layer per word, for kinetic treatments). Styles per speaker via speaker_styles {name:{color, size, align, y}}. Returns layers, keyframe counts, first/last word and overlaps.

| Param | Type | Notes |
|---|---|---|
| `action` | enum: preview \| build \| to_markers |  |
| `comp` | union (optional) | Composition: "active" (default), numeric item id, comp name, or {id}\|{name}. |
| `path` | string | Transcript file path. |
| `mode` | enum: accumulate_turn \| per_turn_hold \| per_word_layers (optional) |  |
| `latency` | number (optional) | Seconds after word onset (default 0.16). |
| `fade` | number (optional) | Fade-in at turn start (default 0.2). |
| `opacity` | number (optional) | Default 95. |
| `box` | object (optional) | Caption box in comp px (default: 80% width, bottom safe area). |
| `font` | string (optional) | Default ESKlarheitGrotesk-Md |
| `size` | number (optional) | Default 28 at 1080p (scaled). |
| `color` | string (optional) |  |
| `speaker_styles` | record (optional) |  |
| `gap_sec` | number (optional) | Turn split gap for flat word lists (default 1.2). |
| `time_offset` | number (optional) | Shift all times by this many seconds (e.g. layer start). |
| `max_chars` | number (optional) | Wrap: start a new text layer when a turn exceeds this many characters (default 160). |

### silia_comp

Create an on-brand Silia comp: format h1080p30 | v1080x1920p60 | v1080x1920p30, grafito background solid (or transparent), optional safe-margin guide layers (shy, guide) and an optional head-black solid of head_black_sec at the start (outro convention 0.43 s). Returns the CompRef and created layers.

| Param | Type | Notes |
|---|---|---|
| `name` | string |  |
| `format` | enum: h1080p30 \| v1080x1920p60 \| v1080x1920p30 (optional) |  |
| `duration` | number (optional) | Seconds (default 10). |
| `background` | enum: grafito \| black \| transparent (optional) |  |
| `guides` | boolean (optional) |  |
| `head_black_sec` | number (optional) |  |
| `folder` | string (optional) |  |

### silia_conform

Frame-rate conform helper for mixed sources (59.94 / 60 / 30 / 24 fps). analyze: ffprobe each source file (or every footage item in the project) and report native fps, VFR, drift per minute against target_fps and the recommended strategy. apply: set conformFrameRate on footage items (interpret) so they play at target_fps, or enable frame blending on their layers. Strategies: interpret (exact 60→30/59.94→60 where the ratio is clean), time_remap (when duration must be preserved), frame_blend (off-ratio sources).

| Param | Type | Notes |
|---|---|---|
| `action` | enum: analyze \| apply |  |
| `comp` | union (optional) | Composition: "active" (default), numeric item id, comp name, or {id}\|{name}. |
| `sources` | array (optional) | File paths; default: all footage items in the project. |
| `target_fps` | number (optional) | Default: comp fps. |
| `strategy` | enum: interpret \| time_remap \| frame_blend (optional) |  |
| `items` | array (optional) | apply: footage items (name/id); default: all with a mismatch. |

### silia_grade

Retro/mono grade on a shot head that dissolves off: adds an adjustment layer over the target layer's span with a look (retro_90s: lifted blacks, warm bias, desaturation via Levels + Tint + Hue/Saturation + Noise; mono: Tint 100%; lime_tint: Tritone toward lime), holds for hold_sec then fades its opacity to 0 over dissolve_sec. Returns the adjustment layer, effects and opacity keys.

| Param | Type | Notes |
|---|---|---|
| `comp` | union (optional) | Composition: "active" (default), numeric item id, comp name, or {id}\|{name}. |
| `layer` | union (optional) | Target layer (span and stacking). Default: whole comp. |
| `look` | enum: retro_90s \| mono \| lime_tint (optional) |  |
| `hold_sec` | number (optional) | Default 1.2 |
| `dissolve_sec` | number (optional) | Default 0.8 |
| `strength` | number (optional) | Max opacity of the grade (default 100). |
| `ease` | union (optional) | Ease: preset name (linear, hold, ease, ease_in, ease_out, ease_in_out, power2_out, power3_out, power3_in_out, expo_out, snappy), {inInfluence,outInfluence,inSpeed,outSpeed}, or cubic-bezier {x1,y1,x2,y2}. |

### silia_lower_third

Build an on-brand lower third: rounded card (variant lime | violeta | rosa | dark) with name (ES Klarheit Md) and optional role (Bk), positioned bottom-left or bottom-right inside the safe margin, with the confirmed entry (opacity 0→1, Y +18→0, power3_out, 0.32 s) and exit. All elements are parented to a control null so it can be moved as one. Returns the created layers and their in/out.

| Param | Type | Notes |
|---|---|---|
| `comp` | union (optional) | Composition: "active" (default), numeric item id, comp name, or {id}\|{name}. |
| `name` | string |  |
| `role` | string (optional) |  |
| `variant` | enum: lime \| violeta \| rosa \| dark (optional) |  |
| `in_time` | number (optional) | Default comp time. |
| `duration` | number (optional) | Seconds on screen (default 4). |
| `position` | enum: left \| right (optional) |  |
| `scale` | number (optional) | Relative size multiplier (default 1). |
| `entry` | enum: confirmed \| slide \| none (optional) |  |
| `exit` | enum: confirmed \| none (optional) |  |

### silia_outro

Regenerate the Silia outro from its .aep (the source references ~40 files on an external drive; missing-footage layers render opaque white). plan: open the project (as a copy), list comps and every layer with missing footage, and propose which layers to disable. render: apply the plan (disable missing layers, optionally enforce head black of head_black_sec by trimming/adding a black solid), save a copy and start aerender for the chosen orientation(s) with verification expectations (duration, head black 0.43 s). Returns job ids to poll with ae_render status.

| Param | Type | Notes |
|---|---|---|
| `action` | enum: plan \| render |  |
| `aep` | string | Path to the outro .aep |
| `comp_horizontal` | string (optional) | Default: first comp matching /horizontal/i |
| `comp_vertical` | string (optional) | Default: first comp matching /vertical/i |
| `orientation` | enum: h \| v \| both (optional) |  |
| `head_black_sec` | number (optional) | Default 0.43 |
| `disable_missing` | boolean (optional) | Default true |
| `disable_layers` | array (optional) | Extra layer names to disable. |
| `om_template` | string (optional) | Default "H.264 - Match Render Settings - 40 Mbps" |
| `output_dir` | string (optional) | Default <dataDir>/outro |
| `force` | boolean (optional) | Discard unsaved changes in the currently open project. |

### silia_push_25d

2.5D push on a still/plate: precomposes the layer at 2x (pre-scale for subpixel motion, collapse transformations), then animates scale from 100 to 100+amount_pct (direction in) or the reverse (out) across the layer's duration (or in_time/duration) with the given ease (default power2_out). Optional parallax: extra layers moved by ratios of the push. Returns the keyframes.

| Param | Type | Notes |
|---|---|---|
| `comp` | union (optional) | Composition: "active" (default), numeric item id, comp name, or {id}\|{name}. |
| `layer` | union | Layer: 1-based index, layer name, or {id} (AE 22+), {index}, {name}. |
| `amount_pct` | number (optional) | Default 5 (Silia range 4.5–6). |
| `direction` | enum: in \| out (optional) |  |
| `in_time` | number (optional) |  |
| `duration` | number (optional) |  |
| `ease` | union (optional) | Ease: preset name (linear, hold, ease, ease_in, ease_out, ease_in_out, power2_out, power3_out, power3_in_out, expo_out, snappy), {inInfluence,outInfluence,inSpeed,outSpeed}, or cubic-bezier {x1,y1,x2,y2}. |
| `pre_scale` | number (optional) | Default 2. |
| `anchor` | array (optional) | Push origin in comp pixels (default center). |

### silia_tokens

Silia brand and motion tokens as data (no AE round trip): colors (Lime #DEFF38 with black text, Violeta, Rosa, Grafito), video fonts (ES Klarheit Grotesk Bk/Md), formats (h1080p30, v1080x1920p60/30), durations (xs..xl), every named ease (silia/gsap, easings.net, carbon, material, fluent, atlassian as cubic-bezier + KeyframeEase influences), motion registers (functional_ui | product_video), named patterns (confirmed_entry, card_travel, zoom_punch, letter_stagger, word_reveal, push_25d), the five orb color ramps, type scale, rules and the SaaS-video house style. resolve_ease: token → KeyframeEase influences + bezier. plan_motion: intent (transition | demonstration | guidance | feedback | visualization | highlight | aesthetic) + optional device, distance_px, register, item_count, item_duration_ms, fps → concrete register, durationMs/frames, ease + exitEase (name, bezier, influences), staggerMs, sequenceMs, rules and sources.

| Param | Type | Notes |
|---|---|---|
| `action` | enum: get \| resolve_ease \| plan_motion (optional) |  |
| `token` | string (optional) | resolve_ease: e.g. power3_out, material_emphasized_decelerate, silia.snappy |
| `intent` | enum: transition \| demonstration \| guidance \| feedback \| visualization \| highlight \| aesthetic (optional) | plan_motion: what the motion is for. |
| `device` | enum: easing \| offset_and_delay \| parenting \| transformation \| value_change \| masking \| overlay \| cloning \| obscuration \| parallax \| dimensionality \| dolly_and_zoom (optional) | plan_motion: UX-in-Motion device (easing, offset_and_delay, parenting, transformation, value_change, masking, overlay, cloning, obscuration, parallax, dimensionality, dolly_and_zoom). |
| `distance_px` | number (optional) | plan_motion: travel distance; duration = 300*sqrt(d/200) ms clamped to the register band. |
| `register` | enum: functional_ui \| product_video (optional) | plan_motion: default product_video (Silia archetype premium); feedback defaults to functional_ui. |
| `item_count` | number (optional) | plan_motion: number of staggered items. |
| `item_duration_ms` | number (optional) | plan_motion: per-item duration for the stagger cap (default the planned duration). |
| `fps` | number (optional) | plan_motion: frame rate for snapping (default 30). |

### silia_type

On-brand typography. title: headline (Md, title_l/m/s) + optional sub (Bk) centered or aligned, with confirmed entry. kinetic: text layer with letter stagger (0.032 s per letter, 0.32 s, power3_out, rise 18 px). word_reveal: one text layer whose source text accumulates words at given times [{w,t}] with 0.16 s latency and 0.2 s fade to 95% (hold keys + per-word opacity via animator is approximated with source-text keyframes). All use ES Klarheit Grotesk; color defaults to white on dark, black on lime.

| Param | Type | Notes |
|---|---|---|
| `action` | enum: title \| kinetic \| word_reveal |  |
| `comp` | union (optional) | Composition: "active" (default), numeric item id, comp name, or {id}\|{name}. |
| `text` | string (optional) |  |
| `sub` | string (optional) |  |
| `size` | enum: title_l \| title_m \| title_s \| body_l \| body_m (optional) |  |
| `color` | string (optional) | Hex; default white (or black when on lime). |
| `align` | enum: left \| center \| right (optional) |  |
| `position` | array (optional) |  |
| `in_time` | number (optional) |  |
| `duration` | number (optional) |  |
| `words` | array (optional) | word_reveal: words with onset times (seconds). |
| `latency` | number (optional) |  |
| `ease` | union (optional) | Ease: preset name (linear, hold, ease, ease_in, ease_out, ease_in_out, power2_out, power3_out, power3_in_out, expo_out, snappy), {inInfluence,outInfluence,inSpeed,outSpeed}, or cubic-bezier {x1,y1,x2,y2}. |
| `on_lime` | boolean (optional) |  |

### silia_ui_composite

Composite Silia product UI over a plate from a spec (e.g. exported from Figma): rows (text lines), pills (rounded lime/violeta chips) and an optional cursor path, each as its own layer, stacked above plate_layer, entering with the confirmed pattern and a stagger. spec: {panel:{x,y,width,height,radius,color,opacity}, rows:[{text,x,y,size,color,weight}], pills:[{text,x,y,color,textColor}], cursor:{path:[[x,y,t],...]}}. Returns created layers and the entry timeline.

| Param | Type | Notes |
|---|---|---|
| `comp` | union (optional) | Composition: "active" (default), numeric item id, comp name, or {id}\|{name}. |
| `plate_layer` | union (optional) | Layer: 1-based index, layer name, or {id} (AE 22+), {index}, {name}. |
| `spec` | object |  |
| `in_time` | number (optional) |  |
| `duration` | number (optional) |  |
| `stagger` | number (optional) | Seconds between element entries (default 0.06). |
| `ease` | union (optional) | Ease: preset name (linear, hold, ease, ease_in, ease_out, ease_in_out, power2_out, power3_out, power3_in_out, expo_out, snappy), {inInfluence,outInfluence,inSpeed,outSpeed}, or cubic-bezier {x1,y1,x2,y2}. |
