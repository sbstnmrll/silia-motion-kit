---
name: auditor-entrega
description: Auditar un video ya renderizado contra su brief, con ojos frescos y medidas, y escribir el POSTMORTEM que cierra el ciclo de aprendizaje — qué falló, qué compuerta no lo detectó, y adónde se promueve cada hallazgo. Usar cuando haya un master entregado o a punto de entregarse, cuando pidan "audita el video", "¿por qué no funciona?", "compáralo con la referencia", "qué salió mal", "cierra el proyecto", o después de que un cliente devuelva feedback sobre una pieza terminada. No usar antes de construir: eso es `revisor-storyboard`.
---

# Auditor de entrega

El mejor documento del repo es `projects/no-sabias-agente/AUDITORIA.md`, y lo es por
cómo se hizo: alguien miró el MP4 terminado **sin haberlo construido**, con el brief
al lado y una referencia externa con la que compararlo, y midió en vez de opinar. Los
siete hallazgos que encontró no los había visto ninguna compuerta.

Esta skill convierte eso en un paso del proceso en vez de una iniciativa suelta. Se
invoca **como subagente**: quien construyó la pieza no puede auditarla, porque sabe lo
que quiso hacer y eso le impide ver lo que hizo.

## Antes de mirar nada

Lee, en este orden: el `BRIEF.md` (las reglas duras, numeradas), el `GATES.md` (qué se
verificó y qué quedó 🟡 o ⛔), y el `PLAN-ANIMACION.md` sólo al final. El plan cuenta la
intención, y la intención contamina: primero hay que ver qué hay.

Si existe una referencia externa —la versión de otro, la pieza anterior de la serie, lo
que hace la competencia— consíguela. Un veredicto sin referencia es una opinión; con
referencia es una comparación.

## Las tres pasadas

### 1. Medir (antes de mirar)

```
verificar-entrega.sh <master> --size … --fps … --dur … --lufs -14 --tp -1.0 --outro-negro …
```

Y lo que el script no cubre, con ffmpeg directo. El precedente obliga a medir el audio
antes que nada: el peor hallazgo de la auditoría fue que los golpes estaban 28 dB por
debajo de la referencia y el fondo era **silencio digital**, y la compuerta de audio
había pasado porque medía alineación, no nivel.

RMS cada 0.1 s contra la referencia es la medida que lo destapó:

```
ffmpeg -i <master> -af astats=metadata=1:reset=0.1,ametadata=print:key=lavfi.astats.Overall.RMS_level -f null -
```

### 2. Mirar, a tamaño de teléfono

Tira de contacto (`--frames`) y, para lo que el brief promete, el frame exacto. A **390
pt de ancho**, no al 100 %: la silueta que no puntea en el feed se ve perfecta en un
monitor.

Preguntas que encontraron algo la vez anterior:

- ¿Qué pasa en los primeros dos segundos? (1.9 s vacíos, en la ventana que decide el scroll)
- ¿Hay algún tramo donde no entre ni se mueva nada? (79 frames)
- ¿Se lee cada texto en el tiempo que está en pantalla? (4.5 s de lectura, 2.6 s en pantalla)
- ¿Hay algo que lea como error de render en vez de como elemento?
- ¿Hay un píxel que se lleve la mirada sin motivo? (un emoji magenta en una pieza monocroma)
- ¿El final termina antes que el clip? (0.27 s de hueco blanco antes del corte)

### 3. Escribir el POSTMORTEM

`templates/postmortem.md`, en la raíz del proyecto. Cinco secciones, y la (c) y la (d)
son las que no se pueden saltar:

- **(c) qué compuerta no lo detectó** — por cada fallo. Una compuerta que pasó sobre una
  entrega que falló se reescribe; no se marca como excepción.
- **(d) adónde se promueve** — cada hallazgo termina en un ítem de rúbrica, en
  `src/motion/measured-facts.ts`, o en una fila de gotcha. Ninguno se queda en el
  postmortem.

## El veredicto

Una frase al principio, honesta, antes de la lista. El modelo:

> *"La estructura narrativa es correcta y resuelve los dos feedbacks, pero el clip pierde
> contra la V1 en las dos cosas que deciden si un reel retiene: el sonido y el punch
> gráfico. Hay además cuatro defectos concretos de ejecución."*

Separa **bloqueantes** (impiden entregar) de **defectos de ejecución** (se arreglan en una
ronda) de **decisiones de fondo** (las decide el usuario, no el auditor). Y cierra con
**lo que sí funciona y no hay que perder** — lo bueno también se pierde entre versiones si
nadie lo escribe.

## Lo que esta skill no hace

- **No arregla.** Audita y propone. Quien arregla es la sesión de construcción, con el
  postmortem delante.
- **No decide de producto.** "¿Los mensajes son para leerse o son textura?" es una
  pregunta para el usuario; el auditor la formula con los números que la hacen decidible.
- **No itera.** Una pasada, un documento. Si hace falta otra auditoría es porque hubo otra
  entrega.

## Gotchas

| Síntoma | Causa | Qué hacer |
|---|---|---|
| Los frames extraídos no coinciden con lo que se ve al reproducir | `ffmpeg -ss` **antes** de `-i` hace seek de entrada y devuelve el cuadro clave anterior | Seek de salida: `ffmpeg -i F -ss t -frames:v 1` |
| Una disolvencia "mide bien" pero se ven dos imágenes superpuestas | La diferencia entre cuadros mide discontinuidad temporal, no si los cuadros intermedios se ven bien | Mirar un cuadro **a mitad** de la disolvencia |
| El audio "está alineado" y aun así no se oye | Alineación y nivel son cosas distintas | Medir LUFS integrado y true peak, siempre, contra `motion://hechos-medidos` |
| Todo parece correcto en el monitor | Se está mirando al 100 % | 390 pt de ancho, que es el contexto de entrega |
