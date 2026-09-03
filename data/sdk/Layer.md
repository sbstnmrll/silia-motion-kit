<!-- Source: pushREC/after-effects-sdk-kb, scripting/01-extendscript-complete-reference.md (MIT; see data/LICENSES/pushREC-after-effects-sdk-kb.LICENSE). Content derived from https://ae-scripting.docsforadobe.dev/ — coverage AE 26.0 (January 2026). Split per object by ae-mcp; category: Layers. -->

# Layer Object

_Category: Layers · URI: ae://sdk/Layer_

Base class for all layers. Access: `app.project.item(index).layer(index)`.

Layer is a subclass of PropertyGroup (which is a subclass of PropertyBase).

#### Attributes

| Attribute | Type | Access | Description |
|-----------|------|--------|-------------|
| `autoOrient` | AutoOrientType | R/W | ALONG_PATH, CAMERA_OR_POINT_OF_INTEREST, CHARACTERS_TOWARD_CAMERA, NO_AUTO_ORIENT |
| `comment` | String | R/W | Descriptive comment |
| `containingComp` | CompItem | R/O | Containing composition |
| `hasVideo` | Boolean | R/O | Has video switch (eyeball) |
| `id` | Integer | R/O | Unique persistent ID (AE 22.0+) |
| `index` | Integer | R/O | Position [1..numLayers] |
| `inPoint` | Float | R/W | In point in comp time (seconds) |
| `isNameSet` | Boolean | R/O | Name was set explicitly |
| `label` | Integer | R/W | Label color (0=None, 1–16=preset) |
| `locked` | Boolean | R/W | Layer locked |
| `marker` | PropertyGroup | R/O | Layer markers container |
| `nullLayer` | Boolean | R/O | Created as null object |
| `outPoint` | Float | R/W | Out point in comp time |
| `parent` | Layer or null | R/W | Parent layer |
| `selectedProperties` | PropertyBase[] | R/O | Selected properties |
| `shy` | Boolean | R/W | Hidden when "Hide all shy layers" enabled |
| `solo` | Boolean | R/W | Soloed |
| `startTime` | Float | R/W | Start time in comp time |
| `stretch` | Float | R/W | Time stretch % (100=no stretch) [-9900..9900] |
| `time` | Float | R/O | Current layer time in comp time |

#### Methods

**`layer.activeAtTime(time)`**
- Returns: Boolean

**`layer.applyPreset(presetName)`**
Applies an animation preset file.

**`layer.copyToComp(intoComp)`**
Copies layer to another composition.

**`layer.doSceneEditDetection(applyOptions)`** *(Added AE 22.3)*
Runs Scene Edit Detection.
- `applyOptions`: MARKERS, SPLIT, SPLIT_PRECOMP, or NONE
- Returns: Array of Float (detected edit times)

**`layer.duplicate()`** — Returns: Layer

**`layer.moveAfter(layer)`** / **`layer.moveBefore(layer)`**

**`layer.moveToBeginning()`** / **`layer.moveToEnd()`**

**`layer.remove()`**

**`layer.setParentWithJump([newParent])`**
Sets parent without transform adjustment (may cause visual jump).

---
