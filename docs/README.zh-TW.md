# Book2OCR

<p align="center">
  <img src="../build/appicon.png" alt="Book2OCR" width="128">
</p>

<p align="center">
  <a href="../README.md">English</a> | 繁體中文 | <a href="README.zh-CN.md">简体中文</a> | <a href="README.ja.md">日本語</a>
</p>

一款 Windows 桌面應用程式，用於批次 OCR 處理。使用 [Wails](https://wails.io/)（Go 後端 + Web 前端）開發，透過 [Google Cloud Vision API](https://cloud.google.com/vision) 辨識掃描書頁中的文字，並輸出可搜尋的 PDF 檔案。

<h2 id="目錄">目錄</h2>

- [工作流程](#工作流程)
- [功能](#功能)
  - [批次重新命名](#批次重新命名)
  - [批次 OCR](#批次-ocr)
  - [圖片轉檔](#圖片轉檔)
  - [一般功能](#一般功能)
- [快速開始](#快速開始)
- [使用方式](#使用方式)
  - [典型工作流程](#典型工作流程)
  - [重新命名分頁](#重新命名分頁)
  - [OCR 分頁](#ocr-分頁)
  - [轉檔分頁](#轉檔分頁)
- [前置需求](#前置需求)
- [設定](#設定)
  - [Google Cloud Vision API 金鑰](#1-google-cloud-vision-api-金鑰)
  - [CJK 字體](#2-cjk-字體中日韓-ocr-用)
  - [設定檔](#3-設定檔)
- [從原始碼建置](#從原始碼建置)
- [檔名命名規則](#檔名命名規則)
- [專案結構](#專案結構)
- [授權條款](#授權條款)

<h2 id="工作流程">工作流程 <a href="#目錄">⬆</a></h2>

```
┌─────────────────────────────────────────┐
│  1. 掃描 / 拍攝                         │
│     使用掃描器或智慧型手機拍攝每一頁    │
│     或跨頁                              │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│  2. 整理圖片檔案                        │
│     將所有掃描圖片放入同一資料夾，      │
│     依序排列                            │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│  3. 批次重新命名               [重新命名] │
│     自動分配頁碼（羅馬 + 阿拉伯數字，  │
│     特殊類型）                          │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│  4. 批次 OCR → PDF               [OCR] │
│     將圖片送至 Google Cloud Vision      │
│     API，每頁生成一份 PDF               │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│  5. 合併輸出                            │
│     自動合併所有頁面為單一可搜尋 PDF，  │
│     立即可用                            │
└─────────────────────────────────────────┘
```

<h2 id="功能">功能 <a href="#目錄">⬆</a></h2>

<h3 id="批次重新命名">批次重新命名 <a href="#目錄">⬆</a></h3>
- 從資料夾匯入掃描圖片，附帶縮圖預覽
- 自動分配頁碼（支援前言使用羅馬數字 + 正文使用阿拉伯數字）
- 處理特殊頁面類型：一般頁面、純圖片頁（Type A/B/C）、跳過頁
- 執行前可預覽舊檔名與新檔名的對照

<h3 id="批次-ocr">批次 OCR <a href="#目錄">⬆</a></h3>
- 將圖片送至 Google Cloud Vision API 進行文字辨識
- **雙頁模式**：從雙頁掃描圖中拆分左右頁，分別輸出為獨立的 PDF 頁面
- **單頁模式**：一張圖片 = 一頁 PDF
- 併發處理（可設定 1-10 個 worker）
- 工作階段持久化：中斷的工作可在下次啟動時繼續
- 自動合併所有輸出 PDF 為單一檔案
- OCR 語言支援：英文、日文、俄文、德文、義大利文、西班牙文、法文、繁體中文、簡體中文、荷蘭文、波斯文、越南文、波蘭文、葡萄牙文

<h3 id="圖片轉檔">圖片轉檔 <a href="#目錄">⬆</a></h3>
- 依百分比（1-99%）批次縮放圖片
- 保留 EXIF 方向資訊

<h3 id="一般功能">一般功能 <a href="#目錄">⬆</a></h3>
- **多語言介面**：支援 14 種語言 — 繁體中文、简体中文、English、日本語、Русский、Deutsch、Italiano、Español、Français、Nederlands、فارسی、Tiếng Việt、Polski、Português
- 深色 / 淺色主題切換
- 波斯文 RTL 排版支援
- 設定自動儲存至 `config.json`

<h2 id="快速開始">快速開始 <a href="#目錄">⬆</a></h2>

<h3 id="方式-a下載預編譯版本推薦">方式 A：下載預編譯版本（推薦） <a href="#目錄">⬆</a></h3>

1. 前往 [Releases](https://github.com/alexwudev/go-book2ocr/releases) 頁面
2. 下載最新的 `go-book2ocr.zip`
3. 解壓縮到任意資料夾
4. 將 Google Cloud API 金鑰放入 `key/` 資料夾（詳見下方[設定](#1-google-cloud-vision-api-金鑰)）
5. （選用）將 CJK 字體 `.ttf` 檔案放入 `fonts/` 資料夾，以支援中日韓文字（詳見下方[設定](#2-cjk-字體中日韓-ocr-用)）
6. 執行 `go-book2ocr.exe`

<h3 id="方式-b從原始碼編譯">方式 B：從原始碼編譯 <a href="#目錄">⬆</a></h3>

需要 [Go](https://go.dev/) 1.24+ 和 [Node.js](https://nodejs.org/)。

```bash
git clone https://github.com/alexwudev/go-book2ocr.git
cd go-book2ocr
build.bat          # Windows 環境
# 或
./build.sh         # WSL 環境（需要 mingw-w64）
```

之後按照方式 A 的步驟 4-6 操作即可。

---

首次啟動後，前往**批次 OCR** 分頁設定 API 金鑰路徑與語言偏好。可從右上角下拉選單切換介面語言，設定會自動儲存。

<h2 id="使用方式">使用方式 <a href="#目錄">⬆</a></h2>

<h3 id="典型工作流程">典型工作流程 <a href="#目錄">⬆</a></h3>

本工具專為數位化掃描書籍設計，典型流程如下：

1. **掃描**書頁為 JPG 圖片（每張圖片為一個跨頁或單頁）
2. **批次重新命名** — 使用重新命名分頁為圖片分配頁碼
3. **批次 OCR** — 使用 OCR 分頁辨識文字並生成可搜尋的 PDF
4. 輸出結果為按頁碼排列的合併 PDF，包含完整書籍文字

<h3 id="重新命名分頁">重新命名分頁 <a href="#目錄">⬆</a></h3>

1. 點擊**選擇資料夾**，選擇存放掃描圖片的資料夾
2. 縮圖會自動載入，顯示每張圖片的預覽
3. 設定**掃描模式**：雙頁（書籍跨頁）或單頁
4. 設定起始頁碼（前言用羅馬數字，正文用阿拉伯數字）
5. 依需要為每張圖片設定**頁面類型**：
   - **Normal** — 左右頁都有頁碼（預設）
   - **Type A** — 左頁有頁碼，右頁為圖片
   - **Type B** — 左右頁都是圖片（無頁碼）
   - **Type C** — 左頁為圖片，右頁有頁碼
   - **Skip** — 跳過此圖片，不參與重新命名
6. 確認舊/新檔名預覽無誤後，點擊**執行重新命名**

<h3 id="ocr-分頁">OCR 分頁 <a href="#目錄">⬆</a></h3>

1. 點擊**選擇圖片資料夾** — 選擇已重新命名的圖片資料夾
2. 點擊**選擇 API 金鑰** — 選擇 Google Cloud 服務帳戶 JSON 檔案
3. 設定**語言**（例如 `zh-CN` 簡體中文、`zh-TW` 繁體中文、`en` 英文）
4. 調整**併發數量**（預設 5，最大 10）
5. 選擇是否**合併**所有輸出 PDF 為單一檔案
6. 點擊**開始 OCR**
7. 即時顯示進度與日誌；可隨時停止，下次啟動時繼續

<h3 id="轉檔分頁">轉檔分頁 <a href="#目錄">⬆</a></h3>

1. 選擇圖片資料夾
2. 設定縮放百分比（1-99%）
3. 點擊**開始** — 圖片會原地縮放覆蓋

<h2 id="前置需求">前置需求 <a href="#目錄">⬆</a></h2>

- **Windows**（本應用程式為 Windows 桌面應用）
- **Google Cloud Vision API** 憑證（服務帳戶 JSON 金鑰）— 詳見下方設定
- **CJK 字體**（僅在 OCR 中日韓文字時需要）— 詳見下方設定

<h2 id="設定">設定 <a href="#目錄">⬆</a></h2>

<h3 id="1-google-cloud-vision-api-金鑰">1. Google Cloud Vision API 金鑰 <a href="#目錄">⬆</a></h3>

#### 啟用 Cloud Vision API

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立新專案（或選擇現有專案）
3. 開啟導覽選單 **API 和服務 > 程式庫**
4. 搜尋 **Cloud Vision API** 並點擊進入
5. 點擊**啟用**

#### 建立服務帳戶金鑰

1. 在 Cloud Console 中，前往 **IAM 與管理 > 服務帳戶**
2. 點擊 **+ 建立服務帳戶**
3. 輸入名稱（例如 `go-book2ocr`），然後點擊**建立並繼續**
4. 角色選擇**專案 > 擁有者**（或依需求選擇更嚴格的角色），點擊**繼續 > 完成**
5. 點擊剛建立的服務帳戶電子郵件
6. 前往**金鑰**分頁，點擊**新增金鑰 > 建立新的金鑰**
7. 選擇 **JSON** 格式，點擊**建立**
8. 瀏覽器會自動下載一個 `.json` 金鑰檔案
9. 將此檔案移入專案的 `key/` 目錄（此目錄已被 git 忽略）

#### 費用

Cloud Vision API 每月提供 **1,000 次免費呼叫**。超過免費額度後，文字偵測（OCR）的費用為**每 1,000 次呼叫 $1.50 美元**。新建立的 Google Cloud 帳號可獲得 **$300 美元免費抵用額度**。

完整費用詳情請參閱 [Cloud Vision API 定價](https://cloud.google.com/vision/pricing)頁面。

<h3 id="2-cjk-字體中日韓-ocr-用">2. CJK 字體（中日韓 OCR 用） <a href="#目錄">⬆</a></h3>

PDF 內建字體（Helvetica）不支援 CJK 字元。若要正確輸出中日韓文字，請將支援 CJK 的 `.ttf` 字體檔案放入 `fonts/` 目錄。

推薦字體（任選其一即可）：

| 字體 | 授權 | 下載 |
|------|------|------|
| 微軟雅黑 (`msyh.ttf`) | 專有（Windows 內建） | 從 `C:\Windows\Fonts\msyh.ttc` 提取 |
| Noto Sans SC (`NotoSansSC-Regular.ttf`) | OFL（免費） | [Google Fonts](https://fonts.google.com/noto/specimen/Noto+Sans+SC) |
| Noto Sans TC (`NotoSansTC-Regular.ttf`) | OFL（免費） | [Google Fonts](https://fonts.google.com/noto/specimen/Noto+Sans+TC) |
| Noto Sans JP (`NotoSansJP-Regular.ttf`) | OFL（免費） | [Google Fonts](https://fonts.google.com/noto/specimen/Noto+Sans+JP) |
| 思源黑體 (`SourceHanSansSC-Regular.ttf`) | OFL（免費） | [Adobe GitHub](https://github.com/adobe-fonts/source-han-sans) |

> 若 `fonts/` 中找不到任何字體，應用程式會退回使用 Helvetica + CP1252 編碼（僅支援西歐字元）。

<h3 id="3-設定檔">3. 設定檔 <a href="#目錄">⬆</a></h3>

應用程式首次執行時會自動產生 `config.json`。你也可以手動從範例建立：

```
cp config.example.json config.json
```

| 欄位 | 說明 |
|------|------|
| `credFile` | Google Cloud 服務帳戶金鑰路徑 |
| `languages` | OCR 語言提示（例如 `["en"]`、`["zh-CN"]`、`["ja", "en"]`） |
| `concurrency` | 併發 API 請求數量（1-10） |
| `outputDir` | PDF 輸出目錄（留空則自動設定） |
| `mergePdf` | 是否合併所有 PDF 為單一檔案 |
| `mergeFilename` | 合併後的 PDF 檔名 |
| `theme` | `"dark"` 或 `"light"` |
| `scanMode` | `"dual"`（雙頁掃描）或 `"single"`（單頁掃描） |
| `uiLang` | 介面語言代碼（例如 `"zh-TW"`、`"en"`、`"ja"`） |

<h2 id="從原始碼建置">從原始碼建置 <a href="#目錄">⬆</a></h2>

<h3 id="需求">需求 <a href="#目錄">⬆</a></h3>

- [Go](https://go.dev/) 1.24+
- [Node.js](https://nodejs.org/)
- [Wails CLI](https://wails.io/docs/gettingstarted/installation)（選用，用於 `wails dev`）

<h3 id="windows原生編譯">Windows（原生編譯） <a href="#目錄">⬆</a></h3>

```batch
build.bat
```

<h3 id="wsl交叉編譯為-windows">WSL（交叉編譯為 Windows） <a href="#目錄">⬆</a></h3>

```bash
# 需要 mingw-w64：sudo apt install gcc-mingw-w64-x86-64
./build.sh
```

<h3 id="開發模式">開發模式 <a href="#目錄">⬆</a></h3>

```bash
wails dev
```

<h2 id="檔名命名規則">檔名命名規則 <a href="#目錄">⬆</a></h2>

OCR 分頁需要輸入圖片遵循特定命名格式（由重新命名分頁產生）：

| 模式 | 格式 | 範例 |
|------|------|------|
| 雙頁 | `Page-NNN-NNN.JPG` | `Page-004-005.JPG`（第 4-5 頁） |
| 雙頁（羅馬） | `Page-r-xxx-xxx.JPG` | `Page-r-iv-v.JPG`（第 iv-v 頁） |
| 單頁 | `Page-NNN.JPG` | `Page-004.JPG`（第 4 頁） |
| 單頁（羅馬） | `Page-r-xxx.JPG` | `Page-r-iv.JPG`（第 iv 頁） |
| 圖片頁後綴 | `-a`、`-b`、`-c` | `Page-004-005-a.JPG` |

<h2 id="專案結構">專案結構 <a href="#目錄">⬆</a></h2>

```
go-book2ocr/
├── main.go              # 應用程式進入點
├── app.go               # 核心結構、設定、工作階段、縮圖
├── ocr.go               # OCR 流程、Vision API、PDF 生成
├── rename.go            # 批次重新命名邏輯、頁碼分配
├── convert.go           # 圖片縮放轉檔
├── models.go            # 共用資料類型
├── CHANGELOG.md         # 版本歷程
├── wails.json           # Wails 專案設定
├── build.bat            # Windows 編譯腳本
├── build.sh             # WSL 交叉編譯腳本
├── config.example.json  # 設定檔範例
├── build/
│   └── appicon.png      # 應用程式圖示
├── docs/                # 翻譯版 README
├── fonts/               # 放置 CJK 字體檔案
├── key/                 # 放置 API 金鑰檔案（已被 git 忽略）
├── frontend/
│   ├── index.html       # 主要 HTML
│   ├── build.js         # 前端建置腳本
│   └── src/
│       ├── main.js      # 分頁切換、設定管理、i18n 初始化
│       ├── i18n.js      # 國際化（14 種語言）
│       ├── ocr.js       # OCR 分頁 UI
│       ├── rename.js    # 重新命名分頁 UI
│       ├── convert.js   # 轉檔分頁 UI
│       ├── theme.js     # 主題切換
│       └── style.css    # 所有樣式（含 RTL 支援）
└── output/              # 預設 OCR 輸出目錄（已被 git 忽略）
```

<h2 id="授權條款">授權條款 <a href="#目錄">⬆</a></h2>

[MIT](../LICENSE)
