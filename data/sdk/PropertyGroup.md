<!-- Source: pushREC/after-effects-sdk-kb, scripting/01-extendscript-complete-reference.md (MIT; see data/LICENSES/pushREC-after-effects-sdk-kb.LICENSE). Content derived from https://ae-scripting.docsforadobe.dev/ — coverage AE 26.0 (January 2026). Split per object by ae-mcp; category: Properties. -->

# PropertyGroup Object

_Category: Properties · URI: ae://sdk/PropertyGroup_

Subclass of PropertyBase. Container for Property and PropertyGroup objects.

#### Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `numProperties` | Integer | Count of indexed properties (layers: 3 for mask, effect, motion tracker groups) |

#### Methods

**`propertyGroup.addProperty(name)`**
Creates and adds a property.

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | String | Display name, match name, or effect name (e.g., `"ADBE Mask Atom"`, `"ADBE Bulge"`) |

**Warning:** Adding to an indexed group invalidates existing references. Store `propertyIndex` before adding more properties.

```javascript
var effectsGroup = layer.property("ADBE Effect Parade");
var slider = effectsGroup.addProperty("ADBE Slider Control");
var sliderIdx = slider.propertyIndex;
effectsGroup.addProperty("ADBE Color Control");
// re-access slider by stored index:
var sl = effectsGroup.property(sliderIdx).property("ADBE Slider Control-0001");
```

**`propertyGroup.canAddProperty(name)`** — Returns: Boolean

**`propertyGroup.addVariableFontAxis(axisTag)`** *(Added AE 26.0)*

> **New in AE 26.0:** Creates a variable font axis property in a text animator's properties group.

Applies only to the `"ADBE Text Animator Properties"` group. Animating variable font axes may change character widths; use `"ADBE Text Variable Font Spacing"` in More Options to compensate.

| Parameter | Type | Description |
|-----------|------|-------------|
| `axisTag` | String | 4-character axis tag: `"wght"` (weight), `"wdth"` (width), `"slnt"` (slant), `"ital"` (italic), `"opsz"` (optical size), or custom 4-char uppercase tag |

- Returns: Property

```javascript
var comp = app.project.items.addComp("VarFont Demo", 1920, 1080, 1, 30, 30);
var textLayer = comp.layers.addText("Hello World!");

// Set variable font
var textDoc = textLayer.property("Source Text").value;
textDoc.font = 'ShantellSans';
textLayer.property("Source Text").setValue(textDoc);

// Add text animator
var animators = textLayer.property("Text").property("Animators");
var animator = animators.addProperty("ADBE Text Animator");
var animatorProps = animator.property("ADBE Text Animator Properties");

// Add weight axis and animate it
var weightAxis = animatorProps.addVariableFontAxis("wght");
weightAxis.setValueAtTime(0, 300);  // Light
weightAxis.setValueAtTime(2, 900);  // Heavy
```

**`propertyGroup.property(index)`** / **`propertyGroup.property(name)`**
Returns child property.

| Name Forms Accepted |
|---------------------|
| Match name: `"ADBE Mask Atom"`, `"ADBE Bulge"` |
| Expression/intercap style: `"position"`, `"anchorPoint"`, `"maskPath"` |
| Display name: `"Position"`, `"Mask Path"` |

**Properties Accessible by Name:**

| Layer Type | Properties |
|------------|-----------|
| Any Layer | `"Masks"`, `"Effects"`, `"Motion Trackers"` |
| AVLayer | `"anchorPoint"`, `"position"`, `"scale"`, `"rotation"`, `"opacity"`, `"marker"`, `"timeRemapEnabled"`, `"audioLevels"` |
| Camera | `"zoom"`, `"depthOfField"`, `"focusDistance"`, `"aperture"`, `"blurLevel"` |
| Light | `"intensity"`, `"color"`, `"coneAngle"`, `"coneFeather"`, `"shadowDarkness"`, `"shadowDiffusion"`, `"castsShadows"` |
| 3D Layer | `"acceptsShadows"`, `"acceptsLights"`, `"ambient"`, `"diffuse"`, `"specular"`, `"shininess"`, `"castsShadows"`, `"lightTransmission"`, `"metal"` |
| Camera/Light/3D | `"xRotation"`, `"yRotation"`, `"orientation"` |
| Text Layer | `"source Text"`, `"text"` |

---
