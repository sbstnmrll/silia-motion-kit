<!-- Source: pushREC/after-effects-sdk-kb, scripting/01-extendscript-complete-reference.md (MIT; see data/LICENSES/pushREC-after-effects-sdk-kb.LICENSE). Content derived from https://ae-scripting.docsforadobe.dev/ — coverage AE 26.0 (January 2026). Split per object by ae-mcp; category: Render Queue. -->

# RenderQueue Object (`app.project.renderQueue`)

_Category: Render Queue · URI: ae://sdk/RenderQueue_

#### Attributes

| Attribute | Type | Added | Description |
|-----------|------|-------|-------------|
| `canQueueInAME` | Boolean | AE 14.0 | Queued items exist for AME |
| `items` | RQItemCollection | — | All render queue items |
| `numItems` | Integer | — | Item count |
| `queueNotify` | Boolean | AE 22.0 | Notify checkbox state |
| `rendering` | Boolean | — | Rendering in progress or paused |

#### Methods

**`renderQueue.item(index)`** — Returns: RenderQueueItem

**`renderQueue.render()`** — Starts rendering (blocking until complete).

**`renderQueue.pauseRendering(pause)`**

**`renderQueue.stopRendering()`**

**`renderQueue.showWindow(doShow)`**

**`renderQueue.queueInAME(render_immediately_in_AME)`** *(Added AE 14.0)*
Requires AME CC 2017 (11.0)+.

```javascript
if (app.project.renderQueue.canQueueInAME) {
    app.project.renderQueue.queueInAME(false);
}
```

---
