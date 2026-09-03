<!-- Source: pushREC/after-effects-sdk-kb, scripting/01-extendscript-complete-reference.md (MIT; see data/LICENSES/pushREC-after-effects-sdk-kb.LICENSE). Content derived from https://ae-scripting.docsforadobe.dev/ — coverage AE 26.0 (January 2026). Split per object by ae-mcp; category: Text. -->

# CharacterRange Object

_Category: Text · URI: ae://sdk/CharacterRange_

> **Added AE 24.3.** Access character-level styling across a range.

Access: `textDocument.characterRange(characterStart, [signedCharacterEnd])`

- `characterEnd - characterStart` = number of characters
- When attributes differ across range: returns `undefined`
- Zero-length ranges valid for most attributes

#### Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `characterEnd` | Integer | Calculated end position (read-only) |
| `characterStart` | Integer | Calculated start position (read-only) |
| `fillColor` | Array [r,g,b] | Fill color (`undefined` if mixed) |
| `isRangeValid` | Boolean | Range within TextDocument bounds |
| `kerning` | Integer | Manual kerning (`undefined` if auto-kern or mixed) |
| `strokeColor` | Array [r,g,b] | Stroke color (`undefined` if mixed) |
| `strokeOverFill` | Boolean | Rendering order (`undefined` if mixed) |
| `text` | String | Character content |

#### Methods

**`characterRange.pasteFrom(characterRange)`** *(Added AE 25.1)*
Copies text and styling from source range.

**`characterRange.toString()`** — Returns: String (safe even if invalid)

```javascript
var doc = layer.property("Source Text").value;
var r = doc.characterRange(0, 1);
r.fontSize = r.fontSize + 5;
doc.characterRange(1, -1).fontSize = 40; // -1 = to end
```

---
