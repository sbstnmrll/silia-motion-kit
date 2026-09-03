<!-- Source: pushREC/after-effects-sdk-kb, scripting/01-extendscript-complete-reference.md (MIT; see data/LICENSES/pushREC-after-effects-sdk-kb.LICENSE). Content derived from https://ae-scripting.docsforadobe.dev/ — coverage AE 26.0 (January 2026). Split per object by ae-mcp; category: Render Queue. -->

# RenderQueueItem Object

_Category: Render Queue · URI: ae://sdk/RenderQueueItem_

Access: `app.project.renderQueue.item(index)`.

#### Attributes

| Attribute | Type | Added | Description |
|-----------|------|-------|-------------|
| `comp` | CompItem | — | Composition being rendered |
| `elapsedSeconds` | Integer or null | — | Seconds spent rendering |
| `logType` | LogType | — | ERRORS_ONLY, ERRORS_AND_SETTINGS, ERRORS_AND_PER_FRAME_INFO |
| `numOutputModules` | Integer | — | Output module count |
| `onStatusChanged` | Function name | — | Callback on status change |
| `outputModules` | OMCollection | — | Output modules |
| `queueItemNotify` | Boolean | AE 22.0 | Notify checkbox |
| `render` | Boolean | — | Renders when queue starts (setting true → QUEUED) |
| `skipFrames` | Integer [0–99] | — | Frames to skip |
| `startTime` | Date or null | — | When rendering began |
| `status` | RQItemStatus | — | Current render status |
| `templates` | String[] | — | Available render settings templates |
| `timeSpanDuration` | Float | — | Duration to render (seconds) |
| `timeSpanStart` | Float | — | Render start time (seconds) |

#### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `applyTemplate(templateName)` | Nothing | Apply render settings template |
| `duplicate()` | RenderQueueItem | Duplicate item |
| `getSetting(key)` | Value | Get setting (AE 13.0+) |
| `getSettings(format)` | Object | Get all settings (AE 13.0+) |
| `outputModule(index)` | OutputModule | Access output module |
| `remove()` | Nothing | Remove from queue |
| `saveAsTemplate(name)` | Nothing | Save as template |
| `setSetting(key, value)` | Nothing | Set setting (AE 13.0+) |
| `setSettings(object)` | Nothing | Set multiple settings (AE 13.0+) |

---
