<!-- Source: pushREC/after-effects-sdk-kb, scripting/01-extendscript-complete-reference.md (MIT; see data/LICENSES/pushREC-after-effects-sdk-kb.LICENSE). Content derived from https://ae-scripting.docsforadobe.dev/ — coverage AE 26.0 (January 2026). Split per object by ae-mcp; category: Sources. -->

# FootageSource Object

_Category: Sources · URI: ae://sdk/FootageSource_

Base class for SolidSource. Access: `footageItem.mainSource` or `item.proxySource`.

#### Attributes

| Attribute | Type | Access | Description |
|-----------|------|--------|-------------|
| `alphaMode` | AlphaMode | R/W | IGNORE, STRAIGHT, PREMULTIPLIED |
| `conformFrameRate` | Float [0–99] | R/W | Override frame rate (0=use native) |
| `displayFrameRate` | Float | R/O | Effective display frame rate |
| `fieldSeparationType` | FieldSeparationType | R/W | OFF, UPPER_FIELD_FIRST, LOWER_FIELD_FIRST |
| `hasAlpha` | Boolean | R/O | Has alpha channel |
| `highQualityFieldSeparation` | Boolean | R/W | High quality field separation |
| `invertAlpha` | Boolean | R/W | Invert alpha |
| `isStill` | Boolean | R/O | Still (vs. time-based) footage |
| `loop` | Integer [1–9999] | R/W | Loop count |
| `nativeFrameRate` | Float | R/O | Original frame rate |
| `premulColor` | Array [R,G,B] | R/W | Premultiply color |
| `removePulldown` | PulldownPhase | R/W | Pulldown removal |

#### Methods

**`footageSource.guessAlphaMode()`** — Estimates alphaMode, premulColor, invertAlpha.

**`footageSource.guessPulldown(method)`**
- `method`: `PulldownMethod.PULLDOWN_3_2` or `ADVANCE_24P`

---
