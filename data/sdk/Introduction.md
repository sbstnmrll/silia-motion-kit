<!-- Source: pushREC/after-effects-sdk-kb, scripting/01-extendscript-complete-reference.md (MIT; see data/LICENSES/pushREC-after-effects-sdk-kb.LICENSE). Content derived from https://ae-scripting.docsforadobe.dev/ — coverage AE 26.0 (January 2026). Split per object by ae-mcp; category: Introduction & Overview. -->

# Introduction & Overview

_Category: Introduction & Overview · URI: ae://sdk/Introduction_

### What is ExtendScript?

ExtendScript is Adobe's extended JavaScript variant for scripting creative applications. After Effects uses it to expose its object model for automation — compositions, layers, properties, the render queue, and more. Scripts use the `.jsx` extension (binary `.jsxbin` also supported).

The object model mirrors the UI hierarchy: `app` → `project` → `items` → `layers` → `properties`.

**Key distinction:** "expressions" describe _what_ a property value is; scripts _direct_ the application to perform actions.

### Running Scripts

| Method | Details |
|--------|---------|
| File > Scripts menu | Scripts in the Scripts folder load at startup |
| File > Scripts > Run Script File | Run an unloaded script |
| Command line (Windows) | `afterfx.exe -r script.jsx` or `afterfx.exe -s "alert('hello')"` |
| AppleScript (Mac) | `tell application "Adobe After Effects" DoScript "..."` |
| Startup/Shutdown folders | Auto-run alphabetically on launch/quit |
| ScriptUI Panels folder | Appear in Window menu as dockable panels |

### ScriptUI Panel Pattern

```javascript
// Supports both Window and Panel (dockable) contexts
var myPanel = (thisObj instanceof Panel) ? thisObj : new Window("palette", "My Tools", [100, 100, 300, 300]);
myPanel.add("button", [10, 10, 100, 30], "Tool #1");
```

### Activating Full Features

Enable file/network access: Edit > Preferences > General > "Allow Scripts To Write Files And Access Network".

---
