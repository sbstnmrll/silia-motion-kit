---
name: revisor-storyboard
description: Revisar un storyboard de Figma ANTES de animarlo — medir legibilidad a tamaño de teléfono, contraste WCAG, densidad de texto, ritmo contra la voz y elementos cortados con la tool `silia_board_review`, presentar las correcciones numéricas, aplicarlas en Figma con `use_figma` y volver a medir. Usar cuando haya un board aprobado y todavía no exista nada en After Effects, cuando pidan "revisa el storyboard", "¿este board va a funcionar?", "¿se lee en el teléfono?", "¿está muy cargado?", "¿le sobra tiempo muerto?", o antes de escribir `PLAN-ANIMACION.md`. No usar para criticar una animación ya construida: eso es `ae_frame action=critique` (skill `ae-motion`).
---

# Revisor de storyboard

Este paso existe por una razón medida. La única auditoría de entrega real del repo,
`projects/no-sabias-agente/AUDITORIA.md`, encontró siete defectos mirando el MP4 terminado —
1.9 s de apertura vacía, un hold estático de 2.6 s, texto de 26 px que a tamaño de teléfono son
9.4 pt, cards blancas sobre blanco que leen como una mancha gris, una card girada que queda como
un sliver roto, un hueco blanco de 0.27 s antes del corte, y un emoji que salió magenta.

**Los siete ya estaban en el board.** Ninguna compuerta los vio porque ninguna compuerta miraba
el board. Todo lo demás de este sistema juzga lo que ya está construido.

Se invoca como subagente y no como continuación del mismo hilo que escribió el plan: el valor
está en llegar sin haber decidido nada todavía.

## Qué mide y qué no

`silia_board_review action=rubric` imprime los 17 ítems con su umbral y el defecto del que salió
cada uno. 15 son automáticos; 2 son de juicio.

Contra el board real de `no-sabias-agente` (verificado 2026-09-20, en
`tests/unit/board-rubric.test.ts` como regresión) la rúbrica reprueba sola cinco de los siete
hallazgos que la auditoría encontró mirando el MP4: tamaño aparente, contraste figura/fondo,
elementos enterrados, glifos no representables y hold largo.

Los otros dos **no los ve, y conviene saberlo**:

- **El nivel de audio** (hallazgo 1, el peor de todos). No está en el board. Es una compuerta de
  entrega con objetivo de LUFS, no una revisión de storyboard.
- **Por qué la card girada leía como error** (hallazgo 6). En el board está entera dentro del
  cuadro; lo que la rompía era estar tapada por la pila. Por eso el ítem que lo atrapa es
  `not_occluded` y no `not_clipped`: el defecto no era el marco, eran las capas de encima. Este
  es el tipo de cosa que solo aparece midiendo contra datos reales.

Lo que **no** puede ver un board estático: si el ritmo *se siente* bien en movimiento. Eso solo
aparece animado. La rúbrica acota el daño (aire muerto, holds, cola) pero no lo sustituye.

## Protocolo

### 1. Volcar el board, y guardarlo

`get_metadata` (MCP Figma) sobre la página del storyboard → ids de los frames.
`use_figma` con `scripts/figma-dump.js` de la skill `video-desde-storyboard`, **2–3 ids por
llamada** (una respuesta grande rompe el transporte).

**Guarda el volcado en `work/figma/board-dump.json` del proyecto.** Hasta ahora se transcribía a
mano al plan y se tiraba, así que cuando el board cambiaba nadie sabía qué fila del plan había
quedado obsoleta. Con el volcado en disco hay diff.

El volcado trae dos campos que la rúbrica necesita y que los volcados anteriores al 2026-09-20 no
tienen: `backdrop` (el fill que se pinta detrás de cada nodo, sin el cual no hay contraste que
medir) y `text.dropped` (glifos que el saneado tuvo que sustituir). Si faltan, esos ítems se
declaran diferidos, no aprobados.

### 2. Medir

```
silia_board_review action=review
  dump=work/figma/board-dump.json
  words=work/palabras.json          # sin esto, ritmo y tiempo de lectura quedan DIFERIDOS
  duration_sec=<duración de la pieza>
  viewport_pt=390                    # ancho del feed en el teléfono
```

Las anclas se sacan casando el copy de cada paso contra la voz, avanzando solo hacia adelante. Un
paso cuyo texto no está literal en la voz vuelve como `tSec: null` y **no se inventa**: sus ítems
de ritmo se difieren y `board.coverage.rows_anchored` reprueba. Si el board dice una cosa y la voz
dice otra, eso ya es un hallazgo. Si la divergencia es deliberada, pasa las anclas a mano en
`anchors`.

### 3. Los dos ítems de juicio

`get_screenshot` (MCP Figma) del board y míralo **a ancho de teléfono**, no al 100 %:

- `board.intent.reads_in_one_second` — ¿se capta el punto de la toma en aproximadamente un segundo?
  El hallazgo A de la auditoría es el fallo tipo: texto *"demasiado pequeño para leerse y demasiado
  largo para ojearse"*. Si es textura, la primera línea va corta y grande. Si es contenido, hay que
  bajar el número de elementos y darles tiempo real.
- `board.intent.one_focal_point` — ¿hay un solo foco por toma?

### 4. Presentar antes de aplicar

**Siempre.** El board es un documento que el usuario y su cliente revisan; que la aplicación sea
automática no quita que el cambio deba verse antes. Una tabla:

| Nodo | Propiedad | De | A | Por qué |
|---|---|---|---|---|

Los `fixes` que devuelve la tool ya vienen con esos cinco campos. No traduzcas el "por qué" a
adjetivos: es un número con su umbral y de ahí sale su fuerza.

### 5. Aplicar en Figma

`use_figma`, **un batch por fila del board**, no uno por nodo. El historial de versiones de Figma
es el deshacer; deja una versión nombrada antes de tocar nada si el board es del cliente.

No toques nada fuera de los nodos que la rúbrica señaló. Un board no se "mejora de paso".

### 6. Volver a medir — la compuerta de convergencia

Re-volcar → `silia_board_review` otra vez. **`summary.failed` tiene que bajar.**

Si no baja, **para y reporta**. No hay tercera pasada a ciegas: o la corrección no era la correcta,
o el ítem está midiendo algo que en esta pieza no aplica, y las dos cosas las decide el usuario.
Es la misma regla de parada que la rúbrica de motion (dos pasadas y se reporta), y por la misma
razón: iterar más no mejora, solo mueve el problema de sitio.

### 7. Dejarlo escrito

Cada corrección aplicada entra en `PLAN-ANIMACION.md` como conflicto numerado, con la regla que lo
resolvió — es la convención de la §4 de `video-desde-storyboard`. Un cambio en el board que no
quede escrito es un cambio que el cliente descubre en la entrega.

Si un ítem se incumple a propósito (el cliente quiere ese hold largo, ese texto pequeño es textura
deliberada), se marca **desviación declarada** con quién lo decidió. No se borra el hallazgo: la
convención de la casa es que una compuerta derogada se marca derogada.

## Umbrales, y cómo discutirlos

Todos salen de algo medido, y están en `src/motion/board-rubric.ts` (`BOARD_RULES`) con su
procedencia en el código, no aquí — para que no haya dos copias que diverjan.

| Umbral | Valor | De dónde |
|---|---|---|
| Tamaño aparente mínimo | 11 pt a 390 pt de ancho | AUDITORIA §A: 26 px @1080 = 9.4 pt, piso cómodo ~11 pt |
| Contraste de texto | WCAG 4.5:1 (3:1 si es grande) | WCAG 2.2 §1.4.3 |
| Contraste figura/fondo | 1.5:1 | regla de casa: una masa no es texto, solo tiene que separarse |
| Velocidad de lectura | 200 wpm | AUDITORIA §A |
| Visible dentro del cuadro | ≥ 60 % de la caja de tinta | AUDITORIA §6 |
| Tapado por lo de encima | ≤ 85 % | medido en la pila A2.6 del board real: las cards que se leen están al 36–52 %, las que desaparecen al 98.7 % y 99.9 % |
| Apertura | primer evento ≤ 0.8 s | AUDITORIA §2 |
| Hold máximo | 1.5 s | AUDITORIA §5 |
| Cola | ≤ 0.3 s | AUDITORIA §4 |

Para discutir un umbral hay que discutir la medición de la que salió. Si una entrega demuestra que
un umbral estaba mal, se cambia **en el código** y se anota en el postmortem — nunca se ignora en
silencio en un proyecto.

## Gotchas

| Síntoma | Causa | Qué hacer |
|---|---|---|
| La respuesta de `use_figma` llega cortada ("truncated to 20kb") | El volcado ahora es recursivo y un board denso da 50+ nodos por toma | **1 toma por llamada** en boards con componentes anidados (cards, instancias); 2–3 solo si las tomas son planas. Verificado el 2026-09-20: tres tomas de `no-sabias-agente` no caben |
| La rúbrica mide "A1.1" o "0:05.6 · fr 168" como si fuera copy | El board envuelve cada toma en una cabecera de anotación; el volcado recursivo la incluye | Ya se descarta por defecto (`stage_name="stage"`, `ignore_paths=["shot-head","shot-dur","nota"]`). Si el board nombra distinto su cuadro entregable, pásalo en `stage_name` |
| Todos los contrastes vuelven diferidos | El volcado no trae `backdrop` (script anterior al 2026-09-20), o los fills son gradiente/imagen/`mixed` | Re-volcar con el script actual. Con gradiente no hay un color que medir: se juzga en la pasada visual |
| `not_occluded` reprueba una pila que está bien | Una pila en abanico tapa a propósito | Mira el número: por debajo del 85 % la rúbrica calla. Si un elemento está al 99 % y es deliberado, decláralo como desviación — pero pregúntate por qué sigue en esa toma |
| `rows_anchored` reprueba en masa | El copy del board no es literalmente lo que se dice en la voz | Es un hallazgo real, no un fallo de la herramienta: o se alinea el copy, o las anclas van a mano en `anchors` |
| `phone_size` reprueba textos que son decorativos | La rúbrica no distingue textura de contenido | Es uno de los dos ítems de juicio: decide y decláralo como desviación |
| Los ítems de ritmo salen diferidos | Falta `palabras.json` o `duration_sec` | Sin voz no hay ritmo que medir. Diferido no es aprobado |
| `phone_size` pasa y `video_min_size` reprueba | Miden cosas distintas: uno escala por el ancho del feed, el otro por la altura del cuadro | Los dos son válidos; el segundo es la regla de casa para video |
