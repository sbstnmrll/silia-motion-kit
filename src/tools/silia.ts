import { z } from "zod";
import { argsVar } from "../bridge/index.js";
import { compRef, layerRef, easeSpec } from "./refs.js";
import { err, ok, runScript, safe, type ToolContext, type ToolRecord } from "./types.js";
import { SILIA_COLORS, SILIA_DURATIONS, SILIA_EASES, SILIA_FONTS, SILIA_FORMATS, SILIA_PATTERNS, SILIA_TYPE_SCALE, resolveEase, siliaTokens } from "../silia/tokens.js";

type Variant = "lime" | "violeta" | "rosa" | "dark";

function variantColors(v: Variant): { bg: string; fg: string; accent: string } {
  switch (v) {
    case "lime":
      return { bg: SILIA_COLORS.lime, fg: SILIA_COLORS.black, accent: SILIA_COLORS.grafito };
    case "violeta":
      return { bg: SILIA_COLORS.violeta, fg: SILIA_COLORS.white, accent: SILIA_COLORS.lime };
    case "rosa":
      return { bg: SILIA_COLORS.rosa, fg: SILIA_COLORS.black, accent: SILIA_COLORS.violeta };
    default:
      return { bg: SILIA_COLORS.grafito, fg: SILIA_COLORS.white, accent: SILIA_COLORS.lime };
  }
}

function easeFor(token: unknown): unknown {
  if (typeof token !== "string") return token ?? { inInfluence: 64.5, outInfluence: 21.5 };
  try {
    const e = resolveEase(token);
    return { inInfluence: e.inInfluence, outInfluence: e.outInfluence, inSpeed: 0, outSpeed: 0 };
  } catch {
    return token;
  }
}

export function getSiliaTools(ctx: ToolContext): ToolRecord {
  return {
    silia_tokens: {
      description:
        "Silia brand and motion tokens as data: colors (Lime #DEFF38 with black text, Violeta, Rosa, Grafito), video fonts (ES Klarheit Grotesk Bk/Md), formats (h1080p30, v1080x1920p60/30), durations (xs..xl), eases (power3_out etc. as cubic-bezier and KeyframeEase influences), named patterns (confirmed_entry, card_travel, zoom_punch, letter_stagger, word_reveal, push_25d), the five orb color ramps, type scale and the rules. resolve_ease converts a token to KeyframeEase influences.",
      parameters: {
        action: z.enum(["get", "resolve_ease"]).optional(),
        token: z.string().optional().describe("resolve_ease: e.g. power3_out"),
      },
      handler: safe(async (a: { action?: string; token?: string }) => {
        if (a.action === "resolve_ease") {
          if (!a.token) return err("token required", "BAD_ARG");
          try {
            return ok(resolveEase(a.token));
          } catch (e) {
            return err(e instanceof Error ? e.message : String(e), "BAD_ARG");
          }
        }
        return ok(siliaTokens());
      }),
    },

    silia_comp: {
      description:
        "Create an on-brand Silia comp: format h1080p30 | v1080x1920p60 | v1080x1920p30, grafito background solid (or transparent), optional safe-margin guide layers (shy, guide) and an optional head-black solid of head_black_sec at the start (outro convention 0.43 s). Returns the CompRef and created layers.",
      parameters: {
        name: z.string().min(1),
        format: z.enum(["h1080p30", "v1080x1920p60", "v1080x1920p30"]).optional(),
        duration: z.number().positive().optional().describe("Seconds (default 10)."),
        background: z.enum(["grafito", "black", "transparent"]).optional(),
        guides: z.boolean().optional(),
        head_black_sec: z.number().min(0).optional(),
        folder: z.string().optional(),
      },
      handler: safe(async (a: Record<string, unknown>) => {
        const f = SILIA_FORMATS[(a.format as keyof typeof SILIA_FORMATS) ?? "h1080p30"];
        const script = `
          ${argsVar("a", { ...a, f, grafito: SILIA_COLORS.grafito, lime: SILIA_COLORS.lime })}
          var p = __project();
          return __result(__mutate("Silia comp", function () {
            var c = p.items.addComp(a.name, a.f.width, a.f.height, 1, a.duration || 10, a.f.fps);
            c.bgColor = __color(a.grafito);
            if (a.folder) { var fo = __itemByName(a.folder, "folder") || p.items.addFolder(a.folder); c.parentFolder = fo; }
            var layers = {};
            if (a.background !== "transparent") { var bg = c.layers.addSolid(__color(a.background === "black" ? "#000000" : a.grafito), "BG " + (a.background === "black" ? "black" : "grafito"), c.width, c.height, 1, c.duration); bg.locked = true; layers.background = __layerInfo(bg); }
            if (a.guides) {
              var m = a.f.safeMargin; var g = c.layers.addShape(); g.name = "Safe margins (guide)"; g.guideLayer = true; g.shy = true;
              var grp = g.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group"); var gc = grp.property("ADBE Vectors Group");
              var rect = gc.addProperty("ADBE Vector Shape - Rect"); rect.property("ADBE Vector Rect Size").setValue([c.width - 2 * m, c.height - 2 * m]);
              var st = gc.addProperty("ADBE Vector Graphic - Stroke"); st.property("ADBE Vector Stroke Color").setValue(__color(a.lime, true)); st.property("ADBE Vector Stroke Width").setValue(2); st.property("ADBE Vector Stroke Opacity").setValue(60);
              g.property("ADBE Transform Group").property("ADBE Position").setValue([c.width / 2, c.height / 2]);
              layers.guides = __layerInfo(g);
            }
            if (a.head_black_sec && a.head_black_sec > 0) { var hb = c.layers.addSolid([0, 0, 0], "Head black", c.width, c.height, 1, c.duration); hb.outPoint = a.head_black_sec; hb.moveToBeginning(); layers.headBlack = __layerInfo(hb); }
            c.openInViewer();
            var info = __compInfo(c); info.layers = layers; info.safeMargin = a.f.safeMargin; return info;
          }));
        `;
        return runScript(ctx, script);
      }),
    },

    silia_lower_third: {
      description:
        "Build an on-brand lower third: rounded card (variant lime | violeta | rosa | dark) with name (ES Klarheit Md) and optional role (Bk), positioned bottom-left or bottom-right inside the safe margin, with the confirmed entry (opacity 0→1, Y +18→0, power3_out, 0.32 s) and exit. All elements are parented to a control null so it can be moved as one. Returns the created layers and their in/out.",
      parameters: {
        comp: compRef,
        name: z.string().min(1),
        role: z.string().optional(),
        variant: z.enum(["lime", "violeta", "rosa", "dark"]).optional(),
        in_time: z.number().min(0).optional().describe("Default comp time."),
        duration: z.number().positive().optional().describe("Seconds on screen (default 4)."),
        position: z.enum(["left", "right"]).optional(),
        scale: z.number().positive().optional().describe("Relative size multiplier (default 1)."),
        entry: z.enum(["confirmed", "slide", "none"]).optional(),
        exit: z.enum(["confirmed", "none"]).optional(),
      },
      handler: safe(async (a: Record<string, unknown>) => {
        const colors = variantColors((a.variant as Variant) ?? "lime");
        const entryEase = easeFor("power3_out");
        const exitEase = easeFor("power2_in_out");
        const script = `
          ${argsVar("a", { ...a, colors, fonts: SILIA_FONTS, type: SILIA_TYPE_SCALE, d: SILIA_DURATIONS, entryEase, exitEase, pattern: SILIA_PATTERNS.confirmed_entry, exitPattern: SILIA_PATTERNS.confirmed_exit })}
          var c = __comp(a.comp);
          var k = (c.height / 1080) * (a.scale || 1);
          var margin = Math.round((c.width >= c.height ? 86 : 72) * (c.height / 1080));
          var t0 = a.in_time !== undefined ? a.in_time : c.time; var dur = a.duration || 4; var t1 = t0 + dur;
          return __result(__mutate("Silia lower third", function () {
            // measure text first (temp layers), then build the card around it
            var nameL = c.layers.addText(a.name); nameL.name = "LT name";
            var nd = nameL.property("ADBE Text Properties").property("ADBE Text Document"); var d1 = nd.value; d1.font = a.fonts.medium; d1.fontSize = Math.round(a.type.title_s.size * k); d1.fillColor = __color(a.colors.fg); d1.applyFill = true; d1.applyStroke = false; d1.justification = ParagraphJustification.LEFT_JUSTIFY; d1.tracking = a.type.title_s.tracking; nd.setValue(d1);
            var roleL = null;
            if (a.role) { roleL = c.layers.addText(a.role); roleL.name = "LT role"; var rd = roleL.property("ADBE Text Properties").property("ADBE Text Document"); var d2 = rd.value; d2.font = a.fonts.body; d2.fontSize = Math.round(a.type.body_m.size * k); d2.fillColor = __color(a.colors.fg); d2.applyFill = true; d2.applyStroke = false; d2.justification = ParagraphJustification.LEFT_JUSTIFY; rd.setValue(d2); }
            var r1 = nameL.sourceRectAtTime(t0, false); var r2 = roleL ? roleL.sourceRectAtTime(t0, false) : { width: 0, height: 0, top: 0, left: 0 };
            var padX = Math.round(28 * k), padY = Math.round(20 * k), gap = roleL ? Math.round(8 * k) : 0;
            var cardW = Math.round(Math.max(r1.width, r2.width) + 2 * padX), cardH = Math.round(r1.height + (roleL ? r2.height + gap : 0) + 2 * padY);
            var left = a.position === "right" ? c.width - margin - cardW : margin; var top = c.height - margin - cardH;
            // control null at the card's bottom-left
            var ctrl = c.layers.addNull(c.duration); ctrl.name = "LT ctrl: " + a.name; ctrl.property("ADBE Transform Group").property("ADBE Anchor Point").setValue([0, 0]); ctrl.property("ADBE Transform Group").property("ADBE Position").setValue([left, top + cardH]);
            // card
            var card = c.layers.addShape(); card.name = "LT card";
            var grp = card.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group"); var gc = grp.property("ADBE Vectors Group");
            var rect = gc.addProperty("ADBE Vector Shape - Rect"); rect.property("ADBE Vector Rect Size").setValue([cardW, cardH]); rect.property("ADBE Vector Rect Roundness").setValue(Math.round(12 * k)); rect.property("ADBE Vector Rect Position").setValue([cardW / 2, -cardH / 2]);
            var fill = gc.addProperty("ADBE Vector Graphic - Fill"); fill.property("ADBE Vector Fill Color").setValue(__color(a.colors.bg, true));
            card.property("ADBE Transform Group").property("ADBE Position").setValue([left, top + cardH]);
            // accent bar
            var bar = c.layers.addShape(); bar.name = "LT accent";
            var bgrp = bar.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group"); var bgc = bgrp.property("ADBE Vectors Group");
            var brect = bgc.addProperty("ADBE Vector Shape - Rect"); brect.property("ADBE Vector Rect Size").setValue([Math.round(6 * k), cardH]); brect.property("ADBE Vector Rect Position").setValue([Math.round(3 * k), -cardH / 2]); brect.property("ADBE Vector Rect Roundness").setValue(Math.round(3 * k));
            var bfill = bgc.addProperty("ADBE Vector Graphic - Fill"); bfill.property("ADBE Vector Fill Color").setValue(__color(a.colors.accent, true));
            bar.property("ADBE Transform Group").property("ADBE Position").setValue([left, top + cardH]);
            // text positions (top-left anchored via sourceRect offsets)
            nameL.property("ADBE Transform Group").property("ADBE Position").setValue([left + padX - r1.left, top + padY - r1.top]);
            if (roleL) roleL.property("ADBE Transform Group").property("ADBE Position").setValue([left + padX - r2.left, top + padY + r1.height + gap - r2.top]);
            var parts = [card, bar, nameL]; if (roleL) parts.push(roleL);
            // Stack: text above bar above card. moveBefore(ctrl) puts each layer directly above the
            // null, so move them in reverse order (the first moved ends up highest).
            for (var i = parts.length - 1; i >= 0; i--) { parts[i].parent = ctrl; parts[i].inPoint = t0; parts[i].outPoint = t1; parts[i].moveBefore(ctrl); }
            ctrl.inPoint = t0; ctrl.outPoint = t1; ctrl.moveBefore(parts[parts.length - 1]);
            // entry / exit on the control null: opacity is per layer, so animate each part
            var entry = a.entry || "confirmed"; var exit = a.exit || "confirmed";
            for (var j = 0; j < parts.length; j++) {
              var tg = parts[j].property("ADBE Transform Group"); var op = tg.property("ADBE Opacity");
              var stagger = j * 0.04;
              if (entry !== "none") {
                __setKeys(op, [{ time: t0 + stagger, value: 0 }, { time: t0 + stagger + a.pattern.duration, value: 100, ease: a.entryEase }]);
                var pos = tg.property("ADBE Position"); var pv = pos.value; var rise = entry === "slide" ? [Math.round(-40 * k), 0] : [0, Math.round(a.pattern.risePx * k)];
                __setKeys(pos, [{ time: t0 + stagger, value: [pv[0] + rise[0], pv[1] + rise[1]], ease: a.entryEase }, { time: t0 + stagger + a.pattern.duration, value: [pv[0], pv[1]], ease: a.entryEase }]);
              }
              if (exit !== "none") {
                __setKeys(op, [{ time: t1 - a.exitPattern.duration, value: 100 }, { time: t1, value: 0, ease: a.exitEase }]);
              }
            }
            var out = { comp: c.name, inPoint: t0, outPoint: t1, card: { left: left, top: top, width: cardW, height: cardH }, variant: a.variant || "lime", layers: __map([ctrl].concat(parts), function (l) { return __layerInfo(l); }) };
            if (a.fonts.medium !== nd.value.font) __warn("Font substituted for name: " + nd.value.font);
            return out;
          }));
        `;
        return runScript(ctx, script);
      }),
    },

    silia_type: {
      description:
        "On-brand typography. title: headline (Md, title_l/m/s) + optional sub (Bk) centered or aligned, with confirmed entry. kinetic: text layer with letter stagger (0.032 s per letter, 0.32 s, power3_out, rise 18 px). word_reveal: one text layer whose source text accumulates words at given times [{w,t}] with 0.16 s latency and 0.2 s fade to 95% (hold keys + per-word opacity via animator is approximated with source-text keyframes). All use ES Klarheit Grotesk; color defaults to white on dark, black on lime.",
      parameters: {
        action: z.enum(["title", "kinetic", "word_reveal"]),
        comp: compRef,
        text: z.string().optional(),
        sub: z.string().optional(),
        size: z.enum(["title_l", "title_m", "title_s", "body_l", "body_m"]).optional(),
        color: z.string().optional().describe("Hex; default white (or black when on lime)."),
        align: z.enum(["left", "center", "right"]).optional(),
        position: z.array(z.number()).length(2).optional(),
        in_time: z.number().min(0).optional(),
        duration: z.number().positive().optional(),
        words: z.array(z.object({ w: z.string(), t: z.number().min(0) })).optional().describe("word_reveal: words with onset times (seconds)."),
        latency: z.number().min(0).optional(),
        ease: easeSpec.optional(),
        on_lime: z.boolean().optional(),
      },
      handler: safe(async (a: Record<string, unknown>) => {
        const color = (a.color as string) ?? (a.on_lime ? SILIA_COLORS.black : SILIA_COLORS.white);
        const script = `
          ${argsVar("a", { ...a, color, fonts: SILIA_FONTS, type: SILIA_TYPE_SCALE, d: SILIA_DURATIONS, ease: easeFor(a.ease ?? "power3_out"), pattern: SILIA_PATTERNS.confirmed_entry, wr: SILIA_PATTERNS.word_reveal, ls: SILIA_PATTERNS.letter_stagger })}
          var c = __comp(a.comp); var k = c.height / 1080;
          var t0 = a.in_time !== undefined ? a.in_time : c.time; var dur = a.duration || 4;
          function styled(text, fontName, spec, colorHex, justify) { var l = c.layers.addText(text); var dp = l.property("ADBE Text Properties").property("ADBE Text Document"); var d = dp.value; d.font = fontName; d.fontSize = Math.round(spec.size * k); d.tracking = spec.tracking; d.applyFill = true; d.fillColor = __color(colorHex); d.applyStroke = false; d.justification = justify === "left" ? ParagraphJustification.LEFT_JUSTIFY : justify === "right" ? ParagraphJustification.RIGHT_JUSTIFY : ParagraphJustification.CENTER_JUSTIFY; dp.setValue(d); if (dp.value.font !== fontName) __warn("Font substituted: " + dp.value.font); l.inPoint = t0; l.outPoint = t0 + dur; return l; }
          function entry(l, delay) { var tg = l.property("ADBE Transform Group"); var pos = tg.property("ADBE Position"); var pv = pos.value; __setKeys(tg.property("ADBE Opacity"), [{ time: t0 + delay, value: 0 }, { time: t0 + delay + a.pattern.duration, value: 100, ease: a.ease }]); __setKeys(pos, [{ time: t0 + delay, value: [pv[0], pv[1] + Math.round(a.pattern.risePx * k)], ease: a.ease }, { time: t0 + delay + a.pattern.duration, value: [pv[0], pv[1]], ease: a.ease }]); }
          var align = a.align || "center"; var pos = a.position || [align === "left" ? Math.round(86 * k) : align === "right" ? c.width - Math.round(86 * k) : c.width / 2, c.height / 2];
          return __result(__mutate("Silia type " + a.action, function () {
            if (a.action === "title") {
              if (!a.text) __fail("text required", "BAD_ARG");
              var h = styled(a.text, a.fonts.medium, a.type[a.size || "title_l"], a.color, align); h.name = "Title: " + a.text.slice(0, 24);
              h.property("ADBE Transform Group").property("ADBE Position").setValue(pos);
              var out = { layers: [] };
              if (a.sub) { var s = styled(a.sub, a.fonts.body, a.type.body_l, a.color, align); s.name = "Sub: " + a.sub.slice(0, 24); var r = h.sourceRectAtTime(t0, false); s.property("ADBE Transform Group").property("ADBE Position").setValue([pos[0], pos[1] + r.height * 0.5 + Math.round(a.type.body_l.leading * k)]); entry(s, 0.08); out.layers.push(__layerInfo(s)); }
              entry(h, 0); out.layers.unshift(__layerInfo(h)); return out;
            }
            if (a.action === "kinetic") {
              if (!a.text) __fail("text required", "BAD_ARG");
              var kl = styled(a.text, a.fonts.medium, a.type[a.size || "title_m"], a.color, align); kl.name = "Kinetic: " + a.text.slice(0, 24);
              kl.property("ADBE Transform Group").property("ADBE Position").setValue(pos);
              var animators = kl.property("ADBE Text Properties").property("ADBE Text Animators"); var an = animators.addProperty("ADBE Text Animator"); an.name = "Silia letter stagger";
              var props = an.property("ADBE Text Animator Properties");
              var po = props.addProperty("ADBE Text Opacity"); po.setValue(0);
              var pp = props.addProperty("ADBE Text Position 3D"); pp.setValue([0, Math.round(a.ls.rise ? a.ls.rise : 18 * k), 0]);
              var sels = an.property("ADBE Text Selectors"); var sel = sels.numProperties ? sels.property(1) : sels.addProperty("ADBE Text Selector");
              sel.property("ADBE Text Percent Start").setValue(0); sel.property("ADBE Text Percent End").setValue(100);
              var adv = sel.property("ADBE Text Range Advanced"); adv.property("ADBE Text Range Type2").setValue(1); adv.property("ADBE Text Range Shape").setValue(2); adv.property("ADBE Text Levels Max Ease").setValue(40);
              var units = a.text.replace(/\\s/g, "").length; var total = a.ls.duration + a.ls.perLetter * Math.max(0, units - 1);
              __setKeys(sel.property("ADBE Text Percent Offset"), [{ time: t0, value: -100, ease: a.ease }, { time: t0 + total, value: 100, ease: a.ease }]);
              return { layers: [__layerInfo(kl)], letters: units, totalDuration: __round(total) };
            }
            if (a.action === "word_reveal") {
              if (!a.words || !a.words.length) __fail("words required", "BAD_ARG");
              var lat = a.latency !== undefined ? a.latency : a.wr.latency;
              var wl = styled("", a.fonts.medium, a.type[a.size || "body_l"], a.color, align); wl.name = "Word reveal";
              wl.property("ADBE Transform Group").property("ADBE Position").setValue(pos);
              var dp = wl.property("ADBE Text Properties").property("ADBE Text Document");
              var acc = "";
              for (var i = 0; i < a.words.length; i++) { acc = acc ? acc + " " + a.words[i].w : a.words[i].w; var dd = dp.value; dd.text = acc; var tt = a.words[i].t + lat; dp.setValueAtTime(tt, dd); var ki = dp.nearestKeyIndex(tt); dp.setInterpolationTypeAtKey(ki, KeyframeInterpolationType.HOLD, KeyframeInterpolationType.HOLD); }
              var first = a.words[0].t + lat; wl.inPoint = Math.max(0, first); wl.outPoint = a.words[a.words.length - 1].t + lat + dur;
              // fade at first word
              __setKeys(wl.property("ADBE Transform Group").property("ADBE Opacity"), [{ time: first, value: 0 }, { time: first + a.wr.fade, value: a.wr.opacity, ease: a.ease }]);
              return { layers: [__layerInfo(wl)], words: a.words.length, firstWordAt: __round(first), sourceTextKeys: dp.numKeys };
            }
            __fail("Unknown action", "BAD_ARG");
          }));
        `;
        return runScript(ctx, script);
      }),
    },

    silia_push_25d: {
      description:
        "2.5D push on a still/plate: precomposes the layer at 2x (pre-scale for subpixel motion, collapse transformations), then animates scale from 100 to 100+amount_pct (direction in) or the reverse (out) across the layer's duration (or in_time/duration) with the given ease (default power2_out). Optional parallax: extra layers moved by ratios of the push. Returns the keyframes.",
      parameters: {
        comp: compRef,
        layer: layerRef,
        amount_pct: z.number().min(0.5).max(20).optional().describe("Default 5 (Silia range 4.5–6)."),
        direction: z.enum(["in", "out"]).optional(),
        in_time: z.number().min(0).optional(),
        duration: z.number().positive().optional(),
        ease: easeSpec.optional(),
        pre_scale: z.number().min(1).max(4).optional().describe("Default 2."),
        anchor: z.array(z.number()).length(2).optional().describe("Push origin in comp pixels (default center)."),
      },
      handler: safe(async (a: Record<string, unknown>) => {
        const script = `
          ${argsVar("a", { ...a, ease: easeFor(a.ease ?? "power2_out") })}
          var c = __comp(a.comp); var l = __layer(c, a.layer);
          var amt = a.amount_pct || 5; var pre = a.pre_scale || 2;
          var t0 = a.in_time !== undefined ? a.in_time : l.inPoint; var t1 = a.duration ? t0 + a.duration : l.outPoint;
          var lname = l.name, lindex = l.index;
          return __result(__mutate("Silia 2.5D push", function () {
            // precompose at higher resolution so the push moves in subpixels (the original layer object is invalid afterwards)
            var pc = c.layers.precompose([lindex], lname + " (push 2x)", true);
            pc.width = Math.round(c.width * pre); pc.height = Math.round(c.height * pre);
            var inner = pc.layer(1); var it = inner.property("ADBE Transform Group"); it.property("ADBE Position").setValue([pc.width / 2, pc.height / 2]); var isc = it.property("ADBE Scale").value; it.property("ADBE Scale").setValue([isc[0] * pre, isc[1] * pre, 100]);
            var newL = null; for (var i = 1; i <= c.numLayers; i++) if (c.layer(i).source === pc) newL = c.layer(i);
            newL.collapseTransformation = true; newL.name = lname + " push";
            var tg = newL.property("ADBE Transform Group"); tg.property("ADBE Scale").setValue([100 / pre, 100 / pre, 100]);
            var anchor = a.anchor || [c.width / 2, c.height / 2];
            tg.property("ADBE Anchor Point").setValue([anchor[0] * pre, anchor[1] * pre]); tg.property("ADBE Position").setValue([anchor[0], anchor[1]]);
            var s0 = 100 / pre, s1 = (100 / pre) * (1 + amt / 100);
            var from = a.direction === "out" ? s1 : s0, to = a.direction === "out" ? s0 : s1;
            var applied = __setKeys(tg.property("ADBE Scale"), [{ time: t0, value: [from, from, 100], ease: a.ease }, { time: t1, value: [to, to, 100], ease: a.ease }]);
            return { layer: __layerInfo(newL), precomp: __compInfo(pc), keys: __keyList(tg.property("ADBE Scale")), amountPct: amt, preScale: pre, eases: applied };
          }));
        `;
        return runScript(ctx, script);
      }),
    },

    silia_grade: {
      description:
        "Retro/mono grade on a shot head that dissolves off: adds an adjustment layer over the target layer's span with a look (retro_90s: lifted blacks, warm bias, desaturation via Levels + Tint + Hue/Saturation + Noise; mono: Tint 100%; lime_tint: Tritone toward lime), holds for hold_sec then fades its opacity to 0 over dissolve_sec. Returns the adjustment layer, effects and opacity keys.",
      parameters: {
        comp: compRef,
        layer: layerRef.optional().describe("Target layer (span and stacking). Default: whole comp."),
        look: z.enum(["retro_90s", "mono", "lime_tint"]).optional(),
        hold_sec: z.number().min(0).optional().describe("Default 1.2"),
        dissolve_sec: z.number().min(0).optional().describe("Default 0.8"),
        strength: z.number().min(0).max(100).optional().describe("Max opacity of the grade (default 100)."),
        ease: easeSpec.optional(),
      },
      handler: safe(async (a: Record<string, unknown>) => {
        const script = `
          ${argsVar("a", { ...a, ease: easeFor(a.ease ?? "power2_in_out"), lime: SILIA_COLORS.lime })}
          var c = __comp(a.comp); var target = a.layer !== undefined ? __layer(c, a.layer) : null;
          var t0 = target ? target.inPoint : 0, t1 = target ? target.outPoint : c.duration;
          var hold = a.hold_sec !== undefined ? a.hold_sec : 1.2, diss = a.dissolve_sec !== undefined ? a.dissolve_sec : 0.8, strength = a.strength !== undefined ? a.strength : 100;
          return __result(__mutate("Silia grade", function () {
            var adj = c.layers.addSolid([1, 1, 1], "Grade " + (a.look || "retro_90s"), c.width, c.height, 1, c.duration); adj.adjustmentLayer = true;
            adj.inPoint = t0; adj.outPoint = Math.min(t1, t0 + hold + diss + 0.01);
            if (target) adj.moveBefore(target);
            var fx = adj.property("ADBE Effect Parade"); var added = [];
            function add(mn, params) { var e = fx.addProperty(mn); for (var k in params) if (params.hasOwnProperty(k)) { var p = __childProp(e, k); if (p) p.setValue(__coerce(p, params[k])); } added.push(__effectInfo(e, false)); return e; }
            var look = a.look || "retro_90s";
            // Parameters are addressed by display name (resolved via __childProp fallback):
            // Levels' numbered matchNames are channel groups and cannot take values directly.
            if (look === "retro_90s") {
              add("ADBE Exposure2", { "Offset": 0.035, "Gamma Correction": 1.05 });
              add("ADBE HUE SATURATION", { "Master Saturation": -45 });
              add("ADBE Tint", { "Map Black To": [0.16, 0.12, 0.09, 1], "Map White To": [0.98, 0.94, 0.86, 1], "Amount to Tint": 35 });
              add("ADBE Noise", { "Amount of Noise": 6, "Use Color Noise": 0 });
            } else if (look === "mono") {
              add("ADBE Tint", { "Amount to Tint": 100 });
            } else {
              add("ADBE Tritone", { "Highlights": __color(a.lime, true), "Midtones": [0.45, 0.5, 0.2, 1], "Shadows": [0.04, 0.04, 0.04, 1] });
            }
            var op = adj.property("ADBE Transform Group").property("ADBE Opacity");
            __setKeys(op, [{ time: t0 + hold, value: strength }, { time: t0 + hold + diss, value: 0, ease: a.ease }]);
            if (hold === 0) op.setValueAtTime(t0, strength);
            return { adjustmentLayer: __layerInfo(adj), effects: added, opacityKeys: __keyList(op), look: look };
          }));
        `;
        return runScript(ctx, script);
      }),
    },
  };
}
