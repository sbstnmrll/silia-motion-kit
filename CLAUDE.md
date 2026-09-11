# Silia AE MCP — instrucciones para Claude

Este repositorio **es** un servidor MCP que maneja Adobe After Effects en Windows (crear comps y capas, animar con easing correcto, aplicar efectos, ver frames renderizados, renderizar con `aerender`, exportar MOGRT y pasárselo a Premiere, más las recetas de marca Silia). No es una librería que se importa: se instala, se registra en Claude y se usa como MCP con 44 tools (`ae_*`, `silia_*`).

Si el usuario abrió Claude aquí, casi siempre quiere una de dos cosas: **instalarlo** o **usarlo**.

---

## A. Instalarlo (primera vez)

Sigue estos pasos en orden y **verifica cada uno antes de pasar al siguiente**. No des un paso por bueno porque el comando no dio error: comprueba lo que se indica.

**Antes de empezar, pide al usuario que cierre After Effects por completo.** El puente nuevo sólo carga en un arranque limpio de AE.

| # | Paso | Comando | Cómo verificar |
|---|---|---|---|
| 1 | Node 20.19+ | `node -v` | Si falta o es viejo: que instale el LTS de nodejs.org. No sigas sin esto |
| 2 | Dependencias | `npm ci` | Termina sin errores; existe `node_modules/` |
| 3 | Build | `npm run build` | Existe `dist/index.js` |
| 4 | Puente CEP dentro de AE | `node dist/index.js --install-cep` | Imprime "Installed" y existe `%APPDATA%\Adobe\CEP\extensions\AeMcpCEP\CSXS\manifest.xml` |
| 5 | Diagnóstico | `node dist/index.js --doctor` | Debe decir `No problems found` (con AE cerrado es normal que no haya "live listeners") |
| 6 | Registrar el MCP | ver abajo | `claude mcp list` muestra `ae` |
| 7 | Abrir After Effects | — | En `Window > Extensions` aparece **Silia AE MCP** |
| 8 | Prueba real | tool `ae_status` | Devuelve `connected: true` y la versión de AE |

Los pasos 1–5 los hace de una pasada `powershell -ExecutionPolicy Bypass -File scripts\setup.ps1` (comprueba Node y ffmpeg, instala, construye, instala el puente, corre el doctor e imprime el comando de registro). Úsalo si prefieres una sola orden; si algo falla, vuelve a la tabla paso a paso.

### Registrar el MCP (paso 6)

Claude Code, ámbito usuario (una sola vez, sirve para cualquier carpeta):

```bash
claude mcp add ae -s user -e AE_MCP_TARGET=auto -- "C:\Program Files\nodejs\node.exe" "<ruta absoluta a este repo>\dist\index.js"
```

Claude Desktop: `node dist/index.js --print-mcp-config` imprime el JSON exacto para `%APPDATA%\Claude\claude_desktop_config.json`.

Usa siempre **rutas absolutas** y el `node.exe` real (`(Get-Command node).Source`): el cliente MCP arranca el servidor con un entorno mínimo y sin `cwd` fijo.

Después de registrar hay que **reiniciar Claude** para que las tools aparezcan.

### Qué hacer si el paso 8 falla

1. `node dist/index.js --doctor` — lee los `problems`, no adivines.
2. `connected: false` casi siempre significa: After Effects no está abierto, o no se reinició después de instalar el puente.
3. Si el doctor menciona **"Signature verification failed"**: con AE cerrado, `node dist/index.js --sign-cep` y luego `--install-cep`. Ojo: `--diagnose-cep` lee el log *histórico* de CEP, así que sigue reportando el fallo antiguo aunque el arreglo ya haya funcionado — mueve `%TEMP%\CEP12-AEFT.log` a otro lado antes de volver a creerle.
4. El resto de síntomas están en [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md).

### Cosas que NO debes hacer al instalar

- **No** instales el puente con After Effects abierto (no carga hasta el siguiente arranque; el script avisa).
- **No** uses `--install-cep --unsigned` en After Effects 2026: desde 2026-09-08 AE rechaza el bundle sin firma. El `.zxp` firmado que ya viene en `artifacts/` es lo que funciona.
- **No** toques `Safe Mode` si AE ofrece "Crash Repair Options" al arrancar: desactiva las extensiones y el puente desaparece. El botón correcto es **Continue**.
- **No** subas al repo `.env.local` ni `artifacts/*.p12` (clave privada del certificado). Ya están en `.gitignore`.

---

## B. Usarlo (trabajo de motion)

- **Primera llamada de cada sesión: `ae_status`.** Dice si el puente está vivo, qué versión de AE, qué proyecto y qué comp activa.
- `ae_checkpoint action=create` antes de cualquier edición de varios pasos sobre un proyecto real del usuario.
- Cada tool que muta devuelve un **read-back** de lo que quedó: léelo, no supongas. Y **mira el frame** (`ae_frame action=capture` / `contact_sheet`) antes de declarar algo terminado: el read-back dice lo que AE tiene, el frame dice lo que AE pinta.
- `ae_project action=save` después de cada cambio estructural, no sólo al final.
- Un `ENGINE_BUSY` no es una desconexión: es un diálogo modal abierto en AE. `ae_dialogs action=list` → leer el texto → `ok`/`cancel`.
- Los renders van por `ae_render` (aerender en segundo plano, verificado con ffprobe). `ae_render_queue action=render` bloquea la interfaz de AE.

El flujo completo, las recetas (`silia_lower_third`, `silia_captions`, `silia_outro`, MOGRT → Premiere…) y una tabla larga de gotchas están en el skill **`.claude/skills/ae-motion/SKILL.md`** de este repo, que Claude Code carga solo cuando la tarea menciona After Effects. Los números del motion (duraciones, easings, staggers, legibilidad) están en **`.claude/skills/motion-intelligence/`** y, en vivo, en los recursos `motion://…` del propio servidor.

---

## Mapa del repositorio

| Ruta | Qué es |
|---|---|
| `src/` | El servidor MCP (TypeScript). `src/jsx/` es el ExtendScript que corre dentro de AE |
| `cep-plugin/` | La extensión CEP: el puente que vive dentro de After Effects |
| `artifacts/AeMcpCEP.zxp` | Ese mismo puente, empaquetado y **firmado**. Es lo que instala `--install-cep` |
| `scripts/` | Instaladores PowerShell (`setup.ps1`, `install-cep.ps1`, `build-signed-cep.ps1`…) |
| `docs/supported-actions.md` | Referencia completa de parámetros de las 44 tools |
| `docs/PLAN-BUILD.md` | Cómo se construyó y por qué (transporte, CEP, firma, qué quedó sin probar) |
| `docs/TROUBLESHOOTING.md` | Síntoma → causa → arreglo |
| `INSTALL.md` | La misma instalación, explicada para leer a mano |
| `~/.ae-mcp/` (fuera del repo) | Datos en caliente: jobs de render, checkpoints, librería de scripts, frames |
| `%TEMP%\ae-mcp-bridge\v26\` | El puente en disco (`panel.log` para depurar) |

## Cómo funciona (para depurar con criterio)

```
Cliente MCP ──stdio──> ae-mcp (Node) ──cmd_<id>.jsx──> %TEMP%\ae-mcp-bridge\v26\ <──poll 200 ms── extensión CEP dentro de AE
                                     <──res_<id>.json──                                          (Node en CEP: $.evalFile → ExtendScript)
```

Consecuencias prácticas: **si AE no está abierto, nada funciona** (no hay a quién preguntarle); un directorio de puente por versión mayor de AE, así que 2025 y 2026 no se pisan (`AE_MCP_TARGET`); y el servidor por sí solo nunca "arregla" AE — si el puente no responde, el problema está del lado de AE o del CEP, no del MCP.

## Si cambias `cep-plugin/`

Hay que volver a firmar e instalar, con AE cerrado:

```bash
node dist/index.js --sign-cep     # regenera artifacts/AeMcpCEP.zxp (necesita ZXPSignCmd.exe, ver docs/TROUBLESHOOTING.md)
node dist/index.js --install-cep
```

Si sólo cambias `src/`, basta `npm run build` y reiniciar el cliente MCP (el puente dentro de AE no cambia).
