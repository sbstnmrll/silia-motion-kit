<!-- Source: pushREC/after-effects-sdk-kb, scripting/01-extendscript-complete-reference.md (MIT; see data/LICENSES/pushREC-after-effects-sdk-kb.LICENSE). Content derived from https://ae-scripting.docsforadobe.dev/ — coverage AE 26.0 (January 2026). Split per object by ae-mcp; category: General. -->

# Project Object (`app.project`)

_Category: General · URI: ae://sdk/Project_

#### Attributes

| Attribute | Type | Added | Description |
|-----------|------|-------|-------------|
| `activeItem` | Item or null | — | Currently active item |
| `bitsPerChannel` | Integer (8/16/32) | — | Project color depth |
| `compensateForSceneReferredProfiles` | Boolean | AE 16.0 | Scene-referred profiles compensation |
| `dirty` | Boolean | AE 17.5 | True if project modified since last save |
| `displayStartFrame` | Integer (0 or 1) | — | Frame Count display start |
| `expressionEngine` | String | AE 16.0 | `"extendscript"` or `"javascript-1.0"` |
| `feetFramesFilmType` | FeetFramesFilmType | — | `MM16` or `MM35` |
| `file` | File or null | — | Project file |
| `footageTimecodeDisplayStartType` | FootageTimecodeDisplayStartType | — | `FTCS_START_0` or `FTCS_USE_SOURCE_MEDIA` |
| `framesCountType` | FramesCountType | — | `FC_START_1`, `FC_START_0`, `FC_TIMECODE_CONVERSION` |
| `framesUseFeetFrames` | Boolean | — | Feet+Frames vs Frames display |
| `gpuAccelType` | GpuAccelType | AE 13.8 | CUDA, Metal, OPENCL, SOFTWARE |
| `items` | ItemCollection | — | All project items |
| `linearBlending` | Boolean | — | Linear blending enabled |
| `linearizeWorkingSpace` | Boolean | AE 16.0 | Linearize Working Space enabled |
| `numItems` | Integer | — | Total item count |
| `renderQueue` | RenderQueue | — | Project render queue |
| `revision` | Integer | — | Project revision number |
| `rootFolder` | FolderItem | — | Root project folder |
| `selection` | Array of Item | — | Selected items in Project panel |
| `timeDisplayType` | TimeDisplayType | — | `FRAMES` or `TIMECODE` |
| `toolType` | ToolType | AE 14.0 | Currently active tool |
| `transparencyGridThumbnails` | Boolean | — | Transparency checkerboard in thumbnails |
| `usedFonts` | Array of Objects | AE 24.5 | Fonts used in project with layer references |
| `workingGamma` | 2.2 or 2.4 | — | Working gamma (ignored if color space set) |
| `workingSpace` | String | AE 16.0 | Color profile description |
| `xmpPacket` | String | AE 9.0 | Project XMP metadata (RDF/XML) |

#### Methods

**`project.autoFixExpressions(oldText, newText)`**
Replaces text in broken expressions.

**`project.close(closeOptions)`**
Closes the project. `closeOptions`: `DO_NOT_SAVE_CHANGES`, `PROMPT_TO_SAVE_CHANGES`, `SAVE_CHANGES`.
- Returns: Boolean

**`project.consolidateFootage()`**
Consolidates all footage (File > Consolidate All Footage).
- Returns: Integer (number removed)

**`project.importFile(importOptions)`**
Imports a file.

```javascript
app.project.importFile(new ImportOptions(new File("sample.psd")));
```

- Returns: FootageItem

**`project.importFileWithDialog()`**
Shows Import File dialog.
- Returns: Array of Item objects or `null`

**`project.importPlaceholder(name, width, height, frameRate, duration)`**
Creates a PlaceholderItem.
- Returns: PlaceholderItem

**`project.item(index)`** — Returns Item at index (1-based).

**`project.itemByID(id)`** *(Added AE 13.0)* — Returns Item by ID.

**`project.layerByID(id)`** *(Added AE 22.0)* — Returns Layer by ID.

```javascript
var firstLayer = app.project.item(1).layer(1);
var id = firstLayer.id;
if (app.project.layerByID(id) === firstLayer) alert("Got layer by ID!");
```

**`project.listColorProfiles()`**
- Returns: Array of color profile description strings

**`project.reduceProject(array_of_items)`**
Removes all items except specified ones.
- Returns: Integer (number removed)

**`project.removeUnusedFootage()`**
- Returns: Integer (number removed)

**`project.replaceFont(fromFont, toFont, [noFontLocking])`** *(Added AE 24.5)*
Replaces all usages of one font with another.

```javascript
var fromFont = app.project.usedFonts[0].font;
var toFont = app.fonts.getFontsByPostScriptName("TimesNewRomanPSMT")[0];
app.project.replaceFont(fromFont, toFont);
```

- Returns: Boolean (true if any layer changed)

**`project.save([file])`** — Saves project.

**`project.saveWithDialog()`** — Shows Save dialog. Returns: Boolean.

**`project.setDefaultImportFolder([folder])`**
Sets default import folder. Call without params to disable.

```javascript
app.project.setDefaultImportFolder(Folder.desktop);
```

- Returns: Boolean

**`project.showWindow(doShow)`** — Shows/hides Project panel.

#### Team Projects Methods *(Added AE 14.2)*

| Method | Returns | Description |
|--------|---------|-------------|
| `newTeamProject(name, [desc])` | Boolean | Creates team project |
| `openTeamProject(name)` | Boolean | Opens team project |
| `shareTeamProject([comment])` | Boolean | Shares open team project |
| `syncTeamProject()` | Boolean | Syncs open team project |
| `closeTeamProject()` | Boolean | Closes team project |
| `convertTeamProjectToProject(file)` | Boolean | Converts to local .aep |
| `listTeamProjects()` | String[] | Lists available team projects |
| `isTeamProjectOpen(name)` | Boolean | Checks if specific project is open |
| `isAnyTeamProjectOpen()` | Boolean | Checks if any team project is open |
| `isTeamProjectEnabled()` | Boolean | Checks if team projects enabled |
| `isLoggedInToTeamProject()` | Boolean | Checks login status |
| `isSyncCommandEnabled()` | Boolean | Sync command available |
| `isShareCommandEnabled()` | Boolean | Share command available |
| `isResolveCommandEnabled()` | Boolean | Resolve command available |
| `resolveConflict(ResolveType)` | Boolean | Resolves conflict (ACCEPT_THEIRS, ACCEPT_YOURS, ACCEPT_THEIRS_AND_COPY) |

---
