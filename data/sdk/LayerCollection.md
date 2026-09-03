<!-- Source: pushREC/after-effects-sdk-kb, scripting/01-extendscript-complete-reference.md (MIT; see data/LICENSES/pushREC-after-effects-sdk-kb.LICENSE). Content derived from https://ae-scripting.docsforadobe.dev/ — coverage AE 26.0 (January 2026). Split per object by ae-mcp; category: Layers. -->

# LayerCollection Object

_Category: Layers · URI: ae://sdk/LayerCollection_

Access: `app.project.item(index).layers`.

#### Methods

**`layers.add(item[, duration])`**
Creates AVLayer from item.
- Returns: AVLayer

**`layers.addBoxText([width, height])`**
Creates paragraph text layer (horizontal).
- Returns: TextLayer

**`layers.addCamera(name, centerPoint)`**
- Returns: CameraLayer

**`layers.addLight(name, centerPoint)`**
- Returns: LightLayer

**`layers.addNull([duration])`**
- Returns: AVLayer

**`layers.addShape()`**
- Returns: ShapeLayer

**`layers.addSolid(color, name, width, height, pixelAspect[, duration])`**
- `color`: `[R, G, B]` values [0..1]
- Returns: AVLayer

**`layers.addText([sourceText])`**
Creates point text layer (horizontal).
- Returns: TextLayer

**`layers.addVerticalBoxText([width, height])`** *(Added AE 24.2)*
- Returns: TextLayer

**`layers.addVerticalText([sourceText])`** *(Added AE 24.2)*
- Returns: TextLayer

**`layers.byName(name)`**
Returns first (topmost) layer with given name.
- Returns: Layer or null

**`layers.precompose(layerIndices, name[, moveAllAttributes])`**
Precomposes specified layers.

| Parameter | Type | Description |
|-----------|------|-------------|
| `layerIndices` | Integer[] | Layer position indexes |
| `name` | String | New comp name |
| `moveAllAttributes` | Boolean | Keep attributes in new comp (default true) |

- Returns: CompItem

---
