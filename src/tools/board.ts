import { z } from "zod";
import { existsSync, readFileSync } from "node:fs";
import { err, ok, safe, type ToolContext, type ToolRecord } from "./types.js";
import {
  evaluateBoard,
  parseWords,
  BOARD_RUBRIC,
  BOARD_RULES,
  type BoardFrame,
  type BoardReviewInput,
} from "../motion/board-rubric.js";

/**
 * Storyboard review. Reads the Figma board dump and the voice track from disk
 * and judges them; it never touches After Effects and never touches Figma.
 * Applying the fixes is the caller's job, because editing the board is a
 * decision about a document the client also reads.
 */
export function getBoardTools(_ctx: ToolContext): ToolRecord {
  return {
    silia_board_review: {
      description:
        "Judge a Figma storyboard BEFORE building it in After Effects. review: run the board rubric over a dump produced by the video-desde-storyboard skill's figma-dump.js, optionally with the voice track (palabras.json, word JSONL in ms or faster-whisper segments in seconds), and return passed/failed/deferred items plus per-node numeric fixes ready to apply with use_figma. rubric: list the items and thresholds with the measured defect each one came from, without reading anything. Every threshold traces to a defect measured on a delivered piece; the failures carry the node id, the property, the current value and the value to set. Pacing and reading-time items defer instead of guessing when there is no transcript.",
      parameters: {
        action: z.enum(["review", "rubric"]),
        dump: z.string().optional().describe("Path to the board dump JSON (an array of frames, as figma-dump.js returns)."),
        frames: z.array(z.any()).optional().describe("The frames inline, instead of a file."),
        words: z.string().optional().describe("Path to palabras.json. Without it the timed items defer."),
        anchors: z.record(z.string(), z.number()).optional().describe("Explicit frameId -> seconds. Overrides matching the step copy against the voice track."),
        duration_sec: z.number().positive().optional().describe("Length of the piece, for the tail-gap item. Defaults to the last word's end."),
        viewport_pt: z.number().positive().optional().describe("Width in points the viewer sees. Default 390 (phone feed)."),
        text_kind: z.enum(["body", "caption", "title"]).optional().describe("Legibility band for the board copy. Default body."),
        stage_name: z.string().optional().describe("Child frame holding the delivered picture, inside the board's annotation chrome. Default \"stage\". Pass \"\" to measure the whole frame."),
        ignore_paths: z.array(z.string()).optional().describe("Path fragments to skip as board chrome. Default [\"shot-head\", \"shot-dur\", \"nota\"]."),
      },
      handler: safe(async (a: Record<string, unknown>) => {
        if (a.action === "rubric") {
          return ok({
            rules: BOARD_RULES,
            items: BOARD_RUBRIC,
            auto: BOARD_RUBRIC.filter((i) => i.auto).length,
            vision: BOARD_RUBRIC.filter((i) => !i.auto).length,
          });
        }

        // ---- frames
        let frames: BoardFrame[];
        if (Array.isArray(a.frames) && a.frames.length) {
          frames = a.frames as BoardFrame[];
        } else if (typeof a.dump === "string") {
          if (!existsSync(a.dump)) return err(`Board dump not found: ${a.dump}`, "NOT_FOUND");
          let parsed: unknown;
          try {
            parsed = JSON.parse(readFileSync(a.dump, "utf8"));
          } catch (e) {
            return err(`Board dump is not valid JSON: ${e instanceof Error ? e.message : String(e)}`, "PARSE");
          }
          // figma-dump.js returns an array of frames; accept {frames:[...]} too.
          const arr = Array.isArray(parsed) ? parsed : (parsed as { frames?: unknown })?.frames;
          if (!Array.isArray(arr)) return err("Board dump must be an array of frames (or {frames:[...]}).", "PARSE");
          frames = arr as BoardFrame[];
        } else {
          return err("Pass `dump` (a file path) or `frames` (inline).", "BAD_INPUT");
        }

        const bad = frames.filter((f) => !f || typeof f.w !== "number" || !Array.isArray(f.children));
        if (bad.length) return err(`${bad.length} frames have no width or no children array; re-run figma-dump.js.`, "BAD_INPUT");

        // ---- words
        const input: BoardReviewInput = {
          frames,
          ...(a.anchors ? { anchors: a.anchors as Record<string, number> } : {}),
          ...(typeof a.duration_sec === "number" ? { durationSec: a.duration_sec } : {}),
          ...(typeof a.viewport_pt === "number" ? { viewportPt: a.viewport_pt } : {}),
          ...(a.text_kind ? { textKind: a.text_kind as "body" | "caption" | "title" } : {}),
          ...(typeof a.stage_name === "string" ? { stageName: a.stage_name } : {}),
          ...(Array.isArray(a.ignore_paths) ? { ignorePaths: a.ignore_paths as string[] } : {}),
        };
        let transcript: { unit: string; shape: string; count: number } | null = null;
        if (typeof a.words === "string") {
          if (!existsSync(a.words)) return err(`Transcript not found: ${a.words}`, "NOT_FOUND");
          try {
            const p = parseWords(readFileSync(a.words, "utf8"));
            input.words = p.words;
            transcript = { unit: p.unit, shape: p.shape, count: p.words.length };
          } catch (e) {
            return err(`Could not parse the transcript: ${e instanceof Error ? e.message : String(e)}`, "PARSE");
          }
        }

        const ev = evaluateBoard(input);

        // One flat list of edits, in the order they should be applied.
        const fixes = ev.failed.flatMap((f) => (f.fixes ?? []).map((x) => ({ item: f.id, ...x })));

        return ok({
          summary: ev.summary,
          ...(transcript ? { transcript } : { transcript: null, note: "sin transcripción: los items de ritmo y de tiempo de lectura quedan diferidos, no aprobados" }),
          failed: ev.failed,
          passed: ev.passed.map((p) => ({ id: p.id, observed: p.observed })),
          unverifiable: ev.unverifiable,
          anchors: ev.anchors,
          fixes,
          instructions:
            ev.failed.length || ev.unverifiable.length
              ? "Presenta `fixes` al usuario antes de aplicarlos (nodo, propiedad, de -> a, por qué): el board es un documento que él y el cliente revisan. Aplica con use_figma en un solo batch por fila, vuelve a volcar el board y vuelve a correr esta tool: `summary.failed` tiene que bajar. Si no baja, para y reporta. Los `unverifiable` se juzgan mirando el board a ancho de teléfono, no con más números."
              : "Los items automáticos pasan. Quedan los de juicio: mira el board a ancho de teléfono antes de dar el paso a After Effects.",
        });
      }),
    },
  };
}
