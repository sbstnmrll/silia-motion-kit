# GATES — <pieza>

> Se escribe **antes** de construir, no al entregar. Una compuerta redactada después
> de ver el resultado se redacta para que pase.
>
> Las ocho primeras son transversales: salen idénticas en los cuatro `GATES.md` que
> ya existen en el repo, y cada proyecto las estaba reescribiendo desde cero. Las
> propias de la pieza se añaden a partir de G9.

## Convenciones de la casa

- Formato: `## G<n> · <resultado> — <estado> <fecha>` + `CHECK:` + `EXPECT:` + `RESULTADO:`.
- `CHECK:` es un **comando**, no una intención. `EXPECT:` es un **criterio con número**.
- Estados: ✅ cumplida · 🟡 desviación declarada (con su motivo) · ⛔ bloqueada o derogada.
- **Una compuerta derogada se marca derogada, no se borra**, y apunta a la que la sustituye.
- El historial se acumula dentro del gate (`RESULTADO v2:`, `RESULTADO v4:`), no se pisa.
- Un `EXPECT:` no copia un número de otro proyecto: **cita `motion://hechos-medidos`**.
  Es lo que evitó que el negro del outro acabara con tres valores distintos en tres
  proyectos — y lo que reveló que uno de ellos no se podía juzgar sin saber qué archivo
  de outro usaba.
- Una compuerta que no puede fallar no es una compuerta. Antes de confiar en una,
  córrela contra algo que **sabes** que está mal y comprueba que falla.

---

## G1 · El puente responde y el disco no miente — <estado>
- CHECK: `ae_status` y, después de renderizar, `lib_purge_caches`
- EXPECT: `connected: true`, versión de AE y comp activa correctas.
- RESULTADO:

> Purgar **después** de renderizar, no sólo antes: la caché de disco llena hizo fallar
> un render en `silia-university` y otro en `punto-de-partida`.

## G2 · El material está conformado — <estado>
- CHECK: `silia_conform action=analyze` sobre cada fuente; `ffprobe -count_frames`
- EXPECT: fps nativo y drift por minuto conocidos para cada fuente; ningún VFR sin declarar.
- RESULTADO:

## G3 · Los keyframes caen en la rejilla — <estado>
- CHECK: `ae_frame action=critique` (incluye `timing.whole_frame`)
- EXPECT: 0 keys fuera de cuadro entero al fps de entrega.
- RESULTADO:

## G4 · El motion está en banda — <estado>
- CHECK: `ae_frame action=critique register=<product_video|functional_ui> intent=<…>`
- EXPECT: `failed` vacío, o cada fallo restante con su desviación declarada. **Dos pasadas y se reporta.**
- RESULTADO:

> Excepción: si el brief manda *appear puro* (cortes secos, sin ease), las reglas de
> easing se apagan a propósito y se declara aquí, no se discute gate a gate.

## G5 · El texto se lee — <estado>
- CHECK: `ae_text action=legibility` en cada keyframe de texto; y en el board, `silia_board_review`
- EXPECT: sin incumplimientos de tamaño, chars/línea, líneas, CPS ni title-safe.
- RESULTADO:

## G6 · Las transiciones caben en su ventana — <estado>
- CHECK: frames extraídos del MP4 con **seek de salida** (`ffmpeg -i F -ss t`) en el inicio, medio y final de cada transición
- EXPECT: la transición empieza y termina dentro de su ventana; ninguna se ve ya completa en su primer cuadro.
- RESULTADO:

> Seek de **entrada** (`-ss` antes de `-i`) devuelve el cuadro clave anterior: la tira
> muestra contenido de antes del tiempo pedido y la compuerta miente.

## G7 · El outro tiene negro suficiente — <estado>
- CHECK: `verificar-entrega.sh <master> --outro-negro <requiredFillerBlackSec>` **y mirar
  un frame a la mitad del cruce**
- EXPECT: negro de relleno + negro propio del archivo de outro **≥ el cruce**.
  El número sale de `motion://hechos-medidos` (`requiredFillerBlackSec`), **no se copia**:
  depende de qué archivo de outro se use.
- RESULTADO:

> **Las dos mediciones no coinciden, y hay que declarar cuál se usó.** Medidos el
> 2026-09-20, `agente-diferenciadores/v5-master-r7.mp4` y `punto-de-partida/punto-v8.mp4`
> dan los dos 0.167 s con `blackdetect=d=0.05:pix_th=0.10`, mientras que la compuerta G10
> de `punto-de-partida` reportó 0.633 s leyendo frames. No es que una mienta: `blackdetect`
> sólo cuenta el negro **pleno**, y la parte del cruce que ya está casi negra no la cuenta.
> Si el criterio es "que no se vea el último cuadro bajo el logo", el frame manda.
> Pendiente de resolver cuál de las dos se convierte en el criterio canónico.

## G8 · La entrega cumple su especificación — <estado>
- CHECK: `verificar-entrega.sh <master> --size <WxH> --fps <fps> --dur <s> --lufs -14 --tp -1.0`
- EXPECT: resolución, fps exacto (60.000 no es 59.94), duración ±0.05 s, −14.0 ±0.5 LUFS, TP ≤ −1.0 dBTP.
- RESULTADO:

> Una compuerta de audio que verifica alineación y no nivel deja pasar una entrega
> inaudible en un teléfono. Ya ocurrió (`no-sabias-agente/AUDITORIA.md` §1).

## G9 · Mirado — <estado>
- CHECK: `verificar-entrega.sh … --frames "<t1> <t2> …"` → abrir `qa/tira.png`
- EXPECT: alguien miró la tira y lo dice aquí, nombrando qué vio en qué tiempo.
- RESULTADO:

> *"Mirar es parte de la verificación, no un extra. Un render que corrió bien no es
> evidencia de nada."* El lint pasando y los tiempos cuadrando no impidieron que un
> highlight cuyo barrido duraba más que su ventana no se viera nunca.

---

## Compuertas propias de esta pieza

## G10 · <…> — <estado>
- CHECK:
- EXPECT:
- RESULTADO:

---

## Gotchas de esta sesión

No son de la pieza, son de la herramienta. Al cerrar, las que valgan para la próxima
suben a la skill que corresponda y se anota en el POSTMORTEM §(d).

| Síntoma | Causa | Qué hacer |
|---|---|---|
| | | |
