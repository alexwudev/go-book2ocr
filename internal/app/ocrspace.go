package app

import (
	"bytes"
	"encoding/json"
	"fmt"
	"image"
	"image/jpeg"
	_ "image/png"
	"io"
	"math"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/nfnt/resize"
)

// OCR.space file size limits per plan (with ~5% safety margin)
const (
	ocrSpaceFreeMaxBytes = 950 * 1024         // ~950 KB (free plan limit: 1 MB)
	ocrSpaceProMaxBytes  = 4800 * 1024        // ~4.7 MB (pro plan limit: 5 MB)
)

// ocrSpaceLangMap maps internal language codes to OCR.space language codes
var ocrSpaceLangMap = map[string]string{
	"en":    "eng",
	"ja":    "jpn",
	"zh-TW": "cht",
	"zh-CN": "chs",
	"ru":    "rus",
	"de":    "ger",
	"it":    "ita",
	"es":    "spa",
	"fr":    "fre",
	"nl":    "dut",
	"fa":    "ara",
	"vi":    "vie",
	"pl":    "pol",
	"pt":    "por",
}

// ocrSpaceResponse represents the JSON response from OCR.space API
type ocrSpaceResponse struct {
	ParsedResults []struct {
		ParsedText string `json:"ParsedText"`
	} `json:"ParsedResults"`
	IsErroredOnProcessing bool     `json:"IsErroredOnProcessing"`
	ErrorMessage          []string `json:"ErrorMessage"`
	OCRExitCode           int      `json:"OCRExitCode"`
}

// callOcrSpace sends an image to OCR.space API and returns the extracted text
func (a *App) callOcrSpace(filePath string, settings OCRSettings) (string, error) {
	imgData, err := os.ReadFile(filePath)
	if err != nil {
		return "", fmt.Errorf("read: %w", err)
	}

	// Shrink image if it exceeds the plan's file size limit
	maxBytes := ocrSpaceFreeMaxBytes
	if settings.OcrSpacePlan == "pro" {
		maxBytes = ocrSpaceProMaxBytes
	}
	if len(imgData) > maxBytes {
		imgData, err = shrinkImageToFit(imgData, maxBytes)
		if err != nil {
			return "", fmt.Errorf("shrink image: %w", err)
		}
	}

	// Build multipart form
	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)

	// Add image file
	part, err := writer.CreateFormFile("file", filepath.Base(filePath))
	if err != nil {
		return "", fmt.Errorf("create form: %w", err)
	}
	if _, err := part.Write(imgData); err != nil {
		return "", fmt.Errorf("write form: %w", err)
	}

	// Map language code
	lang := "eng"
	if len(settings.Languages) > 0 {
		if mapped, ok := ocrSpaceLangMap[settings.Languages[0]]; ok {
			lang = mapped
		}
	}
	writer.WriteField("language", lang)

	// Engine selection
	engine := settings.OcrSpaceEngine
	if engine < 1 || engine > 3 {
		engine = 1
	}
	writer.WriteField("OCREngine", strconv.Itoa(engine))

	writer.WriteField("scale", "true")
	writer.WriteField("isTable", "true")

	writer.Close()

	// Create HTTP request
	req, err := http.NewRequestWithContext(a.ctx, "POST", "https://api.ocr.space/parse/image", &buf)
	if err != nil {
		return "", fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.Header.Set("apikey", settings.OcrSpaceApiKey)

	// Send request
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("HTTP: %w", err)
	}
	defer resp.Body.Close()

	// Record API call as soon as a response is received, regardless of
	// success or failure — OCR.space counts the call against the quota either way.
	a.RecordApiCall("ocrspace", settings.OcrSpacePlan)

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(body))
	}

	// Parse response
	var result ocrSpaceResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return "", fmt.Errorf("parse response: %w", err)
	}

	if result.IsErroredOnProcessing {
		return "", fmt.Errorf("OCR.space error: %s", strings.Join(result.ErrorMessage, "; "))
	}

	if len(result.ParsedResults) == 0 {
		return "", nil
	}

	return result.ParsedResults[0].ParsedText, nil
}

// shrinkImageToFit decodes an image, progressively scales it down (maintaining
// aspect ratio) and re-encodes as JPEG until the result fits within maxBytes.
func shrinkImageToFit(data []byte, maxBytes int) ([]byte, error) {
	img, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return nil, err
	}

	origW := float64(img.Bounds().Dx())
	quality := 85

	// Initial scale estimate based on file-size ratio, with safety margin
	scale := math.Sqrt(float64(maxBytes)/float64(len(data))) * 0.9

	for attempt := 0; attempt < 6; attempt++ {
		newW := uint(origW * scale)
		if newW < 200 {
			newW = 200
		}

		resized := resize.Resize(newW, 0, img, resize.Lanczos3)

		var buf bytes.Buffer
		if err := jpeg.Encode(&buf, resized, &jpeg.Options{Quality: quality}); err != nil {
			return nil, err
		}

		if buf.Len() <= maxBytes {
			return buf.Bytes(), nil
		}

		// Reduce further for next attempt
		scale *= 0.75
		if quality > 50 {
			quality -= 5
		}
	}

	// Last resort: very small
	resized := resize.Resize(400, 0, img, resize.Lanczos3)
	var buf bytes.Buffer
	jpeg.Encode(&buf, resized, &jpeg.Options{Quality: 50})
	return buf.Bytes(), nil
}
