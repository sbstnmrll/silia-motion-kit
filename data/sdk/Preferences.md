<!-- Source: pushREC/after-effects-sdk-kb, scripting/01-extendscript-complete-reference.md (MIT; see data/LICENSES/pushREC-after-effects-sdk-kb.LICENSE). Content derived from https://ae-scripting.docsforadobe.dev/ — coverage AE 26.0 (January 2026). Split per object by ae-mcp; category: Other. -->

# Preferences Object (`app.preferences`)

_Category: Other · URI: ae://sdk/Preferences_

Manages After Effects internal preferences.

#### PREFType Enum Values

| Value | File |
|-------|------|
| `PREF_Type_MACHINE_SPECIFIC` | AE Prefs.txt |
| `PREF_Type_MACHINE_INDEPENDENT` | AE Prefs-indep-general.txt |
| `PREF_Type_MACHINE_INDEPENDENT_RENDER` | AE Prefs-indep-render.txt |
| `PREF_Type_MACHINE_INDEPENDENT_OUTPUT` | AE Prefs-indep-output.txt |
| `PREF_Type_MACHINE_INDEPENDENT_COMPOSITION` | AE Prefs-indep-composition.txt |
| `PREF_Type_MACHINE_SPECIFIC_TEXT` | AE Prefs-text.txt |
| `PREF_Type_MACHINE_SPECIFIC_PAINT` | AE Prefs-paint.txt |

#### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `deletePref(section, key[, prefType])` | Nothing | Deletes preference |
| `getPrefAsBool(section, key[, prefType])` | Boolean | Read boolean pref |
| `getPrefAsFloat(section, key[, prefType])` | Float | Read float pref |
| `getPrefAsLong(section, key[, prefType])` | Long | Read long/integer pref |
| `getPrefAsString(section, key[, prefType])` | String | Read string pref |
| `havePref(section, key[, prefType])` | Boolean | Check if pref exists |
| `reload()` | Nothing | Reload preferences file |
| `savePrefAsBool(section, key, value[, prefType])` | Nothing | Save boolean pref |
| `savePrefAsFloat(section, key, value[, prefType])` | Nothing | Save float pref |
| `savePrefAsLong(section, key, value[, prefType])` | Nothing | Save long pref |
| `savePrefAsString(section, key, value[, prefType])` | Nothing | Save string pref |
| `saveToDisk()` | Nothing | Persist preferences to disk |

```javascript
var debuggerOn = app.preferences.getPrefAsBool(
    "Main Pref Section v2",
    "Pref_JAVASCRIPT_DEBUGGER",
    PREFType.PREF_Type_MACHINE_INDEPENDENT
);
```

---
