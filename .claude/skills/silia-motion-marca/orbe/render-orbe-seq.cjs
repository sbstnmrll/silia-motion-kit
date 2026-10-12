// render-orbe-seq.cjs — secuencia PNG con alfa del orbe real de Silia, para importar a After Effects.
//
//   node render-orbe-seq.cjs --suite azul --size 1024 --seconds 10 --fps 60 --estado speaking --out ./orbe-azul
//
// Opciones (todas opcionales):
//   --suite    azul | verde | naranja | morado | amarillo   (default azul; ver SKILL.md §5 qué suite va con qué industria)
//   --size     lado del PNG en px (default 1024). El disco visible mide size/1.45: el resto es aire para el halo
//   --seconds  duración de la secuencia (default 10)
//   --fps      fps de la comp de destino (default 60)
//   --estado   idle | listening | speaking | thinking | connecting  (default speaking) → velocidad interna del shader
//   --speed    sobreescribe la velocidad del estado (número)
//   --t0       tiempo inicial del shader (default 22). Dos secuencias con el mismo t0/speed son la misma imagen
//   --smoke    intensidad del anillo de humo blanco (default: el del producto, 0.62)
//   --out      carpeta de salida (default ./orbe-<suite>)
//
// El tiempo del shader es una FUNCIÓN PURA DEL FRAME (t = t0 + f/fps·speed): sin reloj propio,
// sin performance.now(), así que es seek-safe y el frame N siempre se ve igual. Un solo Chrome
// y una sola instancia del shader para toda la secuencia.
//
// Requisitos: node ≥ 18 y hyperframes instalado globalmente (`npm i -g hyperframes`
// + `hyperframes browser ensure`), que trae puppeteer-core y el chrome-headless-shell.
// Funciona en macOS (arm64/x64), Windows y Linux.

const path = require("path");
const fs = require("fs");
const os = require("os");
const { execSync } = require("child_process");

const SUITES = {
  azul:    [["#ffffff",0.08],["#2b90e3",0.25],["#5fe3f0",0.55],["#2b90e3",0.67],["#8ed8ea",0.76]],
  verde:   [["#ffffff",0.08],["#2f9e6b",0.25],["#73f359",0.55],["#2f9e6b",0.67],["#92d232",0.76]],
  naranja: [["#ffffff",0.08],["#e0622f",0.25],["#ffb057",0.55],["#e0622f",0.67],["#f5cf7a",0.76]],
  morado:  [["#ffffff",0.08],["#7145c9",0.25],["#c98af0",0.55],["#7145c9",0.67],["#e0a6e8",0.76]],
  amarillo:[["#ffffff",0.08],["#c9992f",0.25],["#f5e06b",0.55],["#c9992f",0.67],["#d9e07a",0.76]],
};
// Velocidades de los estados del widget (silia-orb.js, STATES). En video se usan speaking / listening / idle.
const ESTADOS = { idle: 0.35, listening: 0.55, speaking: 0.7, thinking: 1.5, connecting: 0.9 };

function arg(name, def) {
  const i = process.argv.indexOf("--" + name);
  return i > -1 && process.argv[i + 1] !== undefined ? process.argv[i + 1] : def;
}

const suite   = String(arg("suite", "azul"));
const size    = Number(arg("size", 1024));
const fps     = Number(arg("fps", 60));
const frames  = Math.round(Number(arg("seconds", 10)) * fps);
const estado  = String(arg("estado", "speaking"));
const speed   = Number(arg("speed", ESTADOS[estado]));
const t0      = Number(arg("t0", 22));
const smoke   = arg("smoke", null);
const outDir  = path.resolve(arg("out", "orbe-" + suite));

if (!SUITES[suite]) throw new Error("suite desconocida: " + suite + " (azul|verde|naranja|morado|amarillo). Nunca inventar una sexta.");
if (!(speed > 0)) throw new Error("estado desconocido: " + estado + " (idle|listening|speaking|thinking|connecting) o pasa --speed");

function hyperframesModules() {
  const root = execSync("npm root -g").toString().trim();
  const dir = path.join(root, "hyperframes", "node_modules");
  if (!fs.existsSync(path.join(dir, "puppeteer-core"))) throw new Error("No encuentro puppeteer-core en " + dir + ". Instala hyperframes: npm i -g hyperframes");
  return dir;
}

function chromeHeadless() {
  const base = path.join(os.homedir(), ".cache", "hyperframes", "chrome", "chrome-headless-shell");
  const pref = process.platform === "darwin" ? "mac" : process.platform === "win32" ? "win" : "linux";
  let versions = [];
  try { versions = fs.readdirSync(base).filter(d => d.indexOf(pref) === 0).sort(); } catch (e) {}
  for (const v of versions.reverse()) {
    for (const sub of fs.readdirSync(path.join(base, v))) {
      const exe = path.join(base, v, sub, process.platform === "win32" ? "chrome-headless-shell.exe" : "chrome-headless-shell");
      if (fs.existsSync(exe)) return exe;
    }
  }
  throw new Error("No encuentro chrome-headless-shell en " + base + ". Corre: hyperframes browser ensure");
}

const puppeteer = require(path.join(hyperframesModules(), "puppeteer-core"));
const orbSrc = fs.readFileSync(path.join(__dirname, "silia-orb.js"), "utf8");

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: chromeHeadless(),
    headless: "shell",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--disable-gpu-sandbox", "--no-sandbox"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 64, height: 64 });
  await page.setContent("<canvas id=c></canvas>");

  await page.evaluate(async (src, size, stops, smoke) => {
    const mod = await import("data:text/javascript;base64," + btoa(unescape(encodeURIComponent(src))));
    const canvas = document.getElementById("c");
    canvas.width = size; canvas.height = size;
    const look = smoke === null ? {} : { smoke: Number(smoke) };
    const orb = new mod.SiliaOrb(canvas, { maxSize: size, stops: stops.map(([color, pos]) => ({ color, pos })), look });
    if (!orb.supported) throw new Error("WebGL2 no disponible");
    orb.running = false;
    if (orb.rafId) cancelAnimationFrame(orb.rafId);
    if (orb.resizeObserver) orb.resizeObserver.disconnect();
    canvas.width = size; canvas.height = size;
    orb.gl.viewport(0, 0, size, size);
    orb.gl.uniform2f(orb.uniforms.resolution, size, size);
    orb.activity = 0; orb.presence = 1;
    window.__orb = orb;
  }, orbSrc, size, SUITES[suite], smoke);

  const tstart = Date.now();
  for (let f = 0; f < frames; f++) {
    const dataUrl = await page.evaluate((t) => { window.__orb.time = t; return window.__orb.toDataURL(); }, t0 + (f / fps) * speed);
    fs.writeFileSync(path.join(outDir, "orbe_" + String(f).padStart(5, "0") + ".png"), Buffer.from(dataUrl.split(",")[1], "base64"));
    if (f % 60 === 0 || f === frames - 1) {
      const el = (Date.now() - tstart) / 1000;
      console.log("frame " + f + "/" + (frames - 1) + "  " + el.toFixed(1) + "s  (" + ((f + 1) / el).toFixed(2) + " fps)");
    }
  }
  await browser.close();
  console.log("listo: " + outDir + "  " + frames + " frames · " + size + "px · suite=" + suite + " estado=" + estado + " speed=" + speed + " t0=" + t0);
})().catch(e => { console.error(e.message || e); process.exit(1); });
