package main

import (
	"embed"
	"log"

	"book2ocr/internal/app"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	a := app.NewApp()

	err := wails.Run(&options.App{
		Title:     "OCR Tool",
		Width:     960,
		Height:    680,
		MinWidth:  800,
		MinHeight: 500,
		Frameless: true,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 26, G: 26, B: 46, A: 1},
		OnStartup:        a.Startup,
		Bind: []interface{}{
			a,
		},
	})

	if err != nil {
		log.Fatal(err)
	}
}
