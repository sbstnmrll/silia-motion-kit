/**
 * Facts measured on delivered pieces, with the measurement that produced them.
 *
 * Why this file exists. A number that lives in prose gets copied, and copies
 * drift. The witness case: the black before the outro was measured once on Silia
 * University 02, written into that project's BRIEF as "0.500 s", re-verified by
 * hand in punto-de-partida, and written as "0.300 s" in agente-diferenciadores.
 * Tracing it (2026-09-20) showed the prose had been conflating three different
 * quantities - see OUTRO below. A rule in code cannot be half-copied.
 *
 * The contract: a threshold enters this file with the project, the date and the
 * method that produced it. If a delivery proves a threshold wrong, it changes
 * HERE and the change is noted in that project's POSTMORTEM - never silently
 * overridden inside one project.
 */

export interface MeasuredFact<T> {
  value: T;
  /** Where it was measured. */
  project: string;
  /** ISO date of the measurement. */
  measured: string;
  /** How, in enough detail to repeat it. */
  method: string;
}

const fact = <T>(value: T, project: string, measured: string, method: string): MeasuredFact<T> => ({ value, project, measured, method });

// ---------------------------------------------------------------------------
// The outro
// ---------------------------------------------------------------------------

/**
 * Three quantities the prose kept confusing, which is why the gates diverged:
 *
 *  1. `crossfadeSec` - how long the outro takes to cross in. The picture must
 *     already be black for all of it, or the last frame of the piece is still
 *     visible under the logo.
 *  2. `ownHeadBlackSec` - black already baked into the outro asset itself. It is
 *     a property of the file, not of the piece, and it differs per asset.
 *  3. `fillerBlackSec` - black the piece adds before the outro. This is the only
 *     one the editor controls, and the only one a gate should assert directly.
 *
 * The rule is (2) + (3) >= (1). Writing a bare "black >= 0.500 s" into a gate
 * hides which asset it assumed, which is exactly how agente-diferenciadores
 * ended up asserting 0.300 s: that passes with an asset carrying 0.43 s of its
 * own black and fails with one carrying 0.133 s. The number alone cannot be
 * judged right or wrong, so gates must assert the rule, not the number.
 */
export const OUTRO = {
  crossfadeSec: fact(
    0.6,
    "silia-university/02-agentes-especializados-AE",
    "2026-09-03",
    "BRIEF section 7, hechos medidos: the outro crosses in over 0.6 s. Stated by the client and confirmed on the asset.",
  ),
  ownHeadBlackSec: {
    /** The vertical master actually used on SU02 and punto-de-partida. */
    verticalMaster: fact(
      0.133,
      "punto-de-partida",
      "2026-09-19",
      "GATES G10: frames read off the MP4; the outro master carries 0.133 s of its own black, so 0.500 s of filler gives 0.633 s total against a 0.600 s crossfade.",
    ),
    /** What silia_comp and silia_outro default to when nothing else is known. */
    convention: fact(
      0.43,
      "ae-mcp",
      "2026-09-03",
      "src/tools/silia.ts and silia2.ts: the head_black_sec default, described as the outro convention. Not a measurement of a specific asset.",
    ),
  },
} as const;

/**
 * Filler black a piece must add before the outro, given the black the outro
 * asset already carries. This is what a gate should assert - it survives a
 * change of outro asset, and a bare number does not.
 */
export function requiredFillerBlackSec(outroOwnHeadBlackSec: number = OUTRO.ownHeadBlackSec.verticalMaster.value): number {
  return Math.max(0, Math.round((OUTRO.crossfadeSec.value - outroOwnHeadBlackSec) * 1000) / 1000);
}

export interface OutroBlackCheck {
  ok: boolean;
  totalSec: number;
  requiredSec: number;
  shortfallSec: number;
  explain: string;
}

/** Judges a measured filler against the rule, and says why in the same breath. */
export function checkOutroBlack(fillerSec: number, outroOwnHeadBlackSec: number = OUTRO.ownHeadBlackSec.verticalMaster.value): OutroBlackCheck {
  const total = Math.round((fillerSec + outroOwnHeadBlackSec) * 1000) / 1000;
  const required = OUTRO.crossfadeSec.value;
  const ok = total >= required;
  return {
    ok,
    totalSec: total,
    requiredSec: required,
    shortfallSec: ok ? 0 : Math.round((required - total) * 1000) / 1000,
    explain: `${fillerSec} s de relleno + ${outroOwnHeadBlackSec} s propios del outro = ${total} s contra un cruce de ${required} s${ok ? "" : `: faltan ${Math.round((required - total) * 1000) / 1000} s y el último cuadro de la pieza se ve bajo el logo`}`,
  };
}

// ---------------------------------------------------------------------------
// Delivery
// ---------------------------------------------------------------------------

/**
 * The loudness target, and the reason it is here rather than in a gate template.
 * no-sabias-agente/AUDITORIA.md, finding 1: "Fallo de mi compuerta G5: verifico
 * alineacion con un umbral de -40 dB y paso; nunca verifico nivel. Una compuerta
 * de audio sin objetivo de LUFS no sirve." The gate passed and the delivery was
 * inaudible on a phone. An audio gate that does not assert these two numbers is
 * not an audio gate.
 */
export const DELIVERY_AUDIO = {
  integratedLufs: fact(
    { target: -14.0, toleranceDb: 0.5 },
    "silia-university/02-agentes-especializados-AE",
    "2026-09-03",
    "BRIEF delivery spec, measured with ffmpeg ebur128 and corrected with loudnorm. The voice track arrived at -21.5 LUFS and had to be normalised.",
  ),
  truePeakDbtp: fact(
    -1.0,
    "silia-university/02-agentes-especializados-AE",
    "2026-09-03",
    "BRIEF delivery spec: true peak at or below -1.0 dBTP, measured with ffmpeg ebur128.",
  ),
  /** What an audio gate must assert, learned the expensive way. */
  gateMustAssert: ["level (LUFS integrated)", "true peak", "not only alignment"],
} as const;

export interface AudioCheck {
  ok: boolean;
  problems: string[];
}

export function checkDeliveryAudio(lufs: number, truePeakDbtp: number): AudioCheck {
  const { target, toleranceDb } = DELIVERY_AUDIO.integratedLufs.value;
  const tp = DELIVERY_AUDIO.truePeakDbtp.value;
  const problems: string[] = [];
  if (Math.abs(lufs - target) > toleranceDb) problems.push(`${lufs} LUFS fuera de ${target} ±${toleranceDb}`);
  if (truePeakDbtp > tp) problems.push(`true peak ${truePeakDbtp} dBTP por encima de ${tp}`);
  return { ok: problems.length === 0, problems };
}

/** Everything in one shape, for the motion://hechos-medidos resource. */
export const MEASURED_FACTS = { OUTRO, DELIVERY_AUDIO } as const;
