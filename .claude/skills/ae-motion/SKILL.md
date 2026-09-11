---
name: ae-motion
description: Motion graphics en After Effects desde Claude vía el MCP `ae`: construir comps y capas on-brand Silia (lower thirds, títulos, captions sincronizados desde transcript, push 2.5D, grade, outro), animar con easing correcto, verificar con frames renderizados y con `ae_frame action=critique`, renderizar con aerender y entregar MOGRT/alpha a Premiere. Usar cuando la tarea pida "After Effects", "AE", "MOGRT", "lower third", "captions en AE", "regenerar el outro", "push 2.5D", "exportar con alpha para Premiere". Los números del motion (registros, easings, staggers, legibilidad) están en `motion-intelligence`; el flujo storyboard Figma → video en `video-desde-storyboard`.
---

# AE Motion (Silia) — cómo trabajar con el MCP `ae`

## Antes de tocar nada
1. `ae_status` — confirma bridge vivo, versión de AE, proyecto abierto, comp activa. Si `connected:false`: **After Effects 2026 tiene que estar abierto** (la extensión CEP arranca sola con AE; no hay nada que lanzar a mano). Si sigue sin conectar: `node dist/index.js --doctor`. Un `ENGINE_BUSY` no es desconexión: es un diálogo modal (ver gotchas).
2. `ae_checkpoint action=create label="..."` antes de cualquier edición de varios pasos sobre un proyecto real.
3. Leer `silia_tokens action=get` una vez por sesión: colores (Lime `#DEFF38`, texto sobre lime siempre negro), fuente de video **ESKlarheitGrotesk-Bk/-Md** (no ABC Monument), formatos, duraciones y eases.
4. Decir el **registro** (`product_video` por defecto; `functional_ui` para UI que se opera) antes del primer keyframe. Si hay que decidir duración/ease/stagger: `silia_tokens action=plan_motion intent=… distance_px=… item_count=… fps=…`.

## Dos modos de trabajo (Mode A / Mode B)
| Modo | Cuándo | Cómo |
|---|---|---|
| **A — live** | ≤ 5 operaciones, exploración, ajustes finos | una tool por operación; leer el read-back de cada una; mirar frame |
| **B — batch** | > 5 operaciones, construcciones repetibles (N capas de texto, N cards) | `ae_batch ops=[{tool,args},…] on_error=rollback` → un round trip, un reporte, deshacer en un gesto |
| **B+ — script** | lógica nueva que se va a repetir en otros trabajos | `ae_execute_extendscript` (requiere `AE_MCP_ALLOW_RAW=1`, `confirm=true`; API en `ae://sdk/{object}`) → si funciona, `ae_tool_library action=save` + `action=promote` → queda como tool `lib_<nombre>` |

## Loop de trabajo (siempre igual)
planear números (`plan_motion`) → construir → leer el read-back de cada mutación → **mirar** (`ae_frame action=capture|contact_sheet`) → **criticar** (`ae_frame action=critique register=… intent=…`: aplicar solo los `fix` numéricos de `failed`, re-criticar **una** vez, juzgar `unverifiable` en las dos imágenes, parar) → **legibilidad** (`ae_text action=legibility` en cada texto; `silia_captions` ya devuelve `warnings` de legibilidad) → `ae_project action=save`.
Nunca dar por bueno un cambio sin verlo: el read-back dice lo que AE tiene; el frame dice lo que AE pinta; el critique dice si los números están en banda. Detalle del loop y de cómo leer contact sheet / onion skin: `motion-intelligence` §4–5.

## Recetas

**Comp on-brand**: `silia_comp name format=h1080p30|v1080x1920p60|v1080x1920p30 guides=true`.

**Lower third**: `silia_lower_third comp name role variant=lime|violeta|rosa|dark in_time duration position=left|right` → `ae_frame capture time=in+0.4`. El texto va parentado a un null "LT ctrl"; mover el null mueve todo.

**Título / kinetic**: `silia_type action=title text sub` (entrada confirmada: opacidad 0→1 + Y +18→0, 0.32 s, power3_out) · `silia_type action=kinetic text` (letter stagger 0.032 s/letra).

**Captions desde transcript**: `silia_captions action=preview path=<palabras.json|turns-timed.js>` (detecta ms vs s; reporta overlaps) → `action=build comp mode=accumulate_turn time_offset=<inicio del audio en la comp>`. Regla: en pantalla sólo lo ya dicho (accumulate_turn). Verificar 3 frames en tiempos de palabra y leer `warnings` de legibilidad (≤ 42 chars/línea, ≤ 2 líneas, ≤ 17 CPS, 5/6–7 s).

**Push 2.5D en un still**: `silia_push_25d comp layer amount_pct=5 direction=in` (precompone a 2x para movimiento subpíxel) → contact sheet a 0/50/100 %.

**Grade retro en cabeza de plano**: `silia_grade comp layer look=retro_90s hold_sec dissolve_sec` (ajuste sobre la capa, se disuelve a 0).

**Easing por nombre**: `ae_ease action=preset layer path preset=<cualquier nombre de motion://tokens/easings>` (`ae_ease action=list` los agrupa por fuente); `action=from_cubic_bezier bezier={x1,y1,x2,y2}` para una curva ajena. Overshoot: `ae_expression action=set library=inertia params={amp:0.06,freq:3,decay:6}` (back/elastic no son un bezier). `ae_expression action=library_info` describe cada entrada con rangos.

**Outro**: `silia_outro action=plan aep=<Outro_Precomp_original.aep> orientation=both` → revisar `willDisable` (footage faltante directo) y `nestedMissingLayers` (footage faltante dentro de precomps; verificado 2026-09-03: `Slow Grunge 1` tiene 4 texturas faltantes y es la capa que renderiza blanco opaco; `SiliaLogo_Precomp` tiene 2 faltantes pero el logo es vectorial y debe quedarse) → `action=render disable_layers=["Slow Grunge 1"]` → `ae_render action=status job_id expect={headBlackSec:0.43,...}`. El plan tarda ~40–100 s: el .aep pesa 31 MB, tiene 115 items faltantes y AE muestra 2–3 diálogos informativos que el server responde solo.

**Render**: `ae_render action=start comp output om_template="H.264 - Match Render Settings - 40 Mbps" wait_ms=45000` (aerender en segundo plano, nunca bloquea AE) → `status` hasta `done`; leer `verify` (duración, fps, tamaño, alpha, head black, luma). Para alpha: `om_template="Lossless with Alpha"` (.avi) o `"TIFF Sequence with Alpha"`.

**MOGRT → Premiere**: `ae_mogrt action=add layer path name` por cada control → `action=set_template_name` → `action=validate` → `action=export mogrt_path=…` (el aviso de fuentes no-Adobe se responde solo) → `ae_handoff action=mogrt` devuelve la llamada exacta `import_mogrt` para el MCP `premiere-pro`; después **verificar con `get_full_sequence_info`** (el conector de Premiere reporta éxitos que no ocurrieron).

**Versiones por datos**: `ae_versions action=plan spec={template:{comp}, assets:[{layer,type,value:"{{campo}}"}], variants:[{id,campo}], output:{dir,name_template}}` → `action=run` → `action=status run_id`.

**Script a medida**: `ae_execute_extendscript` (requiere `AE_MCP_ALLOW_RAW=1` en el server) → si funciona, `ae_tool_library action=save` + `promote` para tenerlo como tool `lib_<nombre>`.

## Gotchas (cada fila costó un ciclo de debug)
| Síntoma | Causa | Qué hacer |
|---|---|---|
| Llamadas devuelven `ENGINE_BUSY` | Un diálogo modal en AE bloquea el motor de scripting | `ae_dialogs action=list` → leer el texto → `ok`/`cancel`. La exportación MOGRT ya responde sola al aviso de fuentes |
| `EMPTY_RESULT` en un script propio | Error de sintaxis ES3 (palabra reservada como `native`, coma final, arrow function, `[^/]` en regex) | Renombrar/ajustar; el validador ya frena las palabras reservadas |
| `ae_render` se queda en `running` sin progreso | aerender con consola oculta / entorno mínimo / .aep abierto en la GUI | Ya resuelto en el server (consola visible, entorno completo, copia byte a byte). Si reaparece: `ae_render action=list` y matar `aerender.exe` |
| Fuente distinta a la pedida | AE sustituye en silencio | El read-back de `ae_text` / `silia_*` trae `warnings` con la sustitución |
| Frame capturado con bordes negros | `saveFrameToPng` con alpha | `ae_frame` aplana sobre `#0A0A0B` por defecto; pasar `background=null` sólo si se necesita alpha |
| El texto queda debajo de la tarjeta | Orden de apilado al crear capas | `ae_layer_update action=reorder to=top` sobre el texto; las tools `silia_*` ya lo hacen |
| Posición/escala 2D devuelve 3 valores | AE reporta arrays 3D también en capas 2D | Normal; ignorar el tercer valor |
| `save_copy` deja el proyecto apuntando a la copia | El proyecto nunca se había guardado | Guardar primero con `ae_project action=save path=…` |
| El critique no ve una animación | Está hecha con expresión, y `keyframe_dump` lee keys | Juzgarla en las imágenes (onion skin) o pasarla a keyframes |
| Stagger de 20 ms "no hace nada" a 24/25 fps | < 1 frame | Mínimo real 40 ms; ver tabla de frames en `motion-intelligence` §3 |
| Colocar un texto exactamente donde lo dibuja Figma | La posición de AE es el origen de la línea base, no la caja de tinta | `ae_text action=set` (aunque no cambie nada, p. ej. `tracking` igual) devuelve `bounds` = `sourceRectAtTime`; posición = `rb_figma − bounds.leftTop`. Textos centrados: `justify=center` y `position.x` = centro de la caja de Figma |
| La sombra queda casi opaca | `ADBE Drop Shadow-0002` (Opacity) va de 0 a 255 aunque la UI muestre % | 8 % de Figma = 20.4; dirección 180° = hacia abajo; suavidad ≈ 2× el blur de Figma |
| `ae_precompose` falla con "Can not set moveAllAttributes to false" | AE sólo permite `false` con UNA capa | Con varias capas el server ya fuerza `true` (a68f57f) |
| `ae_layer_create kind=footage` fallaba sin `duration` ("parameter 2 undefined") | `layers.add(item, undefined)` | Corregido en a68f57f; en servers viejos pasar `duration` |
| Al abrir AE el bridge no aparece y el log CEP dice "Signature verification failed" | Las claves `HKCU\Software\Adobe\CSXS.*\PlayerDebugMode` desaparecieron (pasó el 2026-09-03) | `node dist/index.js --install-cep` las restaura (nunca `--unsigned`: desde 2026-09-08 AE 2026 rechaza el bundle sin firma); reiniciar AE. Si AE muestra "Crash Repair Options", el botón por defecto es **Continue** (Enter); nunca Safe Mode, que desactiva extensiones |
| `ae_render` termina con "out of disk space" (error 6662) y un .mp4 de 24 bytes | La caché de disco de AE (tope por defecto 93 GB, en `%TEMP%\Adobe\After Effects\26.3\Disk Cache…`) se llena con el render: ~8.3 MB por frame 1080×1920 | `lib_purge_caches max_gb=15 min_free_gb=20` (purga y baja el tope), comprobar espacio libre con `Get-PSDrive C` y relanzar. Un render de 60 s a 60 fps necesita ~30 GB libres |
| `use_figma` devuelve "Failed to parse SSE message" | Respuesta grande o con saltos de línea/caracteres raros en los strings | Volcar 2–3 frames por llamada y sanear strings a ASCII (`scripts/figma-dump.js` del skill `video-desde-storyboard`) |
| `ae_layer_update action=duplicate` devuelve "Object is invalid" y **no duplica** | En este puente AE renombra la capa origen a `<nombre> 2` en vez de crear una copia | Construir la segunda capa desde cero. Comprobar siempre con `ae_layer_query action=list filter.nameRegex` (el `numLayers` de la comp lo delata) |
| `ae_layer_update action=delete` devuelve "Object is invalid" **pero sí borra** | El read-back se hace sobre la capa ya eliminada | Ignorar el error y verificar con `ae_layer_query action=list` |
| Una shape creada con `primitives:[{stroke}]` y sin `fill` sale con **relleno lima** | `ae_layer_create kind=shape` añade siempre el fill por defecto | Poner `ADBE .../ADBE Vector Graphic - Fill/ADBE Vector Fill Opacity` a 0 después de crearla |
| `group_path` apunta al grupo equivocado con dos grupos en la misma capa | Los dos comparten matchName `ADBE Vector Group`; el path resuelve al primero | Borrar el grupo sobrante primero; el que queda ya es direccionable como `ADBE Vector Group` |
| `ae_comp action=create` ignora `motion_blur` | Sólo lo aplica `action=update` | Crear la comp y acto seguido `ae_comp action=update motion_blur={enabled:true,...}`; el read-back del create lo delata (`motionBlur:false`) |
| Los read-backs de `ae_shape` pesan ~7 k tokens cada uno | Devuelven el árbol completo con Material Options | No llamar `ae_shape action=list` salvo para descubrir un path; en construcciones largas encadenar add_path/add_stroke/add_trim sin listar |
| El caption va medio segundo por detrás de la voz y los tiempos de Whisper "cuadran" | Whisper reparte mal las palabras finales de una frase: les asigna el silencio posterior. Medido: decía "ellos." en 16.68–17.52 cuando la voz termina en 16.534 | Anclar **las últimas palabras de cada frase** contra `ffmpeg -af silencedetect=noise=-50dB`, no contra el JSONL de palabras. Whisper sólo es fiable dentro de un bloque de habla continuo |
| `ae_keyframes` acepta tiempos fuera de la rejilla y el volcado los muestra redondeados | El dump imprime `frame: 106` para t=1.763314 (=105.80 f); sólo `critique` los delata como `timing.whole_frame` | Escribir siempre `round(t*60)/60`; verificar con `ae_frame action=critique`, no con `keyframe_dump` |
| `ae_text action=legibility` reprueba todo un texto tecleado | Mide el hold de **cada** keyframe de source text; en un typewriter cada letra dura 2–3 cuadros por diseño | Leer sólo la última muestra de cada capa (el estado en reposo) y la regla `min_font_size`; ignorar `reading_speed` / `min_sec_per_word` / `hold_after_rest` en las intermedias |
| `critique` reprueba `stagger_in_band` y `sequence_cap` en una fila anclada a voz | Mide el delta entre primeras keys de capas consecutivas sin saber que son **beats** distintos (A3.1 → A3.2 → A3.3) | Aplicar el fix sólo dentro de un mismo beat; los saltos de 1–2 s entre beats son las anclas de la voz y no se tocan |
| `set_time_remap enabled=true` y luego `ae_keyframes` falla con "the property or a parent property is hidden" | El tool habilita el flag pero **no crea las dos keys** que AE pone normalmente; sin keys la propiedad no es escribible | Para cuadrar un evento interno de un clip contra un beat, usar `set_timing` con `stretch` + `start_time`: `stretch = (t_beat − t_in) / t_evento_en_el_clip`. Más simple y sin keys |
| Al parentar, el hijo sale con una escala rara (104.17 %) | AE preserva la transformación en mundo: si el padre está a 96 % en ese instante, compensa el hijo | Después de `set_parent`, reponer `scale = 100` en el hijo (y comprobar posición) |
| **Una propiedad que baja (escala hacia 100, opacidad hacia 0) hace un rebote a mitad de camino** | Los presets de ease calculan la tangente **sin signo**: en un tramo descendente meten una `outSpeed` positiva y la curva sube antes de bajar | Verificar **muestreando el valor**, no leyendo el read-back del keyframe: `ae_property_get action=value at=<t>` en 6–8 tiempos y comprobar que sea monótona. Si rebota, usar un solo tramo o poner las tangentes a mano |
| `ae_keyframes action=set` deja keys viejos en medio | **`set` añade, no reemplaza** | `action=remove` con `indices:[…]` o `all:true` **antes** de escribir los nuevos |
| El preset `word_stagger` entra la línea entera de golpe | Deja el selector en `basedOn: 4` = **LINES**, no words | `ae_text_animator action=set_selector selector={based_on:"words"}` |
| El escalonado del preset va 3× más rápido de lo pedido | Mete todo el barrido dentro de `duration_per_unit` e **ignora `stagger`** | Re-cronometrar a mano los keys de `…/ADBE Text Selector/ADBE Text Percent Offset` |
| Tecleo en vivo (efecto máquina de escribir) | El animador de texto con selector es frágil para esto | **Keys HOLD de source text** (`ae_text action=set_keyframes`), un carácter por key, y el cursor en capa aparte con expresión `thisComp.layer("T1").sourceRectAtTime(time,false).width`. Con `justify=center` AE re-centra solo. Más simple y más robusto |
| Zoom sobre texto que crece: se recorta por los lados | La escala va por tiempo y no sabe cuánto mide el texto | Que el **ancho mande la escala**: capa de texto oculta `MEASURE` con el mismo tecleo, y `escala = ancho_objetivo / sourceRectAtTime().width`. Ojo: **promediar** el ancho hace que la escala vaya por detrás y siga cortando; **anticipar** el máximo futuro no corta pero mata el arranque en grande. Usar el ancho **actual** |
| `ae_layer_create kind=shape` sale con un rectángulo lima | La capa nace con `Rectangle Path 1` 400×400 + `Fill 1` lima; `ae_shape action=add_path` **añade otro path** en vez de configurar ese | Configurar el que ya viene por `ae_property_set`, no añadir |
| `PROP_NOT_FOUND` al escribir una propiedad de forma | `ae_shape action=list` imprime rutas relativas a Contents | Prefijar con `ADBE Root Vectors Group/…` |
| Una comp creada desaparece después de renderizar | El render puede devolver el proyecto al **último guardado** | `ae_project action=save` después de **cada** cambio estructural, no al final del bloque |
| Nombres de parámetro que fallan si se adivinan | — | `item` resuelve **por nombre**, no por id numérico · `ae_property_set` toma `sets:[…]` · `set_blend` usa `blend` · `ae_effect action=apply` usa `name` (`effect` es para apuntar a uno existente) · `ae_keyframes remove` usa `indices` · `ae_property_get` usa `action=value` · `ae_comp` recibe `motion_blur` como **objeto** `{enabled,shutter_angle,shutter_phase}` |
| `set_timing` devuelve la capa **sin cambiar** in/out | Los parámetros son `in_point` / `out_point` (`in`/`out` se ignoran en silencio) | Leer el read-back: si `inPoint`/`outPoint` no se movieron, el nombre estaba mal |
| `ae_keyframes action=clear` → `Unknown action` | No existe `clear` | `action=remove all:true`, o `action=set clear_existing:true` con **una** key (sirve para dejar un valor constante) |
| Leer una expresión / medir un texto | `ae_property_get` sin `action` da `BAD_ARG`; `ae_text action=get` devuelve `bounds` **al tiempo actual** (con tecleo, el ancho del texto parcial) | Expresión: `ae_expression action=get`. Medidas: capa de texto oculta con el texto completo y `sourceRectAtTime()` **dentro de la expresión** (así la geometría del highlight de "adapta" no lleva números a mano) |
| `contact_sheet` de una comp anidada pesada devuelve frames de **otros tiempos** (mezclados) | Escritura asíncrona de `saveFrameToPng` bajo carga; el de una comp ligera salió bien | Cualquier cosa rara en un sheet: repetir con `capture` **individuales** antes de "arreglar" la animación (aquí eran correctas) |
| El grid (`ADBE Grid`) a la opacidad de Figma se ve a la mitad | El borde de 1 px se reparte en 2 px por antialias | Duplicar la opacidad (Figma 20 % → `ADBE Grid-0013` 40) y **medir el píxel** de la línea: objetivo `#e5` sobre blanco |
| `ae_comp update motion_blur=true` no hace nada | Es un objeto | `motion_blur={enabled:true, shutter_angle:180, shutter_phase:-90}` |
| Texto que se vuelve negro solo donde entra un bloque lima | Un solo texto no puede tener dos colores por zona | Dos shapes lima idénticas (mismas expresiones y keys): una visible debajo del texto blanco; la otra como `set_matte matte_type=alpha` de una **copia negra** del texto encima. AE oculta sola la capa matte |
| Gradiente de fondo (PNG estático) que "viva" como en silia.com | Un still se nota still en 30 s | `ADBE Turbulent Displace` en la capa: Amount 70, Size 700, Complexity 1, Evolution `time*7`, Offset `value+[time*6,time*3]`; más deriva `±28/±22 px` y respiración `±1 %` de escala por seno (periodos 16/19/23 s, sin keys, loop infinito). Subir la escala base para que la deriva no descubra bordes; Pinning por defecto (3) los deja fijos |
| Frames extraídos del MP4 con `ffmpeg -ss t -i …` muestran contenido de **antes** de t | Seek de entrada impreciso con H.264 a 60 fps (aquí hasta 3 s antes) | Seek de salida: `ffmpeg -i in.mp4 -ss t -frames:v 1 …` (más lento, exacto). Verificar con una serie densa antes de "arreglar" la animación |
| `ae_layer_update action=delete layers=[a,b,c]` borra **solo la primera** y devuelve "Object is invalid" | El error de la primera corta el bucle | Un `delete` por capa (cada uno dice "Object is invalid" y sí borra); confirmar con `ae_layer_query list filter.nameRegex` |
| `ae_keyframes action=offset` → `dt required` | El desplazamiento se llama `dt` (segundos), no `offset` | `{action:"offset", layer, path, dt:1.5667}` |
| El bloque lime tapa la palabra de la línea 1 cuando hay dos punches en dos líneas | Dos `reorder to=after reference=X` seguidos: el segundo empuja al primero **encima** de su texto | Reordenar cada bloque `after` **su propio** texto (`hl_persona` after `p_persona`, no after `p_correcta`) y mirar el frame: en A4.4 la lima salía sin texto |
| `set_timing in_point=X` mueve también los keyframes | Cambiar solo `in_point` **desplaza la capa** (start time), no la recorta | Pasar `in_point` y `out_point` juntos y reescribir los keys absolutos después; comprobar `outPoint` en el read-back |
| Sacar una imagen de Figma para AE (avatar, logo) | `exportAsync` + base64 en `use_figma` se trunca a 20 kb y transcribirlo a mano corrompe el PNG | `get_screenshot` del **nodo** con `contentsOnly=true` → `curl` del PNG (conserva alfa) → `ae_items action=import add_to_comp=…`. Verificar el alfa de una esquina con `ffmpeg -pix_fmt rgba` |
| Una barra/caret se ve borrosa cuando la precomp se escala mucho (p. ej. 1500 %) | Es un **sólido**: raster reescalado con bilineal | Hacerla **shape** (`ae_layer_create kind=shape primitives=[{type:rect,size,fill}]`) con *collapse* en las precomps: vectorial, nítida a cualquier escala; la tipografía ya lo es |
| `ae_text set_keyframes` devuelve "keyframes required" | El parámetro se llama `keyframes` (no `keys`) | `keyframes=[{time,text}]` + `clear_existing=true` |
| Borrar keys de una propiedad | `ae_keyframes set keys=[]` falla ("keys required") | `ae_keyframes action=remove indices=[1,2,…]` (1-based); o `set clear_existing=true` con una sola key estática |
| Keys de opacidad que deberían ser HOLD salen lineales | `ae_keyframes set` ignora un `interpolation` global | Ponerlo **por key**: `keys=[{time,value,interpolation:"hold"}]` |
| `ae_property_set` sobre position da "undefined is not an object" | Ruta/forma del valor no resuelta para transform | `ae_layer_transform action=set position=[x,y]` (y si la propiedad tiene expresión, cambiar la expresión: el valor no manda) |
| Correr toda una pieza N segundos | Mover in/out no mueve las keys | `set_timing start_time=+N` (mueve capa **y** keys, también en sólidos con startTime 0) y luego in/out; la duración de la comp aparte (`ae_comp update duration`) |

## Dónde están los números
Registros, bandas de duración, tabla de easings con influencias AE, staggers por nº de ítems, legibilidad, rúbrica de crítica y fuentes: skill **`motion-intelligence`** (`SKILL.md` + `references/`). En vivo, sin round trip a AE: recursos `motion://tokens/{durations,easings,staggers,distance-duration}`, `motion://taxonomy/{registers,intents,devices,archetypes}`, `motion://ae/ease-conversion`, `motion://house-style/saas-video`, `motion://typography/legibility`, `motion://rubric/contact-sheet`; y `ae://sdk` / `ae://sdk/{objeto}` para la API ExtendScript. Las tools nuevas (`critique`, `legibility`, `plan_motion`, `ae_ease list`) sólo aparecen si el MCP `ae` se reconectó después del build del 2026-09-03.

## Dónde vive todo
- Server: este repo (`README.md` en inglés, `docs/supported-actions.md` con todos los parámetros, `docs/TROUBLESHOOTING.md` cuando algo falle).
- Datos del server: `~/.ae-mcp/` (jobs de render + logs, checkpoints, librería de tools, frames temporales).
- Bridge: `%TEMP%\ae-mcp-bridge\v26\` (`panel.log` para depurar).
- Flujo storyboard Figma → video vertical/horizontal: skill `video-desde-storyboard`.
