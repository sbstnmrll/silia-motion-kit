<!-- Source: pushREC/after-effects-sdk-kb, scripting/01-extendscript-complete-reference.md (MIT; see data/LICENSES/pushREC-after-effects-sdk-kb.LICENSE). Content derived from https://ae-scripting.docsforadobe.dev/ — coverage AE 26.0 (January 2026). Split per object by ae-mcp; category: Sources. -->

# FileSource Object

_Category: Sources · URI: ae://sdk/FileSource_

Subclass of FootageSource. Represents file-based footage.

#### Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `file` | File | Source file (read-only) |
| `missingFootagePath` | String | Path of missing footage |

#### Methods

**`fileSource.reload()`** — Reloads from source file (mainSource only).

---
