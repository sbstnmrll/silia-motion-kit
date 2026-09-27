# POSTMORTEM — <pieza>

> Se escribe **después de entregar**, no antes de empezar otra. Es el único paso del
> sistema que hace que el siguiente video empiece mejor que éste.
>
> Existe porque el conocimiento estaba disperso en cuatro formatos distintos —la
> cabecera de un PLAN, una sección "lo que costó un ciclo" dentro de un NOTAS, una
> tabla de gotchas al final de un GATES, y una única AUDITORIA suelta— y porque
> ninguna de esas cuatro rutas garantizaba que el hallazgo llegara al siguiente
> proyecto. La sección (d) es la que cierra el ciclo: sin ella esto es un diario.

Fecha: <YYYY-MM-DD> · Proyecto: `projects/<slug>/`

---

## (a) Qué se entregó

| | |
|---|---|
| Master aprobado | `<ruta exacta>` ← **el archivo, no "la v14"** |
| Huella medida | `<WxH>`, `<fps>` fps, `<n>` frames, `<dur>` s, `<LUFS>` LUFS, TP `<tp>` dBTP |
| Cómo se midió | `verificar-entrega.sh <archivo> --size … --fps … --lufs … --tp …` |
| Rondas hasta aprobación | `<n>` (`v1` … `v<n>`) |
| Desde | board `<fileKey>` / `<nodo>` · brief `<ruta>` |

Un proyecto con catorce renders y sin esta fila obliga a adivinar cuál se aprobó.

## (b) Qué falló, y qué regla salió de eso

Una fila por fallo real. "Real" = costó una ronda, o llegó a la entrega.

| Qué pasó | Por qué | Regla que sale |
|---|---|---|
| | | |

Números, no adjetivos. "Se veía raro" no es un hallazgo; "el texto quedaba a 9.4 pt
aparentes y el piso cómodo son 11" sí.

## (c) Qué compuerta no lo detectó

**La sección más valiosa, y la que más se salta.**

| Fallo | Compuerta que debió atraparlo | Por qué no lo hizo | Cómo queda reescrita |
|---|---|---|---|

El precedente que justifica esta tabla, de `no-sabias-agente/AUDITORIA.md`:

> *"Fallo de mi compuerta G5: verificó **alineación** con un umbral de −40 dB y pasó;
> nunca verificó **nivel**. Una compuerta de audio sin objetivo de LUFS no sirve."*

Una compuerta que pasó sobre una entrega que después falló **se reescribe**. No se
marca como excepción.

## (d) Qué se promovió, y adónde

Todo hallazgo de (b) y (c) termina en **uno** de estos tres sitios. Ninguno se queda
solo aquí.

| Hallazgo | Destino | Dónde exactamente |
|---|---|---|
| | ítem de rúbrica / hecho medido / gotcha | `src/motion/…` · `src/motion/measured-facts.ts` · `.claude/skills/…` |

Cómo elegir:

- **Un número** (umbral, duración, tolerancia) → `src/motion/measured-facts.ts` o un
  ítem de rúbrica. Nunca prosa: la prosa se copia y las copias divergen.
- **Un comportamiento raro de una herramienta** (el MCP, ffmpeg, AE, Figma) → fila de
  gotcha `Síntoma | Causa | Qué hacer` en la skill que corresponda. Y si es un bug
  del server, además un issue: documentarlo no lo arregla.
- **Una decisión de oficio** que no es ni número ni bug → la skill de flujo.

Si un hallazgo no encaja en ninguno, probablemente no era un hallazgo: era una
circunstancia de esta pieza.

## (e) Lo que funcionó y no hay que perder

Lo contrario también se olvida. Una lista corta de lo que hay que repetir.

-

## Abierto

Lo que queda sin decidir, con quién lo decide.

-
