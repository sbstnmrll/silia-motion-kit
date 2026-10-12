/**
 * SiliaOrb — orbe reactivo a voz, WebGL2, sin dependencias.
 *
 * Arquitectura, calcada de cómo lo hace ElevenLabs (su widget es open source:
 * elevenlabs/packages → convai-widget-core/src/orb/OrbShader.frag):
 *
 *   1. Un campo de LUMINANCIA en movimiento (escala de grises).
 *   2. Encima, una capa de HUMO BLANCO mezclada en modo screen.
 *   3. El gris resultante se mapea contra una RAMPA DE COLOR.
 *
 * El punto clave es el paso 3: el color no depende de la posición del píxel,
 * depende de qué tan brillante quedó el campo ahí. Por eso el degradado no se
 * lee ni radial ni direccional — los colores viajan con las manchas.
 *
 *   const orb = new SiliaOrb(canvas);
 *   orb.setState("listening");
 *   orb.updateVolume(entrada, salida);  // ambos 0..1
 *   orb.dispose();
 */

const MAX_STOPS = 6;

const VERT = `#version 300 es
precision highp float;
in vec2 position;
out vec2 vUv;
void main() {
  vUv = position;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;

uniform float uTime;
uniform float uActivity;
uniform float uPresence;
uniform vec2  uResolution;
uniform float uSeed;

// --- rampa de color: hasta 6 paradas, cada una con su posicion ---
uniform vec3  uStopColor[6];
uniform float uStopPos[6];
uniform int   uStopCount;

// --- capa 1: campo de luminancia ---
uniform float uFlowScale;
uniform float uFlowSpeed;
uniform float uContrast;
uniform float uSmoothness;

// --- capa 2: humo blanco ---
uniform float uSmoke;       // intensidad del aro
uniform float uSmokeScale;  // lóbulos alrededor del contorno
uniform float uSmokeEdge;   // qué tan adentro llega el aro
uniform float uSmokeWobble; // cuánto varía el radio con el ángulo

// --- sesgo espacial opcional ---
uniform float uSpatial;
uniform float uDirection;
uniform float uAngle;

// --- acabado ---
uniform float uGrain;
uniform float uGrainScale;
uniform float uSaturation;
uniform float uShading;

in vec2 vUv;
out vec4 outColor;

const float TAU = 6.28318530718;

// ---------- ruido ----------
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x),
    mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

const mat2 ROT = mat2(1.6, 1.2, -1.2, 1.6);

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * vnoise(p);
    p = ROT * p;
    a *= 0.5;
  }
  return v;
}

// ---------- rampa con paradas posicionables ----------
// Mezcla progresiva: se arranca en la primera parada y se va empujando hacia
// cada siguiente con un smoothstep entre sus posiciones. Con smoothstep en vez
// de mix lineal las uniones no dejan el quiebre visible que delata una rampa.
vec3 rampColor(float t) {
  vec3 col = uStopColor[0];
  for (int i = 0; i < 5; i++) {
    if (i + 1 >= uStopCount) break;
    col = mix(col, uStopColor[i + 1], smoothstep(uStopPos[i], uStopPos[i + 1], t));
  }
  return col;
}

const float FIT = 1.45;

void main() {
  vec2 uv = vUv * FIT;
  float radius = length(uv);

  if (radius > FIT) {
    outColor = vec4(0.0);
    return;
  }

  // Normal de esfera: proyecta el disco sobre un hemisferio para que el flujo
  // se lea envuelto en volumen y no pintado sobre un circulo plano.
  float rc = min(radius, 1.0);
  float z = sqrt(max(0.0, 1.0 - rc * rc));
  vec2 sphereUv = uv / (z * 0.65 + 0.35);

  float energy = uActivity * uPresence;

  // ================= CAPA 1: campo de luminancia =================
  // Domain warping: se distorsiona el espacio dos veces con ruido fractal
  // antes de muestrear. Produce flujo continuo en vez de manchas discretas.
  vec2 p = sphereUv * uFlowScale;
  float t = uTime * uFlowSpeed;

  vec2 q = vec2(
    fbm(p + t * 0.10),
    fbm(p + vec2(5.2, 1.3) - t * 0.08)
  );

  vec2 r = vec2(
    fbm(p + 2.2 * q + vec2(1.7, 9.2) + t * 0.14),
    fbm(p + 2.2 * q + vec2(8.3, 2.8) - t * 0.11)
  );

  float base = fbm(p + 2.4 * r + t * 0.05);

  // Componente de gran escala. Los 7 ovalos de ElevenLabs son mas grandes que
  // el propio orbe (semieje de hasta 4.5 en un radio de ~1.4), asi que su campo
  // de luminancia es enorme y suave. Un fBm de 5 octavas es lo contrario: mucho
  // detalle fino, y al mapearlo contra la rampa el color queda marmoleado.
  // uSmoothness mezcla hacia una sola octava de baja frecuencia.
  float suave = vnoise(p * 0.5 + r * 0.7 + t * 0.04);
  base = mix(base, suave, uSmoothness);

  base = clamp((base - 0.5) * uContrast + 0.5, 0.0, 1.0);

  // ================= CAPA 2: humo blanco =================
  // Un aro que entra desde el borde hacia adentro, no una textura repartida
  // por todo el disco. El truco, tomado de ElevenLabs: el ruido NO depende del
  // radio. Depende sólo del ángulo, y lo que devuelve es un radio umbral por
  // cada ángulo. Todo lo que queda por fuera de ese umbral se aclara, así que
  // el contorno ondula y muerde hacia el centro.
  float ang = atan(uv.y, uv.x);

  // Se muestrea sobre un círculo en el espacio del ruido: de esa forma es
  // periódico en el ángulo y no aparece una costura en theta = 0. La deriva
  // en el tiempo hace que el contorno respire.
  vec2 circulo = vec2(cos(ang), sin(ang)) * uSmokeScale
               + vec2(uTime * 0.055, uTime * 0.04);
  float nAng = fbm(circulo);

  // La energía hace tres cosas a la vez, no una sola, porque un solo canal de
  // reacción se lee como "más rápido" y no como "más vivo":
  //   1) el aro muerde más hacia el centro (antes 0.10, casi imperceptible)
  //   2) el borde se agita un poco más — sin tocar su ancho/blur
  //   3) el humo se aclara más (ver más abajo, en smokeAmt)
  //
  // Primer intento: 0.32 / x1.85 / x2.1 en las tres a la vez. A energía
  // máxima el orbe se disolvía casi entero en blanco, perdiendo el color de
  // marca — mal calibrado, no mal concepto. La variable suavidad (ancho del
  // borde del aro) queda fija sobre el wobble BASE, no el que crece con
  // energía: si también se ensancha con la energía, el aro deja de leerse
  // como aro y se vuelve una mancha difusa.
  //
  // Segundo intento: lineal en energy, con los tres coeficientes bajados
  // (0.22 / x1.5 / x1.8). El pico ya se ve bien, pero habla normal rara vez
  // llega a energy=1 — vive en 0.3–0.6 la mayor parte del tiempo, y ahí una
  // curva lineal casi no mueve nada (apenas +5% de brillo). boost adelanta
  // la reacción hacia ese rango medio sin tocar el pico.
  float boost = pow(energy, 0.6);

  float wobbleVivo = uSmokeWobble * (1.0 + boost * 0.5);
  float radioBase = mix(1.04, 0.30, uSmokeEdge) - boost * 0.22;
  float radioAro = radioBase + (nAng - 0.5) * wobbleVivo;
  float suavidad = 0.045 + uSmokeWobble * 0.32;

  float humo = smoothstep(radioAro - suavidad, radioAro + suavidad, rc);
  // Intensidad: sube con la energía real del audio, no sólo con la posición
  // del aro. Es el cambio que faltaba — antes el aro se movía un poco pero
  // brillaba siempre igual, así que "hablar fuerte" no se sentía distinto de
  // "hablar quedo".
  float smokeAmt = uSmoke * (1.0 + boost * 0.8);

  float lum = base;

  // ================= sesgo espacial opcional =================
  // A 0 el color depende solo del campo (comportamiento ElevenLabs). Subirlo
  // reintroduce la identidad radial del diseno de Figma.
  float radial = pow(rc, 0.80);
  vec2 eje = vec2(cos(uAngle), sin(uAngle));
  float direccional = dot(uv, eje) * 0.44 + 0.48;
  float espacial = mix(radial, direccional, uDirection);

  float g = mix(lum, espacial, uSpatial);
  g = clamp(g - energy * 0.10, 0.0, 1.0);

  // ================= color =================
  vec3 col = rampColor(g);

  // El aro se aplica DESPUÉS de la rampa. ElevenLabs lo mezcla antes, pero se
  // lo puede permitir porque su rampa remata en blanco puro: subir la
  // luminancia allá equivale a blanquear. Con una paleta que termina en otro
  // color —como la de Silia, que acaba en olivo— hacerlo antes empujaría hacia
  // ese color en vez de aclarar. Aplicado aquí, es blanco con cualquier paleta.
  // Sigue siendo screen: 1-(1-a)*(1-b), que aclara sin ensuciar.
  col = 1.0 - (1.0 - col) * (1.0 - humo * smokeAmt);

  // Sombreado direccional: separa "disco pintado" de "objeto con volumen".
  float lambert = dot(normalize(vec3(-eje * 0.9, 0.62)), vec3(uv, z));
  col *= 1.0 + (lambert - 0.35) * uShading;

  float rim = pow(1.0 - z, 3.0);
  col = mix(col, col * 1.10 + 0.02, rim * 0.28);

  float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(luma), col, uSaturation);

  // ---------- lineal -> sRGB ----------
  // Todo lo anterior se mezclo en espacio lineal (por eso los medios tonos no
  // salen lodosos). Hay que volver a sRGB o el orbe se ve mas oscuro que los
  // hex que eligio diseno.
  col = clamp(col, 0.0, 1.0);
  col = mix(
    col * 12.92,
    1.055 * pow(col, vec3(1.0 / 2.4)) - 0.055,
    step(0.0031308, col)
  );

  // ---------- grano y dither ----------
  // Grano re-sembrado cada frame, por eso hierve como pelicula. uGrainScale lo
  // engrosa agrupando pixeles: a 1.0 es ruido digital fino, a 2.0+ se acerca a
  // la textura de emulsion.
  vec2 celda = floor(gl_FragCoord.xy / max(1.0, uGrainScale));
  float gr = hash12(celda + uSeed + fract(uTime * 0.37) * 431.0);
  col += (gr - 0.5) * uGrain * (0.55 + 0.45 * (1.0 - rc));

  // Dither triangular al nivel de cuantizacion de 8 bits. Sin esto la gradiente
  // hace bandas visibles en pantallas normales.
  float d1 = hash12(gl_FragCoord.xy + 0.5);
  float d2 = hash12(gl_FragCoord.yx + 1.5);
  col += (d1 + d2 - 1.0) / 255.0;

  // ---------- alpha ----------
  float px = 2.0 * FIT / uResolution.y;
  float alpha = 1.0 - smoothstep(1.0 - px * 1.5, 1.0, radius);

  float glow = (1.0 - smoothstep(1.0, 1.0 + 0.26 * (0.50 + energy), radius)) * step(1.0, radius);
  alpha = max(alpha, pow(glow, 1.5) * (0.045 + energy * 0.15));

  outColor = vec4(clamp(col, 0.0, 1.0) * alpha, alpha); // premultiplicado
}`;

/**
 * Rampa por defecto: paleta Silia repartida de sombra a luz.
 * A diferencia de un degradado espacial, aqui la posicion es luminancia — la
 * parada 0 pinta las zonas mas oscuras del campo y la ultima las mas claras.
 */
const DEFAULT_STOPS = [
  { color: "#ffffff", pos: 0.08 }, // luz especular
  { color: "#2b90e3", pos: 0.25 }, // azul de marca
  { color: "#73f359", pos: 0.55 }, // verde brillante
  { color: "#2b90e3", pos: 0.67 }, // vuelve al azul: crea la banda interior
  { color: "#92d232", pos: 0.76 }, // verde oliva en las zonas altas
];

const DEFAULT_LOOK = {
  flowScale: 0.3,
  flowSpeed: 0.8,
  contrast: 1.25,
  smoothness: 0,
  smoke: 0.62,
  smokeScale: 2.4,
  // Ojo: `smokeEdge` cambió de significado al volverse aro. Antes era "cuánto
  // se empuja el humo hacia el borde"; ahora es "qué tan adentro entra el aro".
  smokeEdge: 0.14,
  smokeWobble: 0.32,
  spatial: 0.63,
  direction: 1,
  angle: 3.89,
  grain: 0.105,
  grainScale: 1,
  saturation: 1.01,
  shading: 0.65,
};

const STATE_TARGETS = {
  idle: { speed: 0.35, activity: 0.0, presence: 0.55 },
  connecting: { speed: 0.9, activity: 0.35, presence: 0.8 },
  listening: { speed: 0.55, activity: 0.0, presence: 1.0 },
  thinking: { speed: 1.5, activity: 0.45, presence: 1.0 },
  speaking: { speed: 0.7, activity: 0.0, presence: 1.0 },
};

export class SiliaOrb {
  constructor(canvas, options = {}) {
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      depth: false,
      stencil: false,
      antialias: false,
      premultipliedAlpha: true,
      powerPreference: "low-power",
    });

    if (!gl) {
      this.supported = false;
      canvas.style.background =
        options.fallbackBackground ||
        "radial-gradient(circle at 50% 42%, #f4fbc8 0%, #a9d16b 24%, #3fbc9a 48%, #3690d8 74%, #0f2c4d 100%)";
      canvas.style.borderRadius = "50%";
      return;
    }

    this.supported = true;
    this.gl = gl;
    this.canvas = canvas;
    this.maxSize = options.maxSize ?? 512;
    this.look = { ...DEFAULT_LOOK, ...(options.look || {}) };
    if (options.grain != null) this.look.grain = options.grain;
    this.stops = (options.stops || DEFAULT_STOPS).map((s) => ({ ...s }));

    this.program = this._buildProgram();
    gl.useProgram(this.program);

    const u = (name) => gl.getUniformLocation(this.program, name);
    this.uniforms = {
      time: u("uTime"),
      activity: u("uActivity"),
      presence: u("uPresence"),
      resolution: u("uResolution"),
      seed: u("uSeed"),
      stopColor: u("uStopColor"),
      stopPos: u("uStopPos"),
      stopCount: u("uStopCount"),
      flowScale: u("uFlowScale"),
      flowSpeed: u("uFlowSpeed"),
      contrast: u("uContrast"),
      smoothness: u("uSmoothness"),
      smoke: u("uSmoke"),
      smokeScale: u("uSmokeScale"),
      smokeEdge: u("uSmokeEdge"),
      smokeWobble: u("uSmokeWobble"),
      spatial: u("uSpatial"),
      direction: u("uDirection"),
      angle: u("uAngle"),
      grain: u("uGrain"),
      grainScale: u("uGrainScale"),
      saturation: u("uSaturation"),
      shading: u("uShading"),
    };

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, 1, -1, -1, 1, 1, 1, -1]),
      gl.STATIC_DRAW
    );
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);
    this.buffer = buffer;

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); // alpha premultiplicado

    gl.uniform1f(this.uniforms.seed, Math.random() * 1000);
    this.setLook(this.look);
    this.setStops(this.stops);

    // Constantes de tiempo de la reactividad al audio, en segundos.
    // Valores medidos; ver README. Subir `attack` la vuelve más serena,
    // bajarlo la vuelve más nerviosa.
    this.attack = options.attack ?? 0.1;
    this.release = options.release ?? 0.4;

    this.state = "idle";
    this.time = 0;
    this.speed = STATE_TARGETS.idle.speed;
    this.activity = 0;
    this.presence = STATE_TARGETS.idle.presence;
    this.inputVolume = 0;
    this.outputVolume = 0;
    this.lastFrame = performance.now();

    this.reducedMotion =
      typeof matchMedia === "function" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;

    this._observeSize();
    this._observeVisibility();
    this.running = true;
    this.rafId = requestAnimationFrame(this._render);
  }

  // ------------------------------------------------------------------ API

  /** idle | connecting | listening | thinking | speaking */
  setState(state) {
    if (STATE_TARGETS[state]) this.state = state;
  }

  /** Ambos valores 0..1. Llamar cada frame desde el loop de audio. */
  updateVolume(input, output) {
    this.inputVolume = clamp01(input);
    this.outputVolume = clamp01(output);
  }

  /** Paradas de la rampa: [{ color: "#rrggbb", pos: 0..1 }], hasta 6. */
  setStops(stops) {
    if (!this.gl) return;
    const lista = stops
      .slice(0, MAX_STOPS)
      .map((s) => ({ color: s.color, pos: clamp01(s.pos) }))
      .sort((a, b) => a.pos - b.pos);

    this.stops = lista;

    const colores = new Float32Array(MAX_STOPS * 3);
    const posiciones = new Float32Array(MAX_STOPS);
    for (let i = 0; i < MAX_STOPS; i++) {
      const s = lista[Math.min(i, lista.length - 1)];
      const [r, g, b] = hexToLinear(s.color);
      colores[i * 3] = r;
      colores[i * 3 + 1] = g;
      colores[i * 3 + 2] = b;
      posiciones[i] = s.pos;
    }

    this.gl.useProgram(this.program);
    this.gl.uniform3fv(this.uniforms.stopColor, colores);
    this.gl.uniform1fv(this.uniforms.stopPos, posiciones);
    this.gl.uniform1i(this.uniforms.stopCount, lista.length);
  }

  getStops() {
    return this.stops.map((s) => ({ ...s }));
  }

  /** Compatibilidad: lista de hex repartida uniformemente. */
  setColors(hexList) {
    const n = hexList.length;
    this.setStops(
      hexList.map((color, i) => ({ color, pos: n === 1 ? 0 : i / (n - 1) }))
    );
  }

  setGrain(amount) {
    this.setLook({ grain: amount });
  }

  /** Aplica un acabado parcial o completo. Ver DEFAULT_LOOK para las claves. */
  setLook(parcial) {
    Object.assign(this.look, parcial);
    if (!this.gl) return;
    this.gl.useProgram(this.program);
    for (const [clave, valor] of Object.entries(this.look)) {
      const loc = this.uniforms[clave];
      if (loc) this.gl.uniform1f(loc, valor);
    }
  }

  getLook() {
    return { ...this.look };
  }

  /**
   * Constantes de tiempo de la respuesta al audio, en segundos.
   * `attack` manda en qué tan brusco se siente el arranque del sonido.
   */
  setResponse({ attack, release } = {}) {
    if (attack != null) this.attack = Math.max(0.01, attack);
    if (release != null) this.release = Math.max(0.02, release);
  }

  getResponse() {
    return { attack: this.attack, release: this.release };
  }

  /** PNG del frame actual — útil para exportar a Figma o usar como avatar. */
  toDataURL() {
    if (!this.gl) return null;
    this._drawFrame(); // redibuja: el buffer no se preserva entre frames
    return this.canvas.toDataURL("image/png");
  }

  dispose() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.resizeObserver?.disconnect();
    if (this._onVisibility) {
      document.removeEventListener("visibilitychange", this._onVisibility);
    }
    if (this.gl) {
      this.gl.deleteProgram(this.program);
      this.gl.deleteBuffer(this.buffer);
      this.gl.getExtension("WEBGL_lose_context")?.loseContext();
    }
    this.gl = null;
  }

  // -------------------------------------------------------------- interno

  _buildProgram() {
    const gl = this.gl;
    const compile = (type, src) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error("[SiliaOrb] shader: " + log);
      }
      return shader;
    };

    const program = gl.createProgram();
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.bindAttribLocation(program, 0, "position");
    gl.linkProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error("[SiliaOrb] link: " + gl.getProgramInfoLog(program));
    }
    return program;
  }

  _observeSize() {
    const apply = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = this.canvas.getBoundingClientRect();
      const size = Math.max(
        1,
        Math.min(this.maxSize, Math.round(Math.min(rect.width, rect.height) * dpr))
      );
      if (this.canvas.width !== size || this.canvas.height !== size) {
        this.canvas.width = size;
        this.canvas.height = size;
        this.gl.viewport(0, 0, size, size);
        this.gl.useProgram(this.program);
        this.gl.uniform2f(this.uniforms.resolution, size, size);
      }
    };
    apply();
    this.resizeObserver = new ResizeObserver(apply);
    this.resizeObserver.observe(this.canvas);
  }

  _observeVisibility() {
    // Pausar en pestaña oculta: el orbe corre a 60fps y no vale gastar batería.
    this._onVisibility = () => {
      if (document.hidden) {
        if (this.rafId) cancelAnimationFrame(this.rafId);
        this.rafId = null;
      } else if (this.running && !this.rafId) {
        this.lastFrame = performance.now();
        this.rafId = requestAnimationFrame(this._render);
      }
    };
    document.addEventListener("visibilitychange", this._onVisibility);
  }

  _drawFrame() {
    const gl = this.gl;
    gl.useProgram(this.program);
    gl.uniform1f(this.uniforms.time, this.time);
    gl.uniform1f(this.uniforms.activity, this.activity);
    gl.uniform1f(this.uniforms.presence, this.presence);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  _render = () => {
    if (!this.gl || !this.running) {
      this.rafId = null;
      return;
    }

    const now = performance.now();
    const dt = Math.min((now - this.lastFrame) / 1000, 1 / 20);
    this.lastFrame = now;

    const target = STATE_TARGETS[this.state];

    // El volumen que manda depende de quién tiene el turno.
    const live =
      this.state === "speaking"
        ? this.outputVolume
        : this.state === "listening"
          ? this.inputVolume
          : 0;

    // La compuerta y la normalización ya viven en AudioLevels, así que aquí
    // sólo queda una gamma suave. La curva cóncava anterior (1-(v-1)²) subía
    // los volúmenes bajos con demasiada fuerza y amplificaba el ruido de sala.
    const shaped = Math.pow(live, 0.8);
    const targetActivity = Math.max(target.activity, shaped);

    // Ataque rápido pero finito, caída lenta. El salto instantáneo que usaba
    // antes es lo que hacía sentir brusca la reacción: medido sobre una voz
    // sintética, producía 10 saltos de más de 0.12 por corrida y un salto
    // máximo de 0.339. Con constantes de tiempo queda en 1 salto y 0.131,
    // sin perder viveza.
    const tau = targetActivity > this.activity ? this.attack : this.release;
    this.activity += (targetActivity - this.activity) * (1 - Math.exp(-dt / tau));

    this.presence += (target.presence - this.presence) * (1 - Math.pow(0.08, dt));

    const targetSpeed = target.speed + this.activity * 2.0;
    this.speed += (targetSpeed - this.speed) * (1 - Math.pow(0.05, dt));

    this.time += dt * (this.reducedMotion ? 0.08 : this.speed);

    this._drawFrame();
    this.rafId = requestAnimationFrame(this._render);
  };
}

// ----------------------------------------------------------------- utils

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : Number.isFinite(v) ? v : 0;
}

/** sRGB hex -> lineal, para que las mezclas del shader no salgan lodosas. */
function hexToLinear(hex) {
  const h = String(hex).replace("#", "");
  const full = h.length === 3 ? h[0] + h[0] + h[1] + h[1] + h[2] + h[2] : h;
  const to = (i) => {
    const c = parseInt(full.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return [to(0), to(2), to(4)];
}

export { DEFAULT_STOPS, DEFAULT_LOOK, MAX_STOPS };
