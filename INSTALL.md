# Instalar el MCP de After Effects

Este paquete permite que Claude maneje After Effects directamente: crear comps y capas, animar, aplicar efectos, **ver** los frames que renderiza, sacar renders con `aerender` y exportar MOGRTs para Premiere.

Tiempo real de instalación: **10–15 minutos**, casi todo esperando a `npm` y a que After Effects arranque.

---

## 0. Lo que necesitas antes de empezar

| Requisito | Cómo comprobarlo | Si falta |
|---|---|---|
| Windows 10 u 11 | — | El puente CEP es Windows-only por ahora |
| After Effects 2025 o 2026 | Que abra | — |
| Node.js 20.19 o superior | `node -v` en PowerShell | Instala el **LTS** de [nodejs.org](https://nodejs.org) |
| Git *(sólo si clonas el repo; con el `.zip` no hace falta)* | `git --version` | [git-scm.com](https://git-scm.com) |
| ffmpeg y ffprobe *(recomendado)* | `ffmpeg -version` | `winget install Gyan.FFmpeg` — sin esto los renders salen igual, pero sin verificación automática |
| Fuente **ES Klarheit Grotesk** (Bk y Md) *(sólo para las recetas de marca Silia)* | Búscala en el panel de fuentes de AE | Pídele los `.otf` a Sebastián e instálalos en Windows. Sin ella, AE sustituye la fuente en silencio |

> **Cierra After Effects antes de instalar.** El puente vive dentro de AE y sólo carga en un arranque limpio.

---

## 1. Poner el código en tu máquina

**Si te llegó como `.zip`:** descomprímelo y ya está; no hace falta Git. Salta al paso 2.

**Si tienes acceso al repositorio:**

```bash
git clone <URL del repo privado> ae-mcp
cd ae-mcp
```

Guárdalo en una ruta estable (por ejemplo `C:\Users\<tu usuario>\dev\ae-mcp`): esa ruta queda escrita en la configuración de Claude, así que mover la carpeta después rompe el registro.

> Si descomprimiste un `.zip` descargado, Windows marca los scripts como venidos de internet. Si PowerShell se queja al correrlos, quítales la marca una vez: `Get-ChildItem scripts*.ps1 | Unblock-File`.

---

## 2. La vía fácil: que lo haga Claude

Abre **Claude Code dentro de la carpeta** y pídele:

> Instala este MCP siguiendo CLAUDE.md y verifica cada paso.

El repo trae un `CLAUDE.md` con el procedimiento exacto, las comprobaciones de cada paso y los errores conocidos; Claude lo lee solo al abrirse ahí. Cuando termine, te dará el comando para registrar el servidor.

## 2-bis. La vía manual (o si prefieres verlo pasar)

En PowerShell, dentro de la carpeta y **con After Effects cerrado**:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\setup.ps1
```

Eso comprueba Node y ffmpeg, instala dependencias, compila, instala el puente dentro de After Effects, corre el diagnóstico e imprime el comando del paso 3. Si prefieres los pasos sueltos:

```powershell
npm ci
npm run build
node dist/index.js --install-cep     # copia el puente firmado a %APPDATA%\Adobe\CEP\extensions\AeMcpCEP
node dist/index.js --doctor          # tiene que terminar en "No problems found"
```

---

## 3. Registrar el servidor en Claude

**Claude Code** (una sola vez, ámbito usuario — sirve desde cualquier carpeta):

```powershell
claude mcp add ae -s user -e AE_MCP_TARGET=auto -- "C:\Program Files\nodejs\node.exe" "C:\ruta\a\ae-mcp\dist\index.js"
```

**Claude Desktop**: corre `node dist/index.js --print-mcp-config` y pega el JSON que imprime en `%APPDATA%\Claude\claude_desktop_config.json`.

Usa rutas absolutas en los dos casos. Después, **reinicia Claude** para que aparezcan las tools.

---

## 4. Comprobar que funciona

1. Abre After Effects. En `Window > Extensions` debe aparecer **Silia AE MCP** (el puente real es invisible y arranca solo; el panel sólo muestra el estado).
2. En Claude, pide: *"corre ae_status"*.
3. Tiene que responder `connected: true` con la versión de After Effects y el proyecto abierto.

Si sale `connected: false`: After Effects no está abierto, o no lo reiniciaste después de instalar el puente. Si persiste, corre `node dist/index.js --doctor` y mira [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md).

---

## 5. Primer trabajo, para probar

Con un proyecto de AE abierto (o vacío), pídele a Claude algo pequeño y verificable:

> Crea una comp vertical de marca, mete un lower third que diga "Prueba" y enséñame el frame a 0.4 s.

Eso ejercita el camino completo: `silia_comp` → `silia_lower_third` → `ae_frame`. Si ves la imagen, está todo bien.

---

## Cómo trabajar con esto después

- **Primera llamada de cada sesión: `ae_status`.**
- Antes de tocar un proyecto real: `ae_checkpoint action=create`.
- Claude debe *mirar* lo que hace (`ae_frame`), no fiarse del "listo".
- Un `ENGINE_BUSY` no es una caída: es un diálogo modal abierto en After Effects.

Lo que Claude necesita saber para trabajar bien ya viene en el repo (`.claude/skills/ae-motion/` y `.claude/skills/motion-intelligence/`): se cargan solos cuando trabajas con Claude Code dentro de esta carpeta. Si trabajas desde otra carpeta, copia esos dos skills a `~/.claude/skills/` para tenerlos siempre.

- Referencia completa de parámetros: [`docs/supported-actions.md`](docs/supported-actions.md)
- Qué hace cada tool y cómo está construido: [`README.md`](README.md) y [`docs/PLAN-BUILD.md`](docs/PLAN-BUILD.md)
- Cuando algo falle: [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md)

---

## Actualizar a una versión nueva

Con el repositorio: `git pull`. Con un `.zip` nuevo: descomprímelo **encima** de la carpeta anterior, en la misma ruta (si cambia la ruta hay que volver a registrar el MCP). En los dos casos, después:

```powershell
npm ci
npm run build
```

Y reinicia Claude. Sólo hace falta volver a instalar el puente (`--install-cep`, con After Effects cerrado) si cambió algo dentro de `cep-plugin/` — quien te mande la versión nueva te lo dirá.
