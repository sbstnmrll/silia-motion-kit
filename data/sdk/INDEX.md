<!-- Source: pushREC/after-effects-sdk-kb, scripting/01-extendscript-complete-reference.md (MIT; see data/LICENSES/pushREC-after-effects-sdk-kb.LICENSE). Content derived from https://ae-scripting.docsforadobe.dev/ — coverage AE 26.0 (January 2026). Split per object by ae-mcp; category: index. -->

# After Effects ExtendScript API reference (ae://sdk)

Source: pushREC/after-effects-sdk-kb (MIT), derived from https://ae-scripting.docsforadobe.dev/ — coverage AE 26.0 (January 2026), scraped 2026-04-19.
Read one object with `ae://sdk/{object}` (case-insensitive; `Object` suffix optional). Match names for every layer type and first-party effect are in `ae://sdk/MatchNames`; API additions per AE version in `ae://sdk/Changelog`.

| Object | Category | Summary | URI |
|---|---|---|---|
| Introduction | Introduction & Overview | ExtendScript is Adobe's extended JavaScript variant for scripting creative applications. After Effects uses it to expose its object model for automation — compositions, layers, pro | ae://sdk/Introduction |
| GlobalFunctions | General |  | ae://sdk/GlobalFunctions |
| Application | General | The single global object providing access to all After Effects functionality. | ae://sdk/Application |
| Project | General | **`project.autoFixExpressions(oldText, newText)`** | ae://sdk/Project |
| System | General | Global `system` object for OS-level information. | ae://sdk/System |
| Item | Items | Base class for all Project panel items. Access: `app.project.item(index)` (1-based). | ae://sdk/Item |
| ItemCollection | Items | Access: `app.project.items` or `folderItem.items`. | ae://sdk/ItemCollection |
| AVItem | Items | Base class for CompItem and FootageItem. Access: `app.project.item(index)`. | ae://sdk/AVItem |
| CompItem | Items | Represents a composition. Subclass of AVItem. Access: `app.project.item(index)`. | ae://sdk/CompItem |
| FolderItem | Items | Represents a folder in the Project panel. | ae://sdk/FolderItem |
| FootageItem | Items | Represents imported footage. Subclass of AVItem. | ae://sdk/FootageItem |
| Layer | Layers | Base class for all layers. Access: `app.project.item(index).layer(index)`. | ae://sdk/Layer |
| LayerCollection | Layers | Access: `app.project.item(index).layers`. | ae://sdk/LayerCollection |
| AVLayer | Layers | Represents AV layers (footage, solid, null, text, shape). Subclass of Layer. | ae://sdk/AVLayer |
| CameraLayer | Layers | Subclass of Layer. Created with `layers.addCamera()`. | ae://sdk/CameraLayer |
| LightLayer | Layers | Subclass of Layer. Created with `layers.addLight()`. | ae://sdk/LightLayer |
| ShapeLayer | Layers | Subclass of AVLayer. Created with `layers.addShape()`. No additional attributes. All AVLayer and Layer methods available. | ae://sdk/ShapeLayer |
| TextLayer | Layers | Subclass of AVLayer. Created with `layers.addText()`. | ae://sdk/TextLayer |
| ThreeDModelLayer | Layers | > **New in AE 26.0 (actually 24.4):** ThreeDModelLayer added in AE 24.4. | ae://sdk/ThreeDModelLayer |
| PropertyBase | Properties | Base class for both Property and PropertyGroup. | ae://sdk/PropertyBase |
| Property | Properties | Subclass of PropertyBase. Represents an animatable value. | ae://sdk/Property |
| PropertyGroup | Properties | Subclass of PropertyBase. Container for Property and PropertyGroup objects. | ae://sdk/PropertyGroup |
| MaskPropertyGroup | Properties | Subclass of PropertyGroup. Access: `layer.mask(index)`. | ae://sdk/MaskPropertyGroup |
| RenderQueue | Render Queue | **`renderQueue.item(index)`** — Returns: RenderQueueItem | ae://sdk/RenderQueue |
| RQItemCollection | Render Queue | Access: `app.project.renderQueue.items`. | ae://sdk/RQItemCollection |
| RenderQueueItem | Render Queue | Access: `app.project.renderQueue.item(index)`. | ae://sdk/RenderQueueItem |
| OutputModule | Render Queue | Access: `app.project.renderQueue.item(index).outputModule(index)`. | ae://sdk/OutputModule |
| FootageSource | Sources | Base class for SolidSource. Access: `footageItem.mainSource` or `item.proxySource`. | ae://sdk/FootageSource |
| FileSource | Sources | Subclass of FootageSource. Represents file-based footage. | ae://sdk/FileSource |
| SolidSource | Sources | Subclass of FootageSource. Represents solid-color footage. | ae://sdk/SolidSource |
| PlaceholderSource | Sources | Subclass of FootageSource. No additional attributes or methods. | ae://sdk/PlaceholderSource |
| TextDocument | Text | Stores text content and formatting for a TextLayer's Source Text property. | ae://sdk/TextDocument |
| Font | Text | > **Added AE 24.0.** Provides detailed information about a specific font. | ae://sdk/Font |
| Fonts | Text | > **Added AE 24.0.** Access and manage all system fonts. | ae://sdk/Fonts |
| CharacterRange | Text | > **Added AE 24.3.** Access character-level styling across a range. | ae://sdk/CharacterRange |
| ParagraphRange | Text | > **Added AE 24.3.** Access paragraph-level ranges within TextDocument. | ae://sdk/ParagraphRange |
| ComposedLineRange | Text | > **Added AE 24.3.** Access composed-line ranges. Static — doesn't recompose when document is modified. | ae://sdk/ComposedLineRange |
| Collection | Other | Base class for ItemCollection, LayerCollection, OMCollection, RQItemCollection. | ae://sdk/Collection |
| ImportOptions | Other | **Constructor:** `new ImportOptions()` or `new ImportOptions(file)` | ae://sdk/ImportOptions |
| KeyframeEase | Other | **Constructor:** `new KeyframeEase(speed, influence)` | ae://sdk/KeyframeEase |
| MarkerValue | Other | **Constructor:** `new MarkerValue(comment[, chapter, url, frameTarget, cuePointName, params])` | ae://sdk/MarkerValue |
| Shape | Other | **Constructor:** `new Shape()` | ae://sdk/Shape |
| View | Other | Access: `app.activeViewer.views[0]` | ae://sdk/View |
| Viewer | Other | Access: `app.activeViewer` | ae://sdk/Viewer |
| ViewOptions | Other | Access: `app.activeViewer.views[0].options` | ae://sdk/ViewOptions |
| Preferences | Other | Manages After Effects internal preferences. | ae://sdk/Preferences |
| Settings | Other | Persistent script settings stored in AE preferences file. | ae://sdk/Settings |
| MatchNames | Match Names Reference | Match names are stable identifiers that don't change with locale or version updates. Always prefer match names over display names in production scripts. | ae://sdk/MatchNames |
| Changelog | Changelog | > **New in AE 26.0:** | ae://sdk/Changelog |
