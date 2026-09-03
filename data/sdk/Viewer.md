<!-- Source: pushREC/after-effects-sdk-kb, scripting/01-extendscript-complete-reference.md (MIT; see data/LICENSES/pushREC-after-effects-sdk-kb.LICENSE). Content derived from https://ae-scripting.docsforadobe.dev/ — coverage AE 26.0 (January 2026). Split per object by ae-mcp; category: Other. -->

# Viewer Object

_Category: Other · URI: ae://sdk/Viewer_

Access: `app.activeViewer`

| Attribute | Type | Description |
|-----------|------|-------------|
| `active` | Boolean | Panel focused |
| `activeViewIndex` | Integer | Current active View index |
| `maximized` | Boolean | Maximized state |
| `type` | ViewerType | VIEWER_COMPOSITION, VIEWER_LAYER, VIEWER_FOOTAGE |
| `views` | View[] | All View objects |

**`viewer.setActive()`** — Returns: Boolean

```javascript
var viewer = app.activeViewer;
viewer.maximized = true;
if (viewer.type === ViewerType.VIEWER_COMPOSITION) {
    alert("Comp panel active");
}
```

---
