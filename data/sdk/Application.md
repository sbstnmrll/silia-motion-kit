<!-- Source: pushREC/after-effects-sdk-kb, scripting/01-extendscript-complete-reference.md (MIT; see data/LICENSES/pushREC-after-effects-sdk-kb.LICENSE). Content derived from https://ae-scripting.docsforadobe.dev/ — coverage AE 26.0 (January 2026). Split per object by ae-mcp; category: General. -->

# Application Object (`app`)

_Category: General · URI: ae://sdk/Application_

The single global object providing access to all After Effects functionality.

#### Attributes

| Attribute | Type | Added | Description |
|-----------|------|-------|-------------|
| `activeViewer` | Viewer or null | AE 11.0 | Currently focused viewer panel |
| `availableGPUAccelTypes` | Array of GpuAccelType | AE 14.0 | Available GPU acceleration options (CUDA, Metal, OPENCL, SOFTWARE) |
| `buildName` | String | — | Internal build name |
| `buildNumber` | Integer | — | Internal build number |
| `disableRendering` | Boolean | AE 16.0 | Set `true` to disable rendering (like Caps Lock) |
| `effects` | Array | — | Available effects; each has `displayName`, `category`, `matchName`, `version` |
| `exitAfterLaunchAndEval` | Boolean | — | Exit after command-line script (Windows only) |
| `exitCode` | Integer | — | Numeric status code for external scripts; set positive integer to indicate error |
| `fonts` | Fonts object | AE 24.0 | Access all system fonts |
| `isoLanguage` | String | AE 9.0 | Locale string (e.g., `en_US`, `de_DE`, `ja_JP`) |
| `isRenderEngine` | Boolean | — | True if running as render engine |
| `isWatchFolder` | Boolean | — | True if Watch Folder dialog is active |
| `memoryInUse` | Number | — | Bytes of memory in use |
| `onError` | Function name or null | — | Callback invoked on errors; receives error string and severity |
| `preferences` | Preferences object | — | AE application preferences |
| `project` | Project object | — | Currently loaded project |
| `saveProjectOnCrash` | Boolean | — | Whether to prompt save on unexpected quit |
| `settings` | Settings object | — | Currently loaded script settings |
| `version` | String | AE 12.0 | After Effects version string |

#### Methods

**`app.activate()`**
Opens and brings the application to the front.
- Returns: Nothing

**`app.beginSuppressDialogs()`**
Begins suppression of error dialog boxes. Pair with `endSuppressDialogs()`.
- Returns: Nothing

**`app.beginUndoGroup(undoString)`**
Marks start of an undoable action group.

| Parameter | Type | Description |
|-----------|------|-------------|
| `undoString` | String | Text shown in Edit > Undo menu |

- Returns: Nothing

**`app.cancelTask(taskID)`**
Removes a scheduled task.

| Parameter | Type | Description |
|-----------|------|-------------|
| `taskID` | Integer | ID from `scheduleTask()` |

- Returns: Nothing

**`app.endSuppressDialogs(alert)`**

| Parameter | Type | Description |
|-----------|------|-------------|
| `alert` | Boolean | Show errors that occurred during suppression |

- Returns: Nothing

**`app.endUndoGroup()`**
Closes the undo group. Automatic at script end.
- Returns: Nothing

**`app.endWatchFolder()`**
Ends Watch Folder mode.
- Returns: Nothing

**`app.executeCommand(id)`**
Executes a menu command by ID number.

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | Integer | Menu command ID |

```javascript
app.executeCommand(4162); // Convert to Bezier Path
```

**`app.findMenuCommandId(command)`**
Returns the ID for a menu command text.

| Parameter | Type | Description |
|-----------|------|-------------|
| `command` | String | Exact menu text as shown in UI |

- Returns: Integer

**`app.newProject()`**
Creates a new project (prompts to save if current project has edits).
- Returns: Project object or `null`

```javascript
app.project.close(CloseOptions.DO_NOT_SAVE_CHANGES);
app.newProject();
```

**`app.open([file])`**
Opens a project.

| Parameter | Type | Description |
|-----------|------|-------------|
| `file` | File (optional) | Project file; prompts user if omitted |

- Returns: Project object or `null`

**`app.openFast(file)`** *(Undocumented — use with caution)*
Opens a project faster by skipping validation checks.
- Returns: Project object

**`app.parseSwatchFile(file)`**
Loads color swatch data from an ASE file.
- Returns: Swatch data object with `majorVersion`, `minorVersion`, `values` array

**`app.pauseWatchFolder(pause)`**
Pauses or resumes Watch Folder monitoring.

| Parameter | Type | Description |
|-----------|------|-------------|
| `pause` | Boolean | `true` to pause |

**`app.purge(target)`**
Purges unused data. Updated in AE 24.3: `ALL_CACHES` now also clears disk cache; `ALL_MEMORY_CACHES` clears RAM only.

| Parameter | Type | Description |
|-----------|------|-------------|
| `target` | PurgeTarget | `ALL_CACHES`, `ALL_MEMORY_CACHES` (24.3+), `UNDO_CACHES`, `SNAPSHOT_CACHES`, `IMAGE_CACHES` |

**`app.quit()`** — Quits After Effects.

**`app.restart()`** *(Added AE 25.4)* — Restarts After Effects.

**`app.scheduleTask(stringToExecute, delay, repeat)`**
Schedules JavaScript for delayed execution.

| Parameter | Type | Description |
|-----------|------|-------------|
| `stringToExecute` | String | JavaScript to execute |
| `delay` | Float | Milliseconds to wait |
| `repeat` | Boolean | `true` for repeated execution |

- Returns: Integer (task ID)

**`app.setMemoryUsageLimits(imageCachePercentage, maximumMemoryPercentage)`**
Sets memory usage limits.

**`app.setMultiFrameRenderingConfig(mfr_on, max_cpu_perc)`** *(Added AE 22.0)*
Sets Multi-Frame Rendering configuration for next render.

| Parameter | Type | Description |
|-----------|------|-------------|
| `mfr_on` | Boolean | Enable Multi-Frame Rendering |
| `max_cpu_perc` | Float [1..100] | Max CPU percentage; pass 100 if disabled |

**`app.setSavePreferencesOnQuit(doSave)`**
Sets whether preferences save on quit.

**`app.watchFolder(folder_object_to_watch)`**
Starts Watch Folder monitoring.

```javascript
var theFolder = new Folder("c:/renders");
app.watchFolder(theFolder);
```

---
