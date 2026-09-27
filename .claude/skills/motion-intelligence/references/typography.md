# Tipografía en movimiento — legibilidad

Canon: `src/motion/typography.ts` (rutas relativas al repo del MCP) → `motion://typography/legibility`, registrado desde el commit `5efbee2`; herramientas `ae_text action=legibility` y `silia_captions action=build` (`warnings` + `legibility.items`). Números tomados de guías públicas (Netflix TTSG, BBC, legibility.info, SMPTE/EBU); la lógica de chequeo es nuestra.

## Reglas

| Regla | body / title | caption | Fuente |
|---|---|---|---|
| Tamaño mínimo (px, comp de 1080 de alto; escala por `altura/1080`) | 40 (house: 40–60) | 28 (escala tipográfica Silia) | house / Silia |
| Caracteres por línea | ≤ 30 | ≤ 42 | legibility.info / Netflix |
| Líneas | ≤ 3 | ≤ 2 | Netflix / BBC |
| Velocidad de lectura | 13 CPS | 17 CPS adulto · 20 máximo duro | house / Netflix |
| Hold tras reposar | ≥ 1 s por cada 13 caracteres | — | house |
| Piso por palabra | 0.3 s/palabra | 0.3 s/palabra | BBC |
| Duración de evento | — | 5/6 s (0.833) mín. · 7 s máx. | Netflix |
| Title-safe | 80 % (10 % de inset por lado) | igual | SMPTE RP 218 / EBU R95 |
| Action-safe | 90 % (5 % por lado) | igual | SMPTE RP 218 / EBU R95 |
| Dirección de desplazamiento | derecha → izquierda (sentido de lectura) | igual | convención |

## Safe areas en píxeles

| Comp | title-safe inset x / y | caja title-safe [x, y, w, h] | action-safe inset x / y |
|---|---|---|---|
| 1080×1920 (vertical) | 108 / 192 | [108, 192, 864, 1536] | 54 / 96 |
| 1920×1080 (horizontal) | 192 / 108 | [192, 108, 1536, 864] | 96 / 54 |
| 1080×1080 (cuadrado) | 108 / 108 | [108, 108, 864, 864] | 54 / 54 |

## Cálculos rápidos

- CPS = caracteres (con espacios) / segundos en pantalla. 26 caracteres a 13 CPS → 2.0 s mínimo. Una caption de 60 caracteres a 17 CPS → 3.5 s.
- Hold body: `ceil(chars/13)` s después del último key de texto. "Centraliza y estructura" (23 chars) → 2 s.
- Piso por palabra: 5 palabras → 1.5 s.
- Escala del mínimo: comp 1920 de alto → body ≥ 71 px, caption ≥ 50 px. Comp 1080 → 40 / 28.

## Cómo se verifica

```
ae_text action=legibility comp=<c> layer=<texto> kind=body|caption|title [at=<t>]
ae_text action=legibility comp=<c>              # todas las capas de texto; kind se infiere ("caption" en el nombre → caption)
```

Devuelve por capa: `pass`, `issues[{rule, observed, limit, fix}]` y `metrics {chars, words, lines, maxLineChars, cps, minFontPx}` más las safe areas. Con keyframes de source text evalúa cada key (hold = tiempo del siguiente key − este). `silia_captions action=build` corre el mismo chequeo por chunk y lo devuelve en `warnings` (`legibility: chunk n …`) y en `legibility.items`.

Ítems de la rúbrica visual que dependen de esto (no automáticos): `legibility.title_safe`, `legibility.smallest_glyph`, `legibility.text_holds_after_rest`, `legibility.contrast_darkest_cell`.

## Reglas de casa para texto en video Silia

- Fuente de video **ES Klarheit Grotesk** (`ESKlarheitGrotesk-Md` títulos y énfasis, `-Bk` cuerpo). Nunca ABC Monument en video.
- Sobre lime `#DEFF38` el texto es **negro**; sobre grafito, blanco.
- Tracking en Figma `ls −3 %` → −30 en AE; `−5 %` → −50. Interlineado `lh 92 %` → 0.92 × tamaño.
- Un texto que entra con animación reposa ≥ 1 s por 13 caracteres antes de la siguiente acción; si el corte no lo permite, reduce caracteres, no el hold.
