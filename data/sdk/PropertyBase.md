<!-- Source: pushREC/after-effects-sdk-kb, scripting/01-extendscript-complete-reference.md (MIT; see data/LICENSES/pushREC-after-effects-sdk-kb.LICENSE). Content derived from https://ae-scripting.docsforadobe.dev/ — coverage AE 26.0 (January 2026). Split per object by ae-mcp; category: Properties. -->

# PropertyBase Object

_Category: Properties · URI: ae://sdk/PropertyBase_

Base class for both Property and PropertyGroup.

#### Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `active` | Boolean | For layers: video active at current time; for properties: same as enabled |
| `canSetEnabled` | Boolean | Whether `enabled` can be modified |
| `elided` | Boolean | Hidden organizing group |
| `enabled` | Boolean | Video switch / eyeball state |
| `isEffect` | Boolean | Is an effect PropertyGroup |
| `isMask` | Boolean | Is a mask PropertyGroup |
| `isModified` | Boolean | Changed since creation |
| `matchName` | String | Stable non-localized identifier |
| `name` | String | Display name (R/W for indexed group children only) |
| `parentProperty` | PropertyGroup or null | Immediate parent group |
| `propertyDepth` | Integer | Depth in hierarchy (0 for layers) |
| `propertyIndex` | Integer | Position index within parent |
| `propertyType` | PropertyType | PROPERTY, INDEXED_GROUP, NAMED_GROUP |
| `selected` | Boolean | Selection state |

#### Methods

**`propertyBase.duplicate()`**
Copies property (indexed group children only).
- Returns: PropertyBase

**`propertyBase.moveTo(newIndex)`**
Relocates within parent indexed group. **Warning:** invalidates references to other children.

**`propertyBase.propertyGroup([countUp])`**
Retrieves ancestor group.

| Parameter | Type | Description |
|-----------|------|-------------|
| `countUp` | Integer [1..propertyDepth] | Levels to ascend; default 1 |

- Returns: PropertyGroup or Layer

**`propertyBase.remove()`**
Deletes from indexed group.

---
