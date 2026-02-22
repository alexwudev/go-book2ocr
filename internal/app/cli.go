package app

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"os/signal"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"
)

// CLIEvent is the JSON Lines output format for CLI mode.
type CLIEvent struct {
	Type       string  `json:"type"`
	TotalFiles int     `json:"totalFiles,omitempty"`
	Remaining  int     `json:"remaining,omitempty"`
	Provider   string  `json:"provider,omitempty"`
	ScanMode   string  `json:"scanMode,omitempty"`
	OutputDir  string  `json:"outputDir,omitempty"`
	Filename   string  `json:"filename,omitempty"`
	Index      int     `json:"index,omitempty"`
	Total      int     `json:"total,omitempty"`
	Message    string  `json:"message,omitempty"`
	IsError    bool    `json:"isError,omitempty"`
	Current    int     `json:"current,omitempty"`
	Percent    float64 `json:"percent,omitempty"`
	Processed  int     `json:"processed,omitempty"`
	Errors     int     `json:"errors,omitempty"`
	Elapsed    string  `json:"elapsed,omitempty"`
}

var (
	jsonMu sync.Mutex
)

func emitJSON(evt CLIEvent) {
	jsonMu.Lock()
	defer jsonMu.Unlock()
	data, _ := json.Marshal(evt)
	fmt.Fprintln(os.Stdout, string(data))
}

// RunCLI runs the OCR pipeline in CLI mode and returns the exit code.
func RunCLI(args []string) int {
	attachConsole()

	fs := flag.NewFlagSet("ocr", flag.ContinueOnError)

	dir := fs.String("dir", "", "Image directory (required)")
	output := fs.String("output", "", "Output directory")
	provider := fs.String("provider", "", "OCR provider: google, ocrspace, tesseract")
	cred := fs.String("cred", "", "Google Vision credential JSON path")
	lang := fs.String("lang", "", "Comma-separated language codes")
	concurrency := fs.Int("concurrency", 0, "Concurrency 1-10")
	scanMode := fs.String("scan-mode", "", "dual or single")
	merge := fs.Bool("merge", false, "Merge PDFs after OCR")
	mergeSet := false
	mergeName := fs.String("merge-name", "", "Merged PDF filename")
	tesseractPath := fs.String("tesseract-path", "", "Path to tesseract executable")
	ocrspaceKey := fs.String("ocrspace-key", "", "OCR.space API key")
	ocrspaceEngine := fs.Int("ocrspace-engine", 0, "OCR.space engine 1/2/3")
	ocrspacePlan := fs.String("ocrspace-plan", "", "OCR.space plan: free or pro")

	// Track whether --merge was explicitly set
	fs.Visit(func(f *flag.Flag) {})

	if err := fs.Parse(args[2:]); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		return 1
	}

	// Check if --merge was explicitly provided
	fs.Visit(func(f *flag.Flag) {
		if f.Name == "merge" {
			mergeSet = true
		}
	})

	if *dir == "" {
		fmt.Fprintln(os.Stderr, "Error: --dir is required")
		fs.Usage()
		return 1
	}

	// Verify directory exists
	info, err := os.Stat(*dir)
	if err != nil || !info.IsDir() {
		fmt.Fprintf(os.Stderr, "Error: directory not found: %s\n", *dir)
		return 1
	}

	// Build app and load config
	a := &App{
		thumbSem: make(chan struct{}, 2),
	}
	a.loadConfig()
	a.loadSession()
	a.loadStats()

	// Merge CLI flags with config defaults
	settings := OCRSettings{
		ImageDir:       *dir,
		Provider:       a.config.Provider,
		CredFile:       a.config.CredFile,
		Languages:      a.config.Languages,
		Concurrency:    a.config.Concurrency,
		MergePDF:       a.config.MergePDF,
		MergeFilename:  a.config.MergeFilename,
		ScanMode:       a.config.ScanMode,
		TesseractPath:  a.config.TesseractPath,
		OcrSpaceApiKey: a.config.OcrSpaceApiKey,
		OcrSpaceEngine: a.config.OcrSpaceEngine,
		OcrSpacePlan:   a.config.OcrSpacePlan,
	}

	// CLI flags override config
	if *provider != "" {
		settings.Provider = *provider
	}
	if *cred != "" {
		settings.CredFile = *cred
	}
	if *lang != "" {
		settings.Languages = strings.Split(*lang, ",")
	}
	if *concurrency > 0 {
		settings.Concurrency = *concurrency
	}
	if *scanMode != "" {
		settings.ScanMode = *scanMode
	}
	if mergeSet {
		settings.MergePDF = *merge
	}
	if *mergeName != "" {
		settings.MergeFilename = *mergeName
	}
	if *tesseractPath != "" {
		settings.TesseractPath = *tesseractPath
	}
	if *ocrspaceKey != "" {
		settings.OcrSpaceApiKey = *ocrspaceKey
	}
	if *ocrspaceEngine > 0 {
		settings.OcrSpaceEngine = *ocrspaceEngine
	}
	if *ocrspacePlan != "" {
		settings.OcrSpacePlan = *ocrspacePlan
	}

	// Default scan mode
	if settings.ScanMode == "" {
		settings.ScanMode = "dual"
	}
	// Default provider
	if settings.Provider == "" {
		settings.Provider = "google"
	}

	// Scan directory for matching image files
	entries, err := os.ReadDir(*dir)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error reading directory: %v\n", err)
		return 1
	}

	var files []string
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		if matchesOCRPattern(e.Name(), settings.ScanMode) {
			files = append(files, filepath.Join(*dir, e.Name()))
		}
	}
	sort.Strings(files)

	if len(files) == 0 {
		fmt.Fprintln(os.Stderr, "Error: no matching image files found in directory")
		return 1
	}

	settings.SelectedFiles = files

	// Output directory
	if *output != "" {
		settings.OutputDir = *output
	} else if settings.OutputDir == "" {
		settings.OutputDir = filepath.Join(a.exeDir(), "output", filepath.Base(*dir))
	}

	// Set up context with signal handling
	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt)
	defer cancel()
	a.ctx = ctx

	// Track errors and progress for exit code
	var errorCount int   // per-file errors
	var fatalError bool  // pipeline-level fatal errors
	var lastCurrent int  // last progress current value
	var errorMu sync.Mutex

	// Count remaining (after session skip)
	processedSet := make(map[string]bool)
	if a.session != nil && a.session.ImageDir == settings.ImageDir {
		for _, f := range a.session.ProcessedFiles {
			processedSet[f] = true
		}
	}
	remaining := 0
	for _, f := range files {
		base := filepath.Base(f)
		pdfName := strings.TrimSuffix(base, filepath.Ext(base)) + ".pdf"
		outputPath := filepath.Join(settings.OutputDir, pdfName)
		if processedSet[base] {
			continue
		}
		if _, err := os.Stat(outputPath); err == nil {
			continue
		}
		remaining++
	}

	// Emit start event
	emitJSON(CLIEvent{
		Type:       "start",
		TotalFiles: len(files),
		Remaining:  remaining,
		Provider:   settings.Provider,
		ScanMode:   settings.ScanMode,
		OutputDir:  settings.OutputDir,
	})

	startTime := time.Now()

	// Set up callbacks
	a.onLog = func(entry LogEntry) {
		emitJSON(CLIEvent{
			Type:     "log",
			Filename: entry.Filename,
			Index:    entry.Index,
			Total:    entry.Total,
			Message:  entry.Message,
			IsError:  entry.IsError,
		})
		if entry.IsError {
			errorMu.Lock()
			if entry.Filename != "" {
				errorCount++
			} else {
				fatalError = true
			}
			errorMu.Unlock()
		}
	}

	a.onProgress = func(update ProgressUpdate) {
		emitJSON(CLIEvent{
			Type:    "progress",
			Current: update.Current,
			Total:   update.Total,
			Percent: update.Percent,
		})
		errorMu.Lock()
		lastCurrent = update.Current
		errorMu.Unlock()
	}

	// Run OCR pipeline synchronously
	a.runOCRPipeline(ctx, settings)

	elapsed := time.Since(startTime).Round(time.Second).String()

	errorMu.Lock()
	finalErrors := errorCount
	isFatal := fatalError
	actualProcessed := lastCurrent - (len(files) - remaining) // subtract alreadyDone
	if actualProcessed < 0 {
		actualProcessed = 0
	}
	errorMu.Unlock()

	emitJSON(CLIEvent{
		Type:      "done",
		Processed: actualProcessed,
		Errors:    finalErrors,
		Elapsed:   elapsed,
	})

	if isFatal {
		return 1
	}
	if finalErrors > 0 {
		return 2
	}
	return 0
}
