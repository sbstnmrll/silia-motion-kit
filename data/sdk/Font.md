<!-- Source: pushREC/after-effects-sdk-kb, scripting/01-extendscript-complete-reference.md (MIT; see data/LICENSES/pushREC-after-effects-sdk-kb.LICENSE). Content derived from https://ae-scripting.docsforadobe.dev/ — coverage AE 26.0 (January 2026). Split per object by ae-mcp; category: Text. -->

# FontObject

_Category: Text · URI: ae://sdk/Font_

> **Added AE 24.0.** Provides detailed information about a specific font.

#### Attributes

| Attribute | Type | Added | Description |
|-----------|------|-------|-------------|
| `designAxesData` | Array | AE 24.0 | Axis objects with `name`, `tag`, `min`, `max`, `default` (variable fonts only) |
| `designVector` | Array | AE 24.0 | Current axis values (variable fonts only) |
| `familyName` | String | AE 24.0 | ASCII family name |
| `familyPrefix` | String | AE 24.0 | Variable font PostScript prefix |
| `fontID` | Integer | AE 24.2 | Session-unique identifier |
| `fullName` | String | AE 24.0 | ASCII family + style |
| `hasDesignAxes` | Boolean | AE 24.0 | Is variable font |
| `hasSameDict(fontObject)` | — | AE 24.0 | Method: shares variable font dictionary |
| `isFromAdobeFonts` | Boolean | AE 24.0 | From Adobe Fonts |
| `isSubstitute` | Boolean | AE 24.0 | Missing/substituted font |
| `location` | String | AE 24.0 | File system path |
| `nativeFamilyName` | String | AE 24.0 | Unicode family name |
| `nativeFullName` | String | AE 24.0 | Unicode full name |
| `nativeStyleName` | String | AE 24.0 | Unicode style name |
| `otherFontsWithSameDict` | Array | AE 25.1 | Fonts sharing same dictionary |
| `postScriptName` | String | AE 24.0 | PostScript identifier |
| `styleName` | String | AE 24.0 | ASCII style name |
| `technology` | CTFontTechnology | AE 24.0 | Type1, TrueType, CID, Bitmap, ATC, Type3, SVG |
| `type` | CTFontType | AE 24.0 | Internal classification |
| `version` | String | AE 24.0 | Version string |
| `writingScripts` | CTScript[] | AE 24.0 | Supported character sets |

#### Methods

**`fontObject.hasGlyphsFor(charString)`** *(Added AE 25.1)*
- Returns: Boolean (true if font has glyphs for every character)

**`fontObject.hasSameDict(fontObject)`**
- Returns: Boolean

**`fontObject.postScriptNameForDesignVector([...vectorValues])`**
- Returns: String

```javascript
var textDoc = textLayer.property("Source Text").value;
var font = textDoc.fontObject;
if (font && font.designAxesData) {
    font.designAxesData.forEach(function(axis) {
        // axis.tag, axis.name, axis.min, axis.max, axis.default
    });
}
```

---
