<!-- Source: pushREC/after-effects-sdk-kb, scripting/01-extendscript-complete-reference.md (MIT; see data/LICENSES/pushREC-after-effects-sdk-kb.LICENSE). Content derived from https://ae-scripting.docsforadobe.dev/ — coverage AE 26.0 (January 2026). Split per object by ae-mcp; category: Items. -->

# FootageItem Object

_Category: Items · URI: ae://sdk/FootageItem_

Represents imported footage. Subclass of AVItem.

#### Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `file` | File or null | Source file (same as `mainSource.file` for FileSource) |
| `mainSource` | FootageSource | All source settings and interpretation |

#### Methods

**`footageItem.openInViewer()`**
Opens in Footage panel (works with missing footage).
- Returns: Viewer or null

**`footageItem.replace(file)`**
Replaces source; preserves interpretation.

**`footageItem.replaceWithPlaceholder(name, width, height, frameRate, duration)`**

**`footageItem.replaceWithSequence(file, forceAlphabetical)`**

**`footageItem.replaceWithSolid(color, name, width, height, pixelAspect)`**

---
