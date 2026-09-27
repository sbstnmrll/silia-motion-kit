# Portar ae-mcp a macOS

Documento de traspaso. Escrito el 2026-09-27 desde la máquina Windows, midiendo el código real, para que Claude en la Mac no arranque de cero ni repita el análisis.

## Lo primero: no construyas de nuevo

Dos cosas que parecen trabajo pendiente y no lo son.

**Premiere no necesita un MCP nuevo.** Ya existe `premiere-pro-mcp` (npm, v1.13.0, 286 tools) y **soporta macOS**: su README documenta la instalación manual en Mac y su código ramifica en `process.platform === "darwin"` en al menos tres módulos (`dist/bridge/file-bridge.js`, `dist/context/project-context-store.js`, `dist/diagnostics.js`). Se instala con `npm i -g premiere-pro-mcp` y listo. Construir otro sería tirar el trabajo.

**AE no necesita un MCP nuevo.** Este repo ya es uno: 53 tools verificadas contra After Effects 2026 en Windows. Lo que falta es un **port**, y es más chico de lo que sugiere el README (que dice "on Windows" en la primera línea).

## Qué ya es multiplataforma

Medido leyendo el código, no asumido:

| Módulo | Estado |
|---|---|
| `src/config.ts:30,34` | Usa `tmpdir()` y `USERPROFILE \|\| HOME`. Ya resuelve bien en POSIX. |
| `src/bridge/bridge-dir.ts` | **Escrito con POSIX en mente**: valida `uid` del dueño del directorio y hace `chmod 0700`. El comentario dice que se adaptó de `premiere-pro-mcp` (MIT) justamente por eso. |
| `src/render/aerender.ts:197` | `renderEnvironment()` sale temprano si no es win32. No estorba. |
| `src/render/aerender.ts:348` | `cancelJob()` ya ramifica: `taskkill` en Windows, `SIGTERM` en el resto. |

O sea: el puente de archivos, la config y el ciclo de render ya están preparados. No los toques sin motivo.

## Qué hay que portar

### 1. Localizar la instalación de AE — `src/bridge/poller-transport.ts:31`

`findAeInstalls()` devuelve `[]` si no es win32, y busca en `C:\Program Files\Adobe\Adobe After Effects 20xx\Support Files` los binarios `AfterFX.exe`, `AfterFX.com` y `aerender.exe`.

En macOS el equivalente es `/Applications/Adobe After Effects 20xx/`, donde:
- la app es `Adobe After Effects 20xx.app` (bundle, no `.exe`)
- `aerender` es un binario sin extensión, dentro de la carpeta de la versión
- no existe `AfterFX.com` (es el shim de consola de Windows); revisá qué hace el código con `afterfxCom` antes de inventar un sustituto — puede que en Mac simplemente no haga falta

La interfaz `AeInstall` probablemente necesite que `afterfxCom` pase a opcional.

### 2. Instalar el plugin CEP — `scripts/install-cep.ps1`

Lo que hace en Windows, y su equivalente en Mac:

| Windows | macOS |
|---|---|
| Copia `cep-plugin/` a `%APPDATA%\Adobe\CEP\extensions\AeMcpCEP` | `~/Library/Application Support/Adobe/CEP/extensions/AeMcpCEP` |
| `HKCU:\SOFTWARE\Adobe\CSXS.<v>` → `PlayerDebugMode` = `"1"` (**REG_SZ**, un DWORD se ignora) | `defaults write com.adobe.CSXS.<v> PlayerDebugMode 1` (también como **string**) |
| Chequea que AE no esté corriendo (`Get-Process AfterFX`) | `pgrep -x "After Effects"` o equivalente |
| Puede instalar el `.zxp` firmado de `artifacts/` | Ver abajo |

Hace falta un `scripts/install-cep.sh` que haga lo mismo. Mantené la guarda de seguridad que ya tiene el `.ps1`: se niega a instalar fuera del directorio de extensiones.

El guard que bloquea esto está en `src/index.ts:88` — `"CEP install scripts are Windows-only in this version."` Ese mensaje dice *in this version* a propósito.

### 3. El bundle firmado

En Windows se instala un `.zxp` firmado porque **AE 2026 rechaza bundles sin firmar**. En macOS la firma es un mundo aparte (certificados, `ZXPSignCmd`). Empezá con el bundle de desarrollo sin firmar + PlayerDebugMode, que es el camino soportado para desarrollo, y dejá la firma para después si hace falta distribuirlo.

### 4. Preferencia de scripting — `scripts/enable-scripting-pref.ps1`

Activa "Allow Scripts to Write Files and Access Network". En macOS esa preferencia vive en el archivo de prefs de AE bajo `~/Library/Preferences/Adobe/After Effects/<version>/`, no en el registro. Verificá el formato real antes de escribirlo a ciegas: es un archivo de texto con secciones, y corromperlo deja AE sin arrancar bien.

## Qué NO se puede portar

`ae_dialogs` (`src/host/dialogs.ts`) enumera ventanas modales con PowerShell/Win32 para detectar cuándo un diálogo bloqueó el motor de scripting. El módulo ya devuelve `{dialogs: [], remaining: 0, pid: null}` si no es win32, y `src/tools/health.ts:31` responde `"ae_dialogs is Windows-only"` con código `UNSUPPORTED`.

No hay API equivalente limpia en macOS. Dejalo como no soportado y que el mensaje lo diga. El costo: si un diálogo modal bloquea AE en la Mac, el servidor va a devolver `ENGINE_BUSY` sin poder decir *cuál* diálogo es.

## Cómo verificar que funcionó

No lo des por hecho hasta que estos pasen, en orden:

1. `npm install && npm run build` — `dist/` no se versiona.
2. `node dist/index.js --diagnose-cep` (una vez que exista la versión Mac) reporta el plugin instalado y PlayerDebugMode activo.
3. `npm test` — los unit tests deberían pasar sin AE abierto.
4. Con AE abierto: `ae_status` devuelve bridge vivo, versión y comp activa.
5. `ae_comp` crear una comp, `ae_layer_create` una capa de texto, `ae_frame capture` — y **mirá el PNG**. El puente puede reportar éxito y la comp salir vacía.
6. `ae_render` de 1 segundo y verificá la salida con `ffprobe`.

El paso 5 no es opcional: este proyecto tiene la regla de confiar en el read-back y en los píxeles, no en el código de retorno.

## Contexto del repo

- Node >= 20.19. Dependencias: `@modelcontextprotocol/sdk`, `sharp`, `zod`. Nada atado a Windows en el árbol de dependencias.
- ExtendScript ES3 en `src/jsx/` — sin `let`/`const`, sin arrow functions, sin template literals. Eso no cambia entre plataformas.
- `docs/supported-actions.md` se genera con `scripts/generate-supported-actions.mjs`.
- `docs/TROUBLESHOOTING.md` tiene los modos de falla conocidos del puente.
- El repo es `github.com/sbstnmrll/ae-mcp`, rama `master`.
