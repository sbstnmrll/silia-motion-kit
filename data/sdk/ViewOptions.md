<!-- Source: pushREC/after-effects-sdk-kb, scripting/01-extendscript-complete-reference.md (MIT; see data/LICENSES/pushREC-after-effects-sdk-kb.LICENSE). Content derived from https://ae-scripting.docsforadobe.dev/ — coverage AE 26.0 (January 2026). Split per object by ae-mcp; category: Other. -->

# ViewOptions Object

_Category: Other · URI: ae://sdk/ViewOptions_

Access: `app.activeViewer.views[0].options`

| Attribute | Type | Added | Description |
|-----------|------|-------|-------------|
| `channels` | ChannelType | — | Channel display (CHANNEL_RGB, CHANNEL_RED, etc.) |
| `checkerboards` | Boolean | — | Transparency grid |
| `exposure` | Float [-40..40] | — | Exposure adjustment |
| `fastPreview` | FastPreviewType | AE 12.0 | FP_OFF, FP_ADAPTIVE_RESOLUTION, FP_DRAFT, FP_FAST_DRAFT, FP_WIREFRAME |
| `guidesLocked` | Boolean | AE 16.1 | Guides locked |
| `guidesSnap` | Boolean | AE 16.1 | Snap to guides |
| `guidesVisibility` | Boolean | AE 16.1 | Guide visibility |
| `rulers` | Boolean | AE 16.1 | Show rulers |
| `zoom` | Float [0.01..16] | — | Zoom level (1.0 = 100%) |

---
