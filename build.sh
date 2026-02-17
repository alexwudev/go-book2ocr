#!/bin/bash
# Build script for WSL cross-compilation to Windows
cd "$(dirname "$0")"

# Load nvm for Node.js
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

echo "=== Generating Wails bindings ==="
~/go/bin/wails generate module

echo "=== Building frontend ==="
cd frontend && node build.js && cd ..

echo "=== Building Windows exe ==="
CGO_ENABLED=1 GOOS=windows GOARCH=amd64 CC=x86_64-w64-mingw32-gcc \
    go build -tags desktop,production -ldflags "-H windowsgui" -o ocr-tool.exe .

if [ $? -eq 0 ]; then
    echo "Build OK! -> ocr-tool.exe"
    ls -lh ocr-tool.exe
else
    echo "Build FAILED!"
    exit 1
fi
