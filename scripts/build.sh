#!/bin/bash
# OCR Tool — Quickstart Build Script
# Usage: ./scripts/build.sh [windows|linux]
cd "$(dirname "$0")/.."

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

TARGET="$1"

if [ -z "$TARGET" ]; then
    echo ""
    echo "  OCR Tool Build Script"
    echo "  ====================="
    echo "  1) Windows (x64)"
    echo "  2) Linux   (x64)"
    echo ""
    read -p "  Select target platform [1/2]: " choice
    case $choice in
        1) TARGET=windows ;;
        2) TARGET=linux ;;
        *) echo "  Invalid choice"; exit 1 ;;
    esac
fi

echo ""
echo "=== Generating Wails bindings ==="
WINRES=""
if command -v wails &> /dev/null; then
    wails generate module
elif [ -f ~/go/bin/wails ]; then
    ~/go/bin/wails generate module
else
    echo "wails CLI not found, skipping binding generation"
fi

echo ""
echo "=== Building frontend ==="
cd frontend && node build.js && cd ..
if [ $? -ne 0 ]; then
    echo "Frontend build failed!"
    exit 1
fi

if [ "$TARGET" = "windows" ]; then
    echo ""
    echo "=== Embedding icon resource ==="
    if command -v go-winres &> /dev/null; then
        WINRES="go-winres"
    elif [ -f ~/go/bin/go-winres ]; then
        WINRES="${HOME}/go/bin/go-winres"
    fi

    if [ -n "$WINRES" ]; then
        $WINRES make --in platform/windows/winres.json \
            --product-version 1.0.0.0 --file-version 1.0.0.0
    else
        echo "go-winres not found, skipping icon embed"
    fi

    echo ""
    echo "=== Building Windows executable ==="
    CGO_ENABLED=0 GOOS=windows GOARCH=amd64 \
        go build -tags desktop,production -ldflags "-s -w -H windowsgui" -o book2ocr.exe .

    if [ $? -eq 0 ]; then
        rm -f rsrc_windows_*.syso
        echo ""
        echo "Build complete!"
        ls -lh book2ocr.exe
    else
        echo "Build FAILED!"
        exit 1
    fi

elif [ "$TARGET" = "linux" ]; then
    echo ""
    echo "=== Building Linux executable ==="
    CGO_ENABLED=1 GOOS=linux GOARCH=amd64 \
        go build -tags desktop,production -ldflags "-s -w" -o book2ocr .

    if [ $? -eq 0 ]; then
        echo ""
        echo "Build complete!"
        ls -lh book2ocr
    else
        echo "Build FAILED!"
        exit 1
    fi

else
    echo "Unknown target: $TARGET"
    exit 1
fi
