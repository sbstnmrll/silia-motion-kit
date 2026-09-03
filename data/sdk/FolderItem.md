<!-- Source: pushREC/after-effects-sdk-kb, scripting/01-extendscript-complete-reference.md (MIT; see data/LICENSES/pushREC-after-effects-sdk-kb.LICENSE). Content derived from https://ae-scripting.docsforadobe.dev/ — coverage AE 26.0 (January 2026). Split per object by ae-mcp; category: Items. -->

# FolderItem Object

_Category: Items · URI: ae://sdk/FolderItem_

Represents a folder in the Project panel.

#### Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `items` | ItemCollection | Top-level folder contents |
| `numItems` | Integer | Item count (nested folders count as 1) |

#### Methods

**`folderItem.item(subIndex)`** — Returns item at index.

```javascript
var folder = app.project.item(2);
for (var i = 1; i <= folder.numItems; i++) {
    alert(folder.item(i).name);
}
```

---
