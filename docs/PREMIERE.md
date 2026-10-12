# Premiere Pro: el segundo MCP del kit

After Effects lo maneja el MCP de este repo (`ae`). Premiere Pro lo maneja un MCP aparte, de código abierto: el paquete de npm **`premiere-pro-mcp`** (repo `leancoderkavy/premiere-pro-mcp`, MIT). No se vendoriza aquí: se instala desde npm, y esta guía dice cómo y qué esperar de él.

**No uses `adobe-premiere-pro-mcp`** (repo `hetpatel-11/…`). Su puente CEP no carga en Premiere 2025/2026: falla con `Signature verification failed`. Se probaron y descartaron una por una todas las vías para hacerlo cargar.

## Instalar

Antes de empezar, **Premiere cerrado del todo**:
- En Mac, con **Cmd+Q**. Cerrar la ventana no basta: compruébalo con `pgrep -f "Adobe Premiere Pro"`, que no debe devolver nada.
- En Windows, sin procesos `Adobe Premiere Pro.exe` en el Administrador de tareas.

| # | Paso | Comando | Cómo verificar |
|---|---|---|---|
| 1 | Instalar el paquete | `npm i -g premiere-pro-mcp` (verificado con 1.18.2) | `premiere-pro-mcp --version` responde |
| 2 | Instalar el puente CEP dentro de Premiere | `premiere-pro-mcp --install-cep` | Instala el `.zxp` firmado que trae el paquete (`node_modules/premiere-pro-mcp/artifacts/`) y activa `PlayerDebugMode`. En Mac queda en `~/Library/Application Support/Adobe/CEP/extensions/MCPBridgeCEP` |
| 3 | Diagnóstico | `premiere-pro-mcp --diagnose-cep` y `premiere-pro-mcp --doctor` | Sin problemas |
| 4 | Registrar en Claude Code | ver abajo | `claude mcp list` muestra `premiere-pro` |
| 5 | Abrir Premiere | Abrir **Window > Extensions > MCP for Adobe Premiere Pro** y dejar el panel abierto | El panel dice que está escuchando |
| 6 | Prueba real | tool `verify_premiere_connection` | Responde conectado. `ACTIVE_SEQUENCE_MISSING` no es un error: solo falta abrir una secuencia |

Registro (ámbito usuario, una sola vez):

```bash
# macOS / Linux
claude mcp add premiere-pro -s user -- "$(command -v node)" "$(npm root -g)/premiere-pro-mcp/dist/index.js"
```

```powershell
# Windows (PowerShell)
claude mcp add premiere-pro -s user -- "$((Get-Command node).Source)" "$(npm root -g)\premiere-pro-mcp\dist\index.js"
```

El punto de entrada es `dist/index.js` (verificado con la v1.18.2). `premiere-pro-mcp --print-client-config claude` imprime la configuración exacta de tu copia instalada sin escribir nada. Si `--doctor` encuentra algo, `premiere-pro-mcp --doctor --plan-fixes` propone la reparación sin tocar nada. Después de registrar, **reinicia Claude**.

**Cómo funciona:** el servidor escribe comandos en una carpeta temporal compartida y el panel CEP dentro de Premiere los ejecuta. **Sin Premiere abierto y con el panel cargado, ninguna llamada funciona.** Primera llamada de cada sesión: `verify_premiere_connection`.

**Node en Mac con nvm:** si `node` vive en `~/.nvm/versions/node/<v>/bin` y no está en el PATH de la shell que usa Claude, exporta ese directorio antes de instalar, y registra el MCP con la ruta absoluta a ese `node`.

## Errores del conector ya verificados

**El conector reporta éxito en escrituras que no hizo.** No te fíes de la respuesta: verifica el estado resultante, por ejemplo con `get_full_sequence_info`.

| Síntoma | Qué hacer |
|---|---|
| `replace_clip_media` devuelve `replaced: true` y no cambia nada | Quita el clip y vuelve a colocarlo con `overwrite_clip`; confirma `sourceMediaPath` con `get_full_sequence_info` |
| `delete_multiple_project_items` devuelve `deleted: 0` y no borra | Bórralos a mano en el panel de proyecto |
| El audio siempre cae en A1 | Pasa el parámetro no documentado `audio_track_index`; `track_index` solo se ignora para audio |
| `move_clip_to_track` falla | La API QE lo rechaza en Premiere 26. Quita el clip y vuelve a colocarlo en la pista correcta |
| `set_clip_position` mueve el clip a cualquier lado | Toma coordenadas **normalizadas 0–1**, no píxeles |
| No se pueden mover las carpetas `media/` y `renders/` | Premiere retiene los archivos aun tras `close_project`: hay que salir de la app |
| Un Morph Cut exportado lleva el banner naranja "Analyzing in background" | Se exportó antes de terminar el análisis, y la exportación dice que salió bien. Revisa con `export_frame` a mitad de cada transición hasta que el banner desaparezca |
| `add_transition` no encuentra el corte | Pasa el tiempo con precisión completa (`17.0333333333333`, no `17.0333`) |
| Morph Cut deja manos y camisa en bloques | Falla con gestos de manos. Juzga cada corte por su frame central y vuelve a corte seco si se mancha; nunca lo apliques a ciegas |
| `import_fcp_xml` abre el proyecto en `$TMPDIR` | Ignora `project_path` si la carpeta no existe. Créala primero y usa `save_project_as` dentro de ella |

**Lo más fiable para armar una secuencia** es construirla como **FCP XML**, con src in/out exactos, y leerla de vuelta con `get_full_sequence_info`. Es más seguro que colocar clips uno por uno.

## After Effects → Premiere

- **Desde AE:** `ae_mogrt action=export` o un render con alfa, y luego `ae_handoff`, que devuelve la llamada exacta para este MCP (`import_mogrt` o import + colocación).
- **En Premiere:** importa y coloca en una **pista nueva**. Nunca sobrescribas la secuencia activa del usuario sin preguntar.
- **Siempre:** verifica con `get_full_sequence_info`.
