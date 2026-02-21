package app

// ImageInfo represents one image file in the rename tab
type ImageInfo struct {
	OriginalPath     string `json:"originalPath"`
	OriginalName     string `json:"originalName"`
	Index            int    `json:"index"`
	PageType         string `json:"pageType"` // "Normal", "TypeA", "TypeB", "TypeC"
	IsRoman          bool   `json:"isRoman"`
	LeftPageOverride int    `json:"leftPageOverride"` // 0 = auto, >0 = manual override
}

// RenamePreview is one row of the old->new filename mapping
type RenamePreview struct {
	OriginalName string `json:"originalName"`
	NewName      string `json:"newName"`
	LeftPage     string `json:"leftPage"`
	RightPage    string `json:"rightPage"`
	PageType     string `json:"pageType"`
}

// OCRSettings holds all OCR tab configuration
type OCRSettings struct {
	ImageDir      string   `json:"imageDir"`
	OutputDir     string   `json:"outputDir"`
	CredFile      string   `json:"credFile"`
	Languages     []string `json:"languages"`
	Concurrency   int      `json:"concurrency"`
	MergePDF      bool     `json:"mergePdf"`
	MergeFilename string   `json:"mergeFilename"`
	ScanMode      string   `json:"scanMode"` // "dual" or "single"
}

// AppConfig persisted to config.json next to executable
type AppConfig struct {
	CredFile      string   `json:"credFile"`
	Languages     []string `json:"languages"`
	Concurrency   int      `json:"concurrency"`
	OutputDir     string   `json:"outputDir"`
	MergePDF      bool     `json:"mergePdf"`
	MergeFilename string   `json:"mergeFilename"`
	Theme         string   `json:"theme"`
	ScanMode      string   `json:"scanMode"` // "dual" or "single"
	UILang        string   `json:"uiLang"`   // UI language code, e.g. "zh-TW", "en"
}

// Session persisted to session.json for resume capability
type Session struct {
	ImageDir       string   `json:"imageDir"`
	OutputDir      string   `json:"outputDir"`
	CredFile       string   `json:"credFile"`
	Languages      []string `json:"languages"`
	Concurrency    int      `json:"concurrency"`
	MergePDF       bool     `json:"mergePdf"`
	MergeFilename  string   `json:"mergeFilename"`
	ScanMode       string   `json:"scanMode"`
	TotalFiles     int      `json:"totalFiles"`
	ProcessedFiles []string `json:"processedFiles"`
}

// LogEntry sent via event to frontend
type LogEntry struct {
	Filename string `json:"filename"`
	Index    int    `json:"index"`
	Total    int    `json:"total"`
	Message  string `json:"message"`
	IsError  bool   `json:"isError"`
}

// ProgressUpdate sent via event to frontend
type ProgressUpdate struct {
	Current int     `json:"current"`
	Total   int     `json:"total"`
	Percent float64 `json:"percent"`
}

// LangOption represents a language choice
type LangOption struct {
	Display string `json:"display"`
	Code    string `json:"code"`
}

// ImageMetadata holds image info without decoding pixels
type ImageMetadata struct {
	Path     string `json:"path"`
	Name     string `json:"name"`
	Width    int    `json:"width"`
	Height   int    `json:"height"`
	FileSize int64  `json:"fileSize"`
}

var langOptions = []LangOption{
	{"English", "en"},
	{"日本語", "ja"},
	{"Русский", "ru"},
	{"Deutsch", "de"},
	{"Italiano", "it"},
	{"Español", "es"},
	{"Français", "fr"},
	{"繁體中文", "zh-TW"},
	{"簡體中文", "zh-CN"},
	{"Nederlands", "nl"},
	{"فارسی", "fa"},
	{"Tiếng Việt", "vi"},
	{"Polski", "pl"},
	{"Português", "pt"},
}
