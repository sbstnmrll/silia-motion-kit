<!-- Source: pushREC/after-effects-sdk-kb, scripting/01-extendscript-complete-reference.md (MIT; see data/LICENSES/pushREC-after-effects-sdk-kb.LICENSE). Content derived from https://ae-scripting.docsforadobe.dev/ — coverage AE 26.0 (January 2026). Split per object by ae-mcp; category: Other. -->

# KeyframeEase Object

_Category: Other · URI: ae://sdk/KeyframeEase_

**Constructor:** `new KeyframeEase(speed, influence)`

| Parameter | Type | Range | Description |
|-----------|------|-------|-------------|
| `speed` | Float | — | Speed value |
| `influence` | Float | 0.1–100.0 | Influence percentage |

#### Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `speed` | Float | Speed value |
| `influence` | Float [0.1–100] | Influence value |

```javascript
var easeIn = new KeyframeEase(0.5, 50);
var easeOut = new KeyframeEase(0.75, 85);
myLayer.property("Position").setTemporalEaseAtKey(2, [easeIn], [easeOut]);

// Multi-dimensional (Scale)
myLayer.property("Scale").setTemporalEaseAtKey(2,
    [easeIn, easeIn, easeIn],
    [easeOut, easeOut, easeOut]
);
```

---
