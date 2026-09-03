<!-- Source: pushREC/after-effects-sdk-kb, scripting/01-extendscript-complete-reference.md (MIT; see data/LICENSES/pushREC-after-effects-sdk-kb.LICENSE). Content derived from https://ae-scripting.docsforadobe.dev/ — coverage AE 26.0 (January 2026). Split per object by ae-mcp; category: Items. -->

# ItemCollection Object

_Category: Items · URI: ae://sdk/ItemCollection_

Access: `app.project.items` or `folderItem.items`.

#### Methods

**`items.addComp(name, width, height, pixelAspect, duration, frameRate)`**

| Parameter | Type | Range |
|-----------|------|-------|
| `name` | String | — |
| `width` | Integer | 4–30000 |
| `height` | Integer | 4–30000 |
| `pixelAspect` | Float | 0.01–100.0 |
| `duration` | Float | 0.0–10800.0 |
| `frameRate` | Float | 1.0–99.0 |

- Returns: CompItem

**`items.addFolder(name)`**
- Returns: FolderItem

```javascript
var compFolder = app.project.items.addFolder("comps");
for (var i = 1; i <= app.project.numItems; i++) {
    if (app.project.item(i) instanceof CompItem) {
        app.project.item(i).parentFolder = compFolder;
    }
}
```

---
