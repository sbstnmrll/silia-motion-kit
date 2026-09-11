# Rúbrica de crítica — ítems binarios por grupo

Canon: `src/motion/rubric.ts` (→ `motion://rubric/contact-sheet` cuando el server lo registre; al 2026-09-03 aún no está); ejecutada por `ae_frame action=critique`. Diseño tomado de WebVR (arXiv 2603.13391, CC BY 4.0: un atributo por ítem, sin conjunciones; lo que no se decide con números pasa a visión) y AniMINT (arXiv 2604.26148, CC BY 4.0: 7 intenciones, muestreo ≥ 10 fps, separar hechos de timing de juicios perceptuales). Los ítems atómicos binarios suben el acuerdo entre jueces de 59–67 % a 96 %.

`auto` = se decide desde el `keyframe_dump`; `visión` = lo juzgas tú desde el contact sheet y el onion skin. Los `failed` traen `fix` numérico; los `unverifiable` traen la pregunta. 22 ítems: 14 auto, 8 visión.

## timing (5, todos auto)

| id | Pregunta | Fix típico |
|---|---|---|
| `timing.whole_frame` | ¿Todo keyframe cae en frame entero? | `round(t·fps)/fps`; `ae_keyframes action=set` con el tiempo redondeado |
| `timing.min_visible` | ¿Todo tween de opacidad/posición/escala dura ≥ minVisibleMs (100 UI · 160 video)? | alargar el segundo key |
| `timing.max_single` | ¿Ningún tween supera maxSingleMs (500 UI · 1000 video)? | acortar o partir en dos beats |
| `timing.exit_shorter` | En una capa con entrada y salida de opacidad, ¿la salida es más corta? | salida → 0.7× entrada, ajustada a frames |
| `timing.no_dead_uniformity` | Con 3+ capas animadas, ¿no todas usan la misma duración? | variar 0.87× / 1.07× / 1.33× |

## easing (4, todos auto)

| id | Pregunta | Fix típico |
|---|---|---|
| `easing.no_linear_motion` | ¿Ningún tween de posición/escala/rotación es lineal? (hold permitido) | `ae_ease action=preset preset=<enter del registro>` |
| `easing.entrance_decelerates` | ¿Cada entrada decelera (outInfluence del 1er key ≤ inInfluence del 2º)? Opacidad solo-HOLD pasa con nota "appear (hold), no easing required" | preset enter, o `ae_ease action=custom` con outInfluence 0.1–25 / inInfluence 60–80 |
| `easing.exit_accelerates` | ¿Cada salida acelera (outInfluence ≥ inInfluence)? | `ae_ease action=preset preset=<exit del registro>` |
| `easing.consistent_influences` | ¿Capas que animan la misma propiedad en la misma duración comparten influencias? | `ae_ease action=custom custom={outInfluence, inInfluence}` igualando a la referencia |

## choreography (2 auto + 1 visión)

| id | Pregunta | Fix típico |
|---|---|---|
| `choreography.stagger_in_band` (auto) | ¿Cada delta entre primeros keys de capas consecutivas está en la banda (20–40 UI · 60–120 video)? Deltas 0 se difieren a visión: "¿se mueven como una unidad?" | `ae_keyframes action=offset` al punto medio de la banda |
| `choreography.sequence_cap` (auto) | ¿La secuencia de entrada cabe en el tope (500 · 2000 ms)? | comprimir stagger o partir en dos beats |
| `choreography.one_focal_motion` (visión) | ¿Solo un elemento lleva el movimiento focal en cada beat? | retrasar o reducir amplitud a ≤ 30 % |

## spatial (3 auto + 2 visión)

| id | Pregunta | Fix típico |
|---|---|---|
| `spatial.no_pop_in` (auto) | ¿Ninguna entrada de escala empieza < 0.9× su destino? (desde exactamente 0 se difiere: solo válido como `cloning`) | empezar en 0.96–0.98× |
| `spatial.keys_in_range` (auto) | ¿Todo key cae dentro del in/out de su capa? | `ae_keyframes action=offset` o `ae_layer_update action=set_timing` |
| `spatial.glow_not_zeroed` (auto) | ¿Ningún glow anima intensidad/opacidad a 0? | piso ≥ 0.2 del reposo; fundir la capa |
| `spatial.no_unintended_overlap` (visión) | ¿Nada se solapa sin querer en ningún frame muestreado? | mover destino / retrasar |
| `spatial.nothing_clipped_mid_move` (visión) | ¿Nada queda cortado por el marco o un matte mientras se mueve? | recorrido dentro de title-safe |

## legibility (4, visión; apoyo numérico en `ae_text action=legibility`)

| id | Pregunta |
|---|---|
| `legibility.title_safe` | ¿Todo texto queda dentro del 80 % (inset 10 % por lado)? |
| `legibility.smallest_glyph` | ¿El glifo más pequeño se lee al tamaño de entrega? |
| `legibility.text_holds_after_rest` | ¿El texto reposa lo suficiente para leerse (1 s / 13 chars)? |
| `legibility.contrast_darkest_cell` | ¿Hay contraste en la celda más oscura del sheet? |

## intent (1, visión)

| id | Pregunta |
|---|---|
| `intent.nameable` | ¿Cada elemento animado tiene una intención nombrable (transition, demonstration, guidance, feedback, visualization, highlight, aesthetic)? Si pasaste `intent=`, ¿todo lo sirve? |

## Cómo se lee la salida

```json
{ "rubric": { "register": "product_video",
    "passed": [{ "id": "...", "check": "...", "observed": "..." }],
    "failed": [{ "id": "...", "check": "...", "observed": "...", "fix": "stagger 0 ms -> set 90 ms (3 f) between L2 and L3 (ae_keyframes action=offset on L3 by 0.090 s)" }],
    "unverifiable": [{ "id": "...", "check": "...", "note": "..." }] },
  "images": ["contact sheet", "onion skin"], "keyframe_dump": { "layers": [], "staggerDeltas": [] },
  "instructions": "Judge only the unverifiable items from the images; apply the numeric fixes with ae_ease/ae_keyframes; re-run critique once." }
```

Regla de parada: **dos pasadas**. Pasada 1 aplica `fix` de `failed`; pasada 2 re-critica y juzga `unverifiable`; luego se reporta con frames/timecodes. Las correcciones se expresan siempre con números ("stagger 0 → 80 ms", "duración 0.30 → 0.40 s", "outInfluence 33 → 16"), nunca con adjetivos.

## Excepción declarada: appear puro

Trabajos con opacidad solo en HOLD (cortes secos mandados por el cliente): `easing.entrance_decelerates` pasa con nota; `easing.no_linear_motion` y `timing.min_visible` no tienen tweens que evaluar. Siguen aplicando `timing.whole_frame`, `spatial.keys_in_range`, legibility, `choreography.one_focal_motion` e `intent.nameable`. La sincronía con la palabra hablada no está en la rúbrica: se verifica con `ae_frame action=capture` a ±2 frames de cada entrada.
