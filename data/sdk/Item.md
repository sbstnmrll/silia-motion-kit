<!-- Source: pushREC/after-effects-sdk-kb, scripting/01-extendscript-complete-reference.md (MIT; see data/LICENSES/pushREC-after-effects-sdk-kb.LICENSE). Content derived from https://ae-scripting.docsforadobe.dev/ — coverage AE 26.0 (January 2026). Split per object by ae-mcp; category: Items. -->

# Item Object

_Category: Items · URI: ae://sdk/Item_

Base class for all Project panel items. Access: `app.project.item(index)` (1-based).

#### Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `comment` | String | User comment (up to 15,999 bytes) |
| `dynamicLinkGUID` | String | Unique persistent ID for dynamic linking |
| `guides` | Array | Guide objects with `orientationType`, `positionType`, `position` (AE 16.1+) |
| `id` | Integer | Unique persistent identifier |
| `label` | Integer (0–16) | Label color (0=None) |
| `name` | String | Display name |
| `parentFolder` | FolderItem | Containing folder; set to move item |
| `selected` | Boolean | Selection state |
| `typeName` | String | Locale-specific type name ("Composition", "Folder", "Footage") |

#### Methods

**`item.addGuide(orientationType, position)`** *(Added AE 16.1)*
Creates a guide. `orientationType`: 0=horizontal, 1=vertical.
- Returns: Integer (guide index)

**`item.remove()`** — Deletes item from project.

**`item.removeGuide(guideIndex)`** *(Added AE 16.1)*
Removes guide at index.

**`item.setGuide(position, guideIndex)`** *(Added AE 16.1)*
Modifies guide position.

---
