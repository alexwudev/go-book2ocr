# Changelog

## v1.2.0 — 2026-02-21

### New Features

- **Custom title bar with progress fill**: frameless window with a custom title bar that fills with color as OCR/conversion progresses
- **Windows taskbar progress**: the taskbar button shows real-time progress during OCR and image conversion (ITaskbarList3)
- **Elapsed timer**: live elapsed time display during OCR and image conversion; final duration shown on completion
- **Linux support**: the app now builds and runs natively on Linux (x64) with GTK 3 + WebKit2GTK

### Changes

- Window is now frameless with custom minimize/maximize/close buttons and drag support
- Language selector and theme toggle moved from tab bar to title bar
- Build scripts rewritten: `build.sh` now supports interactive menu (`1=Windows`, `2=Linux`) or argument (`./build.sh windows` / `./build.sh linux`)
- Windows build no longer requires mingw-w64 (uses `CGO_ENABLED=0`)
- Build output now goes to `platform/windows/` and `platform/linux/` directories
- Added `platform/windows/winres.json` for go-winres icon embedding
- Added Windows icon (`build/windows/icon.ico`) and DPI-aware manifest

## v1.1.0 — 2026-02-18

### New Features

- **Multi-language UI**: Full interface localization with a language dropdown selector in the tab bar. Supports 14 languages:
  - 繁體中文, 简体中文, English, 日本語, Русский, Deutsch, Italiano, Español, Français, Nederlands, فارسی, Tiếng Việt, Polski, Português
  - Language preference is saved to config and persists across sessions
  - Persian (فارسی) includes RTL layout support

- **Additional OCR languages**: Added 5 new OCR language options for Google Cloud Vision API:
  - Nederlands (Dutch)
  - فارسی (Persian)
  - Tiếng Việt (Vietnamese)
  - Polski (Polish)
  - Português (Portuguese)

### Changes

- Added `uiLang` field to `config.json` for persisting UI language preference
- All user-facing strings are now served through the i18n translation system (`i18n.js`)
- Tab bar now includes a language selector dropdown next to the theme toggle button
- **Renamed file prefix**: `zzz-` → `Page-` (e.g. `Page-001-002.JPG`, `Page-r-i-ii.JPG`)

## v1.0.0 — 2025-02-14

- Initial release: batch OCR tool for scanned books
- Batch rename with dual/single page modes
- Batch OCR with Google Cloud Vision API
- Image resize/convert tool
- Session resume capability
- Dark/light theme support
