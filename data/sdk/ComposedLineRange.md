<!-- Source: pushREC/after-effects-sdk-kb, scripting/01-extendscript-complete-reference.md (MIT; see data/LICENSES/pushREC-after-effects-sdk-kb.LICENSE). Content derived from https://ae-scripting.docsforadobe.dev/ — coverage AE 26.0 (January 2026). Split per object by ae-mcp; category: Text. -->

# ComposedLineRange Object

_Category: Text · URI: ae://sdk/ComposedLineRange_

> **Added AE 24.3.** Access composed-line ranges. Static — doesn't recompose when document is modified.

Access: `textDocument.composedLineRange(composedLineIndexStart, [signedComposedLineIndexEnd])`

#### Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `characterEnd` | Integer | Calculated end position (read-only) |
| `characterStart` | Integer | Calculated start position (read-only) |
| `isRangeValid` | Boolean | Range within bounds |

#### Methods

**`composedLineRange.characterRange()`** — Returns: CharacterRange

**`composedLineRange.toString()`** — Returns: String

```javascript
var doc = layer.property("Source Text").value;
doc.composedLineRange(0, 1).characterRange().fillColor = [1.0, 0, 0];
doc.composedLineRange(1, -1).characterRange().fillColor = [0, 0, 1.0];
```

---
