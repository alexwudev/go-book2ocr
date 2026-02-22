//go:build !windows

package app

import (
	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

func (a *App) selectDirectoryNative(title string, defaultDir string) (string, error) {
	return wailsRuntime.OpenDirectoryDialog(a.ctx, wailsRuntime.OpenDialogOptions{
		Title:            title,
		DefaultDirectory: defaultDir,
	})
}
