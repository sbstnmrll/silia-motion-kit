<!-- Source: pushREC/after-effects-sdk-kb, scripting/01-extendscript-complete-reference.md (MIT; see data/LICENSES/pushREC-after-effects-sdk-kb.LICENSE). Content derived from https://ae-scripting.docsforadobe.dev/ — coverage AE 26.0 (January 2026). Split per object by ae-mcp; category: Items. -->

# AVItem Object

_Category: Items · URI: ae://sdk/AVItem_

Base class for CompItem and FootageItem. Access: `app.project.item(index)`.

#### Attributes

| Attribute | Type | Access | Description |
|-----------|------|--------|-------------|
| `duration` | Float [0–10800] | CompItem: R/W; FootageItem: R/O | Duration in seconds |
| `footageMissing` | Boolean | R/O | Placeholder or missing source |
| `frameDuration` | Float | FootageItem: R/O; else R/W | Frame duration in seconds |
| `frameRate` | Float [1–99] | FootageItem: R/O; else R/W | Frames per second |
| `hasAudio` | Boolean | R/O | Contains audio |
| `hasVideo` | Boolean | R/O | Contains video |
| `height` | Integer [1–30000] | R/W (some restrictions) | Height in pixels |
| `isMediaReplacementCompatible` | Boolean | R/O | Supports alternate source (AE 18.0+) |
| `name` | String | R/W | Display name |
| `pixelAspect` | Float [0.01–100] | R/W | Pixel aspect ratio |
| `proxySource` | FootageSource | R/O | Current proxy source |
| `time` | Float | R/W | Current preview time |
| `usedIn` | CompItem[] | R/O | Compositions using this item |
| `useProxy` | Boolean | R/W | Proxy active |
| `width` | Integer [1–30000] | R/W (some restrictions) | Width in pixels |

#### Methods

**`avItem.setProxy(file)`** — Sets proxy source.

**`avItem.setProxyToNone()`** — Removes proxy.

**`avItem.setProxyWithPlaceholder(name, width, height, frameRate, duration)`**

**`avItem.setProxyWithSequence(file, forceAlphabetical)`**

**`avItem.setProxyWithSolid(color, name, width, height, pixelAspect)`**
- `color`: `[R, G, B]` values 0.0–1.0

---
