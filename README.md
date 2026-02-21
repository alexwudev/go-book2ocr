# Book2OCR

<p align="center">
  <img src="build/appicon.png" alt="Book2OCR" width="128">
</p>

<p align="center">
  English | <a href="docs/README.zh-TW.md">繁體中文</a> | <a href="docs/README.zh-CN.md">简体中文</a> | <a href="docs/README.ja.md">日本語</a>
</p>

A desktop application for batch OCR processing, built with [Wails](https://wails.io/) (Go backend + Web frontend). It uses the [Google Cloud Vision API](https://cloud.google.com/vision) to recognize text from scanned book pages and outputs searchable PDFs. Supports **Windows** and **Linux**.

<h2 id="table-of-contents">Table of Contents</h2>

- [Workflow](#workflow)
- [Features](#features)
  - [Batch Rename](#batch-rename)
  - [Batch OCR](#batch-ocr)
  - [Image Convert](#image-convert)
  - [General](#general)
- [Quick Start](#quick-start)
- [Usage](#usage)
  - [Typical Workflow](#typical-workflow)
  - [Rename Tab](#rename-tab)
  - [OCR Tab](#ocr-tab)
  - [Convert Tab](#convert-tab)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
  - [Google Cloud Vision API Key](#1-google-cloud-vision-api-key)
  - [CJK Font](#2-cjk-font-for-chinesejapanesekorean-ocr)
  - [Configuration](#3-configuration)
- [Building from Source](#building-from-source)
- [File Naming Convention](#file-naming-convention)
- [Project Structure](#project-structure)
- [License](#license)

<h2 id="workflow">Workflow <a href="#table-of-contents">⬆</a></h2>

```
┌─────────────────────────────────────────┐
│  1. Scan / Photograph                   │
│     Use a scanner or smartphone camera  │
│     to capture each page or spread      │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│  2. Organize Image Files                │
│     Place all scanned images into a     │
│     single folder, sorted by order      │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│  3. Batch Rename               [Rename] │
│     Assign page numbers automatically   │
│     (Roman + Arabic, special types)     │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│  4. Batch OCR → PDF               [OCR] │
│     Send images to Google Cloud Vision  │
│     API, generate one PDF per page      │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│  5. Merge & Output                      │
│     Auto-merge all pages into a single  │
│     searchable PDF, ready to use        │
└─────────────────────────────────────────┘
```

<h2 id="features">Features <a href="#table-of-contents">⬆</a></h2>

<h3 id="batch-rename">Batch Rename <a href="#table-of-contents">⬆</a></h3>
- Import scanned images from a folder with thumbnail preview
- Assign page numbers automatically (supports Roman numerals for preface + Arabic numerals for body text)
- Handle special page types: normal pages, image-only pages (Type A/B/C), skip pages
- Preview old/new filenames before executing

<h3 id="batch-ocr">Batch OCR <a href="#table-of-contents">⬆</a></h3>
- Send images to Google Cloud Vision API for text recognition
- **Dual-page mode**: split left/right pages from a two-page scan into separate PDF pages
- **Single-page mode**: one image = one PDF page
- Concurrent processing (configurable 1-10 workers)
- Session persistence: interrupted jobs can be resumed on next launch
- Auto-merge all output PDFs into one file
- OCR language support: English, Japanese, Russian, German, Italian, Spanish, French, Traditional Chinese, Simplified Chinese, Dutch, Persian, Vietnamese, Polish, Portuguese

<h3 id="image-convert">Image Convert <a href="#table-of-contents">⬆</a></h3>
- Batch resize images by percentage (1-99%)
- Preserves EXIF orientation

<h3 id="general">General <a href="#table-of-contents">⬆</a></h3>
- **Custom title bar with progress**: frameless window with a custom title bar that fills with color as OCR/conversion progresses
- **Windows taskbar progress**: the taskbar button shows real-time progress during OCR and image conversion
- **Elapsed timer**: live elapsed time during OCR and image conversion; final duration shown on completion
- **Multi-language UI**: interface available in 14 languages — 繁體中文, 简体中文, English, 日本語, Русский, Deutsch, Italiano, Español, Français, Nederlands, فارسی, Tiếng Việt, Polski, Português
- Dark / Light theme
- RTL layout support for Persian
- Settings saved to `config.json` automatically

<h2 id="quick-start">Quick Start <a href="#table-of-contents">⬆</a></h2>

<h3 id="option-a-download-pre-built-release-recommended">Option A: Download Pre-built Release (Recommended) <a href="#table-of-contents">⬆</a></h3>

1. Go to the [Releases](https://github.com/alexwudev/go-book2ocr/releases) page
2. Download the latest `go-book2ocr.zip`
3. Extract to any folder
4. Place your Google Cloud API key in the `key/` folder (see [Setup](#1-google-cloud-vision-api-key) below)
5. (Optional) Place a CJK font `.ttf` file in the `fonts/` folder for Chinese/Japanese/Korean support (see [Setup](#2-cjk-font-for-chinesejapanesekorean-ocr) below)
6. Run `go-book2ocr.exe`

<h3 id="option-b-build-from-source">Option B: Build from Source <a href="#table-of-contents">⬆</a></h3>

Requires [Go](https://go.dev/) 1.24+ and [Node.js](https://nodejs.org/).

```bash
git clone https://github.com/alexwudev/go-book2ocr.git
cd go-book2ocr
build.bat          # on Windows
# or
./build.sh         # on WSL (interactive menu: Windows or Linux)
```

Then follow the same steps 4-6 from Option A.

---

On first launch, go to the **Batch OCR** tab to set your API key path and language preferences. You can switch the UI language from the dropdown in the top-right corner. Settings are saved automatically.

<h2 id="usage">Usage <a href="#table-of-contents">⬆</a></h2>

<h3 id="typical-workflow">Typical Workflow <a href="#table-of-contents">⬆</a></h3>

This tool is designed for digitizing scanned books. The typical workflow is:

1. **Scan** your book pages as JPG images (one image per spread or per page)
2. **Batch Rename** — use the Rename tab to assign page numbers to your images
3. **Batch OCR** — use the OCR tab to recognize text and generate searchable PDFs
4. The output is a merged PDF with the full book text, organized by page number

<h3 id="rename-tab">Rename Tab <a href="#table-of-contents">⬆</a></h3>

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

<h3 id="ocr-tab">OCR Tab <a href="#table-of-contents">⬆</a></h3>

1. Click **Select Image Folder** — choose the folder with renamed images (from step above)
2. Click **Select API Key** — choose your Google Cloud service account JSON file
3. Set the **language** (e.g. `zh-CN` for Simplified Chinese, `en` for English)
4. Adjust **concurrency** (default 5, max 10)
5. Choose whether to **merge** all output PDFs into one file
6. Click **Start OCR**
7. Progress and logs are displayed in real-time; you can stop and resume later

<h3 id="convert-tab">Convert Tab <a href="#table-of-contents">⬆</a></h3>

1. Select a folder of images
2. Set the resize percentage (1-99%)
3. Click **Start** — images are resized in place

<h2 id="prerequisites">Prerequisites <a href="#table-of-contents">⬆</a></h2>

**Windows** (x64):

- Windows 10/11
- [Microsoft Edge WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (pre-installed on most Windows 10/11 systems)

**Linux** (x64):

- GTK 3 and WebKit2GTK 4.0
  ```bash
  # Ubuntu/Debian
  sudo apt install libgtk-3-0 libwebkit2gtk-4.0-37
  ```

**Both platforms:**

- **Google Cloud Vision API** credentials (service account JSON key) — see setup below
- **A CJK-capable font** (required only if you OCR Chinese/Japanese/Korean text) — see setup below

<h2 id="setup">Setup <a href="#table-of-contents">⬆</a></h2>

<h3 id="1-google-cloud-vision-api-key">1. Google Cloud Vision API Key <a href="#table-of-contents">⬆</a></h3>

#### Enable the Cloud Vision API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Open the navigation menu **APIs & Services > Library**
4. Search for **Cloud Vision API** and click on it
5. Click **Enable**

#### Create a Service Account Key

1. In the Cloud Console, go to **IAM & Admin > Service Accounts**
2. Click **+ Create Service Account**
3. Enter a name (e.g. `go-book2ocr`), then click **Create and Continue**
4. For the role, select **Project > Owner** (or a more restrictive role if preferred), then click **Continue > Done**
5. Click on the newly created service account email
6. Go to the **Keys** tab, click **Add Key > Create new key**
7. Select **JSON** format and click **Create**
8. A `.json` key file will be downloaded automatically
9. Move this file into the `key/` directory of the project (this directory is git-ignored)

#### Pricing

Cloud Vision API offers **1,000 free calls per month**. Beyond the free tier, text detection (OCR) is billed at **$1.50 per 1,000 calls**. New Google Cloud accounts receive **$300 in free credits**.

For full pricing details, see the [Cloud Vision API Pricing](https://cloud.google.com/vision/pricing) page.

<h3 id="2-cjk-font-for-chinesejapanesekorean-ocr">2. CJK Font (for Chinese/Japanese/Korean OCR) <a href="#table-of-contents">⬆</a></h3>

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

<h3 id="3-configuration">3. Configuration <a href="#table-of-contents">⬆</a></h3>

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
| `uiLang` | UI language code (e.g. `"zh-TW"`, `"en"`, `"ja"`) |

<h2 id="building-from-source">Building from Source <a href="#table-of-contents">⬆</a></h2>

<h3 id="requirements">Requirements <a href="#table-of-contents">⬆</a></h3>

**Common (both platforms):**

- [Go](https://go.dev/) 1.24+
- [Node.js](https://nodejs.org/) (for building the frontend)

**Windows build (WSL cross-compile):**

```bash
# go-winres for embedding the app icon
go install github.com/tc-hib/go-winres@latest
```

**Linux build (native):**

```bash
# Ubuntu/Debian
sudo apt install gcc pkg-config libgtk-3-dev libwebkit2gtk-4.0-dev
```

<h3 id="wsl-cross-compile-to-windows">WSL (cross-compile to Windows) <a href="#table-of-contents">⬆</a></h3>

```bash
./build.sh            # or: ./build.sh windows
# Output: platform/windows/go-book2ocr.exe
```

<h3 id="linux-native">Linux (native) <a href="#table-of-contents">⬆</a></h3>

```bash
./build.sh linux
# Output: platform/linux/go-book2ocr
```

<h3 id="windows-native">Windows (native) <a href="#table-of-contents">⬆</a></h3>

```batch
build.bat
REM Output: platform\windows\go-book2ocr.exe
```

<h3 id="development-mode">Development Mode <a href="#table-of-contents">⬆</a></h3>

Requires [Wails CLI](https://wails.io/docs/gettingstarted/installation).

```bash
wails dev
```

<h2 id="file-naming-convention">File Naming Convention <a href="#table-of-contents">⬆</a></h2>

The OCR tab expects input images to follow a specific naming pattern (produced by the Rename tab):

| Mode | Pattern | Example |
|------|---------|---------|
| Dual-page | `Page-NNN-NNN.JPG` | `Page-004-005.JPG` (pages 4-5) |
| Dual-page (Roman) | `Page-r-xxx-xxx.JPG` | `Page-r-iv-v.JPG` (pages iv-v) |
| Single-page | `Page-NNN.JPG` | `Page-004.JPG` (page 4) |
| Single-page (Roman) | `Page-r-xxx.JPG` | `Page-r-iv.JPG` (page iv) |
| Image page suffix | `-a`, `-b`, `-c` | `Page-004-005-a.JPG` |

<h2 id="project-structure">Project Structure <a href="#table-of-contents">⬆</a></h2>

```
go-book2ocr/
├── main.go              # App entry point (frameless window)
├── app.go               # Core app struct, config, session, thumbnails
├── ocr.go               # OCR pipeline, Vision API, PDF generation
├── rename.go            # Batch rename logic, page numbering
├── convert.go           # Image resize/conversion
├── models.go            # Shared data types
├── taskbar_windows.go   # Windows taskbar progress (ITaskbarList3) & icon
├── taskbar_stub.go      # No-op stub for non-Windows builds
├── CHANGELOG.md         # Version history
├── wails.json           # Wails project config
├── build.sh             # Quickstart build script (interactive menu or argument)
├── build.bat            # Windows native build script
├── config.example.json  # Example configuration
├── platform/
│   ├── windows/
│   │   ├── winres.json          # go-winres config (icon & manifest)
│   │   └── go-book2ocr.exe     # Build output
│   └── linux/
│       └── go-book2ocr         # Build output
├── build/
│   ├── appicon.png      # App icon
│   └── windows/         # Windows manifest & icon resources
├── docs/                # Translated READMEs
├── fonts/               # Place CJK font files here
├── key/                 # Place API key files here (git-ignored)
├── frontend/
│   ├── index.html       # Main HTML (custom title bar)
│   ├── build.js         # Frontend build script
│   └── src/
│       ├── main.js      # Tab switching, config, i18n, window controls
│       ├── i18n.js      # Internationalization (14 languages)
│       ├── ocr.js       # OCR tab UI
│       ├── rename.js    # Rename tab UI
│       ├── convert.js   # Convert tab UI
│       ├── timer.js     # Elapsed timer class
│       ├── theme.js     # Theme toggling
│       └── style.css    # All styles (incl. RTL support)
└── output/              # Default OCR output directory (git-ignored)
```

<h2 id="license">License <a href="#table-of-contents">⬆</a></h2>

[MIT](LICENSE)
