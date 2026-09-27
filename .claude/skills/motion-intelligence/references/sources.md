# Fuentes

Los números son hechos y llevan su origen; la prosa, las glosas y la síntesis son nuestras. Licencias y qué se tomó de cada una: `../LICENSES.md`. La copia canónica con atribución por valor está en `src/motion/*.ts` del repo del MCP y en los recursos `motion://`.

## Sistemas de diseño (registro functional_ui)

| Fuente | Qué aporta | Licencia |
|---|---|---|
| IBM Carbon Design System — Motion | eases productive/expressive (bezier), duraciones 70/110/150/240/400/700, stagger 20 ms, secuencia ≤ 500 ms, orden de entrada shell→body→data→action→dataviz, mover por grilla | Apache-2.0 |
| Material 3 — Motion (Material Design, Google) | eases standard/emphasized (bezier), duraciones 50–1000 en cuatro bandas, desktop 150–200 ms, stagger de lista ≤ 20 ms | CC BY 4.0 |
| Microsoft Fluent 2 — Motion | curvas easeOut/easeIn/easeInOut, duraciones 50–500 | números |
| Atlassian Design System — Motion | ease-out-bold y compañía, < 150 ms para acciones repetidas, bandas 50–150 / 150–400 | números |
| Apple Human Interface Guidelines / SwiftUI | springs como duración + bounce; bounce ≤ 0.1 para UI; banda 200–400 ms | números |
| Shopify Polaris — motion tokens | `polaris_ease_in_out` | MIT |
| CSS Transitions Level 1 (W3C) | eases por palabra clave | números |
| Val Head, "How fast should your UI animations be?" (valhead.com) | banda 200–500 ms; 100 ms lee instantáneo; ~230 ms para percibir; eases complejas necesitan más duración | cita |

## Vocabulario y arquetipos

| Fuente | Qué aporta | Licencia |
|---|---|---|
| UX in Motion Manifesto (Issara Willenskomer) | los 12 nombres de principios/dispositivos; glosas y técnicas AE son nuestras | nombres |
| LottieFiles motion-design-skill | arquetipos Playful / Premium / Corporate / Energetic (concepto y nombres) | nombres |
| LobzyJay/motion-design-with-claude | anticipación 40–80 ms; stagger 40–120 ms; evitar 300 ms uniforme; inertia amp 0.04–0.12 / freq 2–4 / decay 4–8; wiggle drift 0.5 Hz·8 px vs jitter 24 Hz·2 px; Mode A live vs Mode B batch (> 5 ops) | MIT |
| GSAP (GreenSock) | nombres de eases; los números son las aproximaciones CSS estándar de las ecuaciones de Robert Penner | números |
| easings.net (Andrey Sitnik, Ivan Solovev) | `ease_out_quart/quint/expo`, `ease_in_out_quint`, `ease_out_back`, `ease_in_out_back` | MIT |
| Adobe After Effects Scripting Guide — KeyframeEase | modelo influencia/velocidad; base de la conversión bezier → KeyframeEase | referencia |
| pushREC/after-effects-sdk-kb | referencia ExtendScript AE 26 servida como `ae://sdk` | MIT |
| eKeys / eBox (motiondeveloper, Tim Haywood) | conceptos de `ekeys_style`, `ebox_responsive`, `ebox_center` | MIT |
| Dan Ebberts | patrones de inertia y bounce (ampliamente publicados) | patrón |

## Tipografía y legibilidad

| Fuente | Qué aporta | Licencia |
|---|---|---|
| legibility.info | ≤ 30 caracteres por línea, ≤ 3 líneas, ~13 CPS para cuerpo | números |
| Netflix Timed Text Style Guide | 42 chars/línea, 2 líneas, 17 CPS adulto / 20 máx., evento 5/6 s – 7 s | números |
| BBC Subtitle Guidelines | piso 0.3 s por palabra; 2 líneas preferidas | números |
| SMPTE RP 218 / EBU R95 | title-safe 80 %, action-safe 90 % | práctica |
| Silia (house) | body ≥ 40 px @1080, caption 28 px, hold 1 s / 13 chars, ES Klarheit Grotesk, negro sobre lime | opinión |

## Ciencia de la crítica

| Fuente | Qué aporta | Licencia |
|---|---|---|
| AniMINT — "Beyond Screenshots: Evaluating VLMs' Understanding of UI Animations" (arXiv 2604.26148) | 7 intenciones; los frames solos juzgan QUÉ se movió, no cómo; muestreo ≥ 10 fps; separar hechos de timing de juicios perceptuales | CC BY 4.0 |
| WebVR — evaluación de motion/visual quality con rúbricas binarias atómicas (arXiv 2603.13391) | un atributo por ítem; acuerdo 59–67 % → 96 %; lo indecidible por números pasa a visión; parar tras dos pasadas; correcciones numéricas | CC BY 4.0 |

## House style (sin fuente autoritativa)

Las convenciones de video SaaS/producto — hero 600–900 ms expo/quint, entradas UI 300–400 quart, staggers 60–120, zoom-cuts 400–600 con bounce ≤ 0.1, glow antes que posición en oscuro, nunca glow a 0, un foco por beat, reposo de texto — son **opinión de Silia editorial**, marcadas `opinion:true` en `motion://house-style/saas-video`. Coinciden numéricamente con el registro `product_video` de `taxonomy.ts`.
