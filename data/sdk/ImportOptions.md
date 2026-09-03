<!-- Source: pushREC/after-effects-sdk-kb, scripting/01-extendscript-complete-reference.md (MIT; see data/LICENSES/pushREC-after-effects-sdk-kb.LICENSE). Content derived from https://ae-scripting.docsforadobe.dev/ — coverage AE 26.0 (January 2026). Split per object by ae-mcp; category: Other. -->

# ImportOptions Object

_Category: Other · URI: ae://sdk/ImportOptions_

**Constructor:** `new ImportOptions()` or `new ImportOptions(file)`

#### Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `file` | File | File to import |
| `forceAlphabetical` | Boolean | Force alphabetical ordering |
| `importAs` | ImportAsType | COMP_CROPPED_LAYERS, FOOTAGE, COMP, PROJECT |
| `rangeEnd` | Integer | End of clipping range for sequences |
| `rangeStart` | Integer | Start of clipping range |
| `sequence` | Boolean | Import as sequence |

#### Methods

**`importOptions.canImportAs(type)`** — Returns: Boolean

**`importOptions.isFileNameNumbered(file)`** — Returns: `{isNumbered: Boolean, num: Integer}`

```javascript
var io = new ImportOptions(new File("c:\\myFile.psd"));
if (io.canImportAs(ImportAsType.COMP)) {
    io.importAs = ImportAsType.COMP;
}
app.project.importFile(io);

// Sequence import (frames 10–30)
var io2 = new ImportOptions();
io2.file = new File("~/sequence/image_000.png");
io2.sequence = true;
io2.rangeStart = 10;
io2.rangeEnd = 30;
app.project.importFile(io2);
```

---
