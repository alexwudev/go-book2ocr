package app

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

	images := make([]ImageInfo, 0)
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

// ComputeRenamePreview computes the rename mapping for dual-page scanning mode.
// bodyStartIdx: image index where body pages begin (0 = all body, no pre-body).
// bodyStart: first page number for body section.
// Pre-body pages use "Page-XXX-{num}" format; body pages use "Page-{num}" format.
func (a *App) ComputeRenamePreview(images []ImageInfo, bodyStartIdx int, bodyStart int) []RenamePreview {
	var previews []RenamePreview

	isPreBody := bodyStartIdx > 0
	currentPage := 1
	if !isPreBody {
		currentPage = bodyStart
	}

	noIncCount := 0
	typeBCount := 0
	lastValidPage := 0

	for i, img := range images {
		if isPreBody && i == bodyStartIdx {
			isPreBody = false
			currentPage = bodyStart
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

		prefix := ""
		if isPreBody {
			prefix = "XXX-"
		}

		var preview RenamePreview
		preview.OriginalName = img.OriginalName
		preview.PageType = img.PageType

		switch img.PageType {
		case "Skip":
			preview.LeftPage = "[skip]"
			preview.RightPage = ""
			preview.NewName = img.OriginalName

		case "NoIncluding":
			noIncCount++
			preview.LeftPage = "[—]"
			preview.RightPage = ""
			preview.NewName = fmt.Sprintf("NoIncluding-%03d%s", noIncCount, ext)

		case "Normal":
			typeBCount = 0
			leftPage := currentPage
			rightPage := currentPage + 1
			lastValidPage = rightPage
			preview.LeftPage = fmt.Sprintf("%d", leftPage)
			preview.RightPage = fmt.Sprintf("%d", rightPage)
			preview.NewName = fmt.Sprintf("Page-%s%03d-%03d%s", prefix, leftPage, rightPage, ext)
			currentPage += 2

		case "TypeA":
			typeBCount = 0
			leftPage := currentPage
			lastValidPage = leftPage
			preview.LeftPage = fmt.Sprintf("%d", leftPage)
			preview.RightPage = "[img]"
			preview.NewName = fmt.Sprintf("Page-%s%03d-%03d%s", prefix, leftPage, leftPage+1, ext)
			currentPage += 1

		case "TypeB":
			suffix := string(rune('a' + typeBCount))
			typeBCount++
			preview.LeftPage = "[img]"
			preview.RightPage = "[img]"
			preview.NewName = fmt.Sprintf("Page-%s%03d-%03d-%s%s", prefix, lastValidPage, lastValidPage+1, suffix, ext)

		case "TypeC":
			typeBCount = 0
			rightPage := currentPage
			lastValidPage = rightPage
			preview.LeftPage = "[img]"
			preview.RightPage = fmt.Sprintf("%d", rightPage)
			preview.NewName = fmt.Sprintf("Page-%s%03d-%03d%s", prefix, rightPage-1, rightPage, ext)
			currentPage += 1
		}

		previews = append(previews, preview)
	}

	return previews
}

// ComputeRenamePreviewSingle computes rename mapping for single-page scanning mode.
func (a *App) ComputeRenamePreviewSingle(images []ImageInfo, bodyStartIdx int, bodyStart int) []RenamePreview {
	var previews []RenamePreview

	isPreBody := bodyStartIdx > 0
	currentPage := 1
	if !isPreBody {
		currentPage = bodyStart
	}

	noIncCount := 0
	typeBCount := 0
	lastValidPage := 0

	for i, img := range images {
		if isPreBody && i == bodyStartIdx {
			isPreBody = false
			currentPage = bodyStart
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

		prefix := ""
		if isPreBody {
			prefix = "XXX-"
		}

		var preview RenamePreview
		preview.OriginalName = img.OriginalName
		preview.PageType = img.PageType

		switch img.PageType {
		case "Skip":
			preview.LeftPage = "[skip]"
			preview.RightPage = ""
			preview.NewName = img.OriginalName

		case "NoIncluding":
			noIncCount++
			preview.LeftPage = "[—]"
			preview.RightPage = ""
			preview.NewName = fmt.Sprintf("NoIncluding-%03d%s", noIncCount, ext)

		case "Normal":
			typeBCount = 0
			page := currentPage
			lastValidPage = page
			preview.LeftPage = fmt.Sprintf("%d", page)
			preview.RightPage = ""
			preview.NewName = fmt.Sprintf("Page-%s%03d%s", prefix, page, ext)
			currentPage++

		case "TypeB":
			suffix := string(rune('a' + typeBCount))
			typeBCount++
			preview.LeftPage = "[img]"
			preview.RightPage = ""
			preview.NewName = fmt.Sprintf("Page-%s%03d-%s%s", prefix, lastValidPage, suffix, ext)

		default:
			// TypeA, TypeC treated as Normal in single-page mode
			typeBCount = 0
			page := currentPage
			lastValidPage = page
			preview.LeftPage = fmt.Sprintf("%d", page)
			preview.RightPage = ""
			preview.NewName = fmt.Sprintf("Page-%s%03d%s", prefix, page, ext)
			currentPage++
		}

		previews = append(previews, preview)
	}

	return previews
}

// ExecuteRename renames files on disk according to the preview.
// Uses direct rename when safe; falls back to two-phase (via temp names) only
// when name conflicts exist. Includes pre-validation and rollback on failure.
func (a *App) ExecuteRename(dir string, previews []RenamePreview) error {
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
			temp: filepath.Join(dir, fmt.Sprintf("__temp_%04d__", i)),
			to:   filepath.Join(dir, p.NewName),
		})
	}

	if len(ops) == 0 {
		return nil
	}

	// Pre-check: verify every source file is accessible on disk
	for _, op := range ops {
		if _, err := os.Stat(op.from); err != nil {
			return fmt.Errorf("cannot access %s: %w", filepath.Base(op.from), err)
		}
	}

	// Determine whether two-phase rename is needed.
	// It's only required when a target name collides with an existing file
	// that isn't the same source (e.g. Page-003.JPG → Page-005.JPG while
	// another file is already named Page-005.JPG).
	existing := make(map[string]bool)
	entries, _ := os.ReadDir(dir)
	for _, e := range entries {
		existing[strings.ToLower(e.Name())] = true
	}

	needTwoPhase := false
	for _, op := range ops {
		toBase := strings.ToLower(filepath.Base(op.to))
		fromBase := strings.ToLower(filepath.Base(op.from))
		if toBase != fromBase && existing[toBase] {
			needTwoPhase = true
			break
		}
	}

	if !needTwoPhase {
		// Direct rename — no conflicts, no temp files needed
		var done []renameOp
		for _, op := range ops {
			if err := os.Rename(op.from, op.to); err != nil {
				// Rollback successful renames
				for j := len(done) - 1; j >= 0; j-- {
					os.Rename(done[j].to, done[j].from)
				}
				return fmt.Errorf("rename %s → %s: %w",
					filepath.Base(op.from), filepath.Base(op.to), err)
			}
			done = append(done, op)
		}
		return nil
	}

	// Two-phase rename with full rollback support
	// Phase 1: source → temp
	var phase1Done []renameOp
	for _, op := range ops {
		if err := os.Rename(op.from, op.temp); err != nil {
			// Rollback phase 1
			for j := len(phase1Done) - 1; j >= 0; j-- {
				os.Rename(phase1Done[j].temp, phase1Done[j].from)
			}
			return fmt.Errorf("rename %s → temp: %w", filepath.Base(op.from), err)
		}
		phase1Done = append(phase1Done, op)
	}

	// Phase 2: temp → target
	for i, op := range ops {
		if err := os.Rename(op.temp, op.to); err != nil {
			// Rollback phase 2 (undo completed phase-2 renames)
			for j := i - 1; j >= 0; j-- {
				os.Rename(ops[j].to, ops[j].temp)
			}
			// Rollback phase 1 (restore all originals)
			for j := len(phase1Done) - 1; j >= 0; j-- {
				os.Rename(phase1Done[j].temp, phase1Done[j].from)
			}
			return fmt.Errorf("rename temp → %s: %w", filepath.Base(op.to), err)
		}
	}

	return nil
}

