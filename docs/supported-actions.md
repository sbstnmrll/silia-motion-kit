# ae-mcp supported tools

Generated 2026-09-03 from the tool registry. 27 tools.

| Tool | Authority | Actions | Description |
|---|---|---|---|
| `ae_batch` | edit | — | Run several tool calls as one unit. ops: [{tool, args}] executed in order; on_error stop (default) \| continue \| rollback (undo everything done so far). Because each op is its own undo group in AE, rollback undoes N gro |
| `ae_comp` | edit | `list`, `get`, `create`, `update`, `duplicate`, `delete`, `set_active`, `open` | Compositions. list: all comps. get: one comp with its layers. create: new comp (preset h1080p30\|v1080x1920p60\|v1080x1920p30\|... or explicit width/height/frame_rate; duration seconds; bg color). update: rename, duratio |
| `ae_ease` | edit | `preset`, `custom`, `from_cubic_bezier`, `interpolation`, `spatial`, `roving` | Easing and interpolation on existing keyframes. preset: apply a named ease (ease, ease_in, ease_out, ease_in_out, power2_out, power3_out, power3_in_out, expo_out, snappy, linear, hold) to keys (indices or all). custom: { |
| `ae_effect` | edit | `list`, `apply`, `get_params`, `set_params`, `remove`, `reorder`, `toggle`, `duplicate`, `apply_preset` | Effects on a layer (effect parade). list; apply (matchName, display name, alias, or template name from ae_effects_catalog templates) with optional params {paramMatchNameOrName: value} and position; get_params (all parame |
| `ae_effects_catalog` | inspect | `effects`, `resolve`, `templates`, `presets` | Installed effects and presets. effects: search app.effects by regex on display name or matchName (category included). resolve: map a display name or alias to the canonical matchName (includes corrections: Glow=ADBE Glo2, |
| `ae_execute_extendscript` | unsafe-script | — | Run arbitrary ExtendScript inside After Effects (escape hatch when no dedicated tool fits). Gated: requires confirm=true AND the server started with AE_MCP_ALLOW_RAW=1 (or the unsafe-script capability). The code is wrapp |
| `ae_expression` | edit | `get`, `set`, `set_batch`, `remove`, `validate`, `validate_all` | Expressions with validation. get; set (expression text or library name: wiggle, wiggle_slow, loop_cycle, loop_pingpong, loop_offset, loop_continue, inertia, bounce, spring, link_position, follow_with_delay, posterize_12, |
| `ae_frame` | export | `capture`, `contact_sheet`, `stats`, `compare` | See what a comp actually renders. capture: one frame at time t as an image (PNG, or JPEG for smaller payloads); background '#0A0A0B' flattens alpha (recommended; avoids the black fringe of transparent captures). contact_ |
| `ae_items` | edit | `list`, `get`, `import`, `import_sequence`, `replace`, `relink_missing`, `interpret`, `create_folder`, `move`, `rename`, `delete`, `find_missing` | Project panel items (footage, comps, folders, solids). list: with filter {type, nameRegex, folder, missingOnly}. get: one item by id or name. import: file (or folder path) with import_as footage\|comp\|comp_cropped\|proj |
| `ae_keyframes` | edit | `set`, `add`, `remove`, `list`, `offset`, `scale_time`, `copy` | Keyframe CRUD on one property. set: write keys [{time, value, ease?, interpolation?}] (batched via setValuesAtTimes; existing keys at other times are kept). add: alias of set. remove: by times[], indices[], range {from,t |
| `ae_layer_create` | edit | — | Create a layer of any kind in a comp: text (point text), box_text (paragraph box), shape (with primitives rect\|ellipse\|polygon\|star), solid, adjustment, null, camera, light, footage (from item id/name), comp (nested c |
| `ae_layer_query` | inspect | `list`, `get` | Read layers. list: LayerRef[] for a comp with optional filter {nameRegex, kind, selected, enabled, hasAudio}. get: full detail for one layer: transform at time, effects (with params if include_effect_params), masks, text |
| `ae_layer_transform` | edit | `set`, `keyframe`, `fit`, `center`, `reset` | Transform ergonomics. set: static anchor/position/scale/rotation/opacity/orientation (arrays sized to the property; scale as percent, uniform number allowed). keyframe: same fields but written as keyframes at time t (wit |
| `ae_layer_update` | edit | `rename`, `set_timing`, `set_parent`, `set_blend`, `set_matte`, `set_3d`, `set_flags`, `reorder`, `duplicate`, `delete`, `set_quality`, `set_time_remap`, `set_label`, `set_comment` | Layer settings other than transform. rename; set_timing {in,out,start_time,stretch}; set_parent (parent layer or null, jump_to_parent keeps position); set_blend (mode name); set_matte {matte_layer, matte_type alpha\|alph |
| `ae_markers` | edit | `list`, `add`, `add_bulk`, `update`, `remove`, `clear` | Comp or layer markers. list; add one {time, comment, duration, label, chapter, url}; add_bulk many; update by index or time; remove by index or time; clear all. Target a layer by passing layer, otherwise the comp marker  |
| `ae_masks` | edit | `list`, `add`, `update`, `remove` | Layer masks. list; add a mask from shape {rect:[x,y,w,h]} \| {ellipse:[cx,cy,rx,ry]} \| {path:{vertices,inTangents,outTangents,closed}} with mode add\|subtract\|intersect\|lighten\|darken\|difference\|none, feather [x,y] |
| `ae_precompose` | edit | — | Precompose layers into a new nested comp. move_all_attributes=true moves keyframes/effects into the precomp (only allowed for a single layer in newer AE); false leaves them on the new layer. |
| `ae_project` | edit | `info`, `new`, `open`, `save`, `save_copy`, `close`, `set_settings` | Project lifecycle. info: summary (path, dirty, comps, missing footage). new: new empty project (fails if the current one is dirty unless force). open: open an .aep. save: save (optionally save-as to a new path). save_cop |
| `ae_property_get` | inspect | `value`, `tree`, `search` | Read properties by matchName path. value: one property snapshot (value at time, keys, expression). tree: the property tree under a layer or a group path, to depth. search: find properties whose matchName or name matches  |
| `ae_property_set` | edit | — | Set one or more property values statically (removes nothing; if the property has keyframes the value is written at time at or the comp time as a keyframe). Values are coerced: "#RRGGBB" for colors, "50%" -> 50, stringifi |
| `ae_render` | export | `start`, `status`, `cancel`, `list`, `verify` | Background renders with aerender.exe (never blocks After Effects). start: saves a copy of the current project (save_copy_first, default true) and renders comp with rs_template/om_template to output; returns a job id. sta |
| `ae_render_queue` | export | `list`, `add`, `update`, `remove`, `clear`, `templates`, `queue_in_ame`, `render` | In-app render queue. list items; add a comp (rs_template, om_template, output path, optional frame range or work_area); update an item; remove; clear; templates (render settings and output module template names on this m |
| `ae_shape` | edit | `list`, `add_group`, `add_path`, `add_fill`, `add_stroke`, `add_trim`, `add_repeater`, `add_round_corners`, `set`, `remove` | Shape layer contents. list: tree of groups/paths/fills/strokes/operators with matchName paths. add_group (name, optional group_path parent). add_path {rect\|ellipse\|polystar\|custom} into a group. add_fill/add_stroke (c |
| `ae_status` | inspect | — | Health check and orientation. Always call this first. Reports whether the After Effects bridge is live (which AE version, which transport), the open project summary (path, dirty, comps, missing footage), the active comp, |
| `ae_text` | edit | `get`, `set`, `set_keyframes`, `fonts` | Text layer document. get: TextDocument snapshot (text, font, size, fill, stroke, tracking, leading, justification, box). set: change any of those (font by PostScript name; read-back flags silent font substitution). set_k |
| `ae_text_animator` | edit | `list`, `add`, `set_selector`, `set_property`, `remove`, `preset` | Text animators and range selectors. list; add an animator with properties {opacity, position:[x,y], scale:[x,y], rotation, tracking, blur:[x,y], fill:'#hex', line_spacing} and a range selector {start,end,offset, based_on |
| `ae_undo` | edit | `undo`, `redo` | Undo or redo the last N undo groups in After Effects (each tool call is one group). Returns the active comp read-back after the operation. |

## Parameters

### ae_batch

Run several tool calls as one unit. ops: [{tool, args}] executed in order; on_error stop (default) | continue | rollback (undo everything done so far). Because each op is its own undo group in AE, rollback undoes N groups. Returns per-op results plus the final active comp. Use for multi-step builds so a human can undo them in one gesture per step and you get one round trip of reporting.

| Param | Type | Notes |
|---|---|---|
| `ops` | array |  |
| `on_error` | enum: stop \| continue \| rollback (optional) |  |
| `comp` | union (optional) | Comp used for the final read-back (default active). |

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

### ae_ease

Easing and interpolation on existing keyframes. preset: apply a named ease (ease, ease_in, ease_out, ease_in_out, power2_out, power3_out, power3_in_out, expo_out, snappy, linear, hold) to keys (indices or all). custom: {inInfluence,outInfluence,inSpeed,outSpeed}. from_cubic_bezier: {x1,y1,x2,y2} applied across each consecutive key pair (out ease on key n, in ease on key n+1). interpolation: set in/out interpolation type. spatial: auto_bezier|continuous|linear tangents for spatial props. roving: set roving on interior keys. Returns the KeyList with eases.

| Param | Type | Notes |
|---|---|---|
| `action` | enum: preset \| custom \| from_cubic_bezier \| interpolation \| spatial \| roving |  |
| `comp` | union (optional) | Composition: "active" (default), numeric item id, comp name, or {id}\|{name}. |
| `layer` | union | Layer: 1-based index, layer name, or {id} (AE 22+), {index}, {name}. |
| `path` | string | Property path by matchName, e.g. "ADBE Transform Group/ADBE Position" or "Effects/ADBE Gaussian Blur 2/ADBE Gaussian Blur 2-0001". Aliases: position, scale, rotation, opacity, anchor, orientation, "source text", contents. |
| `keys` | array (optional) | 1-based key indices; default all. |
| `preset` | string (optional) |  |
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

| Param | Type | Notes |
|---|---|---|
| `code` | string | ES3 ExtendScript body. Must end with return __result({...}). |
| `confirm` | boolean | Must be true. Acknowledges that this runs unreviewed code inside After Effects. |
| `undo_group` | string (optional) | Wrap the whole body in one undo group with this label. |
| `timeout_ms` | number (optional) | Default 30000. Raise for long operations. |

### ae_expression

Expressions with validation. get; set (expression text or library name: wiggle, wiggle_slow, loop_cycle, loop_pingpong, loop_offset, loop_continue, inertia, bounce, spring, link_position, follow_with_delay, posterize_12, text_bounds_width, auto_fade_in_out, slider_driven; TARGET placeholder replaced with target_layer); set_batch [{layer,path,expression}]; remove; validate (dry-run: applies, reads expressionError, evaluates at eval_at, restores); validate_all (every expression in the comp or project, returns errors). Returns expression, enabled and expressionError read-back.

| Param | Type | Notes |
|---|---|---|
| `action` | enum: get \| set \| set_batch \| remove \| validate \| validate_all |  |
| `comp` | union (optional) | Composition: "active" (default), numeric item id, comp name, or {id}\|{name}. |
| `layer` | union (optional) | Layer: 1-based index, layer name, or {id} (AE 22+), {index}, {name}. |
| `path` | string (optional) | Property path by matchName, e.g. "ADBE Transform Group/ADBE Position" or "Effects/ADBE Gaussian Blur 2/ADBE Gaussian Blur 2-0001". Aliases: position, scale, rotation, opacity, anchor, orientation, "source text", contents. |
| `expression` | string (optional) |  |
| `library` | enum: wiggle \| wiggle_slow \| loop_cycle \| loop_pingpong \| loop_offset \| loop_continue \| loop_in_cycle \| inertia \| bounce \| spring \| link_position \| follow_with_delay \| posterize_12 \| text_bounds_width \| time_seconds_counter \| auto_fade_in_out \| slider_driven (optional) |  |
| `target_layer` | string (optional) | Replaces TARGET in library expressions. |
| `enabled` | boolean (optional) |  |
| `eval_at` | number (optional) | validate: evaluate at this time to surface runtime errors. |
| `batch` | array (optional) |  |
| `scope` | enum: comp \| project (optional) | validate_all: default comp. |

### ae_frame

See what a comp actually renders. capture: one frame at time t as an image (PNG, or JPEG for smaller payloads); background '#0A0A0B' flattens alpha (recommended; avoids the black fringe of transparent captures). contact_sheet: several frames tiled into one labeled JPEG grid (times[], or every N seconds, or at_markers, or at_keyframes of a layer property), max_width caps the sheet. stats: per-frame mean/max luma and alpha coverage without returning pixels (flash/black detection). compare: mean absolute difference between two times or a time and a reference PNG. hide_layers/solo_layers isolate parts of the comp during capture (restored afterwards).

| Param | Type | Notes |
|---|---|---|
| `action` | enum: capture \| contact_sheet \| stats \| compare |  |
| `comp` | union (optional) | Composition: "active" (default), numeric item id, comp name, or {id}\|{name}. |
| `time` | number (optional) | capture/compare: seconds (default comp time). |
| `times` | array (optional) |  |
| `every` | number (optional) | contact_sheet/stats: sample every N seconds across the range. |
| `range` | object (optional) |  |
| `at_markers` | boolean (optional) |  |
| `at_keyframes` | object (optional) |  |
| `max_frames` | number (optional) | Cap for every/at_* (default 16). |
| `max_width` | number (optional) | Output width cap (default 1280 for capture, 1600 for sheets). |
| `format` | enum: png \| jpeg (optional) |  |
| `background` | nullable (optional) | Flatten onto this color (default #0A0A0B). null keeps alpha (PNG only). |
| `region` | array (optional) | Crop [x,y,w,h] in comp pixels before scaling. |
| `hide_layers` | array (optional) | One or more layer references. |
| `solo_layers` | array (optional) | One or more layer references. |
| `labels` | boolean (optional) | contact_sheet: draw timecodes (default true). |
| `columns` | number (optional) |  |
| `reference_png` | string (optional) | compare: path of a reference image (else compare time vs time_b). |
| `time_b` | number (optional) |  |
| `keep_files` | boolean (optional) | Keep the PNG files on disk and return their paths (default true). |

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

### ae_precompose

Precompose layers into a new nested comp. move_all_attributes=true moves keyframes/effects into the precomp (only allowed for a single layer in newer AE); false leaves them on the new layer.

| Param | Type | Notes |
|---|---|---|
| `comp` | union (optional) | Composition: "active" (default), numeric item id, comp name, or {id}\|{name}. |
| `layers` | array | One or more layer references. |
| `name` | string | Name of the new precomp. |
| `move_all_attributes` | boolean (optional) | Default true for a single layer, false otherwise. |
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

Text layer document. get: TextDocument snapshot (text, font, size, fill, stroke, tracking, leading, justification, box). set: change any of those (font by PostScript name; read-back flags silent font substitution). set_keyframes: hold keyframes of source text [{time, text}] (captions, counters). fonts: list installed fonts (AE 24+) with optional regex filter (postScriptName, family, style).

| Param | Type | Notes |
|---|---|---|
| `action` | enum: get \| set \| set_keyframes \| fonts |  |
| `comp` | union (optional) | Composition: "active" (default), numeric item id, comp name, or {id}\|{name}. |
| `layer` | union (optional) | Layer: 1-based index, layer name, or {id} (AE 22+), {index}, {name}. |
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

### ae_undo

Undo or redo the last N undo groups in After Effects (each tool call is one group). Returns the active comp read-back after the operation.

| Param | Type | Notes |
|---|---|---|
| `action` | enum: undo \| redo |  |
| `count` | number (optional) |  |
