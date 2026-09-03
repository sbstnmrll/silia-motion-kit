<!-- Source: pushREC/after-effects-sdk-kb, scripting/01-extendscript-complete-reference.md (MIT; see data/LICENSES/pushREC-after-effects-sdk-kb.LICENSE). Content derived from https://ae-scripting.docsforadobe.dev/ — coverage AE 26.0 (January 2026). Split per object by ae-mcp; category: Other. -->

# Shape Object

_Category: Other · URI: ae://sdk/Shape_

**Constructor:** `new Shape()`

Represents mask path or shape layer path values.

#### Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `closed` | Boolean | First and last vertices connected |
| `vertices` | Array of [x,y] | Anchor points |
| `inTangents` | Array of [x,y] | Incoming direction handles |
| `outTangents` | Array of [x,y] | Outgoing direction handles |
| `featherSegLocs` | Integer[] | Segment containing each feather point |
| `featherRelSegLocs` | Float[] | Position along segment [0–1] |
| `featherRadii` | Float[] | Feather amounts (negative=inner) |
| `featherTypes` | Integer[] | 0=outer, 1=inner |
| `featherTensions` | Float[] | Tension [0–1] |
| `featherInterps` | Integer[] | 0=non-Hold, 1=Hold |
| `featherRelCornerAngles` | Float[] | Corner angle percentages [0–100] |

**Note:** RotoBezier masks auto-calculate tangents; set `inTangents`/`outTangents` to `null`.

```javascript
// Square mask
var s = new Shape();
s.vertices = [[0,0], [0,100], [100,100], [100,0]];
s.closed = true;

// Oval with tangents
var oval = new Shape();
oval.vertices = [[300,50], [200,150], [300,250], [400,150]];
oval.inTangents = [[55.23,0], [0,-55.23], [-55.23,0], [0,55.23]];
oval.outTangents = [[-55.23,0], [0,55.23], [55.23,0], [0,-55.23]];
oval.closed = true;
```

---
