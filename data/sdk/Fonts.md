<!-- Source: pushREC/after-effects-sdk-kb, scripting/01-extendscript-complete-reference.md (MIT; see data/LICENSES/pushREC-after-effects-sdk-kb.LICENSE). Content derived from https://ae-scripting.docsforadobe.dev/ — coverage AE 26.0 (January 2026). Split per object by ae-mcp; category: Text. -->

# FontsObject (`app.fonts`)

_Category: Text · URI: ae://sdk/Fonts_

> **Added AE 24.0.** Access and manage all system fonts.

#### Attributes

| Attribute | Type | Added | Description |
|-----------|------|-------|-------------|
| `allFonts` | Array of Arrays | AE 24.0 | All fonts grouped by family |
| `favoriteFontFamilyList` | String[] | AE 24.6 | R/W favorites list |
| `fontsDuplicateByPostScriptName` | Array of Arrays | AE 24.6 | Fonts with duplicate PS names |
| `fontServerRevision` | Number | AE 24.2 | Font environment change counter |
| `fontsWithDefaultDesignAxes` | Array | AE 24.0 | Variable fonts with default axes |
| `freezeSyncSubstitutedFonts` | Boolean | AE 24.6 | Control Adobe Fonts sync |
| `missingOrSubstitutedFonts` | Array | AE 24.0 | Project's missing/substituted fonts |
| `mruFontFamilyList` | String[] | AE 24.6 | R/W most recently used list |
| `substitutedFontReplacementMatchPolicy` | Enum | AE 24.6 | POSTSCRIPT_NAME (default), CTFI_EQUAL, DISABLED |

#### Methods

**`fonts.getFontByID(fontID)`** *(Added AE 24.2)* — Returns: Font or undefined

**`fonts.getFontsByFamilyNameAndStyleName(familyName, styleName)`** — Returns: Font[]

**`fonts.getFontsByPostScriptName(postscriptName)`** — Returns: Font[]

**`fonts.getCTScriptForString(charString, preferredCTScript)`** *(Added AE 25.1)* — Returns: script assignments with character counts

**`fonts.getDefaultFontForCTScript(ctScript)`** *(Added AE 25.1)* — Returns: Font

**`fonts.setDefaultFontForCTScript(ctScript, font)`** *(Added AE 25.1)* — Returns: Boolean

**`fonts.pollForAndPushNonSystemFontFoldersChanges()`** *(Added AE 24.6)* — Checks non-system font folder changes

```javascript
// Find font by PostScript name
var fonts = app.fonts.getFontsByPostScriptName("MyriadPro-Regular");
alert(fonts.length + " fonts found");

// Access first font family
var firstGroup = app.fonts.allFonts[0];
alert(firstGroup[0].familyName + " " + firstGroup[0].styleName);
```

---
