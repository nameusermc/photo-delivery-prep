# Photo Delivery Prep — Feature Update: Resize, Watermark, Delivery Receipt

## Overview
Three new delivery options added — all client-side, zero server cost, zero architectural changes.
These features go in the "Delivery Options" section between the rename settings and the file list.

---

## New Features

### 1. Image Resize / Quality Options
- Preset sizes: 2048, 1600, 1200, 3000, or custom long-edge
- JPEG quality slider (10–100%, default 80%)
- Only downscales — images smaller than target are left as-is
- Only applies to browser-renderable images (JPEG, PNG, WebP, BMP, GIF)
- RAW, video, TIFF, HEIC pass through untouched
- Resized images are saved as JPEG at the chosen quality

### 2. Watermark on Proofs
- Text watermark with configurable text (e.g. "© Your Name")
- 5 positions: Center (large diagonal), bottom-right, bottom-left, top-right, top-left
- Center mode tiles the text diagonally across the entire image (proof-style)
- Corner modes place a single line with a stroke outline
- Opacity slider (5–80%, default 30%)
- White text with black stroke outline for visibility on any background
- Only applies to browser-renderable images (same as resize)

### 3. Delivery Receipt
- Auto-generated `delivery-receipt.txt` included in the ZIP
- Contains: date, time, photographer name, client name, file count, naming prefix
- Full filename manifest (numbered list of all files in the ZIP)
- Optional notes field for custom delivery info
- Works regardless of file type — it's just a text file

---

## Processing Pipeline Order

For each file, the processing steps run in this order:
1. **EXIF removal** (JPEG only) — strips GPS/serial/software tags using piexif
2. **Resize** (renderable images only) — canvas downscale + JPEG export
3. **Watermark** (renderable images only) — canvas text overlay
4. **Add to ZIP** with the final filename

Non-renderable files (RAW, video, TIFF, HEIC) skip steps 2 and 3 entirely.

---

## Files Changed

### `index.html`
- Added `<section id="deliveryOptions">` between renameSection and metadataSection
- Contains resize, watermark, and delivery receipt option groups
- Each has a checkbox toggle + hidden sub-options that reveal on check
- Updated "How It Works" with step 4 about delivery options
- Updated Features list with 3 new bullet points
- Updated FAQ with 3 new questions (resize quality, watermark formats, receipt contents)
- Updated structured data featureList
- Cache-bust: `main.js?v=5`

### `main.js`
- Added `RENDERABLE_EXTENSIONS` constant and `isRenderable()` helper
- Added `loadImage()` utility (File/Blob → Image element via object URL)
- Added `resizeImage(fileOrBlob, maxLongEdge, jpegQuality)` — canvas downscale
- Added `applyWatermark(fileOrBlob, text, position, opacity)` — canvas text overlay
- Added `generateDeliveryReceipt(filenames, prefix, photographer, client, notes)` — text manifest
- Updated download handler with 4-step pipeline (EXIF → resize → watermark → ZIP)
- Added per-file progress indicator ("Processing 3 of 25...")
- Added toggle event handlers for delivery options UI elements

### `style.css` (additions)
- `#deliveryOptions` section styling
- `.option-group` and `.sub-options` layout
- Form control styling for text inputs, selects, textareas, range sliders

---

## What Did NOT Change
- Paddle payment flow — identical
- Restore purchase flow — identical
- File format detection — identical
- EXIF metadata reading/display — identical
- Free limit enforcement — identical
- File sorting and naming — identical

---

## Git Commit Message

```
feat: Add image resize, watermark, and delivery receipt

- Add delivery options section with resize, watermark, and receipt controls
- Resize: preset/custom long-edge with JPEG quality slider, canvas downscale
- Watermark: text overlay with 5 positions, opacity control, diagonal tiling
- Receipt: auto-generated delivery-receipt.txt with file manifest in ZIP
- All processing client-side via canvas API, zero server cost
- Only applies to browser-renderable images (JPEG/PNG/WebP/BMP/GIF)
- RAW, video, TIFF, HEIC pass through untouched
- Update How It Works, Features, FAQ, and structured data
- Cache-bust main.js?v=5
```
