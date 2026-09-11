# Plan de animación — <título del video> (AE)

Estado: PROPUESTA, nada tocado en After Effects todavía. Fuentes: `BRIEF.md`, storyboard Figma `<fileKey>` página `<nodo>` leído nodo por nodo con `use_figma`, `materiales/audio/palabras.json` (ms → frame = round(ms/1000·<fps>)).

## Entrega

| | |
|---|---|
| Formato | <1080×1920 · 60.000 fps · H.264 faststart> |
| Duración | <frames de imagen · s> + outro con cruce |
| Audio | <−14.0 ±0.5 LUFS · TP ≤ −1.0 dBTP · sin re-nivelar> |
| Versiones | <solo vertical · sin subtítulos> |

## Lectura del storyboard (geometría de Figma, no de screenshots)

Cada fila = una animación; los frames a la derecha son sus pasos. Tipografía <ES Klarheit Grotesk>. `lh 92%` → interlineado 0.92·tamaño; `ls −3%` → tracking −30; `ls −5%` → −50. `rb` = caja renderizada del texto (x, y, w, h) en el cuadro <1080×1920>. "Capa" = detrás/delante del presentador según el z-order de Figma (el nodo `Rectangle` es el presentador).

| Fila | Paso | Nodo | Texto | Color | Tamaño | rb (x, y, w×h) | Capa |
|---|---|---|---|---|---|---|---|
| P1 | 1 | 117:3 | | #FFFFFF | 320 Md | 0, 256, 1074×309 | detrás |
| P1 | 2 | | | | | | delante |
| R1a | 1→3 | | | | | | — |
| | | | | | | | |

## Conflictos y cómo se resuelven (regla del brief gana)

1. <Nodo con `DROP_SHADOW` vs regla "sin sombras" → sin sombras.>
2. <Rótulo del cuadro vs momento en que se dice la palabra → texto con su palabra.>
3. <Color del storyboard vs token de marca → color de Figma.>
4. <Rótulo del outro vs hecho medido → hecho medido.>

## Interpretación de cada animación (anclas en s absolutos · frame @<fps>)

Regla base: aparición pura (opacidad HOLD 0/100 o in/out de capa, sin ningún otro parámetro). Excepciones animadas solo las que el storyboard dibuja distinto: <barrido del highlight, letra por letra, camera-follow>.

| # | Animación | Entradas (palabra · s · frame) | Salida (palabra o corte · s · frame) | Nota / alternativa |
|---|---|---|---|---|
| 1 | | "agente" 1.13 · f68 · "IA" 1.78 · f107 | "¿Qué" 3.40 · f204 | |
| 2 | | | | |
| | | | | |

## Construcción en AE

- Master `<SLUG>_MASTER` <1080×1920 @ 60.000, duración>. Capas y `start_time` de cada tramo. Voz a 0 sin tocar niveles.
- Presentador: `<matte>.mp4` a `start_time` de su footage como matte compartido; textos "detrás" con `set_matte matte_type=luma_inverted`; textos "delante" sin matte.
- Textos: una capa por palabra/línea; fuente y métricas de la tabla; posición = `rb`. Highlight = forma rect r<22> con borde fijo. Letra por letra = keys HOLD de source text. Camera-follow = precomp con transform animado en el master.
- Outro: precomp con <0.500> s de negro + `outro.mp4`; opacidad 0→100 en <0.6> s; audio con el mismo retardo y fundido. Regla: negro ≥ cruce.
- Orden: `ae_status` → checkpoint → importar → master + audio → bloque con presentador (matte primero, borde del pelo) → filas → outro → `ae_render` → compuertas.

## Compuertas y cómo las mido

| Compuerta | Medición |
|---|---|
| Conformado | ffprobe `nb_read_frames` por tramo: <1086 / 1613 / 251 / 369> |
| Appear puro | `ae_frame action=capture` a ±2 frames de cada entrada |
| Anclas | in-points contra la tabla; frames extraídos del render final |
| Piezas con ease | `ae_frame action=critique register=product_video` (2 pasadas) |
| Matte | frames donde una letra cruza el pelo (<rango>) |
| Sin sombras | captura con `background=null`, sin fleco |
| Outro | frames a <t, t+0.3, t+0.6, t+0.9> mirados |
| Entrega | `ae_render action=verify`; `loudnorm` → <−14 LUFS, TP ≤ −1> |

## Abierto / bloqueado

- <SFX sin autorizar · dominio a confirmar · decisiones cambiadas respecto a la dirección aprobada>
