<!-- Source: pushREC/after-effects-sdk-kb, scripting/01-extendscript-complete-reference.md (MIT; see data/LICENSES/pushREC-after-effects-sdk-kb.LICENSE). Content derived from https://ae-scripting.docsforadobe.dev/ — coverage AE 26.0 (January 2026). Split per object by ae-mcp; category: Render Queue. -->

# OutputModule Object

_Category: Render Queue · URI: ae://sdk/OutputModule_

Access: `app.project.renderQueue.item(index).outputModule(index)`.

#### Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `file` | File | Output file destination |
| `includeSourceXMP` | Boolean | Write source XMP metadata |
| `name` | String | Display name |
| `postRenderAction` | PostRenderAction | NONE, IMPORT, IMPORT_AND_REPLACE_USAGE, SET_PROXY |
| `templates` | String[] | Available output module templates |

#### Methods

**`outputModule.applyTemplate(templateName)`**

**`outputModule.getSetting()`** *(Added AE 13.0)*

**`outputModule.getSettings([format])`** *(Added AE 13.0)* — format: `GetSettingsFormat.STRING` or `NUMBER`

**`outputModule.remove()`**

**`outputModule.saveAsTemplate(name)`**

**`outputModule.setSetting()`** *(Added AE 13.0)*

**`outputModule.setSettings(object)`** *(Added AE 13.0)* **Note:** Bug invalidates OutputModule object after modification — retrieve fresh reference.

---
