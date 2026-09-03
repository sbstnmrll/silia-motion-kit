<!-- Source: pushREC/after-effects-sdk-kb, scripting/01-extendscript-complete-reference.md (MIT; see data/LICENSES/pushREC-after-effects-sdk-kb.LICENSE). Content derived from https://ae-scripting.docsforadobe.dev/ — coverage AE 26.0 (January 2026). Split per object by ae-mcp; category: Other. -->

# Settings Object (`app.settings`)

_Category: Other · URI: ae://sdk/Settings_

Persistent script settings stored in AE preferences file.

- All values stored as strings
- Section names prepended internally with `"Settings_"`
- Maximum value: 1999 bytes

#### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getSetting(section, key[, prefType])` | String | Read setting |
| `haveSetting(section, key[, prefType])` | Boolean | Check if setting exists |
| `saveSetting(section, key, value[, prefType])` | Nothing | Save setting |

```javascript
app.settings.saveSetting("MyScript", "lastUsedFolder", "C:/Projects");
var folder = app.settings.getSetting("MyScript", "lastUsedFolder");
```

---
