---
name: video-desde-storyboard
description: Flujo para convertir un storyboard de Figma + brief + materiales (footage conformado, voz, palabras con timings, outro) en un video vertical u horizontal terminado en After Effects con el MCP `ae` — leer el storyboard nodo por nodo con `use_figma`, traducir filas/pasos a anclas frame-exactas desde el JSONL de palabras, construir una capa de texto por palabra con appear puro (HOLD), mattes detrás del presentador, highlight, letra por letra, camera-follow, outro con negro de relleno, y pasar las compuertas antes de entregar. Usar cuando haya "storyboard", "Figma" + "video", "animar el texto sobre el footage", "cuadro por cuadro", "palabras.json", "matte del presentador / de Marian", "outro con cruce", o un `BRIEF.md` con reglas duras del cliente.
---

# Video desde storyboard (Figma → After Effects)

Derivado de un trabajo real (Silia University 02, en el repo `editorial` de Silia: `projects/silia-university/02-agentes-especializados-AE/{BRIEF.md,PLAN-ANIMACION.md}`); pídelos si necesitas ver el resultado completo de este flujo. Cómo operar el MCP `ae`: skill `ae-motion`. Los números de motion para las piezas con ease: skill `motion-intelligence`.

## 0. Orden de entrega

1. **Volcar el board y revisarlo antes de planear**: `scripts/figma-dump.js` → `work/figma/board-dump.json` → skill `revisor-storyboard` (tool `silia_board_review`). Mide legibilidad a tamaño de teléfono, contraste, densidad, ritmo contra la voz y elementos cortados. Lo que se corrige aquí no se paga animado. Existe porque los siete defectos de `projects/no-sabias-agente/AUDITORIA.md` se descubrieron mirando el MP4 terminado y los siete ya estaban en el board.
2. Si el brief pide interpretar ("quiero que intentes interpretar el motion", "llega a tus propias decisiones"), **el segundo entregable es el plan, no el AE**: `PLAN-ANIMACION.md` con lectura del storyboard, conflictos resueltos, anclas frame-exactas, construcción y compuertas (`templates/plan-animacion.md`). Se presenta, se aprueba, y solo entonces se toca After Effects.
3. Si el brief prohíbe consultar versiones anteriores (renders, comps, notas con decisiones de motion), **no se abren**; si aparecen por accidente, se cierran y se anota.
4. Fuentes legítimas: el storyboard en Figma, el brief, los materiales. Nada más.

## 1. Leer el brief y sacar lo que manda

| Qué extraer | Ejemplo del trabajo real |
|---|---|
| Entrega | 1080×1920, **60.000 fps exactos** (no 59.94), H.264 faststart, −14.0 ±0.5 LUFS, TP ≤ −1.0 dBTP, solo vertical, sin subtítulos |
| Estructura en frames | apertura 0–1086 · bloque 1086–2699 · cierres 2699–2950 · 2950–3319 · outro 3319– (t = frame/60) |
| Reglas duras (numeradas) | appear puro · texto con su palabra · nunca completo antes de oírse · texto sobre el presentador va detrás · sin sombras · geometría y color de Figma |
| Hechos medidos | negro del outro: relleno + negro propio del archivo ≥ cruce (en SU02: 0.500 + 0.133 ≥ 0.600). **La regla, no el número, vive en `motion://hechos-medidos`** · el outro no se verifica por luma · el matte parpadea en el pelo |
| Compuertas | frames por tramo, ±2 frames por entrada, matte, alfa, cruce del outro, LUFS/TP |
| Bloqueado | SFX sin autorizar, dominio a confirmar, decisiones cambiadas respecto a Notion |

Por qué el fps exacto importa: con tres relojes (cámara 59.94, outro 30, clips 24) se elige el fps donde el outro duplica exacto y el único conform recae en la cámara (59.94 → 60 duplica un cuadro cada ~16.7 s, invisible). `silia_conform action=analyze` confirma el drift por fuente.

## 2. Leer el storyboard nodo por nodo (nunca de un screenshot)

1. De la URL saca `fileKey` y el nodo de página (`node-id=117-2` → `117:2`). `get_metadata` (MCP Figma) lista los frames de la página con id, nombre, x, y, w, h.
2. Agrupa por **fila** (misma `y`): cada fila es **una animación**; los frames duplicados en horizontal dentro de la fila son **sus pasos**, en orden de `x`. Se leen como secuencia cuadro por cuadro, no como variantes.
3. Vuelca la geometría con `use_figma` y `scripts/figma-dump.js`: pon 2–3 ids en `IDS` por llamada (respuestas mayores rompen el transporte; las cadenas se sanean a ASCII/Latin). Por frame devuelve: `x,y,w,h`, fills hex, `radius`, `effects`, y `children` en orden de z (**el último se dibuja encima**) con `type`, `name`, `x,y,w,h` relativos al frame, fills hex, `radius`, `effects`, `opacity`, `rb` (= `absoluteRenderBounds` relativo al frame: la caja de tinta real), `backdrop` (los fills de lo que se pinta detrás) y para textos `chars`, `font`, `size`, `lineHeight`, `letterSpacing`, `align`, `dropped`.
   **Guarda el volcado en `work/figma/board-dump.json`.** Antes se transcribía a mano a la tabla del plan y se tiraba; cuando el board cambiaba no había forma de saber qué fila del plan había quedado obsoleta. Con el volcado en disco hay diff, y es lo que come `silia_board_review`.
4. **Z-order → quién va detrás del presentador**: el nodo `Rectangle` (o el que tenga la imagen del presentador) es el presentador; todo hijo **anterior** a él en `children` va **detrás** (matte), todo hijo posterior va **delante**.
5. `effects: []` → sin sombras. Si un nodo trae `DROP_SHADOW` y el brief dice sin sombras, gana el brief (anótalo como conflicto).
6. Una caja de texto que se sale del frame (`rb.y + rb.h > h`) es un **bleed intencional**: se copia tal cual.
7. Conversión a AE: fuente `ES Klarheit Grotesk Medium` → `ESKlarheitGrotesk-Md`, `Book` → `-Bk`; `lineHeight 92%` → leading `0.92·size`; `letterSpacing −3%` → tracking −30, `−5%` → −50; `align` → `justify`; color = hex del fill; posición = `rb` (x, y, w, h en el cuadro). Rellena la tabla **Lectura del storyboard** de la plantilla.
   Colocación exacta en AE (verificado 2026-09-03): crea la capa en `[0,0]`, llama `ae_text action=set` (con el mismo `tracking`) y usa el `bounds` que devuelve (`sourceRectAtTime`): `position = [rb.x − bounds.left, rb.y − bounds.top]`. Para textos centrados en Figma, `justify=center` y `position.x` = centro de la caja. Si el `rb` de Figma está recortado por el cuadro (x = 0 o borde = 1080), el texto sangra a propósito: céntralo en el cuadro. Textos de dos líneas: una capa por línea, la segunda a `rb.top + 0.92·size`. Sombras de Figma: Drop Shadow con `-0002` (Opacity) en escala 0–255 (8 % = 20.4), dirección 180° = hacia abajo, suavidad ≈ 2× el blur.
8. Hay planos sin texto: solo se anima lo que el storyboard dibuja.

## 3. Anclas: de la palabra hablada al frame

- `palabras.json` es JSONL (un objeto por línea) con `start`/`end` en **milisegundos**: `frame = round(ms/1000·fps)`, `t = frame/fps`. Si el bloque va desplazado en la comp (retro empieza en 18.100 s), suma el offset antes de redondear. `silia_captions action=preview path=…` detecta ms vs s y reporta overlaps sin tocar AE.
- Cada texto entra **en su palabra** (nunca todos juntos, nunca "en un tiempo cómodo"). El remate no se completa antes de oírse. Sale en el corte de plano o al empezar la frase siguiente; cuando el storyboard extiende la fila sobre dos planos, decide y anota la alternativa.
- Registra por animación: entradas (palabra · s · frame), salida (palabra o corte · s · frame) y la nota de por qué. Casos límite (una tercera línea que vive 7 frames porque la palabra cae 0.12 s antes del corte) se aceptan y se explican: la regla "no antes de oírlo" no se negocia.

## 4. Conflictos y quién gana

| Conflicto | Gana | Ejemplo |
|---|---|---|
| Nodo con sombra vs brief "sin sombras" | brief | `DROP_SHADOW` en Esperando / Uno por uno → sin sombra |
| Rótulo del cuadro dice un plano, la palabra se dice en otro | brief (texto con su palabra) | "pólizas / correos / sistemas" rotulado P3, dicho en P2 → va en P2, P3 queda limpio |
| Color del storyboard vs token de marca | storyboard (geometría y color de Figma) | highlight `#8B6FFA` (no `#7A5BF5`), rosa `#F5A8E0` (no `#F3B9FA`) |
| Rótulo vs hecho medido | hecho medido | negro del outro rotulado 0.300 s en el board, medido 0.500 s → 0.500. El 0.300 del rótulo llegó igualmente al `EXPECT` de una compuerta de otro proyecto: por eso los números viven en código y las compuertas los citan |
| Dirección de un barrido ambigua | storyboard (el paso intermedio) | el paso 2 llena la mitad derecha → barrido de derecha a izquierda, borde derecho fijo |

Cada conflicto va numerado en el plan con la regla que lo resuelve.

## 5. Construcción en AE (mapa a tools)

Orden: `ae_status` → `ae_checkpoint action=create` → importar → master + audio → bloque con presentador (matte primero, verificar borde del pelo) → bloques fila por fila → outro → render → compuertas. Más de 5 capas iguales → `ae_batch ops=[…] on_error=rollback` (Mode B, ver `ae-motion`).

| Pieza | Cómo |
|---|---|
| Master | `ae_comp action=create name=<SLUG>_MASTER width=1080 height=1920 frame_rate=60 duration=<total>`; `ae_project action=set_settings timeDisplay=frames` ayuda a leer anclas |
| Materiales | `ae_items action=import path=… add_to_comp=<master>` por archivo; `ae_layer_update action=set_timing layer=… start_time=<t tramo>`; la voz entra a 0 y **no se re-nivela** |
| Fuentes | `ae_text action=fonts regex=Klarheit` antes de crear texto; el read-back de `ae_text`/`ae_layer_create` avisa si AE sustituyó |
| Texto | **una capa por palabra o línea** que entra en momento distinto: `ae_layer_create kind=text text=… font=ESKlarheitGrotesk-Md size=… fill=#… justify=… tracking=… leading=… in_point=<t_in> out_point=<t_out>`; luego `ae_layer_query action=get` y ajusta `ae_layer_transform action=set position` hasta que la caja renderizada coincida con `rb` de Figma |
| Appear puro | el texto está o no está: in/out de capa en el frame de la palabra, o keys de opacidad con `interpolation:"hold"` (`ae_keyframes action=set path=opacity keys=[{time:t_in,value:100,interpolation:"hold"},{time:t_out,value:0,interpolation:"hold"}]`). Ninguna otra propiedad animada. La rúbrica de `critique` acepta opacidad solo-HOLD |
| Texto detrás del presentador | importa la silueta en gris (`apertura-matte.mp4`) al mismo `start_time` que su footage; en cada texto "detrás": `ae_layer_update action=set_matte layer=<texto> matte_layer=<matte> matte_type=luma_inverted` (AE 23+ comparte un matte entre capas). Verifica la polaridad con un frame (el texto debe desaparecer sobre el presentador); si está al revés, `matte_type=luma` |
| Highlight (subrayado que barre) | capa de forma debajo del texto: `ae_layer_create kind=shape …` con rect del tamaño exacto de Figma, `ae_shape action=add_round_corners radius=22`, fill del storyboard; anima `ADBE Vector Rect Size` de `[0,h]` a `[w,h]` y `ADBE Vector Rect Position` para que el **borde fijo no se mueva** (`x = borde − w_actual/2`) con `ae_keyframes action=set`; 20 f @60 (333 ms), `ease_out_quart`; `ae_layer_update action=reorder` para dejarla justo debajo del texto; comprueba con un frame |
| Letra por letra | una sola capa: `ae_text action=set_keyframes layer=<l> keyframes=[{time,text:"D"},{time,text:"Dí"},{time,text:"Día"},{time,text:"Días"}]` (hold). Se completa exactamente en el frame de la palabra y sostiene todo lo que el corte permita |
| Camera-follow | `ae_precompose layers=[footage, textos…] name=<PLANO>_CAMERA move_all_attributes=false`; en el master, por cada entrada `ae_layer_transform action=keyframe layer=<precomp> scale=<100→103→106> position=[…] at=<t> ease=ease_out_quart` (0.40 s por movimiento, encuadre hacia la palabra nueva, vuelve a 100 en la última); motion blur on en la capa |
| Outro | precomp `OUTRO` = solid negro de `pad` s + `outro.mp4` desde `pad`; en el master empieza en `t_fin − cruce`; opacidad 0→100 en el cruce (0.6 s: es un cruce de video, no un texto); audio del outro con el mismo retardo (va dentro del precomp) y `ae_audio action=set_levels layer=<outro> keyframes=[{time:t,db:-60},{time:t+0.6,db:0}]`. **Regla: negro ≥ cruce**; si no, el destello del logo se forma sobre la cara del presentador |

## 6. Compuertas (todas antes de entregar)

| Compuerta | Cómo se mide |
|---|---|
| Conformado | `ffprobe -v error -select_streams v:0 -count_frames -show_entries stream=nb_read_frames,r_frame_rate -of csv=p=0 <archivo>` por material y sobre el render; un frame de menos corre todo lo que sigue |
| Appear puro | `ae_frame action=capture time=(f−2)/fps`, `f/fps`, `(f+2)/fps` por entrada: sin estados intermedios |
| Anclas | `ae_layer_query action=list` → `inPoint·fps` contra la tabla de anclas |
| Piezas con ease | `ae_frame action=critique register=product_video intent=highlight` (o `guidance`) sobre highlight / letra por letra / camera-follow; dos pasadas y parar |
| Transiciones | capturar un frame **después** de que la transición termine: una animación que no cabe en su ventana nunca se ve completa y ningún lint lo detecta |
| Matte | capturar 3 frames consecutivos donde una letra cruza el pelo; si parpadea, suavizar el matte (blur leve o frame blending en la capa matte) y volver a mirar |
| Sin sombras / sin fleco | `ae_frame action=capture solo_layers=[texto] background=null` y mirar el borde; `ae_frame action=stats solo_layers=[texto]` para cobertura alfa |
| Sincronía en el archivo final | extraer frames del MP4 renderizado en los tiempos de ancla (`ffmpeg -ss <t> -i out.mp4 -frames:v 1 f.png`) y mirarlos: la comp no es evidencia del archivo |
| Outro | frames a lo largo del cruce (inicio, +0.3, +0.6, +0.9 s) **mirados**: el destello no cae sobre la cara. La luma máxima no sirve (el outro trae puntos brillantes desde su primer cuadro) |
| Entrega | `ae_render action=verify path=<mp4> expect={durationSec, fps:60, width:1080, height:1920}`; `ffmpeg -i out.mp4 -af loudnorm=print_format=json -f null -` → integrado −14.0 ±0.5 LUFS, TP ≤ −1.0 dBTP |

Mirar es parte de la verificación: un render que "corrió bien" no es evidencia de nada.

## 7. Gotchas de este flujo

| Síntoma | Causa | Qué hacer |
|---|---|---|
| `use_figma` falla o devuelve vacío con muchos nodos | la respuesta rompe el transporte por tamaño | 2–3 frames por llamada; `clean()` del script recorta cadenas y saca caracteres raros |
| Un texto "no está detrás" del presentador aunque tiene matte | polaridad del luma matte | probar `luma` vs `luma_inverted` y mirar un frame |
| El borde del pelo parpadea al cruzar una letra | segmentación automática por frame | suavizar temporalmente el matte; verificar 3 frames seguidos |
| El destello del logo aparece sobre la cara | negro de relleno < cruce | relleno + negro propio del archivo de outro ≥ cruce. El número depende de qué outro se use: `motion://hechos-medidos` → `requiredFillerBlackSec`, no se copia de otro proyecto |
| Un frame de menos en un tramo | conform o `set_timing` con tiempo no múltiplo de 1/fps | tiempos siempre como `frame/fps`; contar frames con ffprobe |
| Highlight "desproporcionado" | se copió el tamaño de otra fila o se dejó el rect por defecto | tamaño y radio exactos del nodo de Figma |
| El texto se ve completo antes de la palabra | ancla al inicio de la frase, no de la palabra | regla 3: mover al frame de la palabra; aceptar holds cortos |
| La cadena de Figma trae "Un siniestro," mal | Whisper y el storyboard difieren de la transcripción corregida | la transcripción corregida del brief manda para el texto; la geometría de Figma para la caja |

## 8. Entregable final

Reporte con: archivo (ruta, duración en s y frames, fps, LUFS/TP), tabla de anclas con el frame real leído del render, resultado de cada compuerta con los frames mirados, conflictos resueltos, y lo que quedó bloqueado o abierto (SFX, dominio). El `.aep` guardado con `ae_project action=save` y el checkpoint inicial listados.

## 9. Después de entregar: el postmortem

**El paso que hace que el siguiente video empiece mejor que éste.** Sin él, cada pieza vuelve a descubrir lo que la anterior ya sabía.

1. Subagente `auditor-entrega` sobre el master, con el brief y —si existe— una referencia externa. Ojos frescos: quien construyó no audita.
2. `POSTMORTEM.md` en la raíz del proyecto (`templates/postmortem.md`).
3. **La regla de promoción.** Todo hallazgo termina en **uno** de estos tres sitios, y se anota en cuál:

   | Tipo de hallazgo | Destino | Por qué ahí |
   |---|---|---|
   | Un número (umbral, tolerancia, duración) | `src/motion/measured-facts.ts` o un ítem de rúbrica | La prosa se copia y las copias divergen. Pasó con el negro del outro: tres proyectos, tres números, y uno que resultó no ser comparable con los otros |
   | Un comportamiento raro de una herramienta | fila `Síntoma \| Causa \| Qué hacer` en la skill que toque — y un issue si es un bug del server | Documentar un bug no lo arregla |
   | Una decisión de oficio | la skill de flujo | Ni número ni bug: criterio |

   **Ningún hallazgo se queda sólo en el POSTMORTEM.** Si no encaja en ninguno de los tres, probablemente era una circunstancia de esta pieza y no un hallazgo.

4. **Toda compuerta que pasó sobre una entrega que después falló se reescribe.** No se marca como excepción. El precedente: una compuerta de audio que verificaba alineación y no nivel dejó pasar una entrega inaudible en un teléfono.

Los umbrales cambian **en el código** y el cambio se anota en el postmortem — nunca se ignoran en silencio dentro de un proyecto.
