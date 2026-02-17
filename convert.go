package main

import (
	"context"
	"fmt"
	"image"
	"image/jpeg"
	"image/png"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strings"

	_ "image/gif"

	"github.com/nfnt/resize"
	"github.com/rwcarlsen/goexif/exif"
	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// imageExts shared set of supported image extensions
var imageExts = map[string]bool{
	".jpg": true, ".jpeg": true, ".png": true,
	".tif": true, ".tiff": true, ".bmp": true,
}

// GetImageMetadataList scans a directory and returns metadata without decoding pixels
func (a *App) GetImageMetadataList(dir string) ([]ImageMetadata, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, fmt.Errorf("read dir: %w", err)
	}

	var results []ImageMetadata
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		ext := strings.ToLower(filepath.Ext(e.Name()))
		if !imageExts[ext] {
			continue
		}

		fullPath := filepath.Join(dir, e.Name())
		info, err := e.Info()
		if err != nil {
			continue
		}

		w, h := getImageDimensions(fullPath)

		results = append(results, ImageMetadata{
			Path:     fullPath,
			Name:     e.Name(),
			Width:    w,
			Height:   h,
			FileSize: info.Size(),
		})
	}

	sort.Slice(results, func(i, j int) bool {
		return results[i].Name < results[j].Name
	})

	return results, nil
}

// getImageDimensions reads image header only (no full decode)
func getImageDimensions(path string) (int, int) {
	f, err := os.Open(path)
	if err != nil {
		return 0, 0
	}
	defer f.Close()

	cfg, _, err := image.DecodeConfig(f)
	if err != nil {
		return 0, 0
	}
	return cfg.Width, cfg.Height
}

// StartConvert begins resizing images in the given directory
func (a *App) StartConvert(dir string, percent int) string {
	a.mu.Lock()
	if a.convertRunning {
		a.mu.Unlock()
		return "轉檔進行中"
	}
	a.convertRunning = true
	a.mu.Unlock()

	ctx, cancel := context.WithCancel(a.ctx)
	a.cancelConvert = cancel

	go func() {
		defer func() {
			a.mu.Lock()
			a.convertRunning = false
			a.cancelConvert = nil
			a.mu.Unlock()
			wailsRuntime.EventsEmit(a.ctx, "convert:finished", nil)
		}()
		a.runConvert(ctx, dir, percent)
	}()

	return ""
}

// StopConvert cancels the running conversion
func (a *App) StopConvert() {
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.cancelConvert != nil {
		a.cancelConvert()
	}
}

func (a *App) runConvert(ctx context.Context, dir string, percent int) {
	emitLog := func(msg string, isError bool) {
		wailsRuntime.EventsEmit(a.ctx, "convert:log", LogEntry{
			Message: msg,
			IsError: isError,
		})
	}

	emitProgress := func(current, total int) {
		wailsRuntime.EventsEmit(a.ctx, "convert:progress", ProgressUpdate{
			Current: current,
			Total:   total,
			Percent: float64(current) / float64(total),
		})
	}

	if percent < 1 || percent > 99 {
		emitLog("百分比必須在 1-99 之間", true)
		return
	}

	entries, err := os.ReadDir(dir)
	if err != nil {
		emitLog(fmt.Sprintf("讀取目錄失敗: %v", err), true)
		return
	}

	var files []string
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		ext := strings.ToLower(filepath.Ext(e.Name()))
		if imageExts[ext] {
			files = append(files, filepath.Join(dir, e.Name()))
		}
	}
	sort.Strings(files)

	if len(files) == 0 {
		emitLog("目錄中沒有圖片檔案", true)
		return
	}

	total := len(files)
	emitLog(fmt.Sprintf("開始轉檔 %d 張圖片，縮小至 %d%%", total, percent), false)

	for i, fp := range files {
		select {
		case <-ctx.Done():
			emitLog("轉檔已停止", false)
			return
		default:
		}

		baseName := filepath.Base(fp)
		err := resizeOneImage(fp, percent)
		if err != nil {
			emitLog(fmt.Sprintf("[%s] 錯誤: %v", baseName, err), true)
		} else {
			emitLog(fmt.Sprintf("[%s] OK", baseName), false)
		}
		emitProgress(i+1, total)
	}

	emitLog(fmt.Sprintf("轉檔完成！共處理 %d 張圖片", total), false)
}

func resizeOneImage(filePath string, percent int) error {
	f, err := os.Open(filePath)
	if err != nil {
		return fmt.Errorf("open: %w", err)
	}

	// Read EXIF orientation
	orientation := 1
	if ex, err := exif.Decode(f); err == nil {
		if tag, err := ex.Get(exif.Orientation); err == nil {
			if v, err := tag.Int(0); err == nil {
				orientation = v
			}
		}
	}
	f.Seek(0, io.SeekStart)

	img, format, err := image.Decode(f)
	f.Close()
	if err != nil {
		return fmt.Errorf("decode: %w", err)
	}

	// Apply EXIF orientation
	img = applyOrientation(img, orientation)

	bounds := img.Bounds()
	newW := uint(bounds.Dx() * percent / 100)
	newH := uint(bounds.Dy() * percent / 100)
	if newW < 1 {
		newW = 1
	}
	if newH < 1 {
		newH = 1
	}

	resized := resize.Resize(newW, newH, img, resize.Lanczos3)
	img = nil // release original immediately

	// Write to temp file, then rename to overwrite
	tmpPath := filePath + ".tmp"
	out, err := os.Create(tmpPath)
	if err != nil {
		return fmt.Errorf("create tmp: %w", err)
	}

	switch strings.ToLower(format) {
	case "png":
		err = png.Encode(out, resized)
	default:
		err = jpeg.Encode(out, resized, &jpeg.Options{Quality: 92})
	}
	resized = nil // release resized image

	if closeErr := out.Close(); closeErr != nil && err == nil {
		err = closeErr
	}
	if err != nil {
		os.Remove(tmpPath)
		return fmt.Errorf("encode: %w", err)
	}

	return os.Rename(tmpPath, filePath)
}
