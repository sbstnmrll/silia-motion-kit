<!-- Source: pushREC/after-effects-sdk-kb, scripting/01-extendscript-complete-reference.md (MIT; see data/LICENSES/pushREC-after-effects-sdk-kb.LICENSE). Content derived from https://ae-scripting.docsforadobe.dev/ — coverage AE 26.0 (January 2026). Split per object by ae-mcp; category: Layers. -->

# LightLayer Object

_Category: Layers · URI: ae://sdk/LightLayer_

Subclass of Layer. Created with `layers.addLight()`.

#### Attributes

| Attribute | Type | Added | Description |
|-----------|------|-------|-------------|
| `lightSource` | Layer or null | AE 24.3 | Source layer when `lightType` is ENVIRONMENT (expanded to all 2D layers in AE 25.2) |
| `lightType` | LightType | — | PARALLEL, SPOT, POINT, AMBIENT, ENVIRONMENT (24.3+) |

Property groups: Transform, Light Options (Intensity, Color, Cone Angle, Cone Feather, Falloff, Shadow Darkness, Shadow Diffusion), Marker.

---
