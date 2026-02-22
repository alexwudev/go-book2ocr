package app

// ImageInfo represents one image file in the rename tab
type ImageInfo struct {
	OriginalPath     string `json:"originalPath"`
	OriginalName     string `json:"originalName"`
	Index            int    `json:"index"`
	PageType         string `json:"pageType"` // "Normal", "TypeA", "TypeB", "TypeC", "Skip", "NoIncluding"
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
	ImageDir       string   `json:"imageDir"`
	OutputDir      string   `json:"outputDir"`
	CredFile       string   `json:"credFile"`
	Languages      []string `json:"languages"`
	Concurrency    int      `json:"concurrency"`
	MergePDF       bool     `json:"mergePdf"`
	MergeFilename  string   `json:"mergeFilename"`
	ScanMode       string   `json:"scanMode"`       // "dual" or "single"
	Provider       string   `json:"provider"`       // "google" or "ocrspace"
	OcrSpaceApiKey string   `json:"ocrSpaceApiKey"` // OCR.space API key
	OcrSpaceEngine int      `json:"ocrSpaceEngine"` // 1, 2, or 3
	OcrSpacePlan   string   `json:"ocrSpacePlan"`   // "free" or "pro"
	TesseractPath  string   `json:"tesseractPath"`  // path to tesseract.exe
	SelectedFiles  []string `json:"selectedFiles"`  // user-selected file paths from frontend
}

// AppConfig persisted to config.json next to executable
type AppConfig struct {
	CredFile       string   `json:"credFile"`
	Languages      []string `json:"languages"`
	Concurrency    int      `json:"concurrency"`
	OutputDir      string   `json:"outputDir"`
	MergePDF       bool     `json:"mergePdf"`
	MergeFilename  string   `json:"mergeFilename"`
	Theme          string   `json:"theme"`
	ScanMode       string   `json:"scanMode"`       // "dual" or "single"
	UILang         string   `json:"uiLang"`         // UI language code, e.g. "zh-TW", "en"
	Provider       string   `json:"provider"`       // "google" or "ocrspace"
	OcrSpaceApiKey string   `json:"ocrSpaceApiKey"` // OCR.space API key
	OcrSpaceEngine int      `json:"ocrSpaceEngine"` // OCR.space engine (1, 2, or 3)
	OcrSpacePlan   string   `json:"ocrSpacePlan"`   // "free" or "pro"
	TesseractPath  string   `json:"tesseractPath"`  // path to tesseract.exe
	ImageDir       string   `json:"imageDir"`       // last used image folder
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
	Provider       string   `json:"provider"`
	OcrSpaceApiKey string   `json:"ocrSpaceApiKey"`
	OcrSpaceEngine int      `json:"ocrSpaceEngine"`
	OcrSpacePlan   string   `json:"ocrSpacePlan"`
	TesseractPath  string   `json:"tesseractPath"`
	SelectedFiles  []string `json:"selectedFiles"`
}

// UsageRecord tracks API calls for one provider+plan on one date
type UsageRecord struct {
	Date     string `json:"date"`     // "2006-01-02"
	Provider string `json:"provider"` // "google" or "ocrspace"
	Plan     string `json:"plan"`     // "" (google), "free", "pro"
	Count    int    `json:"count"`
}

// UsageStats holds all usage records, persisted to stats.json
type UsageStats struct {
	Records []UsageRecord `json:"records"`
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
