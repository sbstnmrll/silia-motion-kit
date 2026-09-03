<!-- Source: pushREC/after-effects-sdk-kb, scripting/01-extendscript-complete-reference.md (MIT; see data/LICENSES/pushREC-after-effects-sdk-kb.LICENSE). Content derived from https://ae-scripting.docsforadobe.dev/ — coverage AE 26.0 (January 2026). Split per object by ae-mcp; category: Layers. -->

# ThreeDModelLayer Object

_Category: Layers · URI: ae://sdk/ThreeDModelLayer_

> **New in AE 26.0 (actually 24.4):** ThreeDModelLayer added in AE 24.4.

Subclass of AVLayer for 3D model layers. Inherits all AVLayer attributes and methods.

```javascript
var modelLayer = app.project.item(1).layer(1);
if (modelLayer instanceof ThreeDModelLayer) {
    // work with 3D model
}
```

---
