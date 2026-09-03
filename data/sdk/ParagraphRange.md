<!-- Source: pushREC/after-effects-sdk-kb, scripting/01-extendscript-complete-reference.md (MIT; see data/LICENSES/pushREC-after-effects-sdk-kb.LICENSE). Content derived from https://ae-scripting.docsforadobe.dev/ — coverage AE 26.0 (January 2026). Split per object by ae-mcp; category: Text. -->

# ParagraphRange Object

_Category: Text · URI: ae://sdk/ParagraphRange_

> **Added AE 24.3.** Access paragraph-level ranges within TextDocument.

Access: `textDocument.paragraphRange(paragraphIndexStart, [signedParagraphIndexEnd])`

#### Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `characterEnd` | Integer | Position after last character (read-only) |
| `characterStart` | Integer | First character index (read-only) |
| `isRangeValid` | Boolean | Range within bounds |

#### Methods

**`paragraphRange.characterRange()`** — Returns: CharacterRange

**`paragraphRange.toString()`** — Returns: String

```javascript
var doc = layer.property("Source Text").value;
var para0 = doc.paragraphRange(0, 1);
para0.characterRange().fontSize = 40;
```

---
