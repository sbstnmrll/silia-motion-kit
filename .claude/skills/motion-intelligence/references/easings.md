# Easings — tabla cruzada

Canon: `src/motion/eases.ts` → `motion://tokens/easings` → `ae_ease action=list`. Todos los nombres de esta tabla valen en `ae_ease action=preset preset=<nombre>`, en `ease:` de `ae_keyframes action=set` y en `ease=` de `ae_layer_transform action=keyframe` y de las tools `silia_*`.

**Influencias AE a velocidad 0**: `out = 100·x1`, `in = 100·(1−x2)`, recortadas a 0.1–100. Con la velocidad media del tramo v̄ (|Δvalor|/Δt): `speed_out = (y1/x1)·v̄`, `speed_in = ((1−y2)/(1−x2))·v̄`. `ae_ease action=preset` calcula ambos (influencia **y** velocidad) a partir de los keys vecinos; la tabla muestra solo influencias. Rol: enter = decelera, exit = acelera, within = simétrico, loop = lineal.

## Silia / GSAP / CSS

| Nombre | cubic-bezier | out / in % | Rol | GSAP | Nota |
|---|---|---|---|---|---|
| `linear` | 0, 0, 1, 1 | 0.1 / 0.1 | loop | none | solo loops y contadores |
| `ease` | 0.333, 0, 0.667, 1 | 33.3 / 33.3 | within | — | Easy Ease de AE (F9) |
| `ease_in` | 0.42, 0, 1, 1 | 42 / 0.1 | exit | — | CSS |
| `ease_out` | 0, 0, 0.58, 1 | 0.1 / 42 | enter | — | CSS |
| `ease_in_out` | 0.42, 0, 0.58, 1 | 42 / 42 | within | — | CSS |
| `power1_in` | 0.55, 0.085, 0.68, 0.53 | 55 / 32 | exit | power1.in | |
| `power1_out` | 0.25, 0.46, 0.45, 0.94 | 25 / 55 | enter | power1.out | |
| `power1_in_out` | 0.455, 0.03, 0.515, 0.955 | 45.5 / 48.5 | within | power1.inOut | |
| `power2_in` | 0.55, 0.055, 0.675, 0.19 | 55 / 32.5 | exit | power2.in | salida por defecto en product_video |
| `power2_out` | 0.25, 0.46, 0.45, 0.94 | 25 / 55 | enter | power1.out | **heredado Silia** = GSAP power1.out (quad) |
| `power2_in_out` | 0.455, 0.03, 0.515, 0.955 | 45.5 / 48.5 | within | power1.inOut | heredado Silia |
| `power3_in` | 0.895, 0.03, 0.685, 0.22 | 89.5 / 31.5 | exit | power3.in | |
| `power3_out` | 0.215, 0.61, 0.355, 1 | 21.5 / 64.5 | enter | power2.out | **heredado Silia** = GSAP power2.out (cubic); entrada confirmada Silia |
| `power3_in_out` | 0.645, 0.045, 0.355, 1 | 64.5 / 64.5 | within | power2.inOut | heredado Silia; card travel; within por defecto en product_video |
| `power4_in` | 0.755, 0.05, 0.855, 0.06 | 75.5 / 14.5 | exit | power4.in | |
| `power4_out` | 0.23, 1, 0.32, 1 | 23 / 68 | enter | power4.out | |
| `power4_in_out` | 0.86, 0, 0.07, 1 | 86 / 93 | within | power4.inOut | |
| `gsap_power2_out` | 0.215, 0.61, 0.355, 1 | 21.5 / 64.5 | enter | power2.out | GSAP real |
| `gsap_power2_in_out` | 0.645, 0.045, 0.355, 1 | 64.5 / 64.5 | within | power2.inOut | GSAP real |
| `gsap_power3_out` | 0.165, 0.84, 0.44, 1 | 16.5 / 56 | enter | power3.out | GSAP real |
| `gsap_power3_in_out` | 0.77, 0, 0.175, 1 | 77 / 82.5 | within | power3.inOut | GSAP real |
| `sine_in` | 0.47, 0, 0.745, 0.715 | 47 / 25.5 | exit | sine.in | |
| `sine_out` | 0.39, 0.575, 0.565, 1 | 39 / 43.5 | enter | sine.out | |
| `sine_in_out` | 0.445, 0.05, 0.55, 0.95 | 44.5 / 45 | within | sine.inOut | |
| `circ_in` | 0.6, 0.04, 0.98, 0.335 | 60 / 2 | exit | circ.in | |
| `circ_out` | 0.075, 0.82, 0.165, 1 | 7.5 / 83.5 | enter | circ.out | |
| `circ_in_out` | 0.785, 0.135, 0.15, 0.86 | 78.5 / 85 | within | circ.inOut | |
| `expo_in` | 0.95, 0.05, 0.795, 0.035 | 95 / 20.5 | exit | expo.in | |
| `expo_out` | 0.19, 1, 0.22, 1 | 19 / 78 | enter | expo.out | Silia |
| `expo_in_out` | 1, 0, 0, 1 | 100 / 100 | within | expo.inOut | |
| `snappy` | 0.15, 0.85, 0.15, 1 | 15 / 85 | enter | — | zoom punches Silia |

## easings.net (MIT)

| Nombre | cubic-bezier | out / in % | Rol | GSAP | Nota |
|---|---|---|---|---|---|
| `ease_out_quart` | 0.25, 1, 0.5, 1 | 25 / 50 | enter | power3.out | **entradas UI en product_video** |
| `ease_out_quint` | 0.22, 1, 0.36, 1 | 22 / 64 | enter | power4.out | hero |
| `ease_out_expo` | 0.16, 1, 0.3, 1 | 16 / 70 | enter | expo.out | **hero**; easeBias Premium |
| `ease_in_out_quint` | 0.83, 0, 0.17, 1 | 83 / 83 | within | power4.inOut | |
| `ease_out_back` | 0.34, 1.56, 0.64, 1 | 34 / 36 | enter | back.out(1.7) | **overshoot**: no cabe en un KeyframeEase → key extra o `inertia` |
| `ease_in_out_back` | 0.68, −0.6, 0.32, 1.6 | 68 / 68 | within | back.inOut(1.7) | anticipación + overshoot → keys extra |

## IBM Carbon (Apache-2.0)

| Nombre | cubic-bezier | out / in % | Rol | Nota |
|---|---|---|---|---|
| `carbon_productive_standard` | 0.2, 0, 0.38, 0.9 | 20 / 62 | within | productive: movimiento en pantalla; **within por defecto en functional_ui** |
| `carbon_productive_entrance` | 0, 0, 0.38, 0.9 | 0.1 / 62 | enter | |
| `carbon_productive_exit` | 0.2, 0, 1, 0.9 | 20 / 0.1 | exit | |
| `carbon_expressive_standard` | 0.4, 0.14, 0.3, 1 | 40 / 70 | within | expressive: celebración / énfasis |
| `carbon_expressive_entrance` | 0, 0, 0.3, 1 | 0.1 / 70 | enter | |
| `carbon_expressive_exit` | 0.4, 0.14, 1, 1 | 40 / 0.1 | exit | |

Duraciones Carbon: fast-01 70 · fast-02 110 · moderate-01 150 · moderate-02 240 · slow-01 400 · slow-02 700 ms. Stagger 20 ms; secuencia ≤ 500 ms; orden shell → body → data → action → dataviz; mover por líneas de grilla, no diagonales.

## Material 3 (CC BY 4.0, Material Design, Google)

| Nombre | cubic-bezier | out / in % | Rol | Token |
|---|---|---|---|---|
| `material_standard` | 0.2, 0, 0, 1 | 20 / 100 | within | md.sys.motion.easing.standard |
| `material_standard_decelerate` | 0, 0, 0, 1 | 0.1 / 100 | enter | standard.decelerate |
| `material_standard_accelerate` | 0.3, 0, 1, 1 | 30 / 0.1 | exit | standard.accelerate |
| `material_emphasized_decelerate` | 0.05, 0.7, 0.1, 1 | 5 / 90 | enter | emphasized.decelerate |
| `material_emphasized_accelerate` | 0.3, 0, 0.8, 0.15 | 30 / 20 | exit | emphasized.accelerate |
| `material_legacy_standard` | 0.4, 0, 0.2, 1 | 40 / 80 | within | Material 2 standard |

Duraciones M3: short 50–200 · medium 250–400 · long 450–600 · extra-long 700–1000 (cuatro pasos por banda); desktop 150–200 ms; stagger de lista ≤ 20 ms.

## Fluent 2 (números)

| Nombre | cubic-bezier | out / in % | Rol | Curva |
|---|---|---|---|---|
| `fluent_ease_out` | 0, 0, 0, 1 | 0.1 / 100 | enter | curveDecelerateMax; **enter por defecto en functional_ui** |
| `fluent_ease_in` | 1, 0, 1, 1 | 100 / 0.1 | exit | curveAccelerateMax; **exit por defecto en functional_ui** |
| `fluent_ease_in_out` | 0.8, 0, 0.2, 1 | 80 / 80 | within | curveEasyEaseMax |

Duraciones Fluent: ultraFast 50 · faster 100 · fast 150 · normal 200 · gentle 250 · slow 300 · slower 400 · ultraSlow 500 ms.

## Atlassian (números)

| Nombre | cubic-bezier | out / in % | Rol |
|---|---|---|---|
| `atlassian_ease_out_bold` | 0, 0.4, 0, 1 | 0.1 / 100 | enter |
| `atlassian_ease_in_out_bold` | 0.4, 0, 0, 1 | 40 / 100 | within |
| `atlassian_ease_in_practical` | 0.6, 0, 0.8, 0.6 | 60 / 20 | exit |
| `atlassian_ease_out_practical` | 0.4, 1, 0.6, 1 | 40 / 40 | enter |

Atlassian: interacciones 50–150 ms (< 150 ms para acciones que se repiten decenas de veces al día); transiciones 150–400 ms.

## Shopify Polaris (MIT)

| Nombre | cubic-bezier | out / in % | Rol |
|---|---|---|---|
| `polaris_ease_in_out` | 0.42, 0, 0.58, 1 | 42 / 42 | within |

## Apple (springs)

Apple define los springs como **duración + bounce**, no como bezier. Para UI: bounce ≤ 0.1, banda 200–400 ms. En AE: keyframes con `ease_out_quint` / `ease_out_expo` para bounce 0, o `ae_expression action=set library=spring params={amp,freq,decay}` para un rebote pequeño (amp ≤ 0.1).

## Qué ease para qué (síntesis)

| Situación | functional_ui | product_video |
|---|---|---|
| Entrada | `fluent_ease_out` (o `carbon_productive_entrance`) | `ease_out_quart` 300–400 ms |
| Salida | `fluent_ease_in` (o `carbon_productive_exit`) | `power2_in`, ~0.7× la entrada |
| Movimiento en pantalla | `carbon_productive_standard` | `power3_in_out` |
| Hero / reveal | — | `ease_out_expo` o `ease_out_quint` 600–900 ms |
| Énfasis / celebración | `carbon_expressive_*` | `snappy` (zoom punch 400–600 ms) |
| Overshoot deseado (no Premium) | — | `inertia` amp 0.04–0.12 |
| Loops, contadores | `linear` | `linear` |
