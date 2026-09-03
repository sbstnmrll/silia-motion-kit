<!-- Source: pushREC/after-effects-sdk-kb, scripting/01-extendscript-complete-reference.md (MIT; see data/LICENSES/pushREC-after-effects-sdk-kb.LICENSE). Content derived from https://ae-scripting.docsforadobe.dev/ — coverage AE 26.0 (January 2026). Split per object by ae-mcp; category: General. -->

# Global Functions

_Category: General · URI: ae://sdk/GlobalFunctions_

| Function | Added | Description |
|----------|-------|-------------|
| `clearOutput()` | — | Removes text from the Info panel |
| `currentFormatToTime(formattedTime, fps, isDuration)` | — | Converts frame-time string to seconds |
| `generateRandomNumber()` | AE 13.6 | Thread-safe pseudo-random value 0–1 (prefer over `Math.random()`) |
| `getEnumAsString(enumValue)` | AE 24.0 | Returns string representation of an enum |
| `isValid(obj)` | — | Tests whether an AE object still exists |
| `timeToCurrentFormat(time, fps, isDuration)` | — | Converts seconds to formatted frame-time string |
| `write(text)` | — | Outputs text to Info panel without line termination |
| `writeLn(text)` | — | Outputs text to Info panel with line termination |

---
