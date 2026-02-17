@echo off
cd /d "%~dp0"
echo === Building frontend ===
cd frontend
call node build.js
cd ..
echo === Building ocr-tool.exe ===
go build -tags desktop,production -ldflags "-H windowsgui" -o ocr-tool.exe .
if %errorlevel% equ 0 (
    echo Build OK!
) else (
    echo Build FAILED!
)
pause
