# De dónde sale cada regla del canon

Las rutas son del repo `editorial` de Silia (`projects/<slug>/…`), que no viaja con este MCP. Si necesitas ver el resultado o el razonamiento completo de una regla, pídeselo al dueño del repo. El canon no depende de estos archivos: están aquí para que una regla se pueda auditar o revertir sabiendo qué se rompería.

## Decisiones tomadas al consolidar (2026-10-12)

| Tema | Variantes encontradas | Decisión | Por qué |
|---|---|---|---|
| Tiempo del highlight | 8 f tras la frase + 20 f `power2_in_out` (agente-diferenciadores, 09-09) · 0.30 s `ease_out_quart` (cobertura-vacante-65, 10-08) · 250 ms casi lineal (decir-no-se) · 20 f `ease_out_quart` derecha→izquierda (silia-university AE) | **Arranca al decirse lo resaltado (+2 f), `sine_in_out`, duración `28·√(w/476)` f @60** | Elegido por el usuario. Es la versión más iterada (punto-de-partida v9→v14, `GATES.md` G22, G22c, G23), y cada cambio respondió a un feedback suyo |
| Geometría del highlight | r 10 / 12 / 14 / 18 / 22.6 / 24; aire de +14 a +18 px fijos, o 0.20×/0.13× proporcional (que-te-gustaria-supieran) | **Aire sobre la tinta 0.24× / 0.16×, radio 20 fijo** | Elegido por el usuario. Es la regla más reciente de los storyboards (memoria `storyboards-bold-sin-tension`) |
| Construcción del highlight | Rect Size con borde fijo + matte doble (en-una-palabra) · Linear Wipe sobre precomp (punto-de-partida) | **Precomp + Linear Wipe** | Sirve igual en el mundo claro y en el oscuro, y es la que tiene el barrido medido frame a frame |
| Cantidad de lima | En toda la pieza (agente-diferenciadores v2) · 2–3, una por acto (mismo-agente, cobertura, siniestro) | **2–3 por pieza** | Es lo más reciente (09-21 → 10-08) |
| Talla del punch | 120 / 135 / 126 / 130 / 108 según la pieza | **Una sola por pieza**, calculada por la línea más larga | La regla de las memorias; el usuario rechazó tres tallas en una pieza |
| Respiración del orbe | Nunca (punto-de-partida, demo-agente-voz) · ±0.6 % / 9 s (decir-no-se) | **Nunca por defecto; ±0.6 % solo si se pide** | El shader ya es la vida. En decir-no-se se añadió porque el orbe parecía congelado |
| `smoke` del orbe en AE | 0.12 (punto-de-partida) · 0.62 (producto) | **0.62, el del producto**, con `--smoke` disponible | La verdad de marca es el widget real |
| Mundo | Oscuro aurora (hasta 09-29) · Claro rejilla + grano (10-08 en adelante) | **Lo decide el board**; lo nuevo va en claro | — |
| Overshoot | +6 px de caída (no-sabias-agente, HyperFrames) | **Sin overshoot** | Arquetipo Premium |

## Por componente

| Regla | Fuente |
|---|---|
| Solo existe lo que ya se dijo | memoria `ui-nunca-revela-el-futuro`; skill `demo-agente-voz` (SKILL.md:14-18); `punto-de-partida/BRIEF.md:122` |
| Appear puro en texto | `silia-university/02-agentes-especializados-AE/BRIEF.md:228-231` (cliente: «solo el appear»); `mismo-agente-distintas-opticas/BRIEF.md:171` |
| Palabra por palabra con animador HOLD (sin reflow) | `punto-de-partida/GATES.md` G18; reparto por sílabas, idem |
| Whisper adelanta los inicios y se queda con el silencio final | `en-una-palabra/01-confianza/NOTAS.md:6-9`; `agente-diferenciadores/PLAN-ANIMACION.md:277-279`; skill `ae-motion` (gotchas) |
| Highlight: barrido, banda útil del wipe, feather 3, arranque a +2 f, `sine_in_out`, reposo ≥ 1 s | `punto-de-partida/GATES.md` G18, G20, G22, G22c, G23 |
| Highlight: aire sobre la tinta y radio 20 | memorias `storyboards-bold-sin-tension`, `storyboard-claro-rejilla-ui` |
| Highlight: la segunda línea arranca a +5 f, y era «pop» con escala | `agente-diferenciadores/PLAN-ANIMACION.md:697` (Ronda 3) |
| Highlight: orden de capas | `agente-diferenciadores/GATES-v4.md:63`; skill `ae-motion` (gotcha del reorder) |
| Letra por letra: 2 f/letra, cursor shape, parpadeo 32/32 | `agente-diferenciadores/PLAN-ANIMACION.md:99-136, 582, 711-767`; `audio/scripts/gen-v5.js` |
| Orbe: shader, suites, estados | `product-design/projects/agent-widget/widget/src/{silia-orb.js,suites.js}`; skill `demo-agente-voz` (`references/orbe-estados-y-colores.md`); `src/silia/tokens.ts` (`SILIA_ORB_SUITES`) |
| Orbe en AE como secuencia seek-safe, dos resoluciones con el mismo t0 | `punto-de-partida/PLAN-ANIMACION.md` §El orbe; `tools/render-orbe-seq.js` (aquí, `orbe/render-orbe-seq.cjs` es la versión multiplataforma) |
| Ping-pong con N−1 | `decir-no-se/GATES.md:167-172, 253-291`; skill `ae-motion` |
| Orbe: entrada 700 ms `ease_out_expo` 0.97→1 | `agente-diferenciadores/PLAN-ANIMACION.md:159-160, 342` |
| Vidrio claro | memorias `storyboards-bold-sin-tension` (2c), `storyboard-claro-rejilla-ui`; `forum-fsi-casos-silia/01-seguros-viaje/hf/index.html:34-60` |
| Vidrio oscuro: escala de superficies | `mismo-agente-distintas-opticas/BRIEF.md:218, 230`; `cobertura-vacante-65` (10-08) |
| Cards apiladas opacas | skill `isom-motion`; `no-sabias-agente/BRIEF.md:49` |
| Entrada y salida de UI, staggers | `agente-diferenciadores/PLAN-ANIMACION.md:27-36, 147, 280`; `src/motion/taxonomy.ts` |
| Fondo claro: rejilla con opacidad 40 en AE | `agente-diferenciadores/GATES-v4.md:10`; skill `ae-motion` |
| Fondo oscuro vivo (Turbulent Displace) | `agente-diferenciadores/BRIEF.md:66`, `PLAN-ANIMACION.md:603`; skill `ae-motion` |
| Pantalla fija, cámara dentro | memoria `pantalla-fija-camara-dentro`; `cotizaciones-traxion/BRIEF.md:56-83` |
| Spot lima solo como contorno | `forum-fsi-casos-silia/caso2-la-nacion/BRIEF.md:13` |
| Tilt de 0.5 s `power3_in_out` en el lienzo alto | `agente-diferenciadores/PLAN-ANIMACION.md:541-558` |
| Disolvencia de 0.6 s en vez de pull-out | `agente-diferenciadores/PLAN-ANIMACION.md:757-760` |
| Outro: negro ≥ cruce, 60.000 fps | `src/motion/measured-facts.ts`; `silia-university/02-agentes-especializados/NOTAS.md:18-22, 176` |
| Outro corto y suave | `agente-diferenciadores/PLAN-ANIMACION.md:701` |
| Audio: loudnorm, cama y SFX | `punto-de-partida/tools/mezcla.sh`, `GATES.md` G19; `agente-diferenciadores/PLAN-ANIMACION.md:627-634, 699-700, 769`; `no-sabias-agente/AUDITORIA.md:9-21` |
| Franja 4:5 y=285–1635, zonas de IG | memoria `instagram-reels-safe-zones`; `cobertura-vacante-65` (`reglas-casa.js:24`) |
| Cortes de toma ×1.25 ↔ ×0.95 | memoria `recorte-sin-bordes-de-fuente` |
| Piso de 32 px | `mismo-agente-distintas-opticas/BRIEF.md:228`; `no-sabias-agente/AUDITORIA.md:59` |
