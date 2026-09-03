<!-- Source: pushREC/after-effects-sdk-kb, scripting/01-extendscript-complete-reference.md (MIT; see data/LICENSES/pushREC-after-effects-sdk-kb.LICENSE). Content derived from https://ae-scripting.docsforadobe.dev/ — coverage AE 26.0 (January 2026). Split per object by ae-mcp; category: Layers. -->

# AVLayer Object

_Category: Layers · URI: ae://sdk/AVLayer_

Represents AV layers (footage, solid, null, text, shape). Subclass of Layer.

#### Attributes

| Attribute | Type | Access | Added | Description |
|-----------|------|--------|-------|-------------|
| `adjustmentLayer` | Boolean | R/W | — | Adjustment layer |
| `audioActive` | Boolean | R/O | — | Audio active at current time |
| `audioEnabled` | Boolean | R/W | — | Audio toggle |
| `blendingMode` | BlendingMode | R/W | — | Blend mode |
| `collapseTransformation` | Boolean | R/W | — | Collapse transformation |
| `effectsActive` | Boolean | R/W | — | Effects enabled |
| `environmentLayer` | Boolean | R/W | AE 11.0 | 3D environment layer |
| `frameBlending` | Boolean | R/O | — | Frame blending |
| `frameBlendingType` | FrameBlendingType | R/W | — | FRAME_MIX, NO_FRAME_BLEND, PIXEL_MOTION |
| `guideLayer` | Boolean | R/W | — | Guide layer |
| `hasAudio` | Boolean | R/O | — | Has audio |
| `hasTrackMatte` | Boolean | R/O | — | Track matte applied |
| `height` | Float | R/O | — | Layer height in pixels |
| `isNameFromSource` | Boolean | R/O | — | Name from source |
| `isTrackMatte` | Boolean | R/O | — | Used as track matte |
| `motionBlur` | Boolean | R/W | — | Motion blur |
| `preserveTransparency` | Boolean | R/W | — | Preserve transparency |
| `quality` | LayerQuality | R/W | — | BEST, DRAFT, WIREFRAME |
| `samplingQuality` | LayerSamplingQuality | R/W | AE 12.0 | BICUBIC, BILINEAR |
| `source` | AVItem | R/O | — | Source item |
| `threeDLayer` | Boolean | R/W | — | 3D layer |
| `threeDPerChar` | Boolean | R/W | — | Per-character 3D (text) |
| `timeRemapEnabled` | Boolean | R/W | — | Time remapping active |
| `trackMatteLayer` | AVLayer | R/O | AE 23.0 | Track matte layer |
| `trackMatteType` | TrackMatteType | R/W | — | ALPHA, ALPHA_INVERTED, LUMA, LUMA_INVERTED, NO_TRACK_MATTE |
| `width` | Float | R/O | — | Layer width in pixels |

#### Methods

**`avLayer.audioActiveAtTime(time)`** — Returns: Boolean

**`avLayer.calculateTransformFromPoints(pointTopLeft, pointTopRight, pointBottomRight)`**
Computes transformation from three reference points.
- Returns: Transform object

**`avLayer.compPointToSource(point)`** *(Added CC 2014.2)*
Converts comp coordinates to layer coordinates.
- Returns: `[x, y]`

**`avLayer.openInViewer()`** *(Added AE 11.0)* — Returns: Viewer or null

**`avLayer.replaceSource(newSource, fixExpressions)`**
Substitutes layer source.

**`avLayer.sourcePointToComp(point)`** *(Added CC 2014.2)*
Converts layer coordinates to comp coordinates.
- Returns: `[x, y]`

**`avLayer.sourceRectAtTime(timeT, extents)`**
Retrieves layer bounds at time.
- Returns: `{top, left, width, height}`

**Track Matte Methods** *(Added AE 23.0)*

**`avLayer.setTrackMatte(trackMatteLayer, trackMatteType)`**
- `trackMatteLayer`: AVLayer or null (null removes matte)

**`avLayer.removeTrackMatte()`**

**Motion Graphics Template Methods** *(Added AE 18.0)*

**`avLayer.canAddToMotionGraphicsTemplate(comp)`** — Returns: Boolean

**`avLayer.addToMotionGraphicsTemplate(comp)`** — Returns: Boolean

**`avLayer.addToMotionGraphicsTemplateAs(comp, name)`** — Returns: Boolean

```javascript
// Track matte example
myLayer.setTrackMatte(otherLayer, TrackMatteType.ALPHA);
myLayer.removeTrackMatte();
```

---
