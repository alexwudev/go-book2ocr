@echo off
cd /d "%~dp0"

echo === Building frontend ===
cd frontend
call node build.js
cd ..

echo === Embedding icon resource ===
where go-winres >nul 2>nul
if %errorlevel% equ 0 (
    go-winres make --in platform\windows\winres.json --product-version 1.0.0.0 --file-version 1.0.0.0
) else (
    echo go-winres not found, skipping icon embed
)

echo === Building go-book2ocr.exe ===
go build -tags desktop,production -ldflags "-s -w -H windowsgui" -o platform\windows\go-book2ocr.exe .

if %errorlevel% equ 0 (
    del /q rsrc_windows_amd64.syso >nul 2>nul
    echo Build OK! -^> platform\windows\go-book2ocr.exe
) else (
    echo Build FAILED!
)
pause
