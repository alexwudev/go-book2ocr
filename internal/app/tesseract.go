package app

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

// tesseractLangMap maps internal language codes to Tesseract language codes
var tesseractLangMap = map[string]string{
	"en":    "eng",
	"ja":    "jpn",
	"zh-TW": "chi_tra",
	"zh-CN": "chi_sim",
	"ru":    "rus",
	"de":    "deu",
	"it":    "ita",
	"es":    "spa",
	"fr":    "fra",
	"nl":    "nld",
	"fa":    "fas",
	"vi":    "vie",
	"pl":    "pol",
	"pt":    "por",
}

// callTesseract runs tesseract.exe as a subprocess and returns extracted text
func (a *App) callTesseract(filePath string, settings OCRSettings) (string, error) {
	tesseractPath := settings.TesseractPath
	if tesseractPath == "" {
		return "", fmt.Errorf("tesseract path not configured")
	}

	// Build language argument
	var langParts []string
	for _, lang := range settings.Languages {
		if mapped, ok := tesseractLangMap[lang]; ok {
			langParts = append(langParts, mapped)
		}
	}
	if len(langParts) == 0 {
		langParts = []string{"eng"}
	}
	langArg := strings.Join(langParts, "+")

	// Build command: tesseract <image> stdout -l <lang>
	ctx, cancel := context.WithTimeout(a.ctx, 120*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, tesseractPath, filePath, "stdout", "-l", langArg)
	hideCommandWindow(cmd)
	output, err := cmd.Output()
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			return "", fmt.Errorf("tesseract: %s", string(exitErr.Stderr))
		}
		return "", fmt.Errorf("tesseract: %w", err)
	}

	a.RecordApiCall("tesseract", "local")

	return strings.TrimSpace(string(output)), nil
}

// DetectTesseract tries to auto-detect the tesseract.exe path.
// It first checks for a bundled version next to the executable,
// then looks in the system PATH.
func (a *App) DetectTesseract() string {
	// Check bundled: exe_dir/tesseract/tesseract.exe
	bundled := filepath.Join(a.exeDir(), "tesseract", "tesseract.exe")
	if _, err := os.Stat(bundled); err == nil {
		return bundled
	}

	// Check system PATH
	if path, err := exec.LookPath("tesseract"); err == nil {
		return path
	}

	return ""
}
