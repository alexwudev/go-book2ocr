package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	vision "cloud.google.com/go/vision/v2/apiv1"
	visionpb "cloud.google.com/go/vision/v2/apiv1/visionpb"
	"github.com/go-pdf/fpdf"
	pdfcpuapi "github.com/pdfcpu/pdfcpu/pkg/api"
	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
	"google.golang.org/api/option"
)

var filePatternArabic = regexp.MustCompile(`^Page-(\d{3})-(\d{3})(-[a-zA-Z])?\.(JPG|jpg|jpeg|JPEG)$`)
var filePatternRoman = regexp.MustCompile(`^Page-r-([ivxlcdm]+)-([ivxlcdm]+)(-[a-zA-Z])?\.(JPG|jpg|jpeg|JPEG)$`)

var filePatternSingleArabic = regexp.MustCompile(`^Page-(\d{3})(-[a-zA-Z])?\.(JPG|jpg|jpeg|JPEG)$`)
var filePatternSingleRoman = regexp.MustCompile(`^Page-r-([ivxlcdm]+)(-[a-zA-Z])?\.(JPG|jpg|jpeg|JPEG)$`)

func matchesOCRPattern(name string, scanMode string) bool {
	if scanMode == "single" {
		return filePatternSingleArabic.MatchString(name) || filePatternSingleRoman.MatchString(name)
	}
	return filePatternArabic.MatchString(name) || filePatternRoman.MatchString(name)
}

// StartOCR begins the concurrent OCR pipeline
func (a *App) StartOCR(settings OCRSettings) string {
	a.mu.Lock()
	if a.ocrRunning {
		a.mu.Unlock()
		return "OCR is already running"
	}
	a.ocrRunning = true
	a.mu.Unlock()

	ctx, cancel := context.WithCancel(a.ctx)
	a.cancelOCR = cancel

	go func() {
		defer func() {
			a.mu.Lock()
			a.ocrRunning = false
			a.cancelOCR = nil
			a.mu.Unlock()
			wailsRuntime.WindowSetTitle(a.ctx, "OCR Tool")
			setTaskbarProgress(0)
			wailsRuntime.EventsEmit(a.ctx, "ocr:finished", nil)
		}()
		a.runOCRPipeline(ctx, settings)
	}()

	return ""
}

// StopOCR cancels the running OCR pipeline
func (a *App) StopOCR() {
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.cancelOCR != nil {
		a.cancelOCR()
	}
}

// IsOCRRunning returns whether OCR is currently running
func (a *App) IsOCRRunning() bool {
	a.mu.Lock()
	defer a.mu.Unlock()
	return a.ocrRunning
}

func (a *App) runOCRPipeline(ctx context.Context, settings OCRSettings) {
	emitLog := func(filename, message string, index, total int, isError bool) {
		wailsRuntime.EventsEmit(a.ctx, "ocr:log", LogEntry{
			Filename: filename,
			Index:    index,
			Total:    total,
			Message:  message,
			IsError:  isError,
		})
	}

	emitProgress := func(current, total int) {
		pct := float64(current) / float64(total)
		wailsRuntime.EventsEmit(a.ctx, "ocr:progress", ProgressUpdate{
			Current: current,
			Total:   total,
			Percent: pct,
		})
		// Update window title and taskbar with progress
		wailsRuntime.WindowSetTitle(a.ctx, fmt.Sprintf("OCR Tool — %d%% (%d/%d)", int(pct*100), current, total))
		setTaskbarProgress(pct * 100)
	}

	// Create output directory
	if err := os.MkdirAll(settings.OutputDir, 0755); err != nil {
		emitLog("", fmt.Sprintf("Cannot create output directory: %v", err), 0, 0, true)
		return
	}

	// Log scan mode
	modeLabel := "dual-page"
	if settings.ScanMode == "single" {
		modeLabel = "single-page"
	}
	emitLog("", fmt.Sprintf("Scan mode: %s", modeLabel), 0, 0, false)

	// Scan files
	allFiles, err := filepath.Glob(filepath.Join(settings.ImageDir, "Page-*.*"))
	if err != nil {
		emitLog("", fmt.Sprintf("Scan failed: %v", err), 0, 0, true)
		return
	}

	var files []string
	for _, f := range allFiles {
		if matchesOCRPattern(filepath.Base(f), settings.ScanMode) {
			files = append(files, f)
		}
	}
	sort.Strings(files)

	if len(files) == 0 {
		if settings.ScanMode == "single" {
			emitLog("", "No matching files found (single-page: Page-NNN or Page-r-xxx format)", 0, 0, true)
		} else {
			emitLog("", "No matching files found (dual-page: Page-NNN-NNN or Page-r-xxx-xxx format)", 0, 0, true)
		}
		return
	}

	// Load existing session to find already processed files
	processedSet := make(map[string]bool)
	if a.session != nil && a.session.ImageDir == settings.ImageDir {
		for _, f := range a.session.ProcessedFiles {
			processedSet[f] = true
		}
	}

	// Filter out already processed
	var remaining []string
	for _, f := range files {
		base := filepath.Base(f)
		pdfName := strings.TrimSuffix(base, filepath.Ext(base)) + ".pdf"
		outputPath := filepath.Join(settings.OutputDir, pdfName)

		if processedSet[base] {
			continue
		}
		// Also skip if output PDF already exists
		if _, err := os.Stat(outputPath); err == nil {
			processedSet[base] = true
			continue
		}
		remaining = append(remaining, f)
	}

	totalFiles := len(files)
	alreadyDone := len(files) - len(remaining)

	emitLog("", fmt.Sprintf("Found %d matching files, %d already processed, %d remaining",
		totalFiles, alreadyDone, len(remaining)), 0, totalFiles, false)

	if len(remaining) == 0 {
		emitLog("", "All files already processed", 0, totalFiles, false)
		if settings.MergePDF {
			a.mergePDFs(settings.OutputDir, settings.MergeFilename)
		}
		return
	}

	// Create Vision API client
	client, err := vision.NewImageAnnotatorClient(ctx, option.WithCredentialsFile(settings.CredFile))
	if err != nil {
		emitLog("", fmt.Sprintf("Cannot create Vision API client: %v", err), 0, 0, true)
		return
	}
	defer client.Close()

	// Initialize session
	session := &Session{
		ImageDir:       settings.ImageDir,
		OutputDir:      settings.OutputDir,
		CredFile:       settings.CredFile,
		Languages:      settings.Languages,
		Concurrency:    settings.Concurrency,
		MergePDF:       settings.MergePDF,
		MergeFilename:  settings.MergeFilename,
		ScanMode:       settings.ScanMode,
		TotalFiles:     totalFiles,
		ProcessedFiles: make([]string, 0, len(processedSet)),
	}
	for f := range processedSet {
		session.ProcessedFiles = append(session.ProcessedFiles, f)
	}

	// Session debounce
	var sessionMu sync.Mutex
	sessionDirty := false
	sessionTimer := time.NewTicker(5 * time.Second)
	defer sessionTimer.Stop()

	go func() {
		for range sessionTimer.C {
			sessionMu.Lock()
			if sessionDirty {
				a.saveSession(session)
				sessionDirty = false
			}
			sessionMu.Unlock()
		}
	}()

	markProcessed := func(basename string) {
		sessionMu.Lock()
		session.ProcessedFiles = append(session.ProcessedFiles, basename)
		sessionDirty = true
		sessionMu.Unlock()
	}

	// Resolve CJK font path once
	fontPath := a.cjkFontPath()
	if fontPath != "" {
		emitLog("", fmt.Sprintf("Using CJK font: %s", fontPath), 0, 0, false)
	}

	// Concurrent worker pool
	concurrency := settings.Concurrency
	if concurrency < 1 {
		concurrency = 1
	}
	if concurrency > 10 {
		concurrency = 10
	}

	sem := make(chan struct{}, concurrency)
	var wg sync.WaitGroup
	var processed int64

	for i, filePath := range remaining {
		select {
		case <-ctx.Done():
			emitLog("", "OCR stopped by user", 0, totalFiles, false)
			wg.Wait()
			// Save final session state
			sessionMu.Lock()
			a.saveSession(session)
			sessionMu.Unlock()
			return
		case sem <- struct{}{}:
		}

		wg.Add(1)
		go func(idx int, fp string) {
			defer wg.Done()
			defer func() { <-sem }()

			baseName := filepath.Base(fp)

			// Check context before starting
			select {
			case <-ctx.Done():
				return
			default:
			}

			err := a.processOneImage(ctx, client, fp, settings, fontPath)

			cur := int(atomic.AddInt64(&processed, 1)) + alreadyDone

			if err != nil {
				emitLog(baseName, fmt.Sprintf("Error: %v", err), cur, totalFiles, true)
			} else {
				emitLog(baseName, "OK", cur, totalFiles, false)
				markProcessed(baseName)
			}

			emitProgress(cur, totalFiles)
		}(i, filePath)
	}

	wg.Wait()

	// Final session save
	sessionMu.Lock()
	a.saveSession(session)
	sessionMu.Unlock()

	emitLog("", fmt.Sprintf("OCR complete! Processed %d files", atomic.LoadInt64(&processed)), totalFiles, totalFiles, false)

	// Merge PDFs
	if settings.MergePDF {
		a.mergePDFs(settings.OutputDir, settings.MergeFilename)
	}

	// Clear session on success
	a.ClearSession()
}

// cjkFontPath returns the path to a CJK-capable font in the fonts/ directory.
// It searches for common CJK font filenames and returns the first match.
func (a *App) cjkFontPath() string {
	fontsDir := filepath.Join(a.exeDir(), "fonts")
	candidates := []string{
		"msyh.ttf",                // Microsoft YaHei
		"NotoSansSC-Regular.ttf",  // Google Noto Sans SC
		"NotoSansTC-Regular.ttf",  // Google Noto Sans TC
		"NotoSansJP-Regular.ttf",  // Google Noto Sans JP
		"NotoSansCJKsc-Regular.ttf",
		"SourceHanSansSC-Regular.ttf",
	}
	for _, name := range candidates {
		path := filepath.Join(fontsDir, name)
		if _, err := os.Stat(path); err == nil {
			return path
		}
	}
	// Fallback: try any .ttf in fonts/ directory
	matches, _ := filepath.Glob(filepath.Join(fontsDir, "*.ttf"))
	if len(matches) > 0 {
		return matches[0]
	}
	return ""
}

func (a *App) processOneImage(ctx context.Context, client *vision.ImageAnnotatorClient, filePath string, settings OCRSettings, fontPath string) error {
	baseName := filepath.Base(filePath)
	pdfName := strings.TrimSuffix(baseName, filepath.Ext(baseName)) + ".pdf"
	outputPath := filepath.Join(settings.OutputDir, pdfName)

	// Read image file
	imgData, err := os.ReadFile(filePath)
	if err != nil {
		return fmt.Errorf("read: %w", err)
	}

	// Build API request
	image := &visionpb.Image{Content: imgData}
	req := &visionpb.AnnotateImageRequest{
		Image: image,
		Features: []*visionpb.Feature{
			{Type: visionpb.Feature_DOCUMENT_TEXT_DETECTION},
		},
		ImageContext: &visionpb.ImageContext{
			LanguageHints: settings.Languages,
		},
	}

	// Call Vision API
	batchResp, err := client.BatchAnnotateImages(ctx, &visionpb.BatchAnnotateImagesRequest{
		Requests: []*visionpb.AnnotateImageRequest{req},
	})

	// Release image data immediately
	imgData = nil
	_ = imgData

	if err != nil {
		return fmt.Errorf("API: %w", err)
	}

	resp := batchResp.Responses[0]
	if resp.Error != nil {
		return fmt.Errorf("API error: %s", resp.Error.Message)
	}
	// Single-page mode: no splitting, all text goes to one page
	if settings.ScanMode == "single" {
		if resp.FullTextAnnotation == nil {
			label := pageLabelFromFilenameSingle(baseName)
			return generateSinglePagePDF(outputPath, "", label, fontPath)
		}
		var allTexts []string
		for _, page := range resp.FullTextAnnotation.Pages {
			for _, block := range page.Blocks {
				blockText := extractBlockText(block)
				if blockText != "" {
					allTexts = append(allTexts, blockText)
				}
			}
		}
		text := strings.Join(allTexts, "\n\n")
		label := pageLabelFromFilenameSingle(baseName)
		return generateSinglePagePDF(outputPath, text, label, fontPath)
	}

	// Dual-page mode: split by midpoint
	if resp.FullTextAnnotation == nil {
		// No text detected - create empty PDF
		leftLabel, rightLabel := pageLabelsFromFilename(baseName)
		return generatePDFWithAnnotation(outputPath, "", "", leftLabel, rightLabel, fontPath)
	}

	// Find image width for left/right splitting
	maxX := float32(0)
	for _, page := range resp.FullTextAnnotation.Pages {
		if page.Width > 0 {
			maxX = float32(page.Width)
			break
		}
	}
	if maxX == 0 {
		for _, ann := range resp.TextAnnotations {
			if ann.BoundingPoly != nil {
				for _, v := range ann.BoundingPoly.Vertices {
					if float32(v.X) > maxX {
						maxX = float32(v.X)
					}
				}
			}
		}
	}
	midX := maxX / 2

	// Split text into left and right pages
	var leftTexts, rightTexts []string
	for _, page := range resp.FullTextAnnotation.Pages {
		for _, block := range page.Blocks {
			centerX := blockCenterX(block)
			blockText := extractBlockText(block)
			if blockText == "" {
				continue
			}
			if centerX < midX {
				leftTexts = append(leftTexts, blockText)
			} else {
				rightTexts = append(rightTexts, blockText)
			}
		}
	}

	leftText := strings.Join(leftTexts, "\n\n")
	rightText := strings.Join(rightTexts, "\n\n")

	leftLabel, rightLabel := pageLabelsFromFilename(baseName)
	return generatePDFWithAnnotation(outputPath, leftText, rightText, leftLabel, rightLabel, fontPath)
}

// setupPDFFont configures the PDF with a UTF-8 CJK font if available, otherwise falls back to Helvetica+cp1252.
// Returns the font family name and a text translator function.
func setupPDFFont(pdf *fpdf.Fpdf, fontPath string) (string, func(string) string) {
	if fontPath != "" {
		pdf.AddUTF8Font("CJK", "", fontPath)
		pdf.AddUTF8Font("CJK", "B", fontPath)
		return "CJK", func(s string) string { return s }
	}
	tr := pdf.UnicodeTranslatorFromDescriptor("cp1252")
	return "Helvetica", tr
}

// blockCenterX calculates the center X coordinate of a text block
func blockCenterX(block *visionpb.Block) float32 {
	if block.BoundingBox == nil || len(block.BoundingBox.Vertices) == 0 {
		return 0
	}
	sumX := float32(0)
	for _, v := range block.BoundingBox.Vertices {
		sumX += float32(v.X)
	}
	return sumX / float32(len(block.BoundingBox.Vertices))
}

// extractBlockText extracts text from a Vision API block with break handling
func extractBlockText(block *visionpb.Block) string {
	var parts []string
	for _, para := range block.Paragraphs {
		var words []string
		for _, word := range para.Words {
			var syms []string
			for _, s := range word.Symbols {
				syms = append(syms, s.Text)
				if s.Property != nil && s.Property.DetectedBreak != nil {
					switch s.Property.DetectedBreak.Type {
					case visionpb.TextAnnotation_DetectedBreak_SPACE,
						visionpb.TextAnnotation_DetectedBreak_SURE_SPACE:
						syms = append(syms, " ")
					case visionpb.TextAnnotation_DetectedBreak_EOL_SURE_SPACE,
						visionpb.TextAnnotation_DetectedBreak_HYPHEN:
						syms = append(syms, "\n")
					case visionpb.TextAnnotation_DetectedBreak_LINE_BREAK:
						syms = append(syms, "\n")
					}
				}
			}
			words = append(words, strings.Join(syms, ""))
		}
		parts = append(parts, strings.Join(words, ""))
	}
	return strings.TrimSpace(strings.Join(parts, "\n"))
}

// pageLabelsFromFilename extracts page number labels from the filename
func pageLabelsFromFilename(basename string) (left, right string) {
	// Try Roman pattern: Page-r-iv-v.JPG or Page-r-iv-v-a.JPG
	if m := filePatternRoman.FindStringSubmatch(basename); m != nil {
		return "Page " + m[1], "Page " + m[2]
	}
	// Try Arabic pattern: Page-004-005.JPG or Page-004-005-a.JPG
	if m := filePatternArabic.FindStringSubmatch(basename); m != nil {
		// Remove leading zeros for display
		left := strings.TrimLeft(m[1], "0")
		right := strings.TrimLeft(m[2], "0")
		if left == "" {
			left = "0"
		}
		if right == "" {
			right = "0"
		}
		return "Page " + left, "Page " + right
	}
	return "", ""
}

// generatePDFWithAnnotation creates a 2-page PDF with page number headers
func generatePDFWithAnnotation(outputPath, leftText, rightText, leftLabel, rightLabel, fontPath string) error {
	pdf := fpdf.New("P", "mm", "A4", "")
	pdf.SetAutoPageBreak(false, 0)

	fontName, tr := setupPDFFont(pdf, fontPath)

	margin := 15.0
	cellW := 210.0 - margin*2

	// Left page
	pdf.AddPage()
	if leftLabel != "" {
		pdf.SetFont(fontName, "B", 10)
		pdf.SetXY(margin, 5)
		pdf.Cell(cellW, 5, leftLabel)
	}
	pdf.SetFont(fontName, "", 12)
	pdf.SetXY(margin, margin)
	pdf.MultiCell(cellW, 5, tr(leftText), "", "L", false)

	// Right page
	pdf.AddPage()
	if rightLabel != "" {
		pdf.SetFont(fontName, "B", 10)
		pdf.SetXY(margin, 5)
		pdf.Cell(cellW, 5, rightLabel)
	}
	pdf.SetFont(fontName, "", 12)
	pdf.SetXY(margin, margin)
	pdf.MultiCell(cellW, 5, tr(rightText), "", "L", false)

	return pdf.OutputFileAndClose(outputPath)
}

// pageLabelFromFilenameSingle extracts a page label from a single-page filename
func pageLabelFromFilenameSingle(basename string) string {
	if m := filePatternSingleRoman.FindStringSubmatch(basename); m != nil {
		return "Page " + m[1]
	}
	if m := filePatternSingleArabic.FindStringSubmatch(basename); m != nil {
		p := strings.TrimLeft(m[1], "0")
		if p == "" {
			p = "0"
		}
		return "Page " + p
	}
	return ""
}

// generateSinglePagePDF creates a 1-page PDF with a page number header
func generateSinglePagePDF(outputPath, text, label, fontPath string) error {
	pdf := fpdf.New("P", "mm", "A4", "")
	pdf.SetAutoPageBreak(false, 0)

	fontName, tr := setupPDFFont(pdf, fontPath)

	margin := 15.0
	cellW := 210.0 - margin*2

	pdf.AddPage()
	if label != "" {
		pdf.SetFont(fontName, "B", 10)
		pdf.SetXY(margin, 5)
		pdf.Cell(cellW, 5, label)
	}
	pdf.SetFont(fontName, "", 12)
	pdf.SetXY(margin, margin)
	pdf.MultiCell(cellW, 5, tr(text), "", "L", false)

	return pdf.OutputFileAndClose(outputPath)
}

func (a *App) mergePDFs(outputDir, mergeFilename string) {
	wailsRuntime.EventsEmit(a.ctx, "ocr:log", LogEntry{
		Message: "Merging all PDFs...",
	})

	pdfFiles, _ := filepath.Glob(filepath.Join(outputDir, "Page-*.pdf"))
	sort.Strings(pdfFiles)

	if len(pdfFiles) == 0 {
		wailsRuntime.EventsEmit(a.ctx, "ocr:log", LogEntry{
			Message: "No PDF files to merge",
			IsError: true,
		})
		return
	}

	if mergeFilename == "" {
		mergeFilename = "Merge.pdf"
	}

	mergedPath := filepath.Join(outputDir, mergeFilename)

	// Remove existing merged file if present
	os.Remove(mergedPath)

	if err := pdfcpuapi.MergeCreateFile(pdfFiles, mergedPath, false, nil); err != nil {
		wailsRuntime.EventsEmit(a.ctx, "ocr:log", LogEntry{
			Message: fmt.Sprintf("Merge failed: %v", err),
			IsError: true,
		})
		return
	}

	wailsRuntime.EventsEmit(a.ctx, "ocr:log", LogEntry{
		Message: fmt.Sprintf("Merge complete! %d PDFs merged into: %s", len(pdfFiles), mergedPath),
	})
}
