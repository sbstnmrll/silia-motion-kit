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
