# Licencias y atribución — skill `motion-intelligence`

Este skill reproduce **valores numéricos** (duraciones, curvas, umbrales) de fuentes públicas y los organiza con prosa propia. Los números no son protegibles por derecho de autor; los nombres de tokens se citan como identificadores. Donde una fuente tiene licencia que exige atribución, se cumple aquí y en `THIRD_PARTY_NOTICES.md`.

| Fuente | Licencia | Qué se usa | Atribución requerida |
|---|---|---|---|
| IBM Carbon Design System (carbon-design-system/carbon) | Apache-2.0 | eases productive/expressive, escala de duraciones, stagger 20 ms, tope 500 ms, orden de entrada, regla de grilla | © IBM Corp.; Apache License 2.0 — https://www.apache.org/licenses/LICENSE-2.0 |
| Material Design 3 — Motion (material.io) | CC BY 4.0 | eases standard/emphasized, duraciones md.sys.motion.duration, guía de stagger | "Material Design, Google" — https://creativecommons.org/licenses/by/4.0/ |
| easings.net (Andrey Sitnik, Ivan Solovev) | MIT | beziers de quart/quint/expo/back | © easings.net contributors, MIT |
| Shopify Polaris | MIT | `--p-motion-ease-in-out` | © Shopify, MIT |
| LobzyJay/motion-design-with-claude | MIT | rangos numéricos (anticipación, stagger, inertia, wiggle) y el patrón Mode A / Mode B; patrones de expresión reescritos | © LobzyJay, MIT |
| eKeys, eBox (motiondeveloper / Tim Haywood) | MIT | conceptos; implementación propia sobre `ease()` / `sourceRectAtTime()` | © Tim Haywood, MIT |
| pushREC/after-effects-sdk-kb | MIT | referencia ExtendScript servida en `ae://sdk` | © pushREC, MIT |
| AniMINT (arXiv 2604.26148) | CC BY 4.0 | taxonomía de 7 intenciones, hallazgos sobre muestreo y frames | autores del paper — CC BY 4.0 |
| WebVR (arXiv 2603.13391) | CC BY 4.0 | disciplina de rúbrica binaria atómica y cifras de acuerdo | autores del paper — CC BY 4.0 |
| Microsoft Fluent 2 | — | solo valores numéricos de curvas y duraciones; nombres descriptivos propios | no aplica (números) |
| Atlassian Design System | — | solo valores numéricos | no aplica (números) |
| Apple HIG / SwiftUI | — | solo valores numéricos (bounce ≤ 0.1, 200–400 ms) | no aplica (números) |
| GSAP (GreenSock) | — | nombres de ease como referencia cruzada; los números son aproximaciones CSS de Penner | no aplica (nombres/números) |
| CSS Transitions Level 1 (W3C) | W3C Document License | palabras clave de ease | referencia |
| Val Head, valhead.com | — | cifras citadas (200–500, 100, 230 ms) | cita |
| UX in Motion Manifesto (Issara Willenskomer) | — | los 12 nombres de principios; glosas propias | cita de nombres |
| LottieFiles motion-design-skill | — | nombres de arquetipos | cita de nombres |
| Netflix Timed Text Style Guide, BBC Subtitle Guidelines, legibility.info | — | solo valores numéricos | no aplica (números) |
| SMPTE RP 218 / EBU R95 | — | porcentajes de safe area (práctica de la industria) | no aplica |
| Adobe After Effects Scripting Guide | © Adobe | modelo KeyframeEase (referencia de API) | referencia |
| Silia editorial | house | `product_video`, house style SaaS, reglas de texto | opinión propia, `opinion:true` |

Ninguna tabla de una fuente externa se copia literal: los valores se recombinan en tablas propias con columnas nuestras (influencias AE, rol, uso). Si una fuente cambia sus números, la verdad está en `src/motion/*.ts`, no aquí.
