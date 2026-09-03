<!-- Source: pushREC/after-effects-sdk-kb, scripting/01-extendscript-complete-reference.md (MIT; see data/LICENSES/pushREC-after-effects-sdk-kb.LICENSE). Content derived from https://ae-scripting.docsforadobe.dev/ — coverage AE 26.0 (January 2026). Split per object by ae-mcp; category: Properties. -->

# MaskPropertyGroup Object

_Category: Properties · URI: ae://sdk/MaskPropertyGroup_

Subclass of PropertyGroup. Access: `layer.mask(index)`.

#### Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `color` | Array [R, G, B] [0..1] | Mask outline color in UI |
| `inverted` | Boolean | Mask inverted |
| `locked` | Boolean | Locked (cannot edit in UI) |
| `maskFeatherFalloff` | MaskFeatherFalloff | FFO_LINEAR or FFO_SMOOTH |
| `maskMode` | MaskMode | NONE, ADD, SUBTRACT, INTERSECT, LIGHTEN, DARKEN, DIFFERENCE |
| `maskMotionBlur` | MaskMotionBlur | SAME_AS_LAYER, ON, OFF |
| `rotoBezier` | Boolean | RotoBezier shape |

---
