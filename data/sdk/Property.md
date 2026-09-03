<!-- Source: pushREC/after-effects-sdk-kb, scripting/01-extendscript-complete-reference.md (MIT; see data/LICENSES/pushREC-after-effects-sdk-kb.LICENSE). Content derived from https://ae-scripting.docsforadobe.dev/ — coverage AE 26.0 (January 2026). Split per object by ae-mcp; category: Properties. -->

# Property Object

_Category: Properties · URI: ae://sdk/Property_

Subclass of PropertyBase. Represents an animatable value.

> **New in AE 26.0:** `Property.propertyParameters` and `Property.valueText` added.

#### Attributes

| Attribute | Type | Added | Description |
|-----------|------|-------|-------------|
| `alternateSource` | AVItem or null | AE 18.0 | Media replacement source |
| `canSetAlternateSource` | Boolean | AE 18.0 | Supports media replacement |
| `canSetExpression` | Boolean | AE 11.0 | Expression can be set |
| `canVaryOverTime` | Boolean | — | Keyframes/expressions can be written |
| `dimensionsSeparated` | Boolean | AE 9.0 | Multi-dim shown as separate properties |
| `essentialPropertySource` | Property or AVLayer | AE 22.0 | Original source for Essential Property |
| `expression` | String | — | Expression string |
| `expressionEnabled` | Boolean | — | Expression evaluation toggle |
| `expressionError` | String | — | Expression evaluation error |
| `hasMax` | Boolean | — | Has maximum constraint |
| `hasMin` | Boolean | — | Has minimum constraint |
| `isDropdownEffect` | Boolean | AE 17.0.1 | Is Dropdown Menu Control's Menu property |
| `isSeparationFollower` | Boolean | AE 9.0 | Represents separated dimension |
| `isSeparationLeader` | Boolean | AE 9.0 | Can be dimensionally separated |
| `isSpatial` | Boolean | — | Spatial value (e.g., position) |
| `isTimeVarying` | Boolean | — | Has keyframes or enabled expression |
| `maxValue` | — | — | Maximum constraint value |
| `minValue` | — | — | Minimum constraint value |
| `numKeys` | Integer | — | Number of keyframes |
| `propertyIndex` | Integer | — | Position index (starts at 1) |
| `propertyParameters` | Array of String | **AE 26.0** | Dropdown menu items array |
| `propertyValueType` | PropertyValueType | — | Type of stored value |
| `selectedKeys` | Integer[] | — | Indices of selected keyframes |
| `separationDimension` | Integer | AE 9.0 | Dimension number for follower |
| `separationLeader` | Property | AE 9.0 | Original multidimensional property |
| `unitsText` | String | — | Text description of value units |
| `value` | varies | — | Current value at present time |
| `valueText` | String | **AE 26.0** | Text of selected dropdown item |

> **New in AE 26.0:** `valueText` returns the currently selected string from a Dropdown Menu Control. `propertyParameters` returns the full array of dropdown options.

```javascript
// AE 26.0: Read dropdown menu selection
var fx = lyr.property("ADBE Effect Parade").property("Dropdown Menu Control");
var menuProp = fx.property("Menu");
var selectedText = menuProp.valueText; // Current selection string
var allOptions = menuProp.propertyParameters; // Array of all options
```

#### PropertyValueType Enumeration

| Enum | Description |
|------|-------------|
| `NO_VALUE` | No data |
| `ThreeD_SPATIAL` | [x, y, z] positional |
| `ThreeD` | [a, b, c] quantitative |
| `TwoD_SPATIAL` | [x, y] positional |
| `TwoD` | [a, b] quantitative |
| `OneD` | Single float |
| `COLOR` | [r, g, b, alpha] 0.0–1.0 |
| `CUSTOM_VALUE` | Custom (e.g., Histogram) |
| `MARKER` | MarkerValue object |
| `LAYER_INDEX` | Integer (0=no layer) |
| `MASK_INDEX` | Integer (0=no mask) |
| `SHAPE` | Shape object |
| `TEXT_DOCUMENT` | TextDocument object |

#### Value Methods

**`property.setValue(newValue)`** — Sets static value.

**`property.setValueAtTime(time, newValue)`** — Creates keyframe if needed.

**`property.setValueAtKey(keyIndex, newValue)`** — Sets existing keyframe value.

**`property.setValuesAtTimes(times, newValues)`** — Batch set.

**`property.valueAtTime(time, preExpression)`**
- `preExpression`: true = pre-expression value, false = with expression applied
- Returns: property value

#### Keyframe Methods

**`property.addKey(time)`** — Returns: Integer (key index)

**`property.removeKey(keyIndex)`**

**`property.nearestKeyIndex(time)`** — Returns: Integer

**`property.keyTime(keyIndex)`** — Returns: Float

**`property.keyValue(keyIndex)`** — Returns: property value

**`property.keySelected(keyIndex)`** — Returns: Boolean

**`property.setSelectedAtKey(keyIndex, onOff)`**

**`property.keyLabel(keyIndex)`** *(Added AE 22.6)* — Returns: Integer (label color 0–16)

**`property.setLabelAtKey(keyIndex, labelIndex)`** *(Added AE 22.6)*

#### Interpolation Methods

**`property.isInterpolationTypeValid(type)`** — Returns: Boolean

**`property.keyInInterpolationType(keyIndex)`** — Returns: KeyframeInterpolationType

**`property.keyOutInterpolationType(keyIndex)`** — Returns: KeyframeInterpolationType

**`property.setInterpolationTypeAtKey(keyIndex, inType[, outType])`**
Types: LINEAR, BEZIER, HOLD

#### Spatial Methods (TwoD_SPATIAL / ThreeD_SPATIAL only)

**`property.keyInSpatialTangent(keyIndex)`** — Returns: `[x, y]` or `[x, y, z]`

**`property.keyOutSpatialTangent(keyIndex)`** — Returns: `[x, y]` or `[x, y, z]`

**`property.setSpatialTangentsAtKey(keyIndex, inTangent[, outTangent])`**

**`property.keySpatialContinuous(keyIndex)`** — Returns: Boolean

**`property.setSpatialContinuousAtKey(keyIndex, newVal)`**

**`property.keySpatialAutoBezier(keyIndex)`** — Returns: Boolean

**`property.setSpatialAutoBezierAtKey(keyIndex, newVal)`**

**`property.keyRoving(keyIndex)`** — Returns: Boolean

**`property.setRovingAtKey(keyIndex, newVal)`** (Not available for first/last keyframes)

#### Temporal Ease Methods

**`property.keyInTemporalEase(keyIndex)`** — Returns: `[KeyframeEase]` array

**`property.keyOutTemporalEase(keyIndex)`** — Returns: `[KeyframeEase]` array

**`property.setTemporalEaseAtKey(keyIndex, inTemporalEase[, outTemporalEase])`**

**`property.keyTemporalContinuous(keyIndex)`** — Returns: Boolean

**`property.setTemporalContinuousAtKey(keyIndex, newVal)`**

**`property.keyTemporalAutoBezier(keyIndex)`** — Returns: Boolean

**`property.setTemporalAutoBezierAtKey(keyIndex, newVal)`**

#### Dimension Methods *(Added AE 9.0)*

**`property.getSeparationFollower(dim)`** — Returns: Property (separated dimension)

#### Dropdown Menu Methods *(Added AE 17.0.1)*

**`property.setPropertyParameters(items)`**
Sets Dropdown Menu Control items. Use `"(-"` for separator.

```javascript
var dropdownEffect = layer.property("ADBE Effect Parade").addProperty("ADBE Dropdown Control");
var menuProp = dropdownEffect.property(1);
if (menuProp.isDropdownEffect) {
    menuProp.setPropertyParameters(["First", "Second", "(-", "Third"]);
}
```

#### Motion Graphics Methods *(Added AE 15.0+)*

**`property.canAddToMotionGraphicsTemplate(comp)`** — Returns: Boolean

**`property.addToMotionGraphicsTemplate(comp)`** — Returns: Boolean

**`property.addToMotionGraphicsTemplateAs(comp, name)`** *(Added AE 16.1)* — Returns: Boolean

#### Media Replacement *(Added AE 18.0)*

**`property.setAlternateSource(newSource)`**

#### Code Examples

```javascript
// Set opacity
myLayer.property("Opacity").setValue(50);

// Animate position
var pos = myLayer.property("Position");
pos.setValueAtTime(0, [0, 0, 0]);
pos.setValueAtTime(5, [1920, 1080, 0]);

// Evaluate at time
var val = myLayer.property("Scale").valueAtTime(3.5, false);

// Mask shape manipulation
var myMask = myLayer.mask(1);
var myShape = myMask.maskPath.value;
myShape.closed = false;
myMask.maskPath.setValue(myShape);

// Text keyframes
var textProp = myTextLayer.property("Source Text");
textProp.setValueAtKey(1, new TextDocument("frame one"));
textProp.setValueAtKey(2, new TextDocument("frame two"));

// Essential property source (AE 22.0+)
var opacityProp = comp.layer(1).property("Transform").property("Opacity");
opacityProp.addToMotionGraphicsTemplate(comp);
```

---
