<!-- Source: pushREC/after-effects-sdk-kb, scripting/01-extendscript-complete-reference.md (MIT; see data/LICENSES/pushREC-after-effects-sdk-kb.LICENSE). Content derived from https://ae-scripting.docsforadobe.dev/ — coverage AE 26.0 (January 2026). Split per object by ae-mcp; category: General. -->

# System Object (`system`)

_Category: General · URI: ae://sdk/System_

Global `system` object for OS-level information.

#### Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `machineName` | String | Computer name |
| `osName` | String | OS name (blank on Windows 7+; use `$.os` instead) |
| `osVersion` | String | OS version number |
| `userName` | String | Currently logged-in user name |

#### Methods

**`system.callSystem(cmdLineToExecute)`**
Executes a system command.

| Parameter | Type | Description |
|-----------|------|-------------|
| `cmdLineToExecute` | String | Command to execute |

- Returns: String (command output)

```javascript
var timeStr = system.callSystem("cmd.exe /c \"time /t\"");
alert("Current time: " + timeStr);
```

---
