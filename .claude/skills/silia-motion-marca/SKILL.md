---
name: silia-motion-marca
description: El canon de motion graphics de la marca Silia — cómo se ve y se mueve cada componente para que cualquier persona (y cualquier Claude) obtenga el mismo resultado: highlight lima, texto palabra por palabra, letra por letra, orbe vivo, vidrio y cards, fondos claro/oscuro, subtítulos, grabaciones de pantalla, cámara, outro y audio, con números exactos y la receta en After Effects vía el MCP `ae`. Usar SIEMPRE que se anime una pieza de Silia (storyboard, reel, demo, caso, Silia University) antes del primer keyframe, y cuando pidan "como lo hacemos en Silia", "el highlight", "el orbe", "palabra por palabra", "on-brand", "que se vea igual que los otros videos". No aplica a Creai ni a otros clientes (Creai: azul #155EE8, Untitled Sans, sin recetas silia_*).
---

# Motion de marca Silia — el canon

Este documento fija **cómo se ve y cómo se mueve** cada pieza recurrente de los videos de Silia. Salió de ~20 proyectos reales (sep–oct 2026). Cada número tuvo una versión anterior que no funcionó, y la razón está anotada. Si algo aquí choca con lo que harías por defecto, gana esto.

**Cómo se reparte el conocimiento** (lee en este orden):

| Skill | Qué responde |
|---|---|
| **`silia-motion-marca`** (esta) | **Qué** se ve y **cómo** se mueve en Silia: el canon por componente |
| `ae-motion` | Cómo operar el MCP `ae`: sesión, recetas `silia_*`, render, y la tabla larga de gotchas |
| `motion-intelligence` | Los números genéricos: registros, duración por distancia, easings, staggers, legibilidad y crítica |
| `video-desde-storyboard` | El flujo board de Figma → video terminado: anclas, mattes, compuertas |
| `revisor-storyboard` / `auditor-entrega` | QA antes de animar / después de renderizar, siempre como subagente |

**Jerarquía cuando algo choca:** brief del cliente > storyboard de Figma (geometría y color del nodo) > **este canon** > defaults de `motion-intelligence`. Si el board contradice el canon en algo que no es geometría ni color (por ejemplo, el tiempo del highlight), aplica el canon y anótalo como conflicto en el plan.

---

## 1. Los siete principios (no negociables)

1. **Solo existe en pantalla lo que ya se dijo.** Ningún texto aparece antes de que la voz lo diga, ni completo antes de su última palabra. Nada de texto futuro atenuado ni espacio reservado. Atrasarse hasta ~0.16 s está bien; adelantarse aunque sea un cuadro, no.
2. **El texto narrativo aparece, no se anima.** Usa appear puro: opacidad HOLD, sin fade, escala, blur ni desplazamiento. Solo llevan ease el barrido del highlight, el letra por letra, la cámara y la UI (cards, pills, orbe).
3. **Un movimiento focal por beat.** Lo secundario se mueve ≤ 30 % de la amplitud del principal.
4. **El lima escasea.** Úsalo 2–3 veces por pieza, una por acto. Nunca dos highlights en pantalla a la vez. El texto sobre lima siempre es negro.
5. **Premium no rebota.** Sin overshoot ni shake, y nada escala desde 0: entra desde 0.96–0.98. Ningún tween lineal en posición, escala ni rotación. La entrada decelera y la salida acelera; la salida dura ~0.7× la entrada.
6. **La geometría y el color salen del nodo de Figma**, leídos con `use_figma`, nunca de un screenshot. Las alturas tipográficas no se bajan para que algo quepa: se recorta el copy o se rompe la línea.
7. **Nada se da por bueno sin mirarlo en el archivo renderizado.** El read-back dice lo que AE tiene y el frame dice lo que pinta. Ninguno de los dos prueba el MP4: extrae frames del archivo final.

---

## 2. Tokens de marca

### 2.1 Color

| Token | Hex | Uso |
|---|---|---|
| Lima | `#DEFF38` | Highlight y checks. Es el único acento "de marca" en video. El `#E4FE61` de Notion quedó obsoleto |
| Tinta | `#09070F` | Texto sobre lima y sobre fondo claro; bordes y sombras del vidrio claro |
| Grafito | `#0A0A0B` | Fondo oscuro neutro (comps `silia_*`, pantallas) |
| Violeta | `#7A5BF5` (token) / `#8B6FFA` (aurora, highlight de Silia University) | Información real que entra (pills de datos) |
| Rosa | `#F3B9FA` (token) / `#F5A8E0` (aurora) | Acento terciario, solo en el fondo aurora |
| Blanco | `#FFFFFF` | Texto sobre fondo oscuro |
| Gris rejilla | `#767676` al 20 % | Rejilla del mundo claro |

- **Sobre lima: texto negro, siempre. Sobre verde: texto blanco, siempre.**
- Lo que manda es el color exacto del nodo de Figma. Si el board usa `#8B6FFA` en vez de `#7A5BF5`, va el del board.
- Tras el códec, el lima mide `#E0FF40` en el MP4. No es un error de token.

### 2.2 Tipografía

- **ES Klarheit Grotesk**: `ESKlarheitGrotesk-Md` (Medium) y `ESKlarheitGrotesk-Bk` (Book). Medium es el peso más grueso: **no existe Bold**. La jerarquía sale de tamaño y color.
- Nunca uses ABC Monument (es de la web y el producto) ni Inter.
- Antes de crear texto, corre `ae_text action=fonts regex=Klarheit`. AE sustituye fuentes en silencio, y el read-back lo avisa en `warnings`.
- Conversión de Figma a AE:
  - letterSpacing −3 % → tracking −30.
  - lineHeight 92 % → leading 0.92 × tamaño. Es un porcentaje, no px.
  - Medium → `-Md` y Book → `-Bk`.

| Rol | Cuerpo @ 1080 de ancho | Reglas |
|---|---|---|
| **Punch** (frase protagonista) | **Una sola talla por pieza**, típicamente 108–135 px Md, tracking −3 %, leading 0.92–1.10 | Se calcula con la línea más larga: prueba a 120 px y toma el mínimo de `120·936/ancho_línea` entre todas. Máx. ~14 caracteres por línea y 2–4 líneas. El usuario rechazó tres tallas distintas en una pieza |
| Número héroe | 260–300 px Md, −4 % | Un solo número por cuadro |
| Subtítulo | Book 36–38 / 46–48, blanco 72 % (u oscuro 88 % sobre claro) | ≤ 2 líneas; lleva la frase actual, no el bloque |
| Texto de UI | 32–40 px | **Piso 32 px** (11 pt aparentes en un teléfono de 390 pt). Si no cabe, se quita texto; no se achica |
| Etiqueta / meta | 32 px | Contraste ≥ 4.5:1 medido en píxeles del render |

- **Sin sombras en el texto.** Excepción: el nodo de Figma la trae y el cliente la pidió. En ese caso, Drop Shadow con opacidad en escala 0–255 (8 % = 20.4).

### 2.3 Los dos mundos (fondos)

El mundo es una decisión del board. Desde octubre de 2026 las piezas nuevas van en **mundo claro**, y el oscuro sigue vigente cuando el board lo pide.

**Mundo claro** (Cobertura vacante, Siniestro, Forum FS&I):
- Pila de abajo arriba: blanco (`#FFFFFF` o `#F6F6F6`) → grano → rejilla → UI → palabra clave. **La rejilla siempre va detrás de la UI.**
- Rejilla:
  - Líneas de 1 px `#767676` al 20 %, columnas cada 138 px y filas cada 130 px.
  - **En AE pon la opacidad al 40** (`ADBE Grid-0013` = 40). El antialias reparte la línea en 2 px y al 20 % se ve a la mitad. Mide el píxel: objetivo `#E5` sobre blanco.
  - Una sola capa de rejilla continua, nunca una por escena.
- Grano: imagen en mosaico al 12 %.

**Mundo oscuro aurora** (demos de voz, Silia University, Mismo agente):
- Base `#09070F`.
- Seis elipses radiales con blur 170 y stops de alfa 0.78 / 0.35 / 0: `#7B4DE0`, `#B98CFF`, `#3FD98A`, `#7B4DE0`, `#E08A3C`, `#5A3BC4`.
- Grano al 50 %.
- Dos scrims de 1080×760 arriba y abajo, `#05040A` de 0.85 → 0.
- **Un fondo nunca está quieto.** Un still se nota still en 30 s. En AE:
  - `ADBE Turbulent Displace` con Amount 70, Size 700, Complexity 1, Evolution `time*7` y Offset `value+[time*6,time*3]`.
  - Deriva de ±28/±22 px y respiración de ±1 % de escala por seno, con periodos de 16/19/23 s. Sin keys y en loop infinito.
  - Sube la escala base para que la deriva no descubra bordes.
  - El fondo lleva el motion blur apagado.
  - Referencia de la sensación: el fondo de silia.com, que "fluye y respira, nunca salta".

---

## 3. Componentes

Cada componente sigue el mismo esquema: **cuándo**, **especificación**, **receta en AE**, **cómo verificarlo** y **errores ya pagados**.

### 3.1 Highlight lima (el marcador)

**Cuándo:** sobre la palabra o frase que remata la idea. Va dentro de un punch, nunca en un subtítulo. 2–3 por pieza.

**Especificación (canon, decidido el 2026-10-12):**

| | Valor |
|---|---|
| Relleno | `#DEFF38`, **sin borde nunca** |
| Texto encima | `#09070F` (negro tinta) |
| Aire | **Medido sobre la tinta** (`sourceRectAtTime` / `absoluteRenderBounds`), no sobre la caja de texto: **0.24 × cuerpo** a cada lado y **0.16 × cuerpo** arriba y abajo. Ejemplos: a 126 px son 30 / 20 px, y a 300 px son 72 / 48 px. Medir sobre la tinta cubre descendentes como la "q" |
| Radio | **20 px fijo**, sin importar el cuerpo |
| Dirección | Barrido de **izquierda a derecha**; el borde izquierdo no se mueve |
| Arranque | **Apenas se termina de decir lo que resalta**: 2 cuadros después de que aparece la última palabra resaltada, o en el onset de la palabra siguiente si la frase sigue. Con 0 cuadros, la palabra "nace verde" |
| Duración | Proporcional a la raíz del ancho: `frames@60 = round(28·√(ancho_px/476))`. 476 px → 28 f (0.47 s) y 767 px → 36 f (0.60 s). A 30 fps, la mitad |
| Ease | **`sine_in_out`**: arranque suave, llegada suave. Lo pidió el usuario tras probar `power2_out` |
| Reposo | El marcador completo se sostiene **≥ 1 s** antes de que el bloque salga |
| Dos líneas | Un marcador por línea; la segunda arranca 5 f después de la primera |
| Separación | No toca la línea de arriba. Si al crecer roza a un vecino, re-mide y ajusta la fila entera, para que nada salte cuando el marcador entra |

**Receta en AE** (método final de Punto de partida, v14):
1. Mide la tinta de la palabra resaltada.
   - Con `ae_text action=set` sobre la capa: devuelve `bounds`.
   - O, mejor, en una expresión: `sourceRectAtTime()` sobre una copia oculta con el texto completo. Así la geometría se adapta sola si cambia el texto.
2. Crea una **precomp `MARCADOR_<n>` del tamaño de la comp**, para que las posiciones coincidan 1:1. Dentro van:
   - Una shape (`ae_layer_create kind=shape`) con un rect de `[w_tinta + 0.48·cuerpo, h_tinta + 0.32·cuerpo]`, Roundness 20 y fill `#DEFF38`.
     - Ojo: la shape nace con un `Rectangle Path 1` 400×400 y un fill lima. **Configura ese con `ae_property_set`; no añadas otro path.**
   - Encima, una **copia negra** (`#09070F`) de la palabra resaltada, en la posición exacta.
3. Coloca la precomp **justo encima** de la capa de texto original del punch. La reordenas `after` **su propio** texto: con dos marcadores, un `reorder` mal referido deja la lima tapando la palabra de otra línea.
4. Aplica `ADBE Linear Wipe` a la precomp con ángulo **270°** y feather **3**.
   - Con borde duro a ~1500 px/s la esquina redondeada estroboscopea.
   - Transition Completion se mide sobre **el ancho de la comp**: a 1080 px, 1 % = 10.8 px.
   - Anima solo la banda útil: `c_inicio = 100·(1 − x_izq/ancho_comp)` y `c_fin = 100·(1 − x_der/ancho_comp) − 0.3`, donde `x_izq` y `x_der` son los bordes del rect.
   - Con 100 → 0, el 56 % del tiempo era barrido sobre nada y el arranque se sentía tarde.
5. Keys en cuadros enteros (`round(t·60)/60`) con `ae_ease action=preset preset=sine_in_out`.
6. **Por qué precomp + wipe y no dos capas sueltas:** el negro de la palabra solo puede existir donde ya hay lima. Si van sueltas, en el mundo oscuro la palabra negra se ve sobre el fondo durante el barrido. Así sirve igual en los dos mundos.

**Verificar:**
- Extrae **frames consecutivos** del MP4 y mide la x del borde lima en cada uno: el avance debe tener forma de campana (lento, rápido, lento) y no puede haber frames con avance 0 dentro del rango.
- Un frame antes del arranque: palabra completa, sin lima. En el primer frame del barrido ya debe asomar lima visible. Si tarda, el valor inicial de completion deja el borde fuera del rect.
- Mira el marcador **después de su último keyframe**, nunca a mitad del barrido. Un marcador que "cortaba la palabra" estaba simplemente a medio camino, y se llegó a ensanchar un 30 % por error.

**Errores ya pagados:**

| Síntoma | Causa | Arreglo |
|---|---|---|
| El lima se lee como un "pop" | Escala en 10 f con `ease_out_expo` | Usa el barrido de arriba |
| Las esquinas salen elípticas | Se usó un PNG estirado | Usa una shape vectorial |
| Hay lima sin texto encima | Orden de capas | Reordena `after` su propio texto y mira el frame |
| Se ve desproporcionado | Se copió el tamaño de otra fila | Mide la tinta de esa palabra |
| La letra toca el borde | El rect se pegó a la caja de texto | Mide sobre la tinta y aplica 0.24 / 0.16 |
| Llega "medio segundo tarde" | Se esperaba a que terminara la frase | Arranca apenas se dice lo resaltado |

### 3.2 Texto palabra por palabra (el punch)

**Cuándo:** en todo cuadro donde el texto es el protagonista y dice lo que dice la voz.

**Especificación:**
- Cada palabra aparece **en el frame de su onset hablado**, con opacidad HOLD. Sin fade, escala ni desplazamiento.
- **Las palabras ya puestas no se mueven** cuando entra la siguiente. Eso descarta reescribir el source text de una línea centrada, porque se re-centra en cada palabra.
- El bloque entero sale junto, en el corte o al empezar la frase siguiente. Nunca salgas mientras sus palabras se siguen diciendo.

**Receta en AE:**
1. Una capa de texto por línea, con el texto **completo** y colocada según el `rb` de Figma: `position = [rb.x − bounds.left, rb.y − bounds.top]`.
2. Ponle un animador de texto con propiedad **Opacity 0** y un Range Selector:
   - Based On **Words** (`ae_text_animator action=set_selector selector={based_on:"words"}`).
   - Units **Index**, End = número de palabras de la línea.
   - El preset `word_stagger` deja Based On en Lines: corrígelo siempre.
3. Pon keys **HOLD** en el `Start` del selector: `Start = k` en el frame del onset de la palabra k+1. Pasa `interpolation:"hold"` **por key**, porque `ae_keyframes` ignora el global. Después revisa que sean HOLD: si quedan lineales, las palabras se desvanecen.
4. Los onsets salen de `palabras.json` (ms → `frame = round(ms/1000·fps)`, más el offset del bloque en la comp).
5. **No te fíes de Whisper en los bordes de frase.** Adelanta los inicios 0.1–0.4 s tras una pausa y les asigna el silencio a las últimas palabras. Ancla los inicios por energía (envolvente RMS a 10–20 ms) y los finales con `silencedetect=noise=-50dB`.
6. Si la voz no tiene huecos entre palabras (español ligado), reparte las palabras **por sílabas** dentro del tramo hablado, no a tiempos redondos.

**Verificar:** captura a `(f−2)/fps`, `f/fps` y `(f+2)/fps` de cada entrada, sin estados intermedios. Después saca frames del MP4 en cada ancla: la palabra no está en f−1.

### 3.3 Letra por letra (tecleo)

**Cuándo:** solo cuando el board lo dibuja, por ejemplo en aperturas con cursor o en "Días". Por defecto los punches van palabra por palabra.
- No se teclea a 32 px ni en micro-UI: a ese tamaño el tecleo se lee como ruido.

**Especificación:**
- **2 cuadros por letra a 60 fps** (0.033 s).
- Arranca en el onset real de la palabra, y **la última letra aterriza en el frame en que se dice la palabra**.
- En pasajes densos, acumula en vez de relevar: los relevos de 3 f se sienten apurados.

**Receta en AE:**
- Una sola capa por línea con `ae_text action=set_keyframes keyframes=[{time,text:"D"},{time,text:"Dí"},…] clear_existing=true` (HOLD).
- Si el texto está centrado, `justify=center` y AE re-centra solo.
- **Cursor:** una **shape** (no un sólido: escalado se ve borroso) de 8×96, en su propia capa.
  - Posición por expresión: `540 + thisComp.layer("T1").sourceRectAtTime(time,false).width/2 + 14`.
  - Salta con HOLD y nunca se desliza: un cursor que se desliza parece un objeto.
  - Parpadea 32 f encendido y 32 f apagado.
- `ae_text action=legibility` reprueba cada key intermedia por diseño. Lee solo el estado final.

### 3.4 El orbe de Silia (siempre vivo)

**La regla del usuario: el orbe siempre se mueve por dentro.** Un orbe quieto es un error.

**Qué es:** el shader WebGL2 del widget real del producto (`orbe/silia-orb.js` en esta skill). Tiene tres capas:
1. Un campo de luminancia con domain warp sobre fBm, en movimiento.
2. Un anillo de humo blanco, en modo screen.
3. Una rampa de color mapeada **por luminancia**, no por posición. Por eso los colores viajan con las manchas.

No es un efecto de AE ni una expresión: **se renderiza a una secuencia PNG con alfa y se importa**.

**Suites (las cinco medidas; nunca inventes una sexta):**

| Suite | Industria | Stops 0.08 / 0.25 / 0.55 / 0.67 / 0.76 |
|---|---|---|
| `azul` | Seguros y brokers | `#FFFFFF` `#2B90E3` `#5FE3F0` `#2B90E3` `#8ED8EA` |
| `verde` | Finanzas | `#FFFFFF` `#2F9E6B` `#73F359` `#2F9E6B` `#92D232` |
| `naranja` | Logística | `#FFFFFF` `#E0622F` `#FFB057` `#E0622F` `#F5CF7A` |
| `morado` | PPOs | `#FFFFFF` `#7145C9` `#C98AF0` `#7145C9` `#E0A6E8` |
| `amarillo` | Sin asignar | `#FFFFFF` `#C9992F` `#F5E06B` `#C9992F` `#D9E07A`. **Pregunta antes de usarla** |

**Estados** (velocidad interna del shader): idle 0.35 · listening 0.55 · speaking 0.7 · thinking 1.5 · connecting 0.9.
- Usa el que corresponde al beat: idle cuando el agente existe o se detuvo, speaking cuando habla, y thinking mientras analiza.

**Receta:**
1. Render de la secuencia. Necesita node y hyperframes (`npm i -g hyperframes && hyperframes browser ensure`); funciona en Mac, Windows y Linux:
   ```bash
   node orbe/render-orbe-seq.cjs --suite azul --size 1024 --seconds 12 --fps 60 --estado speaking --out ./assets/orbe-azul
   ```
   - El tiempo del shader es función pura del frame, así que la secuencia es seek-safe y reproducible.
   - **Renderiza la duración completa en cámara.** Es mejor que un loop.
   - Si necesitas dos resoluciones (por ejemplo, gigante a 1885² y chica a 512²), usa el **mismo `--t0` y `--estado`** en las dos: el cambio de fuente es invisible.
2. Importa con `ae_items action=import` y ajusta la escala.
   - El PNG mide 1.45× el disco: ese aire es el halo. **Nunca recortes el lienzo a la esfera**, o el halo se corta en cuadrado.
   - Diámetro visible del disco = `size/1.45 × escala`.
3. Si no queda más remedio que hacer loop, usa ping-pong por time-remap:
   - `d=(N-1)/fps; t=time%(2*d); t>d ? 2*d-t : t` con **N−1**: el último frame válido es N−1.
   - Con `N/fps`, la cima pide un frame que no existe y parpadea.
4. **Entrada:** opacidad 0→100 + escala 97→100 %.
   - Como héroe: 700 ms (42 f) con `ease_out_expo`.
   - Como elemento de UI: 400 ms con `ease_out_quart`.
5. **Mientras está en cámara no le pongas tweens de "respiración" encima.** El shader ya es la vida.
   - Si el usuario pide más presencia, el máximo es ±0.6 % de escala con periodo de 9 s, keys `{55,55,speed 0}`.
   - Verifica muestreando que la curva no rebote.
6. Para atar un glow o halo al orbe usa una expresión, no keys duplicadas: `k=100/<base>; o=thisComp.layer("orbe").transform.scale[0]; [o*k,o*k,100]`.
7. **Glow nunca a 0.** Su piso es 8–10 %, o funde la capa entera.
8. Si el orbe es el único sujeto del cuadro, va centrado.

**Orbe reactivo a voz** (demos de llamada): es el mismo shader, manejado por la envolvente RMS del audio y construido en HyperFrames, no en AE. Ver la skill `demo-agente-voz`.
- Ahí **no lleva respiración decorativa**: el audio es su vida.
- Techo de actividad: ×0.55. A 1.0 se lava a blanco.

**No uses:**
- `orb.png` con la "S": es un placeholder del brandbook.
- Las exportaciones viejas de `agent-widget/export/orbe/`: tienen otra paleta.
- El "Liquid Orb / Opal" brillante tipo planeta: obsoleto, y no es seek-safe.
- Cualquier esfera CGI brillante como símbolo de "IA".
- Los "planetas" mate de la web: son otro objeto.

### 3.5 Vidrio, cards y UI escenificada

**Vidrio claro** (mundo claro):
- Relleno: blanco al 72 %, blur 40.
- Borde: 2 px `#09070F` al 10 %.
- Sombra: `#09070F` al 10 %, offset 0/24 y blur 64.
- **Radio 40**, padding 48, y 72–96 px entre bloques. Nunca un gris plano.
- Texto: `#09070F` al 100 / 55 / 40 % según jerarquía, pasando WCAG.
- Prohibido en mundo claro:
  - Cards o pills negras.
  - Pills dentro de una ventana: vidrio sobre vidrio se ve sucio.

**Vidrio oscuro** (sobre aurora):
- El blanco al 5 % falla: mide 1.12:1 contra el fondo, bajo el piso de figura/fondo de 1.5:1.
- Escala de superficies que pasa:

  | Superficie | Blanco al |
  |---|---|
  | Card | 16 % |
  | Fila seleccionada | 18–28 % |
  | Tiles y campos | 22 % |
  | Pills | 26 % |
  | Chips y avatares | 18–20 % |

- Texto encima al 78–100 %.
- El contraste se corrige en dos pasadas: superficie primero, texto después.

**Cards apiladas o superpuestas: opacas, nunca vidrio**, porque la translucidez muestra bordes fantasma. Se solapan 24 px.

**Entrada de un elemento de UI** (card, pill, toast, fila):

| | Valor |
|---|---|
| Entrada | Opacidad 0→100, escala 97→100 %, Y +24→0 · **300 ms (18 f @60) `ease_out_quart`** |
| Salida | 210 ms (13 f) **`power2_in`**, escala → 98 % |
| Stagger | 120 ms (7 f) para 2–3 ítems · 90 ms (5 f) para 4–6 · 60 ms (4 f) para 7+. Menos de 60 ms se lee "simultáneo" |
| Orden | Contenedor → cuerpo → datos → acción |
| Motion blur | On |
| Checks | Lima, 44 px; se dibujan con trim path en 14 f |
| Toast | Y +48 con `ease_out_expo` |
| "No" | Caída de opacidad 40→26→40 en pasos de 167 ms. Sin shake |

- Texto que entra dentro de la UI: la entrada confirmada de marca, opacidad + Y +18→0 en 0.32 s con `power3_out`. Es la de `silia_type` / `silia_lower_third`.
- **La UI tampoco revela el futuro:** un contenedor crece con su texto, y un feed avanza línea por línea.
- Los números cuentan con la voz y aterrizan en la palabra.
- **Énfasis entre KPIs iguales:** `zoom_punch` del tile, 100→109→100 % en 0.33 s. No subas el tamaño del número.
- **Colores con significado:**
  - Vidrio sin texto = flujo conceptual.
  - Violeta = información real que entra.
  - Lima = el remate, nada más.
- Campos sensibles: se enmascaran con puntos, no se borran. No inventes componentes ni pongas logos o interfaces reales de terceros.

### 3.6 Subtítulos

- **Ponlos solo donde el texto en pantalla no dice ya lo mismo.** Si el punch es la voz, no hay subtítulo.
- Aparición acumulada por palabra (`silia_captions mode=accumulate_turn`, o HOLD de source text), siempre detrás de la voz.
- Book 36–38 / 46–48, blanco al 72 % (sobre claro, tinta al 88 %). Centrados.
- **≤ 2 líneas**: llevan la frase actual, no el bloque entero. Se limpian cuando cambia el bloque.
- Posición en vertical: dentro de la franja 4:5 (ver §4), alrededor de y 1467–1563.
- Un subtítulo que cambia en cada paso es ilegible: en una pieza, 6 de 10 no se podían leer.

### 3.7 Grabaciones de pantalla: pantalla fija, cámara dentro

- La pantalla es **un solo objeto** sobre un fondo de marca: mismo tamaño, misma posición y radio 24. Va con sombra suave (0/24/64) o profundidad por capas.
- **Solo se mueve la cámara dentro de ella.** Cambiar el recorte por plano parece un collage.
- Un encuadre por plano, con deriva lenta (`sine_in_out`) y un solo push de vista general a detalle. Corte seco solo al cambiar de paso.
- Magnificación máxima: 1.6×.
- Sin disoluciones largas entre encuadres (dejan doble fantasma).
- **Para señalar algo:** contorno lima de 7 px y radio 28, **solo el contorno**. Entra en 0.35 s desde escala 103 % con `power3_out`. Oscurecer el resto de la pantalla hacía parpadear el video.
- Censura solo el texto, card por card, nunca bloques enteros.
- Bajo el video con máscara, un rect oscuro 1 px más grande evita que la esquina antialiaseada deje pasar el fondo.

### 3.8 Cámara y transiciones

- **Un movimiento de cámara por beat, y nunca se deshace** (nada de ida y vuelta pull-out / push-in).
- **Tilt o paneo dentro de un lienzo alto** (el mundo como una sola comp larga): 0.5 s `power3_in_out` con motion blur, siempre idéntico. "Se entra empujando, se recorre bajando, se abandona retrocediendo." Sin cámara 3D.
- **Push 2.5D sobre un plano:** `silia_push_25d amount_pct=4.5–6`. Precompone a 2× para tener movimiento subpíxel. Dos planos seguidos del mismo set continúan el mismo push (1.000 → 1.045 → 1.105).
- **Camera-follow sobre una palabra que entra:** escala 100 → 103 → 106 %, 0.40 s por movimiento con `ease_out_quart`, encuadrando la palabra nueva y volviendo a 100 % en la última.
- **Transición entre actos:** disolvencia de 0.6 s con `power2_in_out`. Los pull-out abruptos y los paneles que "inundan" rápido se leen como un flash.
- Recorrido largo de un elemento: `power3_in_out` (por ejemplo +630 px en 0.85 s). Los recorridos de más de ~1.3 s se sienten lentos.
- **Gesto continuo** (arrastre, barrido): en los keys intermedios usa velocidad continua (`inSpeed = outSpeed ≠ 0`), porque los presets frenan a 0 en cada key. Revisa también que los tramos descendentes no reboten (ver `ae-motion`, tangentes sin signo).

### 3.9 Presentador y mattes

- Todo texto que cae sobre el presentador va **detrás** de él, salvo que el z-order de Figma lo ponga delante.
- Matte: la silueta (rembg `isnet-general-use`, que conserva el pelo) como **luma matte invertido**. Verifica la polaridad con un frame, y revisa 3 frames seguidos donde una letra cruce el pelo.
- **Cortes de toma:** alterna planos ×1.25 ↔ ×0.95 en vez de un zoom digital de 100 a 115 %. Ningún borde del video fuente puede quedar dentro del 4:5.
- Jump cuts sobre fondo estático: xfade de 8 cuadros centrado en el corte.

### 3.10 Outro

- **Assets:** `outro-vertical.mp4` (1080×1920 @ 30, 5.5 s, con 0.133 s de negro propio) y `outro-horizontal.mp4` (con 0.17 s de negro propio). Úsalos tal cual, sin recortarlos.
- **El master va a 60.000 fps, no a 59.94.** Así el outro de 30 se duplica exacto.
- **Cruce de 0.6 s.** **Regla: negro de relleno + negro propio del outro ≥ cruce.** Si no se cumple, el destello del logo se forma sobre la cara del presentador. El número exacto lo da `motion://hechos-medidos` (`requiredFillerBlackSec`); no lo copies de otro proyecto.
- Construcción: precomp `OUTRO` = sólido negro de relleno + outro desde el fin del relleno. Opacidad 0→100 en el cruce. El audio del outro va con el mismo retardo, de −60 a 0 dB.
- Feedback del usuario: la salida al outro tiene que ser corta y suave (cruce a negro de 0.4 s con `power2_in_out`).
- **El logo vive en el outro.** En los cuadros, el logo solo aparece en portada y cierre. Si sigue un outro, el último plano no lleva logo: cierra con punch + orbe.
- Verifica **mirando** frames a lo largo del cruce (inicio, +0.3, +0.6 y +0.9 s). La luma máxima no sirve.

### 3.11 Audio

- **Entrega:** −14.0 ±0.5 LUFS integrado, TP ≤ −1.0 dBTP, 48 kHz. Usa `loudnorm` **dinámico a dos pasadas**: el lineal no limita y clipea. Ponlo **antes** del `atrim`, porque su lookahead acorta el stream.
- **Cama musical:** ~13 LU bajo la voz, con sidechain (ratio 4, attack 40 ms, release 600 ms), fade-in de 1 s y fade-out de 3 s. Estilo pedido: lounge / bossa / lobby.
- **SFX = la UI suena:**

  | Sonido | Dónde | Pico |
  |---|---|---|
  | Click | Por letra tecleada | −23 dBFS |
  | Pop | Entrada de componente | −24 |
  | Swish | Salida de palabra clave | −26 |
  | Whoosh | Transición | −25 |
  | Tick | Cada highlight | — |

  Nada de "bocinas" (el chime fue rechazado). Los dings derivan de la familia de campanas del outro, y dos dings no pueden ser iguales.
- La compuerta de audio mide nivel y LUFS, no solo alineación: una entrega pasó con impactos 28 dB por debajo.

---

## 4. Formatos y zonas seguras

| Marca | Formatos |
|---|---|
| Silia | 9:16 (IG) + 4:5 (LinkedIn) + 1:1 (Facebook). **El 1:1 lleva su propio layout**; no sale del recorte |

- **Máster único 1080×1920 @ 60.000 fps**, H.264 con faststart. El 4:5 se recorta del mismo render en **y 285–1635**, así que **todo el contenido vive en esa franja**.
- **Instagram tapa** y > 1650, y además x > 912 desde y 1330 hacia abajo. Nada importante ahí.
- Title-safe 80 %: insets de 108 / 192 px en vertical y 192 / 108 en horizontal. Elementos a ≥ 72 px entre sí, o a sangre a propósito.
- **Ritmo de planos:** 2.5–4 s por plano. Ningún hold de más de 1.5 s sin que algo cambie (la regla de silencio la verifica `silia_board_review`).

---

## 5. Prohibido (cada línea fue un rechazo real)

- Texto futuro en gris o espacio reservado para lo que viene.
- Fade, escala o desplazamiento en el texto narrativo (es appear puro).
- Escalar desde 0, rebotar, hacer shake o usar overshoot.
- Usar el lima como decoración, o tener dos highlights en pantalla a la vez.
- Highlight hecho con un PNG estirado, o con borde.
- Orbe quieto, sexta rampa de color, o el orbe brillante tipo planeta.
- Glassmorphism en cards apiladas.
- Spotlight que oscurece la pantalla.
- Indicador de "escribiendo…" (lenguaje de chatbot).
- Tres tallas de punch en una pieza.
- Texto por debajo de 32 px.
- Contraste bajo WCAG (4.5:1, o 3:1 en texto grande).
- Logo en cada cuadro, o un logo inventado.
- Iconografía genérica de "IA", candados o símbolos religiosos o políticos.
- Texto legible dentro de clips de IA (se repone desde el still).
- Pull-out + push-in de ida y vuelta.
- Línea que pasa por detrás de pills.
- Cursor que se desliza.
- Disoluciones largas entre encuadres de pantalla.

---

## 6. El flujo en una línea

**Board de Figma** → `revisor-storyboard` (subagente) → `PLAN-ANIMACION.md` aprobado (con los conflictos numerados contra este canon) → construir (`ae-motion` + este canon) → `ae_frame action=critique` (dos pasadas como máximo) → render → compuertas (`video-desde-storyboard` §6) → `auditor-entrega` (subagente) → `POSTMORTEM.md`.

**Cómo cambia este canon.** Cuando el usuario corrige algo de marca ("el highlight entra tarde", "el orbe está muerto"), la corrección se escribe **aquí**: la regla nueva en su componente, y el porqué en la columna de errores. Además se anota en el postmortem del proyecto. Un número que se puede medir va en `src/motion/measured-facts.ts`, y este documento lo cita. Si el cambio no llega aquí, el siguiente video vuelve a cometer el error.

**Si un caso no está cubierto**, decide con `motion-intelligence` (registro `product_video`, arquetipo Premium), anótalo en el plan como decisión nueva y propón agregarlo aquí.

Procedencia de cada regla (proyecto, archivo y fecha): `references/fuentes.md`.
