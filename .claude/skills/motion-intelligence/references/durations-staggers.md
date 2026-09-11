# Duraciones y staggers

Canon: `src/motion/durations.ts`, `staggers.ts`, `taxonomy.ts` → `motion://tokens/durations`, `motion://tokens/staggers`, `motion://tokens/distance-duration`, `motion://taxonomy/registers`.

## Bandas por registro (ms)

| Banda | functional_ui | product_video | Para qué |
|---|---|---|---|
| micro | 50–100 | 100–160 | hover, toggles, cambios de color |
| small | 100–150 | 200–320 | tooltips, chips, feedback, highlight |
| standard | 200–300 | 300–500 | entradas de elementos, guidance, demostración |
| large | 300–400 | 500–700 | transiciones de estado, visualización |
| hero | — | 600–900 | reveals de marca, títulos |
| tween máximo | 500 | 1000 | más largo exige razón narrativa |
| mínimo visible | 100 | 160 | por debajo se siente, no se ve |

## Escalas de cada sistema

| Sistema | Tokens (ms) | Nota |
|---|---|---|
| IBM Carbon (Apache-2.0) | fast-01 70 · fast-02 110 · moderate-01 150 · moderate-02 240 · slow-01 400 · slow-02 700 | fast: micro; moderate: expansiones pequeñas, tooltips; slow: expansiones grandes, nivel página. Secuencia total ≤ 500 |
| Material 3 (CC BY 4.0) | short 50/100/150/200 · medium 250/300/350/400 · long 450/500/550/600 · extra-long 700/800/900/1000 | desktop 150–200; stagger de lista ≤ 20 |
| Fluent 2 | ultraFast 50 · faster 100 · fast 150 · normal 200 · gentle 250 · slow 300 · slower 400 · ultraSlow 500 | |
| Atlassian | interacciones 50–150 · transiciones 150–400 | < 150 para acciones repetidas decenas de veces al día |
| Apple | banda 200–400; springs como duración + bounce, bounce ≤ 0.1 en UI | |
| Val Head | banda útil 200–500; 100 lee instantáneo; ~230 para percibir | eases complejas necesitan más duración |
| Silia (house) | xs 160 · sm 200 · md 320 · lg 500 · xl 850 | `silia_tokens action=get` |
| LobzyJay/motion-design-with-claude (MIT) | anticipación 40–80; stagger 40–120; evitar 300 uniforme | |

## Duración por distancia

`ms = 300·√(px/200)` → recorte a banda (UI 150–400; video 300–900) → frames enteros. Sintetizado de la no-linealidad descrita por Carbon (crece con la distancia, sublinealmente).

| px | crudo | UI (antes de frames) | video (antes de frames) | video @30 fps |
|---|---|---|---|---|
| 50 | 150 | 150 | 300 | 9 f · 300 ms |
| 100 | 212 | 212 | 300 | 9 f · 300 ms |
| 200 | 300 | 300 | 300 | 9 f · 300 ms |
| 400 | 424 | 400 | 424 | 13 f · 433 ms |
| 800 | 600 | 400 | 600 | 18 f · 600 ms |
| 1200 | 735 | 400 | 735 | 22 f · 733 ms |

`silia_tokens action=plan_motion … distance_px=<px> fps=<fps>` devuelve `durationMs`, `durationFrames` y la regla aplicada.

## Staggers (offset-and-delay)

| Ítems | functional_ui | product_video | Nota |
|---|---|---|---|
| 2–3 | 40 | 120 | cada uno tiene su beat |
| 4–6 | 30 | 90 | listas, filas de cards |
| 7–12 | 20 | 60 | la cascada se lee como un gesto |
| 13+ | `(500 − dur_ítem)/(n−1)`, piso 8 | `(2000 − dur_ítem)/(n−1)`, piso 40 | listas largas |

- Tope de secuencia (primer key del primero → primer key del último + duración): **500 ms UI · 2000 ms video**. Si no cabe, se recorta el stagger hasta el piso o se parte en dos beats.
- Un stagger < 1 frame no existe: a 24/25 fps el mínimo real es 40 ms; a 30 fps, 33 ms; a 60 fps, 17 ms.
- Ejemplo video: 4 cards de 400 ms con 90 ms → secuencia 3·90 + 400 = 670 ms. 8 filas de 300 ms con 60 ms → 720 ms. 20 ítems de 300 ms → (2000−300)/19 = 89 ms/ítem.
- Ejemplo UI: 6 ítems de 200 ms con 30 ms → 350 ms. 15 ítems de 150 ms → (500−150)/14 = 25 ms/ítem.
- En AE: `ae_keyframes action=offset layer=<n> path=<p> dt=<stagger_s>` por capa, in-points escalonados, o `ae_expression action=set library=time_offset params={delay, base_index}` en todas las capas (una expresión, stagger gratis).

## Coreografía (reglas con número)

| Regla | Valor | Fuente |
|---|---|---|
| Orden de entrada | shell → body → data → action → dataviz | Carbon |
| Anticipación | 40–80 ms antes del movimiento principal | LobzyJay (MIT) |
| Uniformidad | con 3+ capas, no todas la misma duración; variar ~0.87× / 1.07× / 1.33× | LobzyJay (MIT); rúbrica `timing.no_dead_uniformity` |
| Salida vs entrada | salida ≈ 0.7× la entrada | rúbrica `timing.exit_shorter` |
| Movimiento focal | uno por beat; secundario ≤ 30 % de amplitud | house style |
| Scale de entrada | 0.96–0.98 del destino, nunca 0 | Carbon / Material / house |
| Spring bounce | ≤ 0.1 | Apple / house |
| Glow | nunca a 0; piso 8–10 % o fundir la capa | house style |
| Luz antes que posición (fondo oscuro) | glow/opacidad 1–2 frames antes que position | house style |
| Zoom-cut | 400–600 ms, bounce ≤ 0.1, motion blur on | house style |
| Reposo de texto | ≥ 1 s por 13 caracteres antes de que algo más se mueva | house style / legibility |
| Modo de trabajo | Mode A live (MCP, ≤ 5 ops) · Mode B batch (`ae_batch`, > 5 ops) | LobzyJay (MIT) |
