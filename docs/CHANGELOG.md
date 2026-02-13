# Photo Delivery Prep — Update Changelog

## Overview
This update expands file format support, adds the restore purchase UI, fixes the
production API mismatch, and improves page content for SEO and domain credibility.

---

## Files Changed

### 1. `index.html`
**What changed:**
- File input `accept` attribute expanded to all supported formats
- Label changed from "Choose JPEG files" to "Choose files"
- Helper text updated to mention images, RAW, and video
- Added EXIF options wrapper `<div id="exifOptions">` with "(JPEG only)" labels
- Added **"How It Works"** section — step-by-step explanation for legitimacy/SEO
- Added **"Supported File Formats"** section — images, RAW, video listed out
- Updated FAQ with new questions about RAW/video, restore purchase, and unlock
- Better `<title>` and `<meta description>` for SEO
- Cache-bust: `main.js?v=4`

**What did NOT change:**
- Paddle script, JSZip, piexif CDN links — identical
- Footer structure and legal page links — identical
- Upload, rename, and action button sections — same IDs and structure

---

### 2. `main.js`
**What changed:**

**File format expansion:**
- Added file extension constants: `JPEG_EXTENSIONS`, `IMAGE_EXTENSIONS`, `RAW_EXTENSIONS`, `VIDEO_EXTENSIONS`, `ALL_EXTENSIONS`
- New helper functions: `getFileExtension()`, `isJpeg()`, `isSupportedFile()`, `getFileCategory()`
- `getNewFilename()` now takes `originalFilename` param and preserves the original file extension (was hardcoded `.jpg`)
- `displayFiles()` filters out unsupported files, shows skip count
- `displayFiles()` shows file type summary (e.g. "12 files selected: 8 JPEG, 2 RAW, 2 video")
- `displayFiles()` shows/hides EXIF checkboxes based on whether any JPEGs are present
- `displayMetadata()` shows basic file info (name, type, size) for non-JPEG files
- Download handler only runs `removeMetadata()` on JPEG files — all others are added to ZIP as-is
- ZIP filename uses prefix if set (e.g. `clientname_delivery.zip`) instead of `images.zip`

**Restore purchase (NEW):**
- `handleRestorePurchase()` function — prompts for email, calls `/api/check-purchase`, handles success/failure/error
- "Restore your purchase" link appears below the unlock button when free limit is hit
- On success: sets unlocked, refreshes display
- On failure: shows alert, re-attaches event listeners
- Loading state while checking ("Checking purchase for email...")

**UI improvements:**
- File list preview capped at 20 (was uncapped) to prevent DOM bloat
- Download button shows "Processing files..." loading state during ZIP generation
- Category labels shown in file list for non-JPEG files (e.g. `[RAW]`, `[VIDEO]`)

**What did NOT change:**
- Paddle config (tokens, price ID, environment) — identical
- `isUnlocked()`, `setUnlocked()` — identical
- `handleUnlock()` — identical
- `removeMetadata()` — identical
- EXIF reading logic in `displayMetadata()` for JPEGs — identical
- Clear button — identical (text changed from "Clear Selected Images" to "Clear Selected Files")

---

### 3. `api/check-purchase.js`
**What changed:**
- API endpoint changed from `sandbox-api.paddle.com` to `api.paddle.com` (PRODUCTION)
- Price ID changed from `pri_01kfc8wsrhhqezk6htxdy7eppe` (sandbox) to `pri_01kg5n2jrb4xwpgehfhrpqjm0y` (production)

**CRITICAL:** This was the mismatch. Your frontend was using production Paddle tokens
but the serverless function was still querying the sandbox API. The restore purchase
would never have found any real purchases.

**What did NOT change:**
- Two-step lookup logic (email → customer → transactions) — identical
- CORS headers — identical
- Error handling — identical

**ACTION REQUIRED:** You also need to update the `PADDLE_API_KEY` environment variable
in Vercel if it's still the sandbox test key. Go to:
  Vercel → photo-delivery-prep → Settings → Environment Variables
Replace `PADDLE_API_KEY` with your PRODUCTION Paddle API key (from Paddle → Settings →
Authentication → API Keys, in LIVE mode, not sandbox).

---

## CSS additions needed

Add these to your `style.css` to handle new elements:

```css
/* Restore purchase link */
.restore-link {
    margin-top: 8px;
    font-size: 14px;
}
.restore-link a {
    color: inherit;
    text-decoration: underline;
}

/* Unlocked message */
.unlocked-msg {
    color: #28a745;
    font-weight: bold;
}

/* Supported formats grid */
.formats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin: 16px 0;
}
.formats-grid h3 {
    margin: 0 0 4px 0;
    font-size: 16px;
}
.formats-grid p {
    margin: 0;
    font-size: 14px;
    opacity: 0.85;
}

/* How it works ordered list */
#howItWorks ol {
    padding-left: 20px;
}
#howItWorks li {
    margin-bottom: 8px;
}
```

---

## Git commit messages

### Commit 1: Update check-purchase.js
```
fix: Point restore purchase API at production Paddle

- Change endpoint from sandbox-api.paddle.com to api.paddle.com
- Update price ID to production pri_01kg5n2jrb4xwpgehfhrpqjm0y
- Was previously querying sandbox while frontend used production tokens
```

### Commit 2: Update main.js
```
feat: Add multi-format support and restore purchase UI

- Support JPEG, PNG, TIFF, WebP, BMP, GIF, HEIC, RAW (CR2/NEF/ARW/DNG/etc), video (MP4/MOV/AVI/MKV/etc)
- Preserve original file extensions instead of hardcoding .jpg
- Add restore purchase flow with email verification
- Show/hide EXIF options based on whether JPEGs are present
- Cap file preview at 20 items, show summary counts by type
- Add loading state during ZIP generation
- EXIF stripping only applied to JPEG files
```

### Commit 3: Update index.html
```
feat: Expand UI for multi-format support and improve SEO

- Broaden file input to accept all supported image/RAW/video formats
- Add How It Works section and Supported Formats grid
- Update FAQ with RAW, video, and restore purchase questions
- Improve title and meta description for search engines
- Add EXIF options wrapper with JPEG-only labels
```

### Commit 4: Update style.css
```
style: Add CSS for restore link, formats grid, and how-it-works section
```
