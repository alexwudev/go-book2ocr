# Book2OCR

<p align="center">
  <img src="../build/appicon.png" alt="Book2OCR" width="128">
</p>

<p align="center">
  <a href="../README.md">English</a> | <a href="README.zh-TW.md">繁體中文</a> | 简体中文 | <a href="README.ja.md">日本語</a>
</p>

一款 Windows 桌面应用程序，用于批量 OCR 处理。使用 [Wails](https://wails.io/)（Go 后端 + Web 前端）开发，通过 [Google Cloud Vision API](https://cloud.google.com/vision) 识别扫描书页中的文字，并输出可搜索的 PDF 文件。

## 工作流程

```
┌─────────────────────────────────────────┐
│  1. 扫描 / 拍摄                         │
│     使用扫描仪或智能手机拍摄每一页或跨页 │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│  2. 整理图片文件                        │
│     将所有扫描图片放入同一文件夹，      │
│     按顺序排列                          │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│  3. 批量重命名                 [重命名] │
│     自动分配页码（罗马 + 阿拉伯数字，  │
│     特殊类型）                          │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│  4. 批量 OCR → PDF               [OCR] │
│     将图片发送至 Google Cloud Vision    │
│     API，每页生成一份 PDF              │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│  5. 合并输出                            │
│     自动合并所有页面为单一可搜索 PDF，  │
│     立即可用                            │
└─────────────────────────────────────────┘
```

## 目录

- [工作流程](#工作流程)
- [功能](#功能)
  - [批量重命名](#批量重命名)
  - [批量 OCR](#批量-ocr)
  - [图片转换](#图片转换)
  - [通用功能](#通用功能)
- [快速开始](#快速开始)
- [使用方式](#使用方式)
  - [典型工作流程](#典型工作流程)
  - [重命名标签页](#重命名标签页)
  - [OCR 标签页](#ocr-标签页)
  - [转换标签页](#转换标签页)
- [前置要求](#前置要求)
- [设置](#设置)
  - [Google Cloud Vision API 密钥](#1-google-cloud-vision-api-密钥)
  - [CJK 字体](#2-cjk-字体中日韩-ocr-用)
  - [配置文件](#3-配置文件)
- [从源码构建](#从源码构建)
- [文件命名规则](#文件命名规则)
- [项目结构](#项目结构)
- [许可证](#许可证)

## 功能

### 批量重命名
- 从文件夹导入扫描图片，附带缩略图预览
- 自动分配页码（支持前言使用罗马数字 + 正文使用阿拉伯数字）
- 处理特殊页面类型：普通页面、纯图片页（Type A/B/C）、跳过页
- 执行前可预览旧文件名与新文件名的对照

### 批量 OCR
- 将图片发送至 Google Cloud Vision API 进行文字识别
- **双页模式**：从双页扫描图中拆分左右页，分别输出为独立的 PDF 页面
- **单页模式**：一张图片 = 一页 PDF
- 并发处理（可设置 1-10 个 worker）
- 会话持久化：中断的任务可在下次启动时继续
- 自动合并所有输出 PDF 为单一文件
- OCR 语言支持：英文、日文、俄文、德文、意大利文、西班牙文、法文、繁体中文、简体中文、荷兰文、波斯文、越南文、波兰文、葡萄牙文

### 图片转换
- 按百分比（1-99%）批量缩放图片
- 保留 EXIF 方向信息

### 通用功能
- **多语言界面**：支持 14 种语言 — 繁體中文、简体中文、English、日本語、Русский、Deutsch、Italiano、Español、Français、Nederlands、فارسی、Tiếng Việt、Polski、Português
- 深色 / 浅色主题切换
- 波斯文 RTL 排版支持
- 设置自动保存至 `config.json`

## 快速开始

### 方式 A：下载预编译版本（推荐）

1. 前往 [Releases](https://github.com/alexwudev/go-book2ocr/releases) 页面
2. 下载最新的 `go-book2ocr.zip`
3. 解压到任意文件夹
4. 将 Google Cloud API 密钥放入 `key/` 文件夹（详见下方[设置](#1-google-cloud-vision-api-密钥)）
5. （可选）将 CJK 字体 `.ttf` 文件放入 `fonts/` 文件夹，以支持中日韩文字（详见下方[设置](#2-cjk-字体中日韩-ocr-用)）
6. 运行 `go-book2ocr.exe`

### 方式 B：从源码构建

需要 [Go](https://go.dev/) 1.24+ 和 [Node.js](https://nodejs.org/)。

```bash
git clone https://github.com/alexwudev/go-book2ocr.git
cd go-book2ocr
build.bat          # Windows 环境
# 或
./build.sh         # WSL 环境（需要 mingw-w64）
```

之后按照方式 A 的步骤 4-6 操作即可。

---

首次启动后，前往**批量 OCR** 标签页设置 API 密钥路径与语言偏好。可从右上角下拉菜单切换界面语言，设置会自动保存。

## 使用方式

### 典型工作流程

本工具专为数字化扫描书籍设计，典型流程如下：

1. **扫描**书页为 JPG 图片（每张图片为一个跨页或单页）
2. **批量重命名** — 使用重命名标签页为图片分配页码
3. **批量 OCR** — 使用 OCR 标签页识别文字并生成可搜索的 PDF
4. 输出结果为按页码排列的合并 PDF，包含完整书籍文字

### 重命名标签页

1. 点击**选择文件夹**，选择存放扫描图片的文件夹
2. 缩略图会自动加载，显示每张图片的预览
3. 设置**扫描模式**：双页（书籍跨页）或单页
4. 设置起始页码（前言用罗马数字，正文用阿拉伯数字）
5. 根据需要为每张图片设置**页面类型**：
   - **Normal** — 左右页都有页码（默认）
   - **Type A** — 左页有页码，右页为图片
   - **Type B** — 左右页都是图片（无页码）
   - **Type C** — 左页为图片，右页有页码
   - **Skip** — 跳过此图片，不参与重命名
6. 确认旧/新文件名预览无误后，点击**执行重命名**

### OCR 标签页

1. 点击**选择图片文件夹** — 选择已重命名的图片文件夹
2. 点击**选择 API 密钥** — 选择 Google Cloud 服务账户 JSON 文件
3. 设置**语言**（例如 `zh-CN` 简体中文、`zh-TW` 繁体中文、`en` 英文）
4. 调整**并发数量**（默认 5，最大 10）
5. 选择是否**合并**所有输出 PDF 为单一文件
6. 点击**开始 OCR**
7. 实时显示进度与日志；可随时停止，下次启动时继续

### 转换标签页

1. 选择图片文件夹
2. 设置缩放百分比（1-99%）
3. 点击**开始** — 图片会原地缩放覆盖

## 前置要求

- **Windows**（本应用程序为 Windows 桌面应用）
- **Google Cloud Vision API** 凭据（服务账户 JSON 密钥）— 详见下方设置
- **CJK 字体**（仅在 OCR 中日韩文字时需要）— 详见下方设置

## 设置

### 1. Google Cloud Vision API 密钥

#### 启用 Cloud Vision API

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建新项目（或选择现有项目）
3. 打开导航菜单 **API 和服务 > 库**
4. 搜索 **Cloud Vision API** 并点击进入
5. 点击**启用**

#### 创建服务账户密钥

1. 在 Cloud Console 中，前往 **IAM 和管理 > 服务账号**
2. 点击 **+ 创建服务账号**
3. 输入名称（例如 `go-book2ocr`），然后点击**创建并继续**
4. 角色选择**项目 > 所有者**（或根据需要选择更严格的角色），点击**继续 > 完成**
5. 点击刚创建的服务账号邮箱
6. 前往**密钥**标签页，点击**添加密钥 > 创建新密钥**
7. 选择 **JSON** 格式，点击**创建**
8. 浏览器会自动下载一个 `.json` 密钥文件
9. 将此文件移入项目的 `key/` 目录（此目录已被 git 忽略）

#### 费用

Cloud Vision API 每月提供 **1,000 次免费调用**。超过免费额度后，文字检测（OCR）费用为**每 1,000 次调用 $1.50 美元**。新创建的 Google Cloud 账号可获得 **$300 美元免费抵扣额度**。

完整费用详情请参阅 [Cloud Vision API 定价](https://cloud.google.com/vision/pricing)页面。

### 2. CJK 字体（中日韩 OCR 用）

PDF 内置字体（Helvetica）不支持 CJK 字符。若要正确输出中日韩文字，请将支持 CJK 的 `.ttf` 字体文件放入 `fonts/` 目录。

推荐字体（任选其一即可）：

| 字体 | 授权 | 下载 |
|------|------|------|
| 微软雅黑 (`msyh.ttf`) | 专有（Windows 内置） | 从 `C:\Windows\Fonts\msyh.ttc` 提取 |
| Noto Sans SC (`NotoSansSC-Regular.ttf`) | OFL（免费） | [Google Fonts](https://fonts.google.com/noto/specimen/Noto+Sans+SC) |
| Noto Sans TC (`NotoSansTC-Regular.ttf`) | OFL（免费） | [Google Fonts](https://fonts.google.com/noto/specimen/Noto+Sans+TC) |
| Noto Sans JP (`NotoSansJP-Regular.ttf`) | OFL（免费） | [Google Fonts](https://fonts.google.com/noto/specimen/Noto+Sans+JP) |
| 思源黑体 (`SourceHanSansSC-Regular.ttf`) | OFL（免费） | [Adobe GitHub](https://github.com/adobe-fonts/source-han-sans) |

> 若 `fonts/` 中找不到任何字体，应用程序会回退使用 Helvetica + CP1252 编码（仅支持西欧字符）。

### 3. 配置文件

应用程序首次运行时会自动生成 `config.json`。你也可以手动从示例创建：

```
cp config.example.json config.json
```

| 字段 | 说明 |
|------|------|
| `credFile` | Google Cloud 服务账户密钥路径 |
| `languages` | OCR 语言提示（例如 `["en"]`、`["zh-CN"]`、`["ja", "en"]`） |
| `concurrency` | 并发 API 请求数量（1-10） |
| `outputDir` | PDF 输出目录（留空则自动设置） |
| `mergePdf` | 是否合并所有 PDF 为单一文件 |
| `mergeFilename` | 合并后的 PDF 文件名 |
| `theme` | `"dark"` 或 `"light"` |
| `scanMode` | `"dual"`（双页扫描）或 `"single"`（单页扫描） |
| `uiLang` | 界面语言代码（例如 `"zh-TW"`、`"en"`、`"ja"`） |

## 从源码构建

### 要求

- [Go](https://go.dev/) 1.24+
- [Node.js](https://nodejs.org/)
- [Wails CLI](https://wails.io/docs/gettingstarted/installation)（可选，用于 `wails dev`）

### Windows（原生编译）

```batch
build.bat
```

### WSL（交叉编译为 Windows）

```bash
# 需要 mingw-w64：sudo apt install gcc-mingw-w64-x86-64
./build.sh
```

### 开发模式

```bash
wails dev
```

## 文件命名规则

OCR 标签页要求输入图片遵循特定命名格式（由重命名标签页生成）：

| 模式 | 格式 | 示例 |
|------|------|------|
| 双页 | `Page-NNN-NNN.JPG` | `Page-004-005.JPG`（第 4-5 页） |
| 双页（罗马） | `Page-r-xxx-xxx.JPG` | `Page-r-iv-v.JPG`（第 iv-v 页） |
| 单页 | `Page-NNN.JPG` | `Page-004.JPG`（第 4 页） |
| 单页（罗马） | `Page-r-xxx.JPG` | `Page-r-iv.JPG`（第 iv 页） |
| 图片页后缀 | `-a`、`-b`、`-c` | `Page-004-005-a.JPG` |

## 项目结构

```
go-book2ocr/
├── main.go              # 应用程序入口
├── app.go               # 核心结构、配置、会话、缩略图
├── ocr.go               # OCR 流程、Vision API、PDF 生成
├── rename.go            # 批量重命名逻辑、页码分配
├── convert.go           # 图片缩放转换
├── models.go            # 共享数据类型
├── CHANGELOG.md         # 版本历程
├── wails.json           # Wails 项目配置
├── build.bat            # Windows 编译脚本
├── build.sh             # WSL 交叉编译脚本
├── config.example.json  # 配置文件示例
├── build/
│   └── appicon.png      # 应用程序图标
├── docs/                # 翻译版 README
├── fonts/               # 放置 CJK 字体文件
├── key/                 # 放置 API 密钥文件（已被 git 忽略）
├── frontend/
│   ├── index.html       # 主 HTML
│   ├── build.js         # 前端构建脚本
│   └── src/
│       ├── main.js      # 标签页切换、配置管理、i18n 初始化
│       ├── i18n.js      # 国际化（14 种语言）
│       ├── ocr.js       # OCR 标签页 UI
│       ├── rename.js    # 重命名标签页 UI
│       ├── convert.js   # 转换标签页 UI
│       ├── theme.js     # 主题切换
│       └── style.css    # 所有样式（含 RTL 支持）
└── output/              # 默认 OCR 输出目录（已被 git 忽略）
```

## 许可证

[MIT](../LICENSE)
