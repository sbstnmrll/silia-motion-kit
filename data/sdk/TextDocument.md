<!-- Source: pushREC/after-effects-sdk-kb, scripting/01-extendscript-complete-reference.md (MIT; see data/LICENSES/pushREC-after-effects-sdk-kb.LICENSE). Content derived from https://ae-scripting.docsforadobe.dev/ — coverage AE 26.0 (January 2026). Split per object by ae-mcp; category: Text. -->

# TextDocument Object

_Category: Text · URI: ae://sdk/TextDocument_

Stores text content and formatting for a TextLayer's Source Text property.

**Constructor:** `new TextDocument(docText)`
**Access:** `textLayer.property("Source Text").value`

#### Core Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `text` | String | Text content |

#### Character Formatting

| Attribute | Type | Added | Description |
|-----------|------|-------|-------------|
| `allCaps` | Boolean | AE 13.2 | Read-only; use `fontCapsOption` to set |
| `applyFill` | Boolean | — | Fill display enabled |
| `applyStroke` | Boolean | — | Stroke display enabled |
| `autoKernType` | AutoKernType | AE 24.0 | NO_AUTO_KERN, METRIC_KERN, OPTICAL_KERN |
| `baselineDirection` | BaselineDirection | AE 24.0 | BASELINE_WITH_STREAM, BASELINE_VERTICAL_ROTATED, BASELINE_VERTICAL_CROSS_STREAM |
| `baselineLocs` | Array | AE 13.6 | [x_start, y_start, x_end, y_end, ...] per line |
| `baselineShift` | Float | AE 13.2 | Baseline shift in pixels |
| `digitSet` | DigitSet | AE 24.0 | DEFAULT_DIGITS, ARABIC_DIGITS, HINDI_DIGITS, FARSI_DIGITS, ARABIC_DIGITS_RTL |
| `fauxBold` | Boolean | AE 24.0 (R/W) | Faux bold |
| `fauxItalic` | Boolean | AE 24.0 (R/W) | Faux italic |
| `fillColor` | Array [r,g,b] | — | Fill color |
| `font` | String | — | PostScript font name |
| `fontBaselineOption` | FontBaselineOption | AE 24.0 | FONT_NORMAL_BASELINE, FONT_FAUXED_SUPERSCRIPT, FONT_FAUXED_SUBSCRIPT |
| `fontCapsOption` | FontCapsOption | AE 24.0 | FONT_NORMAL_CAPS, FONT_SMALL_CAPS, FONT_ALL_CAPS, FONT_ALL_SMALL_CAPS |
| `fontFamily` | String | AE 13.1 | Font family name (read-only) |
| `fontLocation` | String | AE 13.1 | Path to font file (read-only) |
| `fontObject` | Font object | AE 24.0 | R/W font reference |
| `fontSize` | Float [0.1–1296] | — | Font size in pixels |
| `fontStyle` | String | AE 13.1 | Style (e.g., "bold", "italic") (read-only) |
| `horizontalScale` | Float | AE 13.2 | Horizontal scale |
| `kerning` | Integer | AE 24.0 | Kerning value |
| `leading` | Float | AE 14.2 | Line spacing |
| `ligature` | Boolean | AE 24.0 | Ligature enabled |
| `lineJoinType` | LineJoinType | AE 24.0 | LINE_JOIN_MITER, LINE_JOIN_ROUND, LINE_JOIN_BEVEL |
| `noBreak` | Boolean | AE 24.0 | No break attribute |
| `smallCaps` | Boolean | AE 13.2 | Read-only; use `fontCapsOption` |
| `strokeColor` | Array [r,g,b] | — | Stroke color |
| `strokeOverFill` | Boolean | — | Stroke renders over fill |
| `strokeWidth` | Float [0–1000] | — | Stroke thickness in pixels |
| `subscript` | Boolean | AE 13.2 | Read-only; use `fontBaselineOption` |
| `superscript` | Boolean | AE 13.2 | Read-only; use `fontBaselineOption` |
| `tracking` | Float | — | Character spacing |
| `tsume` | Float [0–1] | AE 13.2 | Tsume percentage |
| `verticalScale` | Float | AE 13.2 | Vertical scale |

#### Paragraph Formatting

| Attribute | Type | Added | Description |
|-----------|------|-------|-------------|
| `autoHyphenate` | Boolean | AE 24.0 | Auto hyphenation |
| `autoLeading` | Boolean | — | Auto leading |
| `composedLineCount` | Integer | AE 24.3 | Number of composed lines |
| `composerEngine` | ComposerEngine | AE 24.0 | LATIN_CJK_ENGINE or UNIVERSAL_TYPE_ENGINE |
| `direction` | ParagraphDirection | AE 24.0 | DIRECTION_LEFT_TO_RIGHT, DIRECTION_RIGHT_TO_LEFT |
| `endIndent` | Float | AE 24.0 | Paragraph end indent |
| `everyLineComposer` | Boolean | AE 24.0 | Every-Line vs Single-Line Composer |
| `firstLineIndent` | Float | AE 24.0 | First line indent |
| `hangingRoman` | Boolean | AE 24.0 | Roman Hanging Punctuation |
| `justification` | ParagraphJustification | AE 24.0 | LEFT_JUSTIFY, RIGHT_JUSTIFY, CENTER_JUSTIFY, FULL_JUSTIFY, MULTIPLE_JUSTIFICATIONS |
| `leadingType` | LeadingType | AE 24.0 | ROMAN_LEADING_TYPE, JAPANESE_LEADING_TYPE |
| `lineOrientation` | LineOrientation | AE 24.2 | HORIZONTAL, VERTICAL_RIGHT_TO_LEFT, VERTICAL_LEFT_TO_RIGHT |
| `paragraphCount` | Integer | AE 24.3 | Number of paragraphs |
| `spaceAfter` | Float | AE 24.0 | Space after paragraph |
| `spaceBefore` | Float | AE 24.0 | Space before paragraph |
| `startIndent` | Float | AE 24.0 | Paragraph start indent |

#### Box Text Properties

| Attribute | Type | Added | Description |
|-----------|------|-------|-------------|
| `boxAutoFitPolicy` | BoxAutoFitPolicy | AE 24.6 | AUTO_FIT modes |
| `boxFirstBaselineAlignment` | BoxFirstBaselineAlignment | AE 24.6 | First line alignment |
| `boxFirstBaselineAlignmentMinimum` | Float | AE 24.6 | Manual first line offset |
| `boxInsetSpacing` | Float | AE 24.6 | Inner space from box bounds |
| `boxOverflow` | Boolean | AE 24.6 | Text doesn't fit in box |
| `boxText` | Boolean | AE 10.5 | Is paragraph text (read-only) |
| `boxTextPos` | Array [x,y] | AE 13.2 | Box position from anchor |
| `boxTextSize` | Array [w,h] | AE 10.5 | Box dimensions |
| `boxVerticalAlignment` | BoxVerticalAlignment | AE 24.6 | TOP, CENTER, BOTTOM, JUSTIFY |
| `pointText` | Boolean | AE 10.5 | Is point text (read-only) |

#### Methods

**`textDocument.characterRange(characterStart, [signedCharacterEnd])`** *(Added AE 24.3)*
- Returns: CharacterRange

**`textDocument.composedLineRange(composedLineIndexStart, [signedComposedLineIndexEnd])`** *(Added AE 24.3)*
- Returns: ComposedLineRange

**`textDocument.paragraphRange(paragraphIndexStart, [signedParagraphIndexEnd])`** *(Added AE 24.3)*
- Returns: ParagraphRange

**`textDocument.composedLineCharacterIndexesAt(characterIndex)`** *(Added AE 24.3)*
- Returns: `{start, end}`

**`textDocument.paragraphCharacterIndexesAt(characterIndex)`** *(Added AE 24.3)*
- Returns: `{start, end}`

**`textDocument.resetCharStyle()`** — Restores default character settings.

**`textDocument.resetParagraphStyle()`** — Restores default paragraph settings.

#### Code Examples

```javascript
// Basic text creation
var myDoc = new TextDocument("Hello World");
myTextLayer.property("Source Text").setValue(myDoc);

// Full formatting
var doc = myTextLayer.property("Source Text").value;
doc.resetCharStyle();
doc.fontSize = 60;
doc.fillColor = [1, 0, 0];
doc.strokeColor = [0, 1, 0];
doc.strokeWidth = 2;
doc.font = "Times New Roman PSMT";
doc.applyStroke = true;
doc.applyFill = true;
doc.text = "Happy holidays!";
doc.justification = ParagraphJustification.CENTER_JUSTIFY;
myTextLayer.property("Source Text").setValue(doc);

// Keyframed text
var textProp = myTextLayer.property("Source Text");
textProp.setValueAtTime(0, new TextDocument("First"));
textProp.setValueAtTime(1, new TextDocument("Second"));

// Range styling (AE 24.3+)
var doc = myTextLayer.property("Source Text").value;
var range = doc.characterRange(0, 1);
range.fontSize = range.fontSize + 10;
doc.characterRange(1, -1).fontSize = 40; // rest of text
```

---
