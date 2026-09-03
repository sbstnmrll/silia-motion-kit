<!-- Source: pushREC/after-effects-sdk-kb, scripting/01-extendscript-complete-reference.md (MIT; see data/LICENSES/pushREC-after-effects-sdk-kb.LICENSE). Content derived from https://ae-scripting.docsforadobe.dev/ — coverage AE 26.0 (January 2026). Split per object by ae-mcp; category: Changelog. -->

# Changelog

_Category: Changelog · URI: ae://sdk/Changelog_

### After Effects 26.0 (January 2026)

> **New in AE 26.0:**

- `PropertyGroup.addVariableFontAxis()` — Adds variable font axis property to text animator
- `Property.propertyParameters` — Read-only array of dropdown menu items
- `Property.valueText` — Read-only text of currently selected dropdown item

### After Effects 25.4 (August 2025)
- `app.restart()`

### After Effects 25.2 (April 2025)
- `LightLayer.lightSource` — Expanded to all 2D layer types (previously HDR/EXR only)

### After Effects 25.1 (December 2024)
- `CharacterRange.pasteFrom()`
- `FontObject.hasGlyphsFor()`
- `FontObject.otherFontsWithSameDict`
- `FontsObject.getCTScriptForString()`
- `FontsObject.getDefaultFontForCTScript()`
- `FontsObject.setDefaultFontForCTScript()`

### After Effects 24.6 (August 2024)
- `FontsObject.favoriteFontFamilyList`
- `FontsObject.fontsDuplicateByPostScriptName`
- `FontsObject.freezeSyncSubstitutedFonts`
- `FontsObject.mruFontFamilyList`
- `FontsObject.substitutedFontReplacementMatchPolicy`
- `FontsObject.pollForAndPushNonSystemFontFoldersChanges()`
- `TextDocument.boxAutoFitPolicy`
- `TextDocument.boxFirstBaselineAlignment`
- `TextDocument.boxFirstBaselineAlignmentMinimum`
- `TextDocument.boxInsetSpacing`
- `TextDocument.boxOverflow`
- `TextDocument.boxVerticalAlignment`

### After Effects 24.5 (May 2024)
- `Project.replaceFont()`
- `Project.usedFonts`

### After Effects 24.4 (May 2024)
- `ThreeDModelLayer` object

### After Effects 24.3 (March 2024)
- `CharacterRange` object
- `ParagraphRange` object
- `ComposedLineRange` object
- `TextDocument.characterRange()`
- `TextDocument.composedLineCharacterIndexesAt()`
- `TextDocument.composedLineCount`
- `TextDocument.composedLineRange()`
- `TextDocument.paragraphCharacterIndexesAt()`
- `TextDocument.paragraphCount`
- `TextDocument.paragraphRange()`
- `app.purge()` updated — `ALL_CACHES` now includes disk cache
- `LightLayer.lightSource` (initial, HDR/EXR only)
- `LightType.ENVIRONMENT`

### After Effects 24.2 (February 2024)
- `LayerCollection.addVerticalText()`
- `LayerCollection.addVerticalBoxText()`
- `TextDocument.lineOrientation`
- `FontsObject.fontServerRevision`
- `FontsObject.getFontByID()`
- `FontObject.fontID`

### After Effects 24.0 (October 2023)
- `getEnumAsString()` global function
- `app.fonts`
- `FontsObject` object + all methods/attributes
- `FontObject` object + all attributes
- Extensive `TextDocument` typography properties (autoHyphenate, autoKernType, baselineDirection, composerEngine, digitSet, direction, endIndent, everyLineComposer, firstLineIndent, fontBaselineOption, fontCapsOption, fontObject, hangingRoman, kerning, leadingType, ligature, lineJoinType, noBreak, spaceAfter, spaceBefore, startIndent, updated fauxBold/fauxItalic/justification)

### After Effects 23.0 (October 2022)
- `AVLayer.setTrackMatte()`
- `AVLayer.removeTrackMatte()`
- `AVLayer.trackMatteLayer`
- Updated `AVLayer.trackMatteType`, `isTrackMatte`, `hasTrackMatte`

### After Effects 22.6 (August 2022)
- `Property.keyLabel()`
- `Property.setLabelAtKey()`

### After Effects 22.3 (April 2022)
- `Layer.doSceneEditDetection()`

### After Effects 22.0 (October 2021)
- `Layer.id`
- `Project.layerByID()`
- `Property.essentialPropertySource`
- `app.setMultiFrameRenderingConfig()`
- `RenderQueue.queueNotify`
- `RenderQueueItem.queueItemNotify`

### After Effects 18.0 (March 2021)
- `AVItem.isMediaReplacementCompatible`
- `AVLayer.addToMotionGraphicsTemplate()`
- `AVLayer.addToMotionGraphicsTemplateAs()`
- `AVLayer.canAddToMotionGraphicsTemplate()`
- `Property.alternateSource`
- `Property.canSetAlternateSource`
- `Property.setAlternateSource()`

### After Effects 17.1.1 (May 2020)
- `CompItem.displayStartFrame`

### After Effects 17.0.1 (November 2019)
- `Property.isDropdownEffect`
- `Property.setPropertyParameters()`

### After Effects 16.1 (CC 2019 mid-cycle)
- `ViewOptions.guidesLocked`, `guidesSnap`, `guidesVisibility`, `rulers`
- `Item.addGuide()`, `removeGuide()`, `setGuide()`
- `CompItem.motionGraphicsTemplateControllerCount`
- `CompItem.getMotionGraphicsTemplateControllerName()`
- `CompItem.setMotionGraphicsControllerName()`
- `Property.addToMotionGraphicsTemplateAs()`

### After Effects 16.0 (October 2018)
- `MarkerValue.label`, `protectedRegion`
- `Project.workingSpace`, `workingGamma`, `listColorProfiles()`, `linearizeWorkingSpace`, `compensateForSceneReferredProfiles`
- `Project.expressionEngine`
- `Project.setDefaultImportFolder()`
- `app.disableRendering`

### After Effects 15.0 (October 2017)
- `CompItem.motionGraphicsTemplateName`
- `CompItem.exportAsMotionGraphicsTemplate()`
- `CompItem.openInEssentialGraphics()`
- `Property.addToMotionGraphicsTemplate()`
- `Property.canAddToMotionGraphicsTemplate()`

### After Effects 14.2 (CC 2017.1, April 2017)
- `TextDocument.leading`
- Full Team Projects API (15 methods on Project object)

### After Effects 14.0 (CC 2017, November 2016)
- `Project.toolType`
- `CompItem.markerProperty`
- `RenderQueue.queueInAME()`
- `app.availableGPUAccelTypes`

### After Effects 13.8 (CC 2015.3, June 2016)
- `Project.gpuAccelType`

### After Effects 13.6 (CC 2015, November 2015)
- `TextDocument.baselineLocs`
- `generateRandomNumber()`

### After Effects 13.2 (CC 2014.2, December 2014)
- `TextDocument.fauxBold/fauxItalic/allCaps/smallCaps/superscript/subscript` (read-only)
- `TextDocument.verticalScale/horizontalScale/baselineShift/tsume` (read-only)
- `TextDocument.boxTextPos`
- `AVLayer.sourcePointToComp()`, `compPointToSource()`

### After Effects 13.0 (CC 2014, June 2014)
- `RenderQueueItem.getSetting/setSetting/getSettings/setSettings()`
- `OutputModule.getSetting/setSetting/getSettings/setSettings()`
- `Project.itemByID()`

### After Effects 12.0 (CC, June 2013)
- `app.effects` version attribute
- `ViewOptions.fastPreview`
- `AVLayer.samplingQuality`

### After Effects 11.0 (CS6, April 2012)
- `app.activeViewer`
- `AVLayer.openInViewer()`, `CompItem.openInViewer()`, `FootageItem.openInViewer()`
- `Property.canSetExpression`
- `AVLayer.environmentLayer`
- `MaskPropertyGroup.maskFeatherFalloff`
- Shape feather properties

### After Effects 10.5 (CS5.5, April 2011)
- Project timecode properties
- `CompItem.dropFrame`
- `LayerCollection.addBoxText()`
- `TextDocument.boxText/pointText/boxTextSize`
- `LightLayer.lightType`

### After Effects 9.0 (CS4, September 2008)
- `app.isoLanguage`
- `MarkerValue.duration`
- `OutputModule.includeSourceXMP`
- `Project.xmpPacket`
- Property dimension separation (`dimensionsSeparated`, `getSeparationFollower`, etc.)
- `TextDocument` object initial release

---

*Source: https://ae-scripting.docsforadobe.dev/*
*Scraped: 2026-04-19*
*Coverage: AE 26.0 (January 2026)*
