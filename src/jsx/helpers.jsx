// ae-mcp helpers — loaded once per ExtendScript engine via $.evalFile.
// ES3 ONLY: var, function expressions, no trailing commas, no getters, no JSON
// assumptions beyond json2 (concatenated ahead of this file at build time).
//
// Conventions:
//   __result(data) / __error(e, code)   return envelopes (tool scripts must return one)
//   __comp(ref) / __layer(comp, ref)     resolve targets ("active", id, name, index)
//   __prop(root, path)                   matchName path walk ("ADBE Transform Group/ADBE Position")
//   __mutate(name, fn)                   one undo group per tool call
//   __changed(read, mutate)              {before, after} read-back around a mutation
//
// Patterns adapted from Dakkshin/after-effects-mcp and the juansilvadesign community
// bundle (MIT) and premiere-pro-mcp (MIT). See THIRD_PARTY_NOTICES.md.

// ---------------------------------------------------------------------------
// Envelopes and diagnostics
// ---------------------------------------------------------------------------
var __warnings = [];

function __warn(msg) {
  __warnings.push(String(msg));
}

function __takeWarnings() {
  var w = __warnings;
  __warnings = [];
  return w;
}

function __result(data) {
  var out = { success: true, data: data };
  var w = __takeWarnings();
  if (w.length) {
    if (data && typeof data === "object" && !(data instanceof Array)) {
      data.warnings = (data.warnings || []).concat(w);
    } else {
      out.warnings = w;
    }
  }
  return JSON.stringify(out);
}

function __error(e, code) {
  __takeWarnings();
  var out = { success: false, error: "" };
  if (e && typeof e === "object") {
    out.error = String(e.message || e.description || e);
    if (e.line) out.line = e.line;
    if (e.fileName) out.file = String(e.fileName);
    if (e.code && !code) code = e.code;
  } else {
    out.error = String(e);
  }
  if (code) out.code = code;
  return JSON.stringify(out);
}

function __fail(msg, code) {
  var err = new Error(msg);
  if (code) err.code = code;
  throw err;
}

// ---------------------------------------------------------------------------
// ES3 shims (Array.prototype extras are deliberately NOT patched: AE objects are
// enumerated with for-in in places and extra prototype keys would leak).
// ---------------------------------------------------------------------------
function __each(arr, fn) {
  for (var i = 0; i < arr.length; i++) fn(arr[i], i);
}

function __map(arr, fn) {
  var out = [];
  for (var i = 0; i < arr.length; i++) out.push(fn(arr[i], i));
  return out;
}

function __indexOf(arr, v) {
  for (var i = 0; i < arr.length; i++) if (arr[i] === v) return i;
  return -1;
}

function __trim(s) {
  return String(s).replace(/^\s+|\s+$/g, "");
}

function __isArray(v) {
  return v instanceof Array || Object.prototype.toString.call(v) === "[object Array]";
}

function __num(v, fallback) {
  var n = parseFloat(v);
  return isNaN(n) ? fallback : n;
}

function __pad2(n) {
  return n < 10 ? "0" + n : "" + n;
}

function __round(n, d) {
  var f = Math.pow(10, d === undefined ? 4 : d);
  return Math.round(n * f) / f;
}

// ---------------------------------------------------------------------------
// Version gating
// ---------------------------------------------------------------------------
function __ver() {
  return parseFloat(app.version);
}

function __need(min, feature) {
  if (__ver() < min) __fail(feature + " requires After Effects " + min + " or newer (running " + app.version + ")", "VERSION_UNSUPPORTED");
}

// ---------------------------------------------------------------------------
// Paths, colors, time
// ---------------------------------------------------------------------------
function __fsPath(p) {
  return new File(String(p).replace(/\\/g, "/")).fsName;
}

function __file(p) {
  return new File(String(p).replace(/\\/g, "/"));
}

function __folder(p) {
  return new Folder(String(p).replace(/\\/g, "/"));
}

function __ensureFolder(p) {
  var f = __folder(p);
  if (!f.exists) f.create();
  return f;
}

// "#DEFF38" | "DEFF38" | "#RRGGBBAA" | [r,g,b] (0..1 or 0..255) | [r,g,b,a] -> [r,g,b] or [r,g,b,a] in 0..1
function __color(v, withAlpha) {
  var out;
  if (typeof v === "string") {
    var h = v.replace(/^#/, "");
    if (h.length === 3) h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
    if (h.length !== 6 && h.length !== 8) __fail("Bad color " + v + " (expected #RRGGBB or #RRGGBBAA)", "BAD_COLOR");
    out = [parseInt(h.substr(0, 2), 16) / 255, parseInt(h.substr(2, 2), 16) / 255, parseInt(h.substr(4, 2), 16) / 255];
    if (h.length === 8) out.push(parseInt(h.substr(6, 2), 16) / 255);
  } else if (__isArray(v)) {
    var max = 0;
    for (var i = 0; i < v.length; i++) if (parseFloat(v[i]) > max) max = parseFloat(v[i]);
    var scale = max > 1 ? 255 : 1;
    out = __map(v, function (c) { return parseFloat(c) / scale; });
  } else {
    __fail("Bad color value", "BAD_COLOR");
  }
  if (withAlpha && out.length === 3) out.push(1);
  if (!withAlpha && out.length === 4) out = out.slice(0, 3);
  return out;
}

function __hex(rgb) {
  function h(c) { var s = Math.round(Math.max(0, Math.min(1, c)) * 255).toString(16); return s.length < 2 ? "0" + s : s; }
  return "#" + h(rgb[0]) + h(rgb[1]) + h(rgb[2]);
}

function __tc(seconds, fps) {
  var f = fps || 30;
  var total = Math.max(0, seconds);
  var hh = Math.floor(total / 3600);
  var mm = Math.floor((total % 3600) / 60);
  var ss = Math.floor(total % 60);
  var ff = Math.round((total - Math.floor(total)) * f);
  if (ff >= f) { ff = 0; ss += 1; }
  return __pad2(hh) + ":" + __pad2(mm) + ":" + __pad2(ss) + ":" + __pad2(ff);
}

// ---------------------------------------------------------------------------
// Resolution: comps, items, layers, properties
// ---------------------------------------------------------------------------
function __project() {
  if (!app.project) __fail("No project is open", "NO_PROJECT");
  return app.project;
}

function __itemById(id) {
  var p = __project();
  for (var i = 1; i <= p.numItems; i++) if (p.item(i).id === id) return p.item(i);
  return null;
}

function __itemByName(name, type) {
  var p = __project();
  for (var i = 1; i <= p.numItems; i++) {
    var it = p.item(i);
    if (it.name === name && (!type || __itemType(it) === type)) return it;
  }
  return null;
}

function __itemType(it) {
  if (it instanceof CompItem) return "comp";
  if (it instanceof FolderItem) return "folder";
  if (it instanceof FootageItem) {
    var ms = it.mainSource;
    if (ms instanceof SolidSource) return "solid";
    if (ms instanceof PlaceholderSource) return "placeholder";
    return "footage";
  }
  return "item";
}

// ref: undefined|"active" -> active comp; number -> item id; string -> name; {id}|{name}
function __comp(ref) {
  var p = __project();
  var c = null;
  if (ref === undefined || ref === null || ref === "" || ref === "active") {
    c = p.activeItem;
    if (!(c instanceof CompItem)) __fail("No active composition. Open a comp in the viewer or pass comp by name/id.", "NO_ACTIVE_COMP");
    return c;
  }
  if (typeof ref === "number") {
    c = __itemById(ref);
    if (!(c instanceof CompItem)) __fail("No composition with id " + ref, "COMP_NOT_FOUND");
    return c;
  }
  if (typeof ref === "string") {
    if (/^#\d+$/.test(ref)) return __comp(parseInt(ref.substr(1), 10));
    c = __itemByName(ref, "comp");
    if (!c) __fail('No composition named "' + ref + '"', "COMP_NOT_FOUND");
    return c;
  }
  if (typeof ref === "object") {
    if (ref.id !== undefined) return __comp(parseInt(ref.id, 10));
    if (ref.name !== undefined) return __comp(String(ref.name));
  }
  __fail("Bad comp reference", "BAD_REF");
}

// ref: number -> 1-based index; string -> name; {index}|{id}|{name}
function __layer(comp, ref) {
  if (ref === undefined || ref === null) __fail("Layer reference is required (index, name, or {id})", "BAD_REF");
  var i, l;
  if (typeof ref === "number") {
    if (ref < 1 || ref > comp.numLayers) __fail("Layer index " + ref + " out of range 1.." + comp.numLayers + ' in "' + comp.name + '"', "LAYER_NOT_FOUND");
    return comp.layer(ref);
  }
  if (typeof ref === "string") {
    if (/^#\d+$/.test(ref)) return __layer(comp, { id: parseInt(ref.substr(1), 10) });
    if (/^\d+$/.test(ref)) return __layer(comp, parseInt(ref, 10));
    for (i = 1; i <= comp.numLayers; i++) if (comp.layer(i).name === ref) return comp.layer(i);
    __fail('No layer named "' + ref + '" in "' + comp.name + '"', "LAYER_NOT_FOUND");
  }
  if (typeof ref === "object") {
    if (ref.index !== undefined) return __layer(comp, parseInt(ref.index, 10));
    if (ref.id !== undefined) {
      __need(22.0, "layer.id");
      for (i = 1; i <= comp.numLayers; i++) { l = comp.layer(i); if (l.id === parseInt(ref.id, 10)) return l; }
      __fail("No layer with id " + ref.id, "LAYER_NOT_FOUND");
    }
    if (ref.name !== undefined) return __layer(comp, String(ref.name));
  }
  __fail("Bad layer reference", "BAD_REF");
}

function __layers(comp, refs) {
  return __map(refs, function (r) { return __layer(comp, r); });
}

// Common aliases so callers can write "Position" or "transform.position".
var __PATH_ALIASES = {
  "transform": "ADBE Transform Group",
  "anchor": "ADBE Transform Group/ADBE Anchor Point",
  "anchor point": "ADBE Transform Group/ADBE Anchor Point",
  "position": "ADBE Transform Group/ADBE Position",
  "x position": "ADBE Transform Group/ADBE Position_0",
  "y position": "ADBE Transform Group/ADBE Position_1",
  "z position": "ADBE Transform Group/ADBE Position_2",
  "scale": "ADBE Transform Group/ADBE Scale",
  "rotation": "ADBE Transform Group/ADBE Rotate Z",
  "z rotation": "ADBE Transform Group/ADBE Rotate Z",
  "x rotation": "ADBE Transform Group/ADBE Rotate X",
  "y rotation": "ADBE Transform Group/ADBE Rotate Y",
  "orientation": "ADBE Transform Group/ADBE Orientation",
  "opacity": "ADBE Transform Group/ADBE Opacity",
  "effects": "ADBE Effect Parade",
  "masks": "ADBE Mask Parade",
  "text": "ADBE Text Properties",
  "source text": "ADBE Text Properties/ADBE Text Document",
  "animators": "ADBE Text Properties/ADBE Text Animators",
  "contents": "ADBE Root Vectors Group",
  "time remap": "ADBE Time Remapping",
  "audio levels": "ADBE Audio Group/ADBE Audio Levels",
  "material": "ADBE Material Options Group",
  "camera options": "ADBE Camera Options Group",
  "light options": "ADBE Light Options Group",
  "layer styles": "ADBE Layer Styles"
};

function __splitPath(path) {
  if (__isArray(path)) return path;
  var s = __trim(String(path));
  var alias = __PATH_ALIASES[s.toLowerCase()];
  if (alias) s = alias;
  var parts = s.split("/");
  var out = [];
  for (var i = 0; i < parts.length; i++) {
    var seg = __trim(parts[i]);
    if (!seg) continue;
    var a = __PATH_ALIASES[seg.toLowerCase()];
    if (a && a.indexOf("/") === -1) seg = a;
    out.push(seg);
  }
  return out;
}

// Resolve one segment: "ADBE Gaussian Blur 2", "ADBE Gaussian Blur 2[2]" (2nd instance),
// "Gaussian Blur" (display name fallback), or a 1-based numeric index.
function __childProp(group, seg) {
  var m = /^(.*)\[(\d+)\]$/.exec(seg);
  var wanted = m ? m[1] : seg;
  var instance = m ? parseInt(m[2], 10) : 1;
  if (/^\d+$/.test(wanted)) {
    var idx = parseInt(wanted, 10);
    if (idx < 1 || idx > group.numProperties) return null;
    return group.property(idx);
  }
  var seen = 0;
  for (var i = 1; i <= group.numProperties; i++) {
    var p = group.property(i);
    if (p.matchName === wanted) { seen++; if (seen === instance) return p; }
  }
  seen = 0;
  for (var j = 1; j <= group.numProperties; j++) {
    var q = group.property(j);
    if (q.name === wanted) { seen++; if (seen === instance) return q; }
  }
  return null;
}

// root: a Layer or PropertyGroup. Returns the Property/PropertyGroup or throws.
function __prop(root, path) {
  var segs = __splitPath(path);
  var cur = root;
  for (var i = 0; i < segs.length; i++) {
    if (!cur || typeof cur.numProperties === "undefined" && !(cur instanceof Layer)) __fail("Path segment '" + segs[i] + "' has no parent group", "PROP_NOT_FOUND");
    var next = __childProp(cur, segs[i]);
    if (!next) {
      var avail = [];
      try { for (var k = 1; k <= Math.min(cur.numProperties, 40); k++) avail.push(cur.property(k).matchName + " (" + cur.property(k).name + ")"); } catch (e0) {}
      __fail("Property '" + segs[i] + "' not found under '" + (cur.matchName || cur.name) + "'. Available: " + avail.join(", "), "PROP_NOT_FOUND");
    }
    cur = next;
  }
  return cur;
}

function __propPath(p) {
  var parts = [];
  var cur = p;
  while (cur && cur.propertyDepth > 0) {
    parts.unshift(cur.matchName);
    cur = cur.parentProperty;
  }
  return parts.join("/");
}

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------
function __valueTypeName(t) {
  switch (t) {
    case PropertyValueType.NO_VALUE: return "none";
    case PropertyValueType.ThreeD_SPATIAL: return "3d_spatial";
    case PropertyValueType.ThreeD: return "3d";
    case PropertyValueType.TwoD_SPATIAL: return "2d_spatial";
    case PropertyValueType.TwoD: return "2d";
    case PropertyValueType.OneD: return "1d";
    case PropertyValueType.COLOR: return "color";
    case PropertyValueType.CUSTOM_VALUE: return "custom";
    case PropertyValueType.MARKER: return "marker";
    case PropertyValueType.LAYER_INDEX: return "layer_index";
    case PropertyValueType.MASK_INDEX: return "mask_index";
    case PropertyValueType.SHAPE: return "shape";
    case PropertyValueType.TEXT_DOCUMENT: return "text_document";
    default: return "unknown";
  }
}

function __value(v) {
  if (v === undefined || v === null) return null;
  if (typeof v === "number" || typeof v === "string" || typeof v === "boolean") return v;
  if (__isArray(v)) return __map(v, function (x) { return typeof x === "number" ? __round(x, 4) : x; });
  if (v instanceof TextDocument) return __textDoc(v);
  if (v instanceof Shape) {
    return { vertices: v.vertices, inTangents: v.inTangents, outTangents: v.outTangents, closed: v.closed };
  }
  if (v instanceof MarkerValue) {
    return { comment: v.comment, duration: v.duration, chapter: v.chapter, url: v.url, label: v.label };
  }
  return String(v);
}

function __textDoc(d) {
  var out = { text: d.text };
  try { out.font = d.font; } catch (e1) {}
  try { out.fontSize = d.fontSize; } catch (e2) {}
  try { out.fillColor = d.applyFill ? __hex(d.fillColor) : null; } catch (e3) {}
  try { out.strokeColor = d.applyStroke ? __hex(d.strokeColor) : null; } catch (e4) {}
  try { out.strokeWidth = d.applyStroke ? d.strokeWidth : 0; } catch (e5) {}
  try { out.tracking = d.tracking; } catch (e6) {}
  try { out.leading = d.leading; } catch (e7) {}
  try { out.justification = __justName(d.justification); } catch (e8) {}
  try { out.boxText = d.boxText; if (d.boxText) out.boxTextSize = d.boxTextSize; } catch (e9) {}
  try { out.allCaps = d.allCaps; } catch (e10) {}
  try { out.fauxBold = d.fauxBold; out.fauxItalic = d.fauxItalic; } catch (e11) {}
  return out;
}

function __justName(j) {
  switch (j) {
    case ParagraphJustification.LEFT_JUSTIFY: return "left";
    case ParagraphJustification.RIGHT_JUSTIFY: return "right";
    case ParagraphJustification.CENTER_JUSTIFY: return "center";
    case ParagraphJustification.FULL_JUSTIFY_LASTLINE_LEFT: return "justify_last_left";
    case ParagraphJustification.FULL_JUSTIFY_LASTLINE_RIGHT: return "justify_last_right";
    case ParagraphJustification.FULL_JUSTIFY_LASTLINE_CENTER: return "justify_last_center";
    case ParagraphJustification.FULL_JUSTIFY_LASTLINE_FULL: return "justify_full";
    default: return "unknown";
  }
}

function __justValue(name) {
  switch (String(name).toLowerCase()) {
    case "left": return ParagraphJustification.LEFT_JUSTIFY;
    case "right": return ParagraphJustification.RIGHT_JUSTIFY;
    case "center": return ParagraphJustification.CENTER_JUSTIFY;
    case "justify_last_left": return ParagraphJustification.FULL_JUSTIFY_LASTLINE_LEFT;
    case "justify_last_right": return ParagraphJustification.FULL_JUSTIFY_LASTLINE_RIGHT;
    case "justify_last_center": return ParagraphJustification.FULL_JUSTIFY_LASTLINE_CENTER;
    case "justify_full": return ParagraphJustification.FULL_JUSTIFY_LASTLINE_FULL;
    default: __fail("Unknown justification '" + name + "'", "BAD_ARG");
  }
}

function __propInfo(p, at) {
  var info = { path: __propPath(p), matchName: p.matchName, name: p.name };
  if (p.propertyType === PropertyType.PROPERTY) {
    info.kind = "property";
    info.valueType = __valueTypeName(p.propertyValueType);
    try { info.value = __value(at !== undefined ? p.valueAtTime(at, false) : p.value); } catch (e1) { info.value = null; }
    info.numKeys = p.numKeys;
    info.isTimeVarying = p.isTimeVarying;
    info.canVaryOverTime = p.canVaryOverTime;
    info.canSetExpression = p.canSetExpression;
    if (p.canSetExpression) {
      info.expression = p.expression;
      info.expressionEnabled = p.expressionEnabled;
      info.expressionError = p.expressionError || "";
    }
    info.isSpatial = p.isSpatial;
    try { info.dimensionsSeparated = p.dimensionsSeparated; } catch (e2) {}
    try { if (p.hasMin) info.min = p.minValue; if (p.hasMax) info.max = p.maxValue; } catch (e3) {}
    try { info.unitsText = p.unitsText; } catch (e4) {}
  } else {
    info.kind = p.propertyType === PropertyType.INDEXED_GROUP ? "indexed_group" : "group";
    info.numProperties = p.numProperties;
    try { info.enabled = p.enabled; } catch (e5) {}
  }
  return info;
}

function __propTree(group, depth, onlyAnimatable) {
  var out = [];
  for (var i = 1; i <= group.numProperties; i++) {
    var p = group.property(i);
    if (p.propertyType === PropertyType.PROPERTY) {
      if (onlyAnimatable && !p.canVaryOverTime) continue;
      out.push(__propInfo(p));
    } else {
      var node = __propInfo(p);
      if (depth > 1) node.children = __propTree(p, depth - 1, onlyAnimatable);
      out.push(node);
    }
  }
  return out;
}

// Text and shape layers do not always satisfy instanceof AVLayer in the shared engine; duck-type instead.
function __isAV(l) {
  return !!l && !(l instanceof CameraLayer) && !(l instanceof LightLayer) && typeof l.blendingMode !== "undefined";
}

function __layerKind(l) {
  if (l instanceof TextLayer) return "text";
  if (l instanceof ShapeLayer) return "shape";
  if (l instanceof CameraLayer) return "camera";
  if (l instanceof LightLayer) return "light";
  if (__isAV(l)) {
    if (l.nullLayer) return "null";
    if (l.adjustmentLayer) return "adjustment";
    if (l.source instanceof CompItem) return "comp";
    if (l.source && l.source.mainSource instanceof SolidSource) return "solid";
    if (l.source && !l.hasVideo && l.hasAudio) return "audio";
    return "footage";
  }
  return "layer";
}

function __blendName(m) {
  var names = { };
  names[BlendingMode.NORMAL] = "normal"; names[BlendingMode.ADD] = "add"; names[BlendingMode.MULTIPLY] = "multiply";
  names[BlendingMode.SCREEN] = "screen"; names[BlendingMode.OVERLAY] = "overlay"; names[BlendingMode.SOFT_LIGHT] = "soft_light";
  names[BlendingMode.HARD_LIGHT] = "hard_light"; names[BlendingMode.DARKEN] = "darken"; names[BlendingMode.LIGHTEN] = "lighten";
  names[BlendingMode.DIFFERENCE] = "difference"; names[BlendingMode.EXCLUSION] = "exclusion"; names[BlendingMode.HUE] = "hue";
  names[BlendingMode.SATURATION] = "saturation"; names[BlendingMode.COLOR] = "color"; names[BlendingMode.LUMINOSITY] = "luminosity";
  names[BlendingMode.LINEAR_DODGE] = "linear_dodge"; names[BlendingMode.LINEAR_BURN] = "linear_burn"; names[BlendingMode.COLOR_DODGE] = "color_dodge";
  names[BlendingMode.COLOR_BURN] = "color_burn"; names[BlendingMode.SILHOUETE_ALPHA] = "silhouette_alpha"; names[BlendingMode.SILHOUETTE_LUMA] = "silhouette_luma";
  names[BlendingMode.STENCIL_ALPHA] = "stencil_alpha"; names[BlendingMode.STENCIL_LUMA] = "stencil_luma"; names[BlendingMode.ALPHA_ADD] = "alpha_add";
  names[BlendingMode.LUMINESCENT_PREMUL] = "luminescent_premul"; names[BlendingMode.DISSOLVE] = "dissolve"; names[BlendingMode.DANCING_DISSOLVE] = "dancing_dissolve";
  names[BlendingMode.CLASSIC_COLOR_BURN] = "classic_color_burn"; names[BlendingMode.CLASSIC_COLOR_DODGE] = "classic_color_dodge"; names[BlendingMode.CLASSIC_DIFFERENCE] = "classic_difference";
  names[BlendingMode.LINEAR_LIGHT] = "linear_light"; names[BlendingMode.VIVID_LIGHT] = "vivid_light"; names[BlendingMode.PIN_LIGHT] = "pin_light";
  names[BlendingMode.HARD_MIX] = "hard_mix"; names[BlendingMode.LIGHTER_COLOR] = "lighter_color"; names[BlendingMode.DARKER_COLOR] = "darker_color";
  names[BlendingMode.SUBTRACT] = "subtract"; names[BlendingMode.DIVIDE] = "divide";
  return names[m] || "unknown";
}

function __blendValue(name) {
  var n = String(name).toLowerCase().replace(/[\s-]/g, "_");
  var table = {
    normal: BlendingMode.NORMAL, add: BlendingMode.ADD, multiply: BlendingMode.MULTIPLY, screen: BlendingMode.SCREEN,
    overlay: BlendingMode.OVERLAY, soft_light: BlendingMode.SOFT_LIGHT, hard_light: BlendingMode.HARD_LIGHT, darken: BlendingMode.DARKEN,
    lighten: BlendingMode.LIGHTEN, difference: BlendingMode.DIFFERENCE, exclusion: BlendingMode.EXCLUSION, hue: BlendingMode.HUE,
    saturation: BlendingMode.SATURATION, color: BlendingMode.COLOR, luminosity: BlendingMode.LUMINOSITY, linear_dodge: BlendingMode.LINEAR_DODGE,
    linear_burn: BlendingMode.LINEAR_BURN, color_dodge: BlendingMode.COLOR_DODGE, color_burn: BlendingMode.COLOR_BURN,
    silhouette_alpha: BlendingMode.SILHOUETE_ALPHA, silhouette_luma: BlendingMode.SILHOUETTE_LUMA, stencil_alpha: BlendingMode.STENCIL_ALPHA,
    stencil_luma: BlendingMode.STENCIL_LUMA, alpha_add: BlendingMode.ALPHA_ADD, luminescent_premul: BlendingMode.LUMINESCENT_PREMUL,
    dissolve: BlendingMode.DISSOLVE, dancing_dissolve: BlendingMode.DANCING_DISSOLVE, linear_light: BlendingMode.LINEAR_LIGHT,
    vivid_light: BlendingMode.VIVID_LIGHT, pin_light: BlendingMode.PIN_LIGHT, hard_mix: BlendingMode.HARD_MIX,
    lighter_color: BlendingMode.LIGHTER_COLOR, darker_color: BlendingMode.DARKER_COLOR, subtract: BlendingMode.SUBTRACT, divide: BlendingMode.DIVIDE
  };
  if (table[n] === undefined) __fail("Unknown blend mode '" + name + "'", "BAD_ARG");
  return table[n];
}

function __matteName(t) {
  if (t === TrackMatteType.NO_TRACK_MATTE) return "none";
  if (t === TrackMatteType.ALPHA) return "alpha";
  if (t === TrackMatteType.ALPHA_INVERTED) return "alpha_inverted";
  if (t === TrackMatteType.LUMA) return "luma";
  if (t === TrackMatteType.LUMA_INVERTED) return "luma_inverted";
  return "unknown";
}

function __matteValue(name) {
  switch (String(name).toLowerCase()) {
    case "none": return TrackMatteType.NO_TRACK_MATTE;
    case "alpha": return TrackMatteType.ALPHA;
    case "alpha_inverted": case "alpha_inv": return TrackMatteType.ALPHA_INVERTED;
    case "luma": return TrackMatteType.LUMA;
    case "luma_inverted": case "luma_inv": return TrackMatteType.LUMA_INVERTED;
    default: __fail("Unknown matte type '" + name + "'", "BAD_ARG");
  }
}

function __layerInfo(l) {
  var info = {
    index: l.index,
    name: l.name,
    kind: __layerKind(l),
    enabled: l.enabled,
    locked: l.locked,
    shy: l.shy,
    solo: l.solo,
    inPoint: __round(l.inPoint),
    outPoint: __round(l.outPoint),
    startTime: __round(l.startTime),
    stretch: l.stretch,
    parentIndex: l.parent ? l.parent.index : null,
    parentName: l.parent ? l.parent.name : null,
    label: l.label,
    comment: l.comment,
    hasVideo: l.hasVideo
  };
  try { if (__ver() >= 22) info.id = l.id; } catch (e0) {}
  if (__isAV(l)) {
    info.is3D = l.threeDLayer;
    info.blend = __blendName(l.blendingMode);
    info.adjustment = l.adjustmentLayer;
    info.isNull = l.nullLayer;
    info.hasAudio = l.hasAudio;
    info.audioEnabled = l.audioEnabled;
    info.motionBlur = l.motionBlur;
    info.collapse = l.collapseTransformation;
    info.quality = l.quality === LayerQuality.BEST ? "best" : l.quality === LayerQuality.DRAFT ? "draft" : "wireframe";
    try { info.matte = __matteName(l.trackMatteType); } catch (e1) {}
    try { if (__ver() >= 23 && l.trackMatteLayer) info.matteLayerIndex = l.trackMatteLayer.index; } catch (e2) {}
    try { info.isTrackMatte = l.isTrackMatte; } catch (e3) {}
    if (l.source) {
      info.source = { id: l.source.id, name: l.source.name, type: __itemType(l.source) };
      try { if (l.source.width) { info.source.width = l.source.width; info.source.height = l.source.height; } } catch (e4) {}
    }
    try { info.timeRemapEnabled = l.timeRemapEnabled; } catch (e5) {}
  }
  try {
    var t = l.property("ADBE Transform Group");
    info.transform = {
      anchor: __value(t.property("ADBE Anchor Point").value),
      position: __value(t.property("ADBE Position").value),
      scale: __value(t.property("ADBE Scale").value),
      rotation: __value(t.property("ADBE Rotate Z").value),
      opacity: t.property("ADBE Opacity") ? __value(t.property("ADBE Opacity").value) : null
    };
  } catch (e6) {}
  try {
    var fx = l.property("ADBE Effect Parade");
    info.numEffects = fx ? fx.numProperties : 0;
  } catch (e7) {}
  try {
    var mk = l.property("ADBE Mask Parade");
    info.numMasks = mk ? mk.numProperties : 0;
  } catch (e8) {}
  if (l instanceof TextLayer) {
    try { info.text = __textDoc(l.property("ADBE Text Properties").property("ADBE Text Document").value).text; } catch (e9) {}
  }
  return info;
}

function __compInfo(c) {
  var info = {
    id: c.id,
    name: c.name,
    width: c.width,
    height: c.height,
    pixelAspect: c.pixelAspect,
    frameRate: __round(c.frameRate, 3),
    frameDuration: c.frameDuration,
    duration: __round(c.duration),
    workAreaStart: __round(c.workAreaStart),
    workAreaDuration: __round(c.workAreaDuration),
    displayStartTime: __round(c.displayStartTime),
    bgColor: __hex(c.bgColor),
    numLayers: c.numLayers,
    time: __round(c.time),
    motionBlur: c.motionBlur,
    shutterAngle: c.shutterAngle,
    shutterPhase: c.shutterPhase,
    renderer: c.renderer,
    isActive: app.project.activeItem === c
  };
  try { info.hideShyLayers = c.hideShyLayers; } catch (e0) {}
  try { info.resolutionFactor = c.resolutionFactor; } catch (e1) {}
  try { info.parentFolder = c.parentFolder ? c.parentFolder.name : null; } catch (e2) {}
  try { info.usedIn = __map(c.usedIn, function (u) { return u.name; }); } catch (e3) {}
  return info;
}

function __itemInfo(it) {
  var info = { id: it.id, name: it.name, type: __itemType(it), comment: it.comment, label: it.label };
  try { info.parentFolder = it.parentFolder ? it.parentFolder.name : null; } catch (e0) {}
  if (it instanceof FootageItem || it instanceof CompItem) {
    try { info.width = it.width; info.height = it.height; info.duration = __round(it.duration); info.frameRate = __round(it.frameRate, 3); } catch (e1) {}
    try { info.hasVideo = it.hasVideo; info.hasAudio = it.hasAudio; } catch (e2) {}
    try { info.usedIn = __map(it.usedIn, function (u) { return u.name; }); } catch (e3) {}
  }
  if (it instanceof FootageItem) {
    try { info.file = it.file ? it.file.fsName : null; } catch (e4) {}
    try { info.missing = it.footageMissing; } catch (e5) {}
    try { if (it.mainSource instanceof FileSource) { info.isStill = it.mainSource.isStill; info.hasAlpha = it.mainSource.hasAlpha; info.alphaMode = it.mainSource.alphaMode; info.conformFrameRate = it.mainSource.conformFrameRate; info.nativeFrameRate = it.mainSource.nativeFrameRate; info.loop = it.mainSource.loop; } } catch (e6) {}
    try { if (it.mainSource instanceof SolidSource) info.color = __hex(it.mainSource.color); } catch (e7) {}
  }
  if (it instanceof FolderItem) info.numItems = it.numItems;
  return info;
}

function __projectInfo() {
  var p = __project();
  var info = {
    file: p.file ? p.file.fsName : null,
    dirty: p.dirty,
    numItems: p.numItems,
    bitsPerChannel: p.bitsPerChannel,
    activeItem: (p.activeItem instanceof CompItem) ? { id: p.activeItem.id, name: p.activeItem.name } : null,
    aeVersion: app.version,
    locale: $.locale
  };
  try { info.workingSpace = p.workingSpace; } catch (e0) {}
  try { info.timeDisplayType = p.timeDisplayType === TimeDisplayType.TIMECODE ? "timecode" : "frames"; } catch (e1) {}
  var comps = [], missing = 0;
  for (var i = 1; i <= p.numItems; i++) {
    var it = p.item(i);
    if (it instanceof CompItem) comps.push({ id: it.id, name: it.name, w: it.width, h: it.height, fps: __round(it.frameRate, 3), duration: __round(it.duration), numLayers: it.numLayers });
    else if (it instanceof FootageItem) { try { if (it.footageMissing) missing++; } catch (e2) {} }
  }
  info.comps = comps.slice(0, 200);
  info.numComps = comps.length;
  info.missingFootage = missing;
  return info;
}

function __missingFootage() {
  var p = __project();
  var out = [];
  for (var i = 1; i <= p.numItems; i++) {
    var it = p.item(i);
    if (it instanceof FootageItem) {
      try { if (it.footageMissing) out.push({ id: it.id, name: it.name, file: it.file ? it.file.fsName : null, usedIn: __map(it.usedIn, function (u) { return u.name; }) }); } catch (e0) {}
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Mutation harness: one undo group per tool call, read-back around mutations
// ---------------------------------------------------------------------------
function __mutate(name, fn) {
  app.beginUndoGroup("AE MCP: " + name);
  try {
    return fn();
  } finally {
    app.endUndoGroup();
  }
}

function __changed(readFn, mutateFn) {
  var before = null;
  try { before = readFn(); } catch (e0) {}
  mutateFn();
  return { before: before, after: readFn() };
}

// ---------------------------------------------------------------------------
// Values, keyframes, easing
// ---------------------------------------------------------------------------
// Coerce an incoming value to what the property expects: parse stringified
// arrays ("[100,200]"), hex colors, percentages, and pad/trim dimensions.
function __coerce(prop, v) {
  if (typeof v === "string") {
    var s = __trim(v);
    if (/^\[.*\]$/.test(s)) { try { v = JSON.parse(s); } catch (e0) {} }
    else if (/^-?\d+(\.\d+)?%$/.test(s)) v = parseFloat(s);
    else if (/^#?[0-9a-f]{6}([0-9a-f]{2})?$/i.test(s) && prop.propertyValueType === PropertyValueType.COLOR) v = __color(s, true);
    else if (/^-?\d+(\.\d+)?$/.test(s)) v = parseFloat(s);
  }
  var t = prop.propertyValueType;
  if (t === PropertyValueType.COLOR) return __color(v, true);
  if (t === PropertyValueType.OneD) {
    if (__isArray(v)) v = v[0];
    if (typeof v === "boolean") return v ? 1 : 0;
    return parseFloat(v);
  }
  if (t === PropertyValueType.TwoD || t === PropertyValueType.TwoD_SPATIAL) {
    if (!__isArray(v)) __fail("Property " + prop.name + " expects [x, y]", "BAD_VALUE");
    return [parseFloat(v[0]), parseFloat(v[1])];
  }
  if (t === PropertyValueType.ThreeD || t === PropertyValueType.ThreeD_SPATIAL) {
    if (!__isArray(v)) __fail("Property " + prop.name + " expects [x, y, z]", "BAD_VALUE");
    return [parseFloat(v[0]), parseFloat(v[1]), v.length > 2 ? parseFloat(v[2]) : 0];
  }
  if (t === PropertyValueType.TEXT_DOCUMENT) {
    if (typeof v === "string") { var d = prop.value; d.text = v; return d; }
    return v;
  }
  return v;
}

function __dims(prop) {
  var t = prop.propertyValueType;
  if (t === PropertyValueType.TwoD || t === PropertyValueType.TwoD_SPATIAL) return 2;
  if (t === PropertyValueType.ThreeD || t === PropertyValueType.ThreeD_SPATIAL) return 3;
  if (t === PropertyValueType.COLOR) return 4;
  return 1;
}

// KeyframeEase arrays: spatial properties take ONE ease per side; other multi-dim
// properties take one per dimension. Getting this wrong throws inside AE.
function __easeArrays(prop, speed, influence) {
  var n = prop.isSpatial ? 1 : __dims(prop);
  var arr = [];
  for (var i = 0; i < n; i++) arr.push(new KeyframeEase(speed, Math.max(0.1, Math.min(100, influence))));
  return arr;
}

// Named eases as cubic-bezier {x1,y1,x2,y2}. The block between the markers is
// REGENERATED by scripts/copy-jsx.mjs from src/motion/eases.ts (the single source
// of truth) when building dist/jsx/helpers.jsx. The copy in src is a fallback so
// the source file stays valid ES3 for tests; do not add rows here, add them to eases.ts.
// @@EASE_PRESETS_START@@
var __EASE_PRESETS = {
  linear: null,
  ease: { x1: 0.333, y1: 0, x2: 0.667, y2: 1 },
  ease_in: { x1: 0.42, y1: 0, x2: 1, y2: 1 },
  ease_out: { x1: 0, y1: 0, x2: 0.58, y2: 1 },
  ease_in_out: { x1: 0.42, y1: 0, x2: 0.58, y2: 1 },
  power2_out: { x1: 0.25, y1: 0.46, x2: 0.45, y2: 0.94 },
  power3_out: { x1: 0.215, y1: 0.61, x2: 0.355, y2: 1 },
  power3_in_out: { x1: 0.645, y1: 0.045, x2: 0.355, y2: 1 },
  power2_in_out: { x1: 0.455, y1: 0.03, x2: 0.515, y2: 0.955 },
  expo_out: { x1: 0.19, y1: 1, x2: 0.22, y2: 1 },
  snappy: { x1: 0.15, y1: 0.85, x2: 0.15, y2: 1 }
};
// @@EASE_PRESETS_END@@

// Apply an ease to key index k. presetOrSpec: string preset name (any name in
// __EASE_PRESETS, "silia." prefix and ./-/space separators accepted, plus "hold") or
// {inSpeed,inInfluence,outSpeed,outInfluence} | {x1,y1,x2,y2} (cubic-bezier).
// Named presets resolve to their bezier and go through __bezierToEase, so speed is
// computed from the neighbouring keys as well as influence.
function __applyEase(prop, k, presetOrSpec) {
  var spec = presetOrSpec;
  var presetName = null;
  if (typeof spec === "string") {
    var name = spec.toLowerCase().replace(/^\s+|\s+$/g, "").replace(/[\.\-\s]+/g, "_").replace(/^silia_/, "");
    if (name === "linear") {
      prop.setInterpolationTypeAtKey(k, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);
      return { key: k, interpolation: "linear" };
    }
    if (name === "hold") {
      prop.setInterpolationTypeAtKey(k, KeyframeInterpolationType.HOLD, KeyframeInterpolationType.HOLD);
      return { key: k, interpolation: "hold" };
    }
    var p = __EASE_PRESETS[name];
    if (!p) __fail("Unknown ease preset '" + spec + "'. Known: " + __keys(__EASE_PRESETS).join(", ") + ", hold", "BAD_ARG");
    presetName = name;
    spec = { x1: p.x1, y1: p.y1, x2: p.x2, y2: p.y2 };
  }
  if (spec.x1 !== undefined) {
    // cubic-bezier(x1,y1,x2,y2) -> influence/speed. Speed is relative to the
    // segment's average velocity, which AE handles when speed = 0 and influence
    // carries the shape; a non-zero speed needs dv/dt, so we approximate by
    // scaling with the key's neighbour values when available.
    spec = __bezierToEase(prop, k, spec);
  }
  prop.setInterpolationTypeAtKey(k, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
  var inArr = __easeArrays(prop, spec.inSpeed || 0, spec.inInfluence === undefined ? 33.33 : spec.inInfluence);
  var outArr = __easeArrays(prop, spec.outSpeed || 0, spec.outInfluence === undefined ? 33.33 : spec.outInfluence);
  prop.setTemporalEaseAtKey(k, inArr, outArr);
  var res = { key: k, interpolation: "bezier", inInfluence: inArr[0].influence, outInfluence: outArr[0].influence, inSpeed: inArr[0].speed, outSpeed: outArr[0].speed };
  if (presetName) res.preset = presetName;
  return res;
}

// cubic-bezier(x1,y1,x2,y2) -> AE KeyframeEase pair for key k:
//   influence_out = 100*x1,     speed_out = (y1/x1) * avgSpeed(segment after k)
//   influence_in  = 100*(1-x2), speed_in  = ((1-y2)/(1-x2)) * avgSpeed(segment before k)
// Influence is clamped to AE's 0.1..100; x1=0 / x2=1 give speed 0.
function __bezierToEase(prop, k, b) {
  var x1 = b.x1, y1 = b.y1, x2 = b.x2, y2 = b.y2;
  var outInf = __round(Math.max(0.1, Math.min(100, x1 * 100)), 3);
  var inInf = __round(Math.max(0.1, Math.min(100, (1 - x2) * 100)), 3);
  var outSpeed = 0, inSpeed = 0;
  // Speed relative to the neighbouring segment when the key has one.
  try {
    if (k < prop.numKeys) {
      var dt = prop.keyTime(k + 1) - prop.keyTime(k);
      var dv = __delta(prop.keyValue(k + 1), prop.keyValue(k));
      if (dt > 0 && x1 > 0) outSpeed = (y1 / x1) * (dv / dt);
    }
    if (k > 1) {
      var dt2 = prop.keyTime(k) - prop.keyTime(k - 1);
      var dv2 = __delta(prop.keyValue(k), prop.keyValue(k - 1));
      if (dt2 > 0 && x2 < 1) inSpeed = ((1 - y2) / (1 - x2)) * (dv2 / dt2);
    }
  } catch (e0) {}
  // The "out" ease of THIS key is the start of the segment (x1,y1); the "in"
  // ease of the NEXT key is its end (x2,y2). Callers applying a bezier across a
  // pair of keys should call this on both keys.
  return { inSpeed: inSpeed, inInfluence: inInf, outSpeed: outSpeed, outInfluence: outInf };
}

function __delta(a, b) {
  if (__isArray(a)) {
    var s = 0;
    for (var i = 0; i < a.length; i++) s += (a[i] - b[i]) * (a[i] - b[i]);
    return Math.sqrt(s);
  }
  return a - b;
}

function __keys(o) {
  var out = [];
  for (var k in o) if (o.hasOwnProperty(k)) out.push(k);
  return out;
}

function __interpName(t) {
  if (t === KeyframeInterpolationType.LINEAR) return "linear";
  if (t === KeyframeInterpolationType.BEZIER) return "bezier";
  if (t === KeyframeInterpolationType.HOLD) return "hold";
  return "unknown";
}

function __interpValue(name) {
  switch (String(name).toLowerCase()) {
    case "linear": return KeyframeInterpolationType.LINEAR;
    case "bezier": return KeyframeInterpolationType.BEZIER;
    case "hold": return KeyframeInterpolationType.HOLD;
    default: __fail("Unknown interpolation '" + name + "'", "BAD_ARG");
  }
}

function __keyInfo(prop, k) {
  var info = { index: k, time: __round(prop.keyTime(k)), value: __value(prop.keyValue(k)) };
  try { info.inInterpolation = __interpName(prop.keyInInterpolationType(k)); info.outInterpolation = __interpName(prop.keyOutInterpolationType(k)); } catch (e0) {}
  try {
    var ie = prop.keyInTemporalEase(k), oe = prop.keyOutTemporalEase(k);
    info.inEase = { speed: __round(ie[0].speed), influence: __round(ie[0].influence, 2) };
    info.outEase = { speed: __round(oe[0].speed), influence: __round(oe[0].influence, 2) };
  } catch (e1) {}
  try { if (prop.isSpatial) info.roving = prop.keyRoving(k); } catch (e2) {}
  try { info.selected = prop.keySelected(k); } catch (e3) {}
  return info;
}

function __keyList(prop) {
  var out = [];
  for (var k = 1; k <= prop.numKeys; k++) out.push(__keyInfo(prop, k));
  return out;
}

// keys: [{time, value, ease?, interpolation?}] -> sets values (batched) then eases.
function __setKeys(prop, keys) {
  if (!prop.canVaryOverTime) __fail("Property " + prop.name + " cannot be animated", "NOT_ANIMATABLE");
  var times = [], values = [];
  for (var i = 0; i < keys.length; i++) {
    times.push(parseFloat(keys[i].time));
    values.push(__coerce(prop, keys[i].value));
  }
  if (times.length) prop.setValuesAtTimes(times, values);
  var applied = [];
  for (var j = 0; j < keys.length; j++) {
    var k = prop.nearestKeyIndex(times[j]);
    if (keys[j].interpolation) {
      var it = __interpValue(keys[j].interpolation);
      prop.setInterpolationTypeAtKey(k, it, it);
    }
    if (keys[j].ease) applied.push(__applyEase(prop, k, keys[j].ease));
  }
  return applied;
}

// ---------------------------------------------------------------------------
// Effects
// ---------------------------------------------------------------------------
var __EFFECT_ALIASES = {
  "glow": "ADBE Glo2",
  "directional blur": "ADBE Motion Blur",
  "gaussian blur": "ADBE Gaussian Blur 2",
  "fast box blur": "ADBE Box Blur2",
  "levels": "ADBE Pro Levels2",
  "levels (individual controls)": "ADBE Pro Levels2",
  "hue/saturation": "ADBE HUE SATURATION",
  "curves": "ADBE CurvesCustom",
  "tint": "ADBE Tint",
  "tritone": "ADBE Tritone",
  "fill": "ADBE Fill",
  "drop shadow": "ADBE Drop Shadow",
  "transform": "ADBE Geometry2",
  "linear wipe": "ADBE Linear Wipe",
  "noise": "ADBE Noise",
  "add grain": "VISINF Grain Implant",
  "lumetri color": "ADBE Lumetri",
  "slider control": "ADBE Slider Control",
  "color control": "ADBE Color Control",
  "checkbox control": "ADBE Checkbox Control",
  "point control": "ADBE Point Control",
  "angle control": "ADBE Angle Control",
  "dropdown menu control": "ADBE Dropdown Control",
  "layer control": "ADBE Layer Control",
  "cc composite": "CC Composite",
  "set matte": "ADBE Set Matte3",
  "invert": "ADBE Invert",
  "exposure": "ADBE Exposure2",
  "brightness & contrast": "ADBE Brightness & Contrast 2",
  "vibrance": "ADBE Vibrance",
  "fractal noise": "ADBE Fractal Noise",
  "gradient ramp": "ADBE Ramp",
  "4-color gradient": "ADBE 4ColorGradient",
  "vignette": "ADBE Vignette",
  "cc radial fast blur": "CC Radial Fast Blur",
  "camera lens blur": "ADBE Camera Lens Blur",
  "turbulent displace": "ADBE Turbulent Displace",
  "wave warp": "ADBE Wave Warp",
  "echo": "ADBE Echo",
  "posterize time": "ADBE Posterize Time",
  "venetian blinds": "ADBE Venetian Blinds",
  "radial wipe": "ADBE Radial Wipe",
  "simple choker": "ADBE Simple Choker",
  "roughen edges": "ADBE Roughen Edges",
  "offset": "ADBE Offset",
  "mirror": "ADBE Mirror",
  "corner pin": "ADBE Corner Pin",
  "bezier warp": "ADBE BEZMESH",
  "optics compensation": "ADBE Optics Compensation",
  "cc light sweep": "CS LightSweep",
  "cc light burst 2.5": "CC Light Burst 2.5",
  "shift channels": "ADBE Shift Channels",
  "channel mixer": "ADBE Channel Mixer",
  "color balance": "ADBE Color Balance 2",
  "unsharp mask": "ADBE Unsharp Mask2",
  "sharpen": "ADBE Sharpen",
  "posterize": "ADBE Posterize",
  "threshold": "ADBE Threshold2",
  "photo filter": "ADBE PhotoFilterPS",
  "black & white": "ADBE Black&White",
  "cc toner": "CC Toner",
  "colorama": "ADBE Colorama",
  "matte choker": "ADBE Matte Choker",
  "keylight (1.2)": "Keylight 906",
  "extract": "ADBE Extract",
  "linear color key": "ADBE Linear Color Key2",
  "motion tile": "ADBE Tile",
  "grid": "ADBE Grid",
  "checkerboard": "ADBE Checkerboard",
  "circle": "ADBE Circle",
  "ellipse": "ADBE Ellipse",
  "beam": "ADBE Laser",
  "lens flare": "ADBE Lens Flare",
  "cc particle world": "CC Particle World",
  "cc particle systems ii": "CC Particle Systems II",
  "write-on": "ADBE Write-on",
  "stroke": "ADBE Stroke",
  "scribble": "ADBE Scribble",
  "audio spectrum": "ADBE AudSpect",
  "audio waveform": "ADBE AudWave",
  "timewarp": "ADBE Timewarp",
  "cc force motion blur": "CC Force Motion Blur",
  "pixel motion blur": "ADBE Pixel Motion Blur",
  "detail-preserving upscale": "ADBE Detail Preserving Upscale",
  "warp stabilizer": "ADBE SubspaceStabilizer",
  "3d camera tracker": "ADBE 3D Tracker",
  "displacement map": "ADBE Displacement Map",
  "cc glass": "CC Glass",
  "cc bend it": "CC Bend It",
  "puppet": "ADBE FreePin3",
  "color key": "ADBE Color Key",
  "luma key": "ADBE Luma Key",
  "cc composite ": "CC Composite"
};

// app.effects[i] is slow to index (each access re-walks the plugin list), so snapshot it once per engine.
function __effectsList() {
  if ($.global.__aeMcpEffects && $.global.__aeMcpEffects.length === app.effects.length) return $.global.__aeMcpEffects;
  var out = [];
  var fx = app.effects;
  for (var i = 0; i < fx.length; i++) {
    var e = fx[i];
    out.push({ matchName: e.matchName, displayName: e.displayName, category: e.category });
  }
  $.global.__aeMcpEffects = out;
  return out;
}

function __effectMatchName(nameOrMatch) {
  var s = __trim(String(nameOrMatch));
  var list = __effectsList();
  var lower = s.toLowerCase();
  for (var i = 0; i < list.length; i++) if (list[i].matchName === s) return s;
  var alias = __EFFECT_ALIASES[lower];
  if (alias) return alias;
  for (var j = 0; j < list.length; j++) if (list[j].displayName.toLowerCase() === lower) return list[j].matchName;
  __fail("Unknown effect '" + nameOrMatch + "'. Use ae_effects_catalog to search installed effects.", "EFFECT_NOT_FOUND");
}

function __effectInfo(fx, withParams) {
  var info = { index: fx.propertyIndex, name: fx.name, matchName: fx.matchName, enabled: fx.enabled };
  if (withParams) {
    info.params = [];
    for (var i = 1; i <= fx.numProperties; i++) {
      var p = fx.property(i);
      if (p.propertyType === PropertyType.PROPERTY && p.propertyValueType !== PropertyValueType.NO_VALUE) info.params.push(__propInfo(p));
      else if (p.propertyType !== PropertyType.PROPERTY) info.params.push({ matchName: p.matchName, name: p.name, kind: "group" });
    }
  }
  return info;
}

// ---------------------------------------------------------------------------
// Frame capture
// ---------------------------------------------------------------------------
function __omTemplateMatching(re) {
  var rq = app.project.renderQueue;
  var comp = null;
  for (var i = 1; i <= app.project.numItems; i++) if (app.project.item(i) instanceof CompItem) { comp = app.project.item(i); break; }
  if (!comp) return null;
  var item = rq.items.add(comp);
  try {
    var templates = item.outputModule(1).templates;
    for (var t = 0; t < templates.length; t++) if (re.test(templates[t])) return templates[t];
    return null;
  } finally {
    item.remove();
  }
}

// Save one frame to PNG. opts: {background: "#rrggbb" | null}. Adds a temporary
// bottom solid when a background is given (hides saveFrameToPng's black alpha
// fringe), then removes it, all inside one undo group so the project is untouched.
function __saveFrame(comp, time, path, opts) {
  opts = opts || {};
  var file = __file(path);
  __ensureFolder(file.parent.fsName);
  if (file.exists) { try { file.remove(); } catch (e0) {} }
  var t = Math.max(0, Math.min(parseFloat(time), comp.duration - comp.frameDuration));
  var method = "saveFrameToPng";
  var canSave = false;
  try { canSave = typeof comp.saveFrameToPng === "function"; } catch (e1) {}
  if (!canSave) __fail("comp.saveFrameToPng is not available in this After Effects build; use ae_render_queue with a PNG output template", "NO_SAVE_FRAME");

  __mutate("Frame capture", function () {
    var solid = null;
    if (opts.background) {
      solid = comp.layers.addSolid(__color(opts.background), "__aemcp_bg", comp.width, comp.height, comp.pixelAspect, comp.duration);
      solid.moveToEnd();
    }
    var hidden = [];
    if (opts.hideLayers) {
      __each(opts.hideLayers, function (r) { var l = __layer(comp, r); if (l.enabled) { l.enabled = false; hidden.push(l); } });
    }
    var soloed = [];
    if (opts.soloLayers && opts.soloLayers.length) {
      __each(opts.soloLayers, function (r) { var l = __layer(comp, r); if (!l.solo) { l.solo = true; soloed.push(l); } });
    }
    try {
      comp.saveFrameToPng(t, file);
      // The write is asynchronous: the PNG appears within ~50 ms and grows for ~100 ms
      // more. Keep the temporary background/solo state until the size is stable.
      var last = -1, stable = 0;
      for (var w = 0; w < 100; w++) {
        var chk = __file(file.fsName);
        var len = chk.exists ? chk.length : -1;
        if (len > 0 && len === last) { stable++; if (stable >= 2) break; } else stable = 0;
        last = len;
        $.sleep(50);
      }
    } finally {
      __each(soloed, function (l) { l.solo = false; });
      __each(hidden, function (l) { l.enabled = true; });
      if (solid) solid.remove();
    }
  });
  var written = __file(file.fsName);
  if (!written.exists || written.length <= 0) __fail("saveFrameToPng reported no error but wrote nothing at " + file.fsName + " after 5 s", "FRAME_NOT_WRITTEN");
  return { path: written.fsName, bytes: written.length, time: __round(t), method: method, width: comp.width, height: comp.height };
}
