package main

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// LoadImagesFromFolder scans a directory and returns sorted ImageInfo list
func (a *App) LoadImagesFromFolder(dir string) ([]ImageInfo, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, fmt.Errorf("read dir: %w", err)
	}

	imageExts := map[string]bool{
		".jpg": true, ".jpeg": true, ".png": true,
		".tif": true, ".tiff": true, ".bmp": true,
	}

	var images []ImageInfo
	idx := 0
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		ext := strings.ToLower(filepath.Ext(e.Name()))
		if !imageExts[ext] {
			continue
		}
		images = append(images, ImageInfo{
			OriginalPath: filepath.Join(dir, e.Name()),
			OriginalName: e.Name(),
			Index:        idx,
			PageType:     "Normal",
			IsRoman:      false,
		})
		idx++
	}

	sort.Slice(images, func(i, j int) bool {
		return images[i].OriginalName < images[j].OriginalName
	})

	for i := range images {
		images[i].Index = i
	}

	return images, nil
}

// ComputeRenamePreview computes the rename mapping based on page types and numbering
func (a *App) ComputeRenamePreview(images []ImageInfo, arabicStartIdx int, romanStart int, arabicStart int) []RenamePreview {
	var previews []RenamePreview

	currentPage := romanStart
	isRoman := true
	typeBCount := 0 // counter for consecutive TypeB suffix
	lastValidPage := 0

	if arabicStartIdx <= 0 {
		// All arabic, no roman section
		isRoman = false
		currentPage = arabicStart
	}

	for i, img := range images {
		// Check if we switch to Arabic at this index
		if arabicStartIdx > 0 && i == arabicStartIdx {
			isRoman = false
			currentPage = arabicStart
			typeBCount = 0
		}

		// Apply left page override if set
		if img.LeftPageOverride > 0 {
			currentPage = img.LeftPageOverride
			typeBCount = 0
		}

		ext := strings.ToLower(filepath.Ext(img.OriginalName))
		if ext == "" {
			ext = ".JPG"
		} else {
			ext = strings.ToUpper(ext)
		}

		var preview RenamePreview
		preview.OriginalName = img.OriginalName
		preview.PageType = img.PageType

		switch img.PageType {
		case "Skip":
			// Don't rename, don't consume page numbers
			preview.LeftPage = "[skip]"
			preview.RightPage = ""
			preview.NewName = img.OriginalName

		case "Normal":
			typeBCount = 0
			leftPage := currentPage
			rightPage := currentPage + 1
			lastValidPage = rightPage

			if isRoman {
				preview.LeftPage = toRoman(leftPage)
				preview.RightPage = toRoman(rightPage)
				preview.NewName = fmt.Sprintf("Page-r-%s-%s%s", toRoman(leftPage), toRoman(rightPage), ext)
			} else {
				preview.LeftPage = fmt.Sprintf("%d", leftPage)
				preview.RightPage = fmt.Sprintf("%d", rightPage)
				preview.NewName = fmt.Sprintf("Page-%03d-%03d%s", leftPage, rightPage, ext)
			}
			currentPage += 2

		case "TypeA":
			// Left page has page number, right page is image (no page number)
			typeBCount = 0
			leftPage := currentPage
			lastValidPage = leftPage

			if isRoman {
				preview.LeftPage = toRoman(leftPage)
				preview.RightPage = "[img]"
				preview.NewName = fmt.Sprintf("Page-r-%s-%s%s", toRoman(leftPage), toRoman(leftPage+1), ext)
			} else {
				preview.LeftPage = fmt.Sprintf("%d", leftPage)
				preview.RightPage = "[img]"
				preview.NewName = fmt.Sprintf("Page-%03d-%03d%s", leftPage, leftPage+1, ext)
			}
			currentPage += 1 // only left page counted

		case "TypeB":
			// Both pages are images, no page numbers
			suffix := string(rune('a' + typeBCount))
			typeBCount++

			if isRoman {
				preview.LeftPage = "[img]"
				preview.RightPage = "[img]"
				preview.NewName = fmt.Sprintf("Page-r-%s-%s-%s%s", toRoman(lastValidPage), toRoman(lastValidPage+1), suffix, ext)
			} else {
				preview.LeftPage = "[img]"
				preview.RightPage = "[img]"
				preview.NewName = fmt.Sprintf("Page-%03d-%03d-%s%s", lastValidPage, lastValidPage+1, suffix, ext)
			}
			// currentPage unchanged — no pages counted

		case "TypeC":
			// Left page is image (no page number), right page has page number
			typeBCount = 0
			rightPage := currentPage
			lastValidPage = rightPage

			if isRoman {
				preview.LeftPage = "[img]"
				preview.RightPage = toRoman(rightPage)
				preview.NewName = fmt.Sprintf("Page-r-%s-%s%s", toRoman(rightPage-1), toRoman(rightPage), ext)
			} else {
				preview.LeftPage = "[img]"
				preview.RightPage = fmt.Sprintf("%d", rightPage)
				preview.NewName = fmt.Sprintf("Page-%03d-%03d%s", rightPage-1, rightPage, ext)
			}
			currentPage += 1 // only right page counted
		}

		previews = append(previews, preview)
	}

	return previews
}

// ComputeRenamePreviewSingle computes rename mapping for single-page scanning mode
func (a *App) ComputeRenamePreviewSingle(images []ImageInfo, arabicStartIdx int, romanStart int, arabicStart int) []RenamePreview {
	var previews []RenamePreview

	currentPage := romanStart
	isRoman := true
	typeBCount := 0
	lastValidPage := 0

	if arabicStartIdx <= 0 {
		isRoman = false
		currentPage = arabicStart
	}

	for i, img := range images {
		if arabicStartIdx > 0 && i == arabicStartIdx {
			isRoman = false
			currentPage = arabicStart
			typeBCount = 0
		}

		if img.LeftPageOverride > 0 {
			currentPage = img.LeftPageOverride
			typeBCount = 0
		}

		ext := strings.ToLower(filepath.Ext(img.OriginalName))
		if ext == "" {
			ext = ".JPG"
		} else {
			ext = strings.ToUpper(ext)
		}

		var preview RenamePreview
		preview.OriginalName = img.OriginalName
		preview.PageType = img.PageType

		switch img.PageType {
		case "Skip":
			// Don't rename, don't consume page numbers
			preview.LeftPage = "[skip]"
			preview.RightPage = ""
			preview.NewName = img.OriginalName

		case "Normal":
			typeBCount = 0
			page := currentPage
			lastValidPage = page

			if isRoman {
				preview.LeftPage = toRoman(page)
				preview.RightPage = ""
				preview.NewName = fmt.Sprintf("Page-r-%s%s", toRoman(page), ext)
			} else {
				preview.LeftPage = fmt.Sprintf("%d", page)
				preview.RightPage = ""
				preview.NewName = fmt.Sprintf("Page-%03d%s", page, ext)
			}
			currentPage++

		case "TypeB":
			// Image page without page number
			suffix := string(rune('a' + typeBCount))
			typeBCount++

			if isRoman {
				preview.LeftPage = "[img]"
				preview.RightPage = ""
				preview.NewName = fmt.Sprintf("Page-r-%s-%s%s", toRoman(lastValidPage), suffix, ext)
			} else {
				preview.LeftPage = "[img]"
				preview.RightPage = ""
				preview.NewName = fmt.Sprintf("Page-%03d-%s%s", lastValidPage, suffix, ext)
			}
			// currentPage unchanged

		default:
			// TypeA/TypeC not applicable in single-page mode, treat as Normal
			typeBCount = 0
			page := currentPage
			lastValidPage = page

			if isRoman {
				preview.LeftPage = toRoman(page)
				preview.RightPage = ""
				preview.NewName = fmt.Sprintf("Page-r-%s%s", toRoman(page), ext)
			} else {
				preview.LeftPage = fmt.Sprintf("%d", page)
				preview.RightPage = ""
				preview.NewName = fmt.Sprintf("Page-%03d%s", page, ext)
			}
			currentPage++
		}

		previews = append(previews, preview)
	}

	return previews
}

// ExecuteRename renames files on disk according to the preview
func (a *App) ExecuteRename(dir string, previews []RenamePreview) error {
	// First pass: rename all to temp names to avoid collisions
	type renameOp struct {
		from string
		temp string
		to   string
	}

	var ops []renameOp
	for i, p := range previews {
		if p.OriginalName == p.NewName {
			continue
		}
		ops = append(ops, renameOp{
			from: filepath.Join(dir, p.OriginalName),
			temp: filepath.Join(dir, fmt.Sprintf("__temp_rename_%04d__", i)),
			to:   filepath.Join(dir, p.NewName),
		})
	}

	// Rename to temp names
	for _, op := range ops {
		if err := os.Rename(op.from, op.temp); err != nil {
			return fmt.Errorf("rename %s -> temp: %w", op.from, err)
		}
	}

	// Rename from temp to final names
	for _, op := range ops {
		if err := os.Rename(op.temp, op.to); err != nil {
			return fmt.Errorf("rename temp -> %s: %w", op.to, err)
		}
	}

	return nil
}

// toRoman converts an integer to lowercase Roman numeral string
func toRoman(n int) string {
	if n <= 0 {
		return "0"
	}

	values := []int{1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1}
	symbols := []string{"m", "cm", "d", "cd", "c", "xc", "l", "xl", "x", "ix", "v", "iv", "i"}

	var result strings.Builder
	for i, val := range values {
		for n >= val {
			result.WriteString(symbols[i])
			n -= val
		}
	}
	return result.String()
}

// fromRoman converts a lowercase Roman numeral string to int
func fromRoman(s string) int {
	romanMap := map[byte]int{
		'i': 1, 'v': 5, 'x': 10, 'l': 50,
		'c': 100, 'd': 500, 'm': 1000,
	}

	s = strings.ToLower(s)
	result := 0
	for i := 0; i < len(s); i++ {
		val := romanMap[s[i]]
		if i+1 < len(s) && romanMap[s[i+1]] > val {
			result -= val
		} else {
			result += val
		}
	}
	return result
}
