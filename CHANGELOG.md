# Changelog

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

## v1.0.0 — 2025-02-14

- Initial release: batch OCR tool for scanned books
- Batch rename with dual/single page modes
- Batch OCR with Google Cloud Vision API
- Image resize/convert tool
- Session resume capability
- Dark/light theme support
