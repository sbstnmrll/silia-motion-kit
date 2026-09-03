<!-- Source: pushREC/after-effects-sdk-kb, scripting/01-extendscript-complete-reference.md (MIT; see data/LICENSES/pushREC-after-effects-sdk-kb.LICENSE). Content derived from https://ae-scripting.docsforadobe.dev/ — coverage AE 26.0 (January 2026). Split per object by ae-mcp; category: Items. -->

# CompItem Object

_Category: Items · URI: ae://sdk/CompItem_

Represents a composition. Subclass of AVItem. Access: `app.project.item(index)`.

#### Key Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `activeCamera` | CameraLayer or null | Frontmost enabled camera |
| `bgColor` | Array [R,G,B] | Background color [0..1] |
| `displayStartFrame` | Integer | Frame value at comp start (AE 17.1.1+) |
| `displayStartTime` | Float | Comp start time in seconds |
| `draft3d` | Boolean | Draft 3D mode |
| `dropFrame` | Boolean | Drop frame timecode (AE 10.5+) |
| `frameBlending` | Boolean | Frame blending |
| `frameDuration` | Float | Single frame duration |
| `layers` | LayerCollection | All layers |
| `markerProperty` | PropertyGroup | Composition markers (AE 14.0+) |
| `motionBlur` | Boolean | Motion blur |
| `motionGraphicsTemplateName` | String | .mogrt template name (AE 15.0+) |
| `motionGraphicsTemplateControllerCount` | Integer | EGP controller count (AE 16.1+) |
| `numLayers` | Integer | Layer count |
| `selectedLayers` | Array | Selected layers |
| `selectedProperties` | Array | Selected properties |
| `workAreaDuration` | Float | Work area duration |
| `workAreaStart` | Float | Work area start time |

#### Methods

**`comp.layer(index)`** / **`comp.layer(name)`** / **`comp.layer(otherLayer, relIndex)`**
- Returns: Layer

**`comp.duplicate()`**
- Returns: CompItem

**`comp.exportAsMotionGraphicsTemplate(overwrite[, path])`** *(Added AE 15.0)*
- Returns: Boolean (true if saved)

**`comp.getMotionGraphicsTemplateControllerName(index)`** *(Added AE 16.1)*
- Returns: String

**`comp.openInEssentialGraphics()`** *(Added AE 15.0)*

**`comp.openInViewer()`** *(Added AE 11.0)*
- Returns: Viewer or null

**`comp.setMotionGraphicsControllerName(index, newName)`** *(Added AE 16.1)*

```javascript
// Add composition markers
var comp = app.project.items.addComp("mycomp", 1920, 1080, 1.0, 5, 29.97);
var marker = new MarkerValue("Marker text");
marker.duration = 1;
comp.markerProperty.setValueAtTime(1, marker);
```

---
