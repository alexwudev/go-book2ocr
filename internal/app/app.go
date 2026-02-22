package app

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"image"
	"image/jpeg"
	"image/png"
	"io"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"book2ocr/internal/taskbar"

	"github.com/nfnt/resize"
	"github.com/rwcarlsen/goexif/exif"
	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// App is the main application struct bound to Wails
type App struct {
	ctx            context.Context
	config         AppConfig
	session        *Session
	stats          UsageStats
	statsMu        sync.Mutex
	cancelOCR      context.CancelFunc
	cancelConvert  context.CancelFunc
	ocrRunning     bool
	convertRunning bool
	mu             sync.Mutex
	thumbSem       chan struct{} // limits concurrent thumbnail decoding
	onLog          func(entry LogEntry)
	onProgress     func(update ProgressUpdate)
	onFinished     func()
}

// NewApp creates a new App instance
func NewApp() *App {
	return &App{
		thumbSem: make(chan struct{}, 2),
	}
}

// Startup is called when the app starts
func (a *App) Startup(ctx context.Context) {
	a.ctx = ctx
	a.loadConfig()
	a.loadSession()
	a.loadStats()
	taskbar.Init()
}

// --- Path helpers ---

func (a *App) exeDir() string {
	exePath, err := os.Executable()
	if err != nil {
		return "."
	}
	return filepath.Dir(exePath)
}

func (a *App) configPath() string {
	return filepath.Join(a.exeDir(), "config.json")
}

func (a *App) sessionPath() string {
	return filepath.Join(a.exeDir(), "session.json")
}

// --- Config persistence ---

func (a *App) loadConfig() {
	data, err := os.ReadFile(a.configPath())
	if err != nil {
		a.config = AppConfig{
			Languages:     []string{"en"},
			Concurrency:   5,
			MergePDF:      true,
			MergeFilename: "Merge.pdf",
			Theme:         "dark",
			ScanMode:      "dual",
			UILang:        "zh-TW",
		}
		return
	}
	if err := json.Unmarshal(data, &a.config); err != nil {
		a.config = AppConfig{
			Languages:     []string{"en"},
			Concurrency:   5,
			MergePDF:      true,
			MergeFilename: "Merge.pdf",
			Theme:         "dark",
			ScanMode:      "dual",
			UILang:        "zh-TW",
		}
	}
}

// GetConfig returns the current config to the frontend
func (a *App) GetConfig() AppConfig {
	return a.config
}

// SaveConfig saves the config from the frontend
func (a *App) SaveConfig(cfg AppConfig) error {
	a.config = cfg
	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(a.configPath(), data, 0644)
}

// --- Session management ---

func (a *App) loadSession() {
	data, err := os.ReadFile(a.sessionPath())
	if err != nil {
		return
	}
	var s Session
	if err := json.Unmarshal(data, &s); err != nil {
		return
	}
	a.session = &s
}

// GetPendingSession returns the pending session if any
func (a *App) GetPendingSession() *Session {
	return a.session
}

// ClearSession removes the session file
func (a *App) ClearSession() {
	a.session = nil
	os.Remove(a.sessionPath())
}

func (a *App) saveSession(s *Session) {
	a.session = s
	data, err := json.MarshalIndent(s, "", "  ")
	if err != nil {
		return
	}
	os.WriteFile(a.sessionPath(), data, 0644)
}

// --- Native dialogs ---

// SelectDirectory opens a native directory picker that shows both files and
// folders. On Windows a custom IFileOpenDialog with FOS_PICKFOLDERS is used
// (bypassing Wails' built-in dialog which has issues on some systems).
// On other platforms the Wails OpenDirectoryDialog is used.
func (a *App) SelectDirectory(title string, defaultDir string) (string, error) {
	resolved := resolveDefaultDir(defaultDir)
	return a.selectDirectoryNative(title, resolved)
}

// resolveDefaultDir returns an existing directory for use as DefaultDirectory.
// It walks up parent directories if the given path doesn't exist,
// and falls back to the user's home directory.
func resolveDefaultDir(dir string) string {
	if dir == "" {
		home, err := os.UserHomeDir()
		if err != nil {
			return ""
		}
		return home
	}
	d := dir
	for d != "" && d != filepath.Dir(d) {
		if info, err := os.Stat(d); err == nil && info.IsDir() {
			return d
		}
		d = filepath.Dir(d)
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return ""
	}
	return home
}

// SelectFile opens a native file picker
func (a *App) SelectFile(title string, displayName string, pattern string) (string, error) {
	return wailsRuntime.OpenFileDialog(a.ctx, wailsRuntime.OpenDialogOptions{
		Title: title,
		Filters: []wailsRuntime.FileFilter{
			{DisplayName: displayName, Pattern: pattern},
		},
	})
}

// --- Thumbnail generation ---

// GetImageThumbnail returns a base64 data URL for a resized image
func (a *App) GetImageThumbnail(path string, maxSize int) (string, error) {
	a.thumbSem <- struct{}{}
	defer func() { <-a.thumbSem }()

	f, err := os.Open(path)
	if err != nil {
		return "", fmt.Errorf("open: %w", err)
	}
	defer f.Close()

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
	if err != nil {
		return "", fmt.Errorf("decode: %w", err)
	}

	img = applyOrientation(img, orientation)

	thumb := resize.Thumbnail(uint(maxSize), uint(maxSize), img, resize.Lanczos3)
	img = nil

	var buf bytes.Buffer
	switch strings.ToLower(format) {
	case "png":
		err = png.Encode(&buf, thumb)
	default:
		err = jpeg.Encode(&buf, thumb, &jpeg.Options{Quality: 80})
	}
	if err != nil {
		return "", fmt.Errorf("encode: %w", err)
	}

	mimeType := "image/jpeg"
	if strings.ToLower(format) == "png" {
		mimeType = "image/png"
	}

	b64 := base64.StdEncoding.EncodeToString(buf.Bytes())
	return fmt.Sprintf("data:%s;base64,%s", mimeType, b64), nil
}

// --- Image orientation helpers ---

func applyOrientation(img image.Image, orientation int) image.Image {
	switch orientation {
	case 1:
		return img
	case 2:
		return flipH(img)
	case 3:
		return rotate180(img)
	case 4:
		return flipV(img)
	case 5:
		return flipH(rotate90CW(img))
	case 6:
		return rotate90CW(img)
	case 7:
		return flipH(rotate90CCW(img))
	case 8:
		return rotate90CCW(img)
	default:
		return img
	}
}

func rotate90CW(img image.Image) image.Image {
	b := img.Bounds()
	dst := image.NewRGBA(image.Rect(0, 0, b.Dy(), b.Dx()))
	for x := b.Min.X; x < b.Max.X; x++ {
		for y := b.Min.Y; y < b.Max.Y; y++ {
			dst.Set(b.Max.Y-1-y, x, img.At(x, y))
		}
	}
	return dst
}

func rotate90CCW(img image.Image) image.Image {
	b := img.Bounds()
	dst := image.NewRGBA(image.Rect(0, 0, b.Dy(), b.Dx()))
	for x := b.Min.X; x < b.Max.X; x++ {
		for y := b.Min.Y; y < b.Max.Y; y++ {
			dst.Set(y, b.Max.X-1-x, img.At(x, y))
		}
	}
	return dst
}

func rotate180(img image.Image) image.Image {
	b := img.Bounds()
	dst := image.NewRGBA(image.Rect(0, 0, b.Dx(), b.Dy()))
	for x := b.Min.X; x < b.Max.X; x++ {
		for y := b.Min.Y; y < b.Max.Y; y++ {
			dst.Set(b.Max.X-1-x, b.Max.Y-1-y, img.At(x, y))
		}
	}
	return dst
}

func flipH(img image.Image) image.Image {
	b := img.Bounds()
	dst := image.NewRGBA(image.Rect(0, 0, b.Dx(), b.Dy()))
	for x := b.Min.X; x < b.Max.X; x++ {
		for y := b.Min.Y; y < b.Max.Y; y++ {
			dst.Set(b.Max.X-1-x, y, img.At(x, y))
		}
	}
	return dst
}

func flipV(img image.Image) image.Image {
	b := img.Bounds()
	dst := image.NewRGBA(image.Rect(0, 0, b.Dx(), b.Dy()))
	for x := b.Min.X; x < b.Max.X; x++ {
		for y := b.Min.Y; y < b.Max.Y; y++ {
			dst.Set(x, b.Max.Y-1-y, img.At(x, y))
		}
	}
	return dst
}

// --- Language options ---

// GetAvailableLanguages returns language options for the frontend
func (a *App) GetAvailableLanguages() []LangOption {
	return langOptions
}

// GetDefaultOutputDir returns the default output directory for a given image directory
func (a *App) GetDefaultOutputDir(imageDir string) string {
	return filepath.Join(a.exeDir(), "output", filepath.Base(imageDir))
}
