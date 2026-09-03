# Third-party notices

This project vendors and adapts code from the following MIT-licensed projects. Each notice
is reproduced as required by the license. Adapted files carry a header comment naming
their origin.

## premiere-pro-mcp (leancoderkavy/premiere-pro-mcp)

Upstream commit vendored: `5038b4d376176facb49724fa6f0979a6a3139ae9` (v1.14.7, 2026-09-02).
Adapted: file bridge protocol and polling (`src/bridge/file-transport.ts`), script builder
(`src/bridge/script-builder.ts`), capability/authority model (`src/security/*`), server
registration loop (`src/server.ts`), CLI dispatch (`src/index.ts`), CEP executor
(`cep-plugin/main.js`, `cep-plugin/index.html`, `cep-plugin/styles.css`, `cep-plugin/CSInterface.js`),
install scripts (`scripts/install-cep.ps1`, `scripts/build-signed-cep.ps1`).

```
MIT License

Copyright (c) 2025 Premiere Pro MCP Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## after-effects-mcp (Dakkshin/after-effects-mcp) and community bundle (juansilvadesign, morioka185, dellis23, Boke-kun, sneakersk18, shaunroot)

Upstream commits: Dakkshin `88d5fbf`, juansilvadesign `feat/community-tools-bundle` `b14e334`.
Adapted: ExtendScript patterns for compositions, layers, keyframes, easing, text animators,
trim paths, track mattes, lights, render queue and frame capture (`src/jsx/helpers.jsx`,
`src/tools/*`). MIT License, Copyright (c) 2025 Dakkshin and contributors.

## after-effects-mcp (ishu86/after-effects-mcp) and (TheLlamainator/after-effects-mcp)

Upstream commits: ishu86 `8d14179`, TheLlamainator `e4a4620`. Used as structural reference for
motion-graphics templates, expression presets, and audio-to-marker tools. MIT License.

## CSInterface.js (Adobe Systems Incorporated)

`cep-plugin/CSInterface.js` is a minimal shim derived from Adobe's CSInterface, used under the
Adobe CEP license terms reproduced in its header.

## json2.js (Douglas Crockford)

`src/jsx/vendor/json2.js` is public domain (https://github.com/douglascrockford/JSON-js).

## after-effects-sdk-kb (pushREC/after-effects-sdk-kb)

`data/sdk/*.md` (served as `ae://sdk` and `ae://sdk/{object}`) is `scripting/01-extendscript-complete-reference.md`
from https://github.com/pushREC/after-effects-sdk-kb split per scripting object. The compilation, organisation and
annotations are MIT (Copyright (c) 2026 pushREC; full text in `data/LICENSES/pushREC-after-effects-sdk-kb.LICENSE`).
The API signatures and descriptions it contains derive from Adobe's public After Effects scripting documentation
(https://ae-scripting.docsforadobe.dev/) and remain subject to their original terms.

## motion-design-with-claude (LobzyJay/motion-design-with-claude)

Expression patterns and parameter ranges (inertia/bounce amplitude 0.04–0.12, frequency 2–4, decay 4–8; wiggle
drift/jitter values) in `src/motion/expressions.ts` follow this MIT-licensed project. The expression text here is
re-written. MIT License, Copyright (c) LobzyJay.

## eKeys and eBox (motiondeveloper / Tim Haywood)

`ekeys_style`, `ebox_responsive` and `ebox_center` in `src/motion/expressions.ts` implement the *concepts* of
eKeys (inline keyframes) and eBox (responsive text boxes via `sourceRectAtTime`) with After Effects' built-in
`ease()`/`linear()`; no eKeys/eBox source is vendored. Both projects are MIT, Copyright (c) Tim Haywood.

## easings.net (Andrey Sitnik, Ivan Solovev)

The cubic-bezier values for `ease_out_quart`, `ease_out_quint`, `ease_out_expo`, `ease_in_out_quint`,
`ease_out_back` and `ease_in_out_back` in `src/motion/eases.ts` are from https://easings.net (MIT).

## Shopify Polaris

`polaris_ease_in_out` in `src/motion/eases.ts` is the `--p-motion-ease-in-out` token from Polaris (MIT,
Copyright (c) Shopify).

## IBM Carbon Design System (Apache License 2.0)

Motion easing curves (`carbon_productive_*`, `carbon_expressive_*`) and duration tokens (`fast-01` … `slow-02`) in
`src/motion/eases.ts` and `src/motion/durations.ts`, and the entrance ordering in `src/motion/taxonomy.ts`, are
taken from the Carbon Design System motion guidance and `@carbon/motion` (https://github.com/carbon-design-system/carbon),
Copyright IBM Corp. 2016, 2023. Licensed under the Apache License, Version 2.0 (the "License"); you may not use
these files except in compliance with the License. You may obtain a copy of the License at
http://www.apache.org/licenses/LICENSE-2.0. Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
either express or implied. See the License for the specific language governing permissions and limitations under
the License. The distance→duration formula in `durations.ts` is our synthesis of Carbon's described non-linearity,
not Carbon's own.

## Material Design (Google) — CC BY 4.0

Material 3 easing tokens (`material_standard`, `material_standard_decelerate`, `material_standard_accelerate`,
`material_emphasized_decelerate`, `material_emphasized_accelerate`, `material_legacy_standard`) and duration bands
(short/medium/long/extra-long) in `src/motion/eases.ts` and `src/motion/durations.ts` are from the Material Design
guidelines (https://m3.material.io/styles/motion), by Material Design, Google, used under the Creative Commons
Attribution 4.0 International license (https://creativecommons.org/licenses/by/4.0/). Values are reproduced as
numbers; descriptions are ours.

## Fluent 2 (Microsoft) and Atlassian Design System

`fluent_*` and `atlassian_*` eases and their duration scales are numeric values reproduced from public design
documentation; only the numbers are used, with descriptive names.

## Research cited (CC BY 4.0)

- AniMINT: "Beyond Screenshots: Evaluating VLMs' Understanding of UI Animations", arXiv 2604.26148. Used for the 7 animation intents (src/motion/taxonomy.ts), the ~10 fps sampling floor and the auto/vision split of rubric items (src/tools/vision.ts, src/motion/rubric.ts).
- WebVR visual rubrics, arXiv 2603.13391. Used for atomic single-attribute binary rubric design and the numeric-vs-perceptual separation (src/motion/rubric.ts, src/tools/vision.ts).
