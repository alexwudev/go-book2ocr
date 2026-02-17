# OCR Tool

<p align="center">
  <img src="build/appicon.png" alt="OCR Tool" width="128">
</p>

<p align="center">
  English | <a href="README.zh-TW.md">繁體中文</a> | <a href="README.zh-CN.md">简体中文</a>
</p>

A Windows desktop application for batch OCR processing, built with [Wails](https://wails.io/) (Go backend + Web frontend). It uses the [Google Cloud Vision API](https://cloud.google.com/vision) to recognize text from scanned book pages and outputs searchable PDFs.

## Features

### Batch Rename
- Import scanned images from a folder with thumbnail preview
- Assign page numbers automatically (supports Roman numerals for preface + Arabic numerals for body text)
- Handle special page types: normal pages, image-only pages (Type A/B/C), skip pages
- Preview old/new filenames before executing

### Batch OCR
- Send images to Google Cloud Vision API for text recognition
- **Dual-page mode**: split left/right pages from a two-page scan into separate PDF pages
- **Single-page mode**: one image = one PDF page
- Concurrent processing (configurable 1-10 workers)
- Session persistence: interrupted jobs can be resumed on next launch
- Auto-merge all output PDFs into one file
- Multi-language support: English, Japanese, Russian, German, Italian, Spanish, French, Traditional Chinese, Simplified Chinese

### Image Convert
- Batch resize images by percentage (1-99%)
- Preserves EXIF orientation

### General
- Dark / Light theme
- Settings saved to `config.json` automatically

## Quick Start

### Option A: Download Pre-built Release (Recommended)

1. Go to the [Releases](https://github.com/alexwudev/ocr-tool/releases) page
2. Download the latest `ocr-tool.zip`
3. Extract to any folder
4. Place your Google Cloud API key in the `key/` folder (see [Setup](#1-google-cloud-vision-api-key) below)
5. (Optional) Place a CJK font `.ttf` file in the `fonts/` folder for Chinese/Japanese/Korean support (see [Setup](#2-cjk-font-for-chinesejapanesekorean-ocr) below)
6. Run `ocr-tool.exe`

### Option B: Build from Source

Requires [Go](https://go.dev/) 1.24+ and [Node.js](https://nodejs.org/).

```bash
git clone https://github.com/alexwudev/ocr-tool.git
cd ocr-tool
build.bat          # on Windows
# or
./build.sh         # on WSL (requires mingw-w64)
```

Then follow the same steps 4-6 from Option A.

---

On first launch, go to the **Batch OCR** tab to set your API key path and language preferences. Settings are saved automatically.

## Usage

### Typical Workflow

This tool is designed for digitizing scanned books. The typical workflow is:

1. **Scan** your book pages as JPG images (one image per spread or per page)
2. **Batch Rename** — use the Rename tab to assign page numbers to your images
3. **Batch OCR** — use the OCR tab to recognize text and generate searchable PDFs
4. The output is a merged PDF with the full book text, organized by page number

### Rename Tab

1. Click **Select Folder** and choose the folder containing your scanned images
2. Thumbnails will load with a preview of each image
3. Set the **scan mode**: dual-page (book spread) or single-page
4. Set the starting page number (Roman for preface, Arabic for body)
5. For each image, set the **page type** if needed:
   - **Normal** — both pages have page numbers (default)
   - **Type A** — left page has number, right page is an image
   - **Type B** — both sides are images (no page numbers)
   - **Type C** — left page is an image, right page has number
   - **Skip** — exclude this image from renaming
6. Review the old/new filename preview, then click **Execute Rename**

### OCR Tab

1. Click **Select Image Folder** — choose the folder with renamed images (from step above)
2. Click **Select API Key** — choose your Google Cloud service account JSON file
3. Set the **language** (e.g. `zh-CN` for Simplified Chinese, `en` for English)
4. Adjust **concurrency** (default 5, max 10)
5. Choose whether to **merge** all output PDFs into one file
6. Click **Start OCR**
7. Progress and logs are displayed in real-time; you can stop and resume later

### Convert Tab

1. Select a folder of images
2. Set the resize percentage (1-99%)
3. Click **Start** — images are resized in place

## Prerequisites

- **Windows** (the app is built as a Windows desktop application)
- **Google Cloud Vision API** credentials (service account JSON key) — see setup below
- **A CJK-capable font** (required only if you OCR Chinese/Japanese/Korean text) — see setup below

## Setup

### 1. Google Cloud Vision API Key

#### Enable the Cloud Vision API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Open the navigation menu **APIs & Services > Library**
4. Search for **Cloud Vision API** and click on it
5. Click **Enable**

#### Create a Service Account Key

1. In the Cloud Console, go to **IAM & Admin > Service Accounts**
2. Click **+ Create Service Account**
3. Enter a name (e.g. `ocr-tool`), then click **Create and Continue**
4. For the role, select **Project > Owner** (or a more restrictive role if preferred), then click **Continue > Done**
5. Click on the newly created service account email
6. Go to the **Keys** tab, click **Add Key > Create new key**
7. Select **JSON** format and click **Create**
8. A `.json` key file will be downloaded automatically
9. Move this file into the `key/` directory of the project (this directory is git-ignored)

#### Pricing

Cloud Vision API offers **1,000 free calls per month**. Beyond the free tier, text detection (OCR) is billed at **$1.50 per 1,000 calls**. New Google Cloud accounts receive **$300 in free credits**.

For full pricing details, see the [Cloud Vision API Pricing](https://cloud.google.com/vision/pricing) page.

### 2. CJK Font (for Chinese/Japanese/Korean OCR)

The built-in PDF font (Helvetica) does not support CJK characters. To output CJK text correctly, place a CJK-capable `.ttf` font file in the `fonts/` directory.

Recommended fonts (any one will work):

| Font | License | Download |
|------|---------|----------|
| Microsoft YaHei (`msyh.ttf`) | Proprietary (Windows built-in) | Extract from `C:\Windows\Fonts\msyh.ttc` |
| Noto Sans SC (`NotoSansSC-Regular.ttf`) | OFL (free) | [Google Fonts](https://fonts.google.com/noto/specimen/Noto+Sans+SC) |
| Noto Sans TC (`NotoSansTC-Regular.ttf`) | OFL (free) | [Google Fonts](https://fonts.google.com/noto/specimen/Noto+Sans+TC) |
| Noto Sans JP (`NotoSansJP-Regular.ttf`) | OFL (free) | [Google Fonts](https://fonts.google.com/noto/specimen/Noto+Sans+JP) |
| Source Han Sans (`SourceHanSansSC-Regular.ttf`) | OFL (free) | [Adobe GitHub](https://github.com/adobe-fonts/source-han-sans) |

> If no font is found in `fonts/`, the app falls back to Helvetica with CP1252 encoding (Western European characters only).

### 3. Configuration

The app generates `config.json` automatically on first run. You can also create it manually from the example:

```
cp config.example.json config.json
```

| Field | Description |
|-------|-------------|
| `credFile` | Path to your Google Cloud service account key |
| `languages` | OCR language hints (e.g. `["en"]`, `["zh-CN"]`, `["ja", "en"]`) |
| `concurrency` | Number of concurrent API requests (1-10) |
| `outputDir` | Output directory for PDFs (auto-set if empty) |
| `mergePdf` | Whether to merge all PDFs into one file |
| `mergeFilename` | Merged PDF filename |
| `theme` | `"dark"` or `"light"` |
| `scanMode` | `"dual"` (two-page scan) or `"single"` (one-page scan) |

## Building from Source

### Requirements

- [Go](https://go.dev/) 1.24+
- [Node.js](https://nodejs.org/)
- [Wails CLI](https://wails.io/docs/gettingstarted/installation) (optional, for `wails dev`)

### Windows (native)

```batch
build.bat
```

### WSL (cross-compile to Windows)

```bash
# Requires mingw-w64: sudo apt install gcc-mingw-w64-x86-64
./build.sh
```

### Development mode

```bash
wails dev
```

## File Naming Convention

The OCR tab expects input images to follow a specific naming pattern (produced by the Rename tab):

| Mode | Pattern | Example |
|------|---------|---------|
| Dual-page | `zzz-NNN-NNN.JPG` | `zzz-004-005.JPG` (pages 4-5) |
| Dual-page (Roman) | `zzz-r-xxx-xxx.JPG` | `zzz-r-iv-v.JPG` (pages iv-v) |
| Single-page | `zzz-NNN.JPG` | `zzz-004.JPG` (page 4) |
| Single-page (Roman) | `zzz-r-xxx.JPG` | `zzz-r-iv.JPG` (page iv) |
| Image page suffix | `-a`, `-b`, `-c` | `zzz-004-005-a.JPG` |

## Project Structure

```
ocr-tool/
├── main.go              # App entry point
├── app.go               # Core app struct, config, session, thumbnails
├── ocr.go               # OCR pipeline, Vision API, PDF generation
├── rename.go            # Batch rename logic, page numbering
├── convert.go           # Image resize/conversion
├── models.go            # Shared data types
├── wails.json           # Wails project config
├── build.bat            # Windows build script
├── build.sh             # WSL cross-compile script
├── config.example.json  # Example configuration
├── build/
│   └── appicon.png      # App icon
├── fonts/               # Place CJK font files here
├── key/                 # Place API key files here (git-ignored)
├── frontend/
│   ├── index.html       # Main HTML
│   ├── build.js         # Frontend build script
│   └── src/
│       ├── main.js      # Tab switching, config management
│       ├── ocr.js       # OCR tab UI
│       ├── rename.js    # Rename tab UI
│       ├── convert.js   # Convert tab UI
│       ├── theme.js     # Theme toggling
│       └── style.css    # All styles
└── output/              # Default OCR output directory (git-ignored)
```

## License

[MIT](LICENSE)
