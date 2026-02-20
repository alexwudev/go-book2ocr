# Book2OCR

<p align="center">
  <img src="../build/appicon.png" alt="Book2OCR" width="128">
</p>

<p align="center">
  <a href="../README.md">English</a> | <a href="README.zh-TW.md">繁體中文</a> | <a href="README.zh-CN.md">简体中文</a> | 日本語
</p>

Windows 向けのバッチ OCR 処理デスクトップアプリケーションです。[Wails](https://wails.io/)（Go バックエンド + Web フロントエンド）で構築されており、[Google Cloud Vision API](https://cloud.google.com/vision) を使用してスキャンした書籍ページからテキストを認識し、検索可能な PDF を出力します。

**ユースケース**
- 書籍、雑誌、歴史的文書をスキャンまたは撮影してデジタル化
- スキャンページからテキストを抽出し、個人用デジタルライブラリを構築
- 書籍の内容をプレーンテキストに変換し、AIツール（ChatGPT、Claudeなど）で要約・翻訳・Q&A・分析に活用
- 希少本や絶版書を検索可能・保存可能な形式で保存

## ワークフロー [⬆](#目次)

```
┌─────────────────────────────────────────┐
│  1. スキャン／撮影                      │
│     スキャナーまたはスマートフォンで    │
│     各ページまたは見開きを撮影          │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│  2. 画像ファイルの整理                  │
│     スキャン画像をフォルダにまとめ、    │
│     順番に並べる                        │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│  3. 一括リネーム              [リネーム] │
│     ページ番号を自動付与                │
│     （ローマ数字＋アラビア数字、        │
│     特殊タイプ対応）                    │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│  4. 一括 OCR → PDF               [OCR] │
│     Google Cloud Vision API で画像を    │
│     送信し、ページごとに PDF を生成     │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│  5. 結合・出力                          │
│     全ページを検索可能な単一 PDF に     │
│     自動結合                            │
└─────────────────────────────────────────┘
```

## 目次

- [ワークフロー](#ワークフロー)
- [機能](#機能)
  - [一括リネーム](#一括リネーム)
  - [一括 OCR](#一括-ocr)
  - [画像変換](#画像変換)
  - [全般](#全般)
- [クイックスタート](#クイックスタート)
- [使い方](#使い方)
  - [基本的なワークフロー](#基本的なワークフロー)
  - [リネームタブ](#リネームタブ)
  - [OCR タブ](#ocr-タブ)
  - [変換タブ](#変換タブ)
- [前提条件](#前提条件)
- [セットアップ](#セットアップ)
  - [Google Cloud Vision API キー](#1-google-cloud-vision-api-キー)
  - [CJK フォント](#2-cjk-フォント中国語日本語韓国語-ocr-用)
  - [設定ファイル](#3-設定ファイル)
- [ソースからのビルド](#ソースからのビルド)
- [ファイル命名規則](#ファイル命名規則)
- [プロジェクト構成](#プロジェクト構成)
- [ライセンス](#ライセンス)

## 機能 [⬆](#目次)

### 一括リネーム [⬆](#目次)
- フォルダからスキャン画像をサムネイル付きでインポート
- ページ番号を自動付与（序文にローマ数字、本文にアラビア数字に対応）
- 特殊ページタイプに対応：通常ページ、画像のみのページ（Type A/B/C）、スキップページ
- 実行前に変更前後のファイル名をプレビュー

### 一括 OCR [⬆](#目次)
- Google Cloud Vision API に画像を送信してテキスト認識
- **見開きモード**：見開きスキャンから左右のページを分割し、それぞれ独立した PDF ページとして出力
- **単ページモード**：1枚の画像 = 1ページの PDF
- 並行処理（1〜10 ワーカーで設定可能）
- セッション永続化：中断したジョブを次回起動時に再開可能
- すべての出力 PDF を1つのファイルに自動結合
- OCR 対応言語：英語、日本語、ロシア語、ドイツ語、イタリア語、スペイン語、フランス語、繁体字中国語、簡体字中国語、オランダ語、ペルシア語、ベトナム語、ポーランド語、ポルトガル語

### 画像変換 [⬆](#目次)
- パーセント指定（1〜99%）で画像を一括リサイズ
- EXIF の向き情報を保持

### 全般 [⬆](#目次)
- **多言語 UI**：14言語に対応 — 繁體中文、简体中文、English、日本語、Русский、Deutsch、Italiano、Español、Français、Nederlands、فارسی、Tiếng Việt、Polski、Português
- ダーク／ライトテーマ切り替え
- ペルシア語向け RTL レイアウト対応
- 設定は `config.json` に自動保存

## クイックスタート [⬆](#目次)

### 方法 A：ビルド済みリリースをダウンロード（推奨） [⬆](#目次)

1. [Releases](https://github.com/alexwudev/go-book2ocr/releases) ページにアクセス
2. 最新の `go-book2ocr.zip` をダウンロード
3. 任意のフォルダに展開
4. Google Cloud API キーを `key/` フォルダに配置（下記の[セットアップ](#1-google-cloud-vision-api-キー)を参照）
5. （任意）CJK フォントの `.ttf` ファイルを `fonts/` フォルダに配置して中国語・日本語・韓国語に対応（下記の[セットアップ](#2-cjk-フォント中国語日本語韓国語-ocr-用)を参照）
6. `go-book2ocr.exe` を実行

### 方法 B：ソースからビルド [⬆](#目次)

[Go](https://go.dev/) 1.24+ と [Node.js](https://nodejs.org/) が必要です。

```bash
git clone https://github.com/alexwudev/go-book2ocr.git
cd go-book2ocr
build.bat          # Windows 環境
# または
./build.sh         # WSL 環境（mingw-w64 が必要）
```

その後、方法 A の手順 4〜6 に従ってください。

---

初回起動時に**一括 OCR** タブで API キーのパスと言語設定を行ってください。UI 言語は右上のドロップダウンから切り替えられます。設定は自動的に保存されます。

## 使い方 [⬆](#目次)

### 基本的なワークフロー [⬆](#目次)

本ツールはスキャンした書籍のデジタル化を目的としています。基本的なワークフローは以下の通りです：

1. **スキャン** — 書籍のページを JPG 画像として取り込む（1枚あたり見開きまたは単ページ）
2. **一括リネーム** — リネームタブで画像にページ番号を割り当てる
3. **一括 OCR** — OCR タブでテキストを認識し、検索可能な PDF を生成する
4. ページ番号順に整理された、書籍全文を含む結合 PDF が出力される

### リネームタブ [⬆](#目次)

1. **フォルダを選択** をクリックし、スキャン画像が入ったフォルダを選択
2. サムネイルが自動的に読み込まれ、各画像のプレビューが表示される
3. **スキャンモード** を設定：見開き（ブックスプレッド）または単ページ
4. 開始ページ番号を設定（序文にはローマ数字、本文にはアラビア数字）
5. 必要に応じて各画像の**ページタイプ**を設定：
   - **Normal** — 左右両ページにページ番号あり（デフォルト）
   - **Type A** — 左ページにページ番号あり、右ページは画像
   - **Type B** — 左右とも画像（ページ番号なし）
   - **Type C** — 左ページは画像、右ページにページ番号あり
   - **Skip** — この画像をリネーム対象から除外
6. 変更前後のファイル名プレビューを確認し、**リネーム実行** をクリック

### OCR タブ [⬆](#目次)

1. **画像フォルダを選択** をクリック — リネーム済み画像のフォルダを選択
2. **API キーを選択** をクリック — Google Cloud サービスアカウントの JSON ファイルを選択
3. **言語** を設定（例：`ja` は日本語、`zh-CN` は簡体字中国語、`en` は英語）
4. **同時実行数** を調整（デフォルト 5、最大 10）
5. すべての出力 PDF を1つのファイルに**結合**するかどうかを選択
6. **OCR 開始** をクリック
7. 進捗状況とログがリアルタイムで表示される。いつでも停止でき、次回起動時に再開可能

### 変換タブ [⬆](#目次)

1. 画像フォルダを選択
2. リサイズ率を設定（1〜99%）
3. **開始** をクリック — 画像がその場でリサイズされる

## 前提条件 [⬆](#目次)

- **Windows**（本アプリは Windows デスクトップアプリケーションとしてビルドされています）
- **Google Cloud Vision API** の認証情報（サービスアカウント JSON キー）— 下記のセットアップを参照
- **CJK 対応フォント**（中国語・日本語・韓国語のテキストを OCR する場合のみ必要）— 下記のセットアップを参照

## セットアップ [⬆](#目次)

### 1. Google Cloud Vision API キー [⬆](#目次)

#### Cloud Vision API を有効化

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新しいプロジェクトを作成（または既存のプロジェクトを選択）
3. ナビゲーションメニューの **API とサービス > ライブラリ** を開く
4. **Cloud Vision API** を検索してクリック
5. **有効にする** をクリック

#### サービスアカウントキーの作成

1. Cloud Console で **IAM と管理 > サービスアカウント** に移動
2. **+ サービスアカウントを作成** をクリック
3. 名前を入力（例：`go-book2ocr`）し、**作成して続行** をクリック
4. ロールは**プロジェクト > オーナー**を選択（必要に応じてより制限的なロールも可）し、**続行 > 完了** をクリック
5. 作成したサービスアカウントのメールアドレスをクリック
6. **鍵** タブに移動し、**鍵を追加 > 新しい鍵を作成** をクリック
7. **JSON** 形式を選択し、**作成** をクリック
8. `.json` キーファイルが自動的にダウンロードされる
9. このファイルをプロジェクトの `key/` ディレクトリに移動（このディレクトリは git の管理対象外）

#### 料金

Cloud Vision API は**月 1,000 回まで無料**で利用できます。無料枠を超えた場合、テキスト検出（OCR）は **1,000 回あたり $1.50** で課金されます。新規の Google Cloud アカウントには **$300 分の無料クレジット**が付与されます。

料金の詳細は [Cloud Vision API の料金](https://cloud.google.com/vision/pricing)ページをご覧ください。

### 2. CJK フォント（中国語・日本語・韓国語 OCR 用） [⬆](#目次)

PDF の内蔵フォント（Helvetica）は CJK 文字に対応していません。CJK テキストを正しく出力するには、CJK 対応の `.ttf` フォントファイルを `fonts/` ディレクトリに配置してください。

推奨フォント（いずれか1つで動作します）：

| フォント | ライセンス | ダウンロード |
|----------|------------|--------------|
| Microsoft YaHei (`msyh.ttf`) | プロプライエタリ（Windows 内蔵） | `C:\Windows\Fonts\msyh.ttc` から抽出 |
| Noto Sans SC (`NotoSansSC-Regular.ttf`) | OFL（無料） | [Google Fonts](https://fonts.google.com/noto/specimen/Noto+Sans+SC) |
| Noto Sans TC (`NotoSansTC-Regular.ttf`) | OFL（無料） | [Google Fonts](https://fonts.google.com/noto/specimen/Noto+Sans+TC) |
| Noto Sans JP (`NotoSansJP-Regular.ttf`) | OFL（無料） | [Google Fonts](https://fonts.google.com/noto/specimen/Noto+Sans+JP) |
| Source Han Sans (`SourceHanSansSC-Regular.ttf`) | OFL（無料） | [Adobe GitHub](https://github.com/adobe-fonts/source-han-sans) |

> `fonts/` にフォントが見つからない場合、アプリは Helvetica + CP1252 エンコーディング（西欧文字のみ対応）にフォールバックします。

### 3. 設定ファイル [⬆](#目次)

アプリは初回起動時に `config.json` を自動生成します。サンプルから手動で作成することもできます：

```
cp config.example.json config.json
```

| フィールド | 説明 |
|------------|------|
| `credFile` | Google Cloud サービスアカウントキーのパス |
| `languages` | OCR 言語ヒント（例：`["en"]`、`["zh-CN"]`、`["ja", "en"]`） |
| `concurrency` | 同時 API リクエスト数（1〜10） |
| `outputDir` | PDF の出力ディレクトリ（空の場合は自動設定） |
| `mergePdf` | すべての PDF を1つのファイルに結合するかどうか |
| `mergeFilename` | 結合後の PDF ファイル名 |
| `theme` | `"dark"` または `"light"` |
| `scanMode` | `"dual"`（見開きスキャン）または `"single"`（単ページスキャン） |
| `uiLang` | UI 言語コード（例：`"zh-TW"`、`"en"`、`"ja"`） |

## ソースからのビルド [⬆](#目次)

### 必要環境 [⬆](#目次)

- [Go](https://go.dev/) 1.24+
- [Node.js](https://nodejs.org/)
- [Wails CLI](https://wails.io/docs/gettingstarted/installation)（任意、`wails dev` 用）

### Windows（ネイティブ） [⬆](#目次)

```batch
build.bat
```

### WSL（Windows 向けクロスコンパイル） [⬆](#目次)

```bash
# mingw-w64 が必要：sudo apt install gcc-mingw-w64-x86-64
./build.sh
```

### 開発モード [⬆](#目次)

```bash
wails dev
```

## ファイル命名規則 [⬆](#目次)

OCR タブでは、入力画像が特定の命名パターンに従っている必要があります（リネームタブで生成されるもの）：

| モード | パターン | 例 |
|--------|----------|----|
| 見開き | `Page-NNN-NNN.JPG` | `Page-004-005.JPG`（4〜5ページ） |
| 見開き（ローマ数字） | `Page-r-xxx-xxx.JPG` | `Page-r-iv-v.JPG`（iv〜vページ） |
| 単ページ | `Page-NNN.JPG` | `Page-004.JPG`（4ページ） |
| 単ページ（ローマ数字） | `Page-r-xxx.JPG` | `Page-r-iv.JPG`（ivページ） |
| 画像ページ接尾辞 | `-a`、`-b`、`-c` | `Page-004-005-a.JPG` |

## プロジェクト構成 [⬆](#目次)

```
go-book2ocr/
├── main.go              # App entry point
├── app.go               # Core app struct, config, session, thumbnails
├── ocr.go               # OCR pipeline, Vision API, PDF generation
├── rename.go            # Batch rename logic, page numbering
├── convert.go           # Image resize/conversion
├── models.go            # Shared data types
├── CHANGELOG.md         # Version history
├── wails.json           # Wails project config
├── build.bat            # Windows build script
├── build.sh             # WSL cross-compile script
├── config.example.json  # Example configuration
├── build/
│   └── appicon.png      # App icon
├── docs/                # Translated READMEs
├── fonts/               # Place CJK font files here
├── key/                 # Place API key files here (git-ignored)
├── frontend/
│   ├── index.html       # Main HTML
│   ├── build.js         # Frontend build script
│   └── src/
│       ├── main.js      # Tab switching, config, i18n init
│       ├── i18n.js      # Internationalization (14 languages)
│       ├── ocr.js       # OCR tab UI
│       ├── rename.js    # Rename tab UI
│       ├── convert.js   # Convert tab UI
│       ├── theme.js     # Theme toggling
│       └── style.css    # All styles (incl. RTL support)
└── output/              # Default OCR output directory (git-ignored)
```

## ライセンス [⬆](#目次)

[MIT](../LICENSE)
