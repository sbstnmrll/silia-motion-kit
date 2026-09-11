# Cuando algo falla

Todo lo que hay aquí está verificado en producción sobre After Effects 2025 y 2026 en Windows: cada fila costó un ciclo de depuración. Antes de improvisar, corre el diagnóstico y lee los `problems`:

```powershell
node dist/index.js --doctor
```

Dice qué versiones de AE hay instaladas, si el puente CEP está copiado, el estado de las claves `PlayerDebugMode`, cuántos "listeners" vivos hay en el directorio del puente y si `ffmpeg`/`ffprobe` están en el PATH.

**Dónde mirar cuando el doctor no basta**

| Archivo | Qué cuenta |
|---|---|
| `%TEMP%\ae-mcp-bridge\v26\panel.log` | Lo que ve el puente dentro de AE: comandos recibidos, errores de ExtendScript |
| `%TEMP%\CEP12-AEFT.log` | Por qué After Effects cargó o rechazó la extensión (busca `com.silia.ae.mcp`) |
| `~\.ae-mcp\jobs\` | Los renders de `aerender`: línea de comando, log y verificación |

---

## Instalación

**`npm ci` falla con errores de `sharp` o de compilación nativa.**
`sharp` trae binarios precompilados para Windows x64; si tu Node es de 32 bits o muy nuevo/viejo, no los encuentra. Comprueba `node -v` (hace falta 20.19+) y `node -p "process.arch"` (debe decir `x64`).

**`--install-cep` dice que After Effects está abierto.**
Es un aviso, no un error: la copia se hace igual, pero AE sólo carga el puente nuevo en el siguiente arranque completo. Cierra AE del todo (que no quede `AfterFX.exe` en el Administrador de tareas) y vuelve a abrirlo.

**No encuentro `ZXPSignCmd.exe` al correr `--sign-cep`.**
Sólo hace falta si cambiaste `cep-plugin/`: el repo ya trae `artifacts/AeMcpCEP.zxp` firmado. Si de verdad tienes que firmar, baja `ZXPSignCmd.exe` de [Adobe-CEP/CEP-Resources](https://github.com/Adobe-CEP/CEP-Resources) (carpeta `ZXPSignCMD`) y déjalo en `tools\ZXPSignCmd.exe` dentro del repo, o exporta `$env:ZXPSIGNCMD` con su ruta.

---

## El puente no conecta

**`ae_status` devuelve `connected: false`.**
Por orden de probabilidad: (1) After Effects no está abierto — sin AE no hay nadie al otro lado; (2) no reiniciaste AE después de instalar el puente; (3) el puente no está instalado (`--doctor` lo dice). El panel `Window > Extensions > Silia AE MCP` es la confirmación visual: si no aparece en el menú, AE no cargó la extensión.

**El log de CEP dice `Signature verification failed for extension com.silia.ae.mcp.headless`.**
After Effects 2026 dejó de aceptar el bundle sin firma el 2026-09-08 (hasta entonces bastaba `PlayerDebugMode`). Con **AE cerrado**:

```powershell
node dist/index.js --sign-cep
node dist/index.js --install-cep
```

Y abre AE. Trampa conocida: **`--diagnose-cep` lee el log histórico de CEP**, así que sigue reportando el fallo aunque el arreglo ya haya funcionado. Mueve `%TEMP%\CEP12-AEFT.log` a otro lado antes de volver a creerle, o confía en `ae_status`.

**El puente funcionaba y de un día para otro desapareció.**
Las claves `HKCU\Software\Adobe\CSXS.*\PlayerDebugMode` se borran solas a veces (pasó el 2026-09-03). `--install-cep` las repone (tienen que ser **REG_SZ "1"**, un DWORD 1 se ignora). Reinicia AE.

**Al abrir, After Effects ofrece "Crash Repair Options".**
El botón correcto es **Continue** (Enter). **Nunca Safe Mode**: desactiva todas las extensiones y el puente deja de existir sin decir nada.

**Tengo 2025 y 2026 instalados y las llamadas van a la que no quiero.**
Cada versión mayor tiene su propio directorio de puente (`v25`, `v26`), así que no se pisan. Con `AE_MCP_TARGET=auto` gana el listener más fresco; fija `AE_MCP_TARGET=2026` (o `26`) en la configuración del MCP para forzar una.

**Las tools `ae_*` no aparecen en Claude.**
El servidor no está registrado o el cliente no se reinició. `claude mcp list` debe mostrar `ae`. Comprueba que la ruta a `dist/index.js` sea absoluta y que el `node.exe` sea el real (`(Get-Command node).Source`): el cliente arranca el servidor con un entorno mínimo, sin PATH completo ni carpeta de trabajo.

---

## Operación

**Todas las llamadas devuelven `ENGINE_BUSY`.**
No es una desconexión: hay un **diálogo modal abierto en After Effects** y eso bloquea el motor de scripting. `ae_dialogs action=list` para leer el texto y `ok`/`cancel` para responderlo. Los avisos informativos (fuentes al exportar un MOGRT, efectos faltantes al abrir un proyecto) los contesta el servidor solo.

**Un script propio devuelve `EMPTY_RESULT`.**
Error de sintaxis ES3: `let`/`const`, arrow functions, template literals, coma final, o una palabra reservada como clave (`native`). El ExtendScript de AE es ES3 y punto.

**La fuente que sale no es la que pedí.**
AE sustituye en silencio. El read-back de `ae_text` y de las tools `silia_*` trae un `warnings` con la sustitución; si aparece, instala la fuente (`ESKlarheitGrotesk-Bk` / `-Md` para las recetas de marca) y repite.

**El frame capturado tiene bordes negros raros, o un contact sheet mezcla tiempos.**
`saveFrameToPng` escribe de forma asíncrona y bajo carga puede devolver frames de otros tiempos. Ante cualquier cosa rara en un contact sheet, repite con `ae_frame action=capture` individuales **antes** de "arreglar" una animación que probablemente esté bien.

---

## Renders

**`ae_render` se queda en `running` sin avanzar.**
`aerender.exe` se cuelga si se lanza con la consola oculta, con un entorno mínimo, o sobre un `.aep` que la interfaz tiene abierto. El servidor ya lo evita (consola visible, entorno completo, copia byte a byte del proyecto). Si reaparece: `ae_render action=list` y mata `aerender.exe` en el Administrador de tareas.

**El render muere con "out of disk space" (error 6662) y deja un `.mp4` de 24 bytes.**
Es la caché de disco de After Effects llenándose (tope por defecto 93 GB, en `%TEMP%\Adobe\After Effects\<versión>\Disk Cache…`): ~8.3 MB por frame a 1080×1920. Un render de 60 s a 60 fps necesita unos **30 GB libres**. Purga con la tool `lib_purge_caches max_gb=15 min_free_gb=20`, comprueba con `Get-PSDrive C` y relanza.

**Los renders salen sin verificar.**
Falta `ffprobe` en el PATH: `winget install Gyan.FFmpeg`. El archivo se genera igual, pero nadie comprueba duración, fps, alpha ni si el arranque está en negro.

---

## Transporte alternativo (rara vez hace falta)

Si el CEP no carga de ninguna manera, existe un transporte de respaldo sin extensión: un *poller* lanzado dentro de AE con `AfterFX -r`.

```powershell
node dist/index.js --enable-scripting-pref --ae 26.3   # con AE CERRADO: activa "Allow Scripts to Write Files and Access Network"
node dist/index.js --install-poller --ae 2026 --startup
```

Ese modo **sí** necesita la preferencia de scripting activada (el puente CEP no, porque escribe los archivos desde Node). Es un plan B: más frágil y más lento.
