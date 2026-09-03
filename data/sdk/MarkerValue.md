<!-- Source: pushREC/after-effects-sdk-kb, scripting/01-extendscript-complete-reference.md (MIT; see data/LICENSES/pushREC-after-effects-sdk-kb.LICENSE). Content derived from https://ae-scripting.docsforadobe.dev/ — coverage AE 26.0 (January 2026). Split per object by ae-mcp; category: Other. -->

# MarkerValue Object

_Category: Other · URI: ae://sdk/MarkerValue_

**Constructor:** `new MarkerValue(comment[, chapter, url, frameTarget, cuePointName, params])`

#### Attributes

| Attribute | Type | Added | Description |
|-----------|------|-------|-------------|
| `chapter` | String | — | QuickTime chapter link |
| `comment` | String | — | Timeline display text |
| `cuePointName` | String | — | Flash Video cue point name |
| `duration` | Float | AE 9.0 | Marker duration in seconds |
| `eventCuePoint` | Boolean | — | Event vs navigation cue point |
| `frameTarget` | String | — | Web page frame target |
| `label` | Integer (0–16) | AE 16.0 | Label color |
| `protectedRegion` | Boolean | AE 16.0 | Protected region |
| `url` | String | — | Web page link |

#### Methods

**`markerValue.getParameters()`** — Returns: Object (key-value pairs)

**`markerValue.setParameters(keyValuePairs)`**

```javascript
// Layer marker
var mv = new MarkerValue("Scene change");
mv.duration = 1;
myLayer.property("Marker").setValueAtTime(2, mv);

// Composition marker
comp.markerProperty.setValueAtTime(5, new MarkerValue("Act 2"));
```

---
