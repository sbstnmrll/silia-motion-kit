---
name: motion-intelligence
description: Los números del motion en After Effects vía el MCP `ae` — registro (functional_ui vs product_video), intención, duración por distancia, easing con su equivalencia en KeyframeEase, stagger y coreografía, legibilidad tipográfica y el loop de crítica con `ae_frame action=critique`. Usar cuando pidan "que se vea premium", "mejor motion", "más fluido", "easing", "stagger", "critica la animación", "legibilidad", "cuánto debe durar", "se ve robótico / uniforme", o antes de animar algo en AE que no sea una receta `silia_*` ya confirmada.
---

# Motion intelligence — decidir los números y verificarlos

Este skill dice **qué valores usar y cómo comprobarlos**. Cómo operar el MCP `ae` (recetas, gotchas, render) vive en `ae-motion`; el flujo storyboard → video vive en `video-desde-storyboard`. Los números son hechos con fuente (ver `references/sources.md` y `LICENSES.md`); la prosa y la síntesis son nuestras. La copia canónica de las tablas es el código del server (`src/motion/*.ts` en el repo del MCP) expuesto como recursos `motion://` — cuando dudes, léelos en vez de recordar.

## 1. Orden de decisión (siempre en este orden)

**Registro → intención → dispositivo → duración → easing → coreografía → verificar.** Saltarse el registro es la causa nº 1 de motion "raro": UI a velocidad de video o video a velocidad de UI.

### 1.1 Registro

| | `functional_ui` | `product_video` |
|---|---|---|
| Qué es | Interfaz que el usuario **opera** (feedback, estados, transiciones) | Video que el espectador **mira** (hero reveals, UI escenificada, kinetic type) |
| micro / small | 50–100 / 100–150 ms | 100–160 / 200–320 ms |
| standard / large | 200–300 / 300–400 ms | 300–500 / 500–700 ms |
| hero | — | 600–900 ms |
| tween máximo · mínimo visible | 500 · 100 ms | 1000 · 160 ms |
| stagger por ítem · secuencia ≤ | 20–40 ms · 500 ms | 60–120 ms · 2000 ms |
| ease enter / exit / within | `fluent_ease_out` / `fluent_ease_in` / `carbon_productive_standard` | `ease_out_quart` / `power2_in` / `power3_in_out` · hero `ease_out_expo` |
| scale de entrada desde | 0.96–0.98 (nunca 0) | 0.96–0.98 (nunca 0) |
| spring bounce ≤ · motion blur | 0.1 · off | 0.1 · on |

Silia es arquetipo **Premium** (LottieFiles: Playful / Premium / Corporate / Energetic) → registro `product_video`, easeBias `ease_out_expo`, duraciones largas, sin overshoot, **un movimiento focal a la vez**. `feedback` cae en `functional_ui` por defecto. Fuentes del registro UI: Carbon, Material 3, Fluent 2, Atlassian, Apple, Val Head (banda útil 200–500 ms; 100 ms se lee instantáneo; ~230 ms para percibir conscientemente). `product_video` **no tiene fuente autoritativa**: es house style (`motion://house-style/saas-video`, marcado `opinion:true`).

### 1.2 Intención (AniMINT, 7) → banda y rol de ease

| Intención | Banda | Ease | Nota |
|---|---|---|---|
| `transition` | large | within | continuidad entre estados |
| `demonstration` | standard | within | el movimiento ES el contenido |
| `guidance` | standard | enter | dirige la mirada |
| `feedback` | small | enter | confirma; registro UI por defecto |
| `visualization` | large | within | contadores/progreso pueden ir **lineales** para que el ritmo sea honesto; easear solo el contenedor |
| `highlight` | small | enter | subrayado, glow, pop |
| `aesthetic` | hero | hero | sabor de marca; la deceleración más larga del registro |

### 1.3 Dispositivo (UX in Motion, 12 nombres; glosas y técnica AE nuestras)

| Dispositivo | En AE |
|---|---|
| `easing` | `ae_ease action=preset` / `from_cubic_bezier`; lineal solo en loops |
| `offset_and_delay` | `ae_keyframes action=offset dt` por capa; text animator con offset |
| `parenting` | `ae_layer_update action=set_parent`; expresiones que enlazan |
| `transformation` | keys de path, scale/rotation en la misma capa, swap bajo matte |
| `value_change` | slider + `counter`; `ae_text action=set_keyframes` (hold) |
| `masking` | `ae_layer_update action=set_matte`; `ae_masks` |
| `overlay` | `ae_layer_update action=reorder` + opacidad/blur para separar planos |
| `cloning` | `ae_layer_update action=duplicate`; `ae_shape action=add_repeater` |
| `obscuration` | blur/dim en capa de ajuste que se disuelve (patrón `silia_grade`) |
| `parallax` | 3D + cámara, o posición 2D escalada por profundidad |
| `dimensionality` | capas 3D, flips en Y |
| `dolly_and_zoom` | `silia_push_25d`; zoom_punch en precomp |

### 1.4 Duración

Pide los números en vez de inventarlos: `silia_tokens action=plan_motion intent=<…> device=<…> distance_px=<…> register=<…> item_count=<n> fps=<fps>` → `durationMs` / `durationFrames`, `ease` / `exitEase` (nombre, bezier, influencias), `staggerMs`, `sequenceMs`, `rules`, `sources`.

Fórmula por distancia: **`ms = 300·√(px/200)`**, recortada a la banda del registro (UI 150–400; video 300–900) y ajustada a frames enteros.

| px | crudo | UI | video |
|---|---|---|---|
| 50 | 150 | 150 | 300 |
| 100 | 212 | 212 | 300 |
| 200 | 300 | 300 | 300 |
| 400 | 424 | 400 | 424 |
| 800 | 600 | 400 | 600 |
| 1200 | 735 | 400 | 735 |

Otras reglas: cualquier tween > `maxSingleMs` necesita razón narrativa; nada que deba **verse** dura menos que `minVisibleMs`; la salida siempre más corta que la entrada (~0.7×); eases complejas (expo, quint) necesitan más duración que una cúbica para que la curva se lea. Detalle y escalas de cada sistema: `references/durations-staggers.md`, `motion://tokens/durations`, `motion://tokens/distance-duration`.

### 1.5 Easing

- **Rol**: enter decelera (ease-out), exit acelera (ease-in), within simétrico (in-out). Nunca lineal en posición/escala/rotación salvo loops.
- **Nombres**: cualquiera de `motion://tokens/easings` vale en `ae_ease action=preset preset=<nombre>` (`ae_ease action=list` los agrupa por fuente). Ojo con la nomenclatura heredada de Silia: `power2_out` / `power3_out` = GSAP power1 / power2; los GSAP reales son `gsap_power2_out`, `gsap_power3_out`.
- **Conversión cubic-bezier(x1,y1,x2,y2) → KeyframeEase** (v̄ = |Δvalor|/Δt del tramo):
  `influence_out = 100·x1` · `speed_out = (y1/x1)·v̄` · `influence_in = 100·(1−x2)` · `speed_in = ((1−y2)/(1−x2))·v̄`; influencia recortada a 0.1–100; Easy Ease de AE = 33.33 % / velocidad 0. Con x1 = 0 o x2 = 1 la tangente es vertical: AE pone velocidad 0 e influencia 0.1. Las propiedades espaciales easean **a lo largo del path** (arity distinta). `motion://ae/ease-conversion`.
- **back / elastic / bounce no son un bezier** (y fuera de 0..1): en AE se hacen con keyframe extra o con `ae_expression action=set library=inertia|spring|bounce`.
- Tabla completa (bezier, influencias a velocidad 0, rol, fuente): `references/easings.md`.

### 1.6 Coreografía

- **Orden de entrada** (Carbon): shell → body → data → action → dataviz. Lo estático entra antes que lo dinámico; la acción primaria antes que la visualización.
- **Stagger por nº de ítems** (ms/ítem, UI · video): 2–3 → 40 · 120 · 4–6 → 30 · 90 · 7–12 → 20 · 60 · 13+ → `(tope − duración_ítem)/(n−1)` con piso 8 · 40. Tope de secuencia 500 · 2000 ms.
- **Anticipación** 40–80 ms antes del movimiento principal (product_video). **Evita el 300 ms uniforme**: con 3+ capas varía las duraciones (~0.87× / 1.07× / 1.33×) y ajusta a frames.
- **Un movimiento focal por beat**; lo secundario ≤ 30 % de la amplitud del primario.
- Mueve por líneas de la grilla, no en diagonal (Carbon). En fondo oscuro, la luz llega antes que la posición (glow/opacidad 1–2 frames antes). **Nunca fundas un glow a 0** (el último 10 % salta): fija piso ~8–10 % o funde la capa.
- Texto: reposa y sostiene ≥ 1 s por cada 13 caracteres antes de que otra cosa se mueva.

### 1.7 Verificar

Nunca por read-back solo. `ae_frame action=critique` (§5) tras cada bloque de animación; `ae_text action=legibility` sobre cada capa de texto (§7); `ae_frame action=capture` a ±2 frames de cada entrada cuando el brief pide cortes secos.

## 2. No negociables

1. Registro decidido y dicho **antes** del primer keyframe.
2. Todo keyframe en frame entero (`round(t·fps)/fps`).
3. Ninguna entrada en escala desde 0 (salvo dispositivo `cloning` justificado): desde 0.96–0.98.
4. Ningún tween lineal en posición/escala/rotación (hold sí; loops sí).
5. Entrada decelera, salida acelera, salida más corta que entrada.
6. Stagger dentro de la banda del registro y secuencia bajo el tope.
7. Bounce/overshoot ≤ 0.1; premium = sin overshoot.
8. Glow nunca a 0; motion blur **on** en product_video, **off** en functional_ui.
9. Texto legible (§7) y dentro de title-safe 80 %.
10. Correcciones siempre **numéricas** ("stagger 0 → 80 ms", "outInfluence 33 → 16"), nunca adjetivos ("más suave").
11. Máximo **dos pasadas** de crítica por bloque; después se reporta, no se itera.

## 3. Disciplina de frames

`frames = round(ms/1000·fps)`; el valor real que queda en la comp es `frames/fps`. Un stagger por debajo de 1 frame **no existe**: a 24/25 fps el mínimo real es 40 ms.

| ms | 24 fps | 25 fps | 30 fps | 60 fps | Uso típico |
|---|---|---|---|---|---|
| 50 | 1 | 1 | 2 | 3 | micro UI |
| 80 | 2 | 2 | 2 | 5 | anticipación · stagger video |
| 100 | 2 | 3 | 3 | 6 | micro video · mín. visible UI |
| 120 | 3 | 3 | 4 | 7 | stagger video (2–3 ítems) |
| 150 | 4 | 4 | 5 | 9 | small UI |
| 160 | 4 | 4 | 5 | 10 | mín. visible video · Silia xs |
| 200 | 5 | 5 | 6 | 12 | standard UI · Silia sm |
| 240 | 6 | 6 | 7 | 14 | Carbon moderate-02 |
| 300 | 7 | 8 | 9 | 18 | standard video |
| 320 | 8 | 8 | 10 | 19 | entrada confirmada Silia |
| 400 | 10 | 10 | 12 | 24 | large UI · entrada UI en video |
| 500 | 12 | 13 | 15 | 30 | tope UI · Silia lg |
| 600 | 14 | 15 | 18 | 36 | hero mín. |
| 700 | 17 | 18 | 21 | 42 | large video máx. |
| 850 | 20 | 21 | 26 | 51 | Silia xl |
| 900 | 22 | 23 | 27 | 54 | hero máx. |
| 1000 | 24 | 25 | 30 | 60 | tope video |

Staggers (ms → frames a 24/25/30/60): 20 → 1/1/1/1 (redondeado hacia arriba desde < 1) · 40 → 1/1/1/2 · 60 → 1/2/2/4 · 90 → 2/2/3/5 · 120 → 3/3/4/7.

## 4. Cómo leer un contact sheet y un onion skin

Los frames solos dicen **qué** se movió, no **qué tan bien** (AniMINT). Por eso la crítica junta tres cosas: contact sheet a intervalo uniforme (≥ 10 fps de muestreo: `every=0.1` en rangos ≤ 2 s), onion skin (todas las muestras compuestas en una imagen; la última sin tinte, las anteriores como fantasmas con alfa decreciente, cajas del cambio y `spacing[]` = desplazamiento del centroide por muestra) y el `keyframe_dump` numérico.

| Lo que ves | Significa | Qué hacer |
|---|---|---|
| Fantasmas apretados al final del trayecto, `spacing[]` decrece | ease-out correcto | nada |
| Fantasmas equidistantes, `spacing[]` constante | movimiento **lineal**: se olvidó el ease | `ae_ease action=preset preset=<enter del registro>` |
| Apretados al inicio, abiertos al final | ease-in en una entrada (al revés) | invertir influencias |
| Apretados en ambos extremos | in-out en una entrada; aceptable solo en `within` | cambiar a ease-out si es entrada |
| Un fantasma aislado lejos de los demás | salto/pop (key fuera de frame, hold mal puesto) | revisar `timing.whole_frame` en el dump |
| Dos trazos dominantes en el mismo beat | dos movimientos focales | retrasar uno (stagger) o reducir amplitud a ≤ 30 % |
| El primer frame ya muestra el estado final | la animación no cabe en su ventana | acortar duración o mover la entrada |
| Borde del texto cortado por el marco o un matte en pleno movimiento | recorrido mal calculado | mover destino dentro de title-safe |
| Texto presente en la celda anterior a su palabra | rompe "no se revela antes de oírlo" | mover in-point al frame de la palabra |

Regla práctica: el contact sheet a intervalo uniforme **es** un spacing chart. Numera mentalmente las celdas: la etiqueta `f<frame>` te da el frame exacto para la corrección.

## 5. Loop de crítica

```
ae_frame action=critique comp=<c> register=product_video|functional_ui intent=<intención> [layers=[…]] [range={start,end}] [every=0.1]
```

Devuelve: contact sheet con frames, onion skin, `keyframe_dump` (keys con t/frame/valor/interpolación/influencias/velocidades, glows, deltas de stagger) y `rubric {passed, failed, unverifiable}`. Cada `failed` trae un `fix` numérico ejecutable con `ae_ease`, `ae_keyframes` o `ae_layer_update action=set_timing`.

1. **Pasada 1**: corre `critique`. Aplica **solo** los `fix` de `failed`, tal cual (no retoques nada que pasó). Ignora `unverifiable`.
2. **Pasada 2**: vuelve a correr `critique` con los mismos argumentos. Reporta qué `failed` se limpió.
3. Juzga `unverifiable` **desde las dos imágenes** (un foco por beat, title-safe, glifo mínimo legible, texto que reposa, contraste en la celda más oscura, sin solapes, nada recortado en movimiento, intención nombrable).
4. **Para.** Dos pasadas es el tope (los ítems binarios atómicos suben el acuerdo entre jueces de 59–67 % a 96 %; iterar más no mejora, solo mueve el problema). Reporta lo que quede con su `fix` y los veredictos visuales con frame/timecode.

El prompt `motion-critique` del server (args `comp`, `register`) hace exactamente esto. Rúbrica completa por grupos y qué ítem es automático vs visual: `references/critique-rubric.md`.

## 6. Recursos `motion://` (léelos, no los copies)

| URI | Qué trae |
|---|---|
| `motion://taxonomy/registers` · `intents` · `devices` · `archetypes` | La taxonomía con bandas numéricas |
| `motion://tokens/durations` | Escalas Carbon / Material 3 / Fluent 2 / Atlassian / Val Head / Silia + fórmula por distancia |
| `motion://tokens/easings` | Cada ease: bezier, CSS, influencias AE a velocidad 0, nombre GSAP, rol, fuente, licencia |
| `motion://tokens/staggers` | Tabla por nº de ítems, pisos, topes, ejemplos |
| `motion://tokens/distance-duration` | Tabla px → ms para ambos registros |
| `motion://ae/ease-conversion` | Fórmulas bezier → KeyframeEase, unidades de velocidad por propiedad, caveat espacial |
| `motion://typography/legibility` | Reglas de legibilidad (tamaño mínimo, chars/línea, CPS, hold, safe areas). |
| `motion://rubric/contact-sheet` | La rúbrica binaria y cómo leer el sheet. |
| `motion://house-style/saas-video` | House style SaaS (opinión): hero, entradas UI, staggers, zoom-cuts, glow, reposo de texto |
| `ae://sdk` · `ae://sdk/{object}` | Referencia ExtendScript de AE 26 por objeto (para `ae_execute_extendscript`) |

Sin round trip a AE: `silia_tokens action=get|resolve_ease|plan_motion`, `ae_ease action=list`, `ae_expression action=library_info`.

## 7. Legibilidad (resumen; detalle en `references/typography.md`)

| Regla | body / title | caption |
|---|---|---|
| tamaño mínimo @1080 de alto | ≥ 40 px (house: 40–60) | ≥ 28 px |
| caracteres por línea | ≤ 30 | ≤ 42 |
| líneas | ≤ 3 | ≤ 2 |
| velocidad de lectura | 13 CPS | 17 CPS (20 máx.) |
| duración | hold ≥ 1 s por 13 chars tras reposar; piso 0.3 s/palabra | evento 5/6 s – 7 s |
| title-safe 80 % | 1080×1920 → insets 108 px x / 192 px y · 1920×1080 → 192 / 108 | igual |

El texto que se desplaza va **de derecha a izquierda** (sentido de lectura). Herramientas: `ae_text action=legibility layer=<l> kind=body|caption|title [at=t]` (o toda la comp sin `layer`); `silia_captions action=build` devuelve `warnings` de legibilidad y `legibility.items`.

## 8. Excepción: trabajos de "appear puro"

Cuando el cliente manda cortes secos (el texto está o no está: opacidad **HOLD** 0/100 o in/out de capa, sin fade/escala/blur/desplazamiento), las reglas de easing **se apagan a propósito**. La rúbrica lo sabe: una opacidad con solo keys HOLD pasa `easing.entrance_decelerates` con la nota "appear (hold), no easing required" y `easing.no_linear_motion` no tiene tweens que evaluar. Siguen vigentes: frame entero, keys dentro del rango de la capa, title-safe, legibilidad, un foco por beat, y sobre todo la **sincronía con la palabra** (verificar a ±2 frames de cada entrada con `ae_frame action=capture`). Las únicas piezas con ease en esos trabajos son las que el storyboard dibuja distinto (barrido de highlight, letra por letra, camera-follow) y ahí sí aplica todo lo anterior. Flujo completo: skill `video-desde-storyboard`.

## 9. Llamadas de ejemplo

```
silia_tokens action=plan_motion intent=guidance device=offset_and_delay distance_px=240 item_count=4 fps=30
ae_keyframes action=set layer="Card 1" path=position keys=[{time:1.0,value:[540,1200]},{time:1.4,value:[540,960],ease:"ease_out_quart"}]
ae_ease action=preset layer="Card 2" path=position preset=ease_out_quart
ae_keyframes action=offset layer="Card 2" path=position dt=0.09
ae_expression action=set layer="Logo" path=scale library=inertia params={amp:0.06,freq:3,decay:6}
ae_frame action=critique comp=active register=product_video intent=guidance
ae_text action=legibility comp=active kind=body
```
