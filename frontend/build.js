// Simple build script: copy src/ to dist/
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const distDir = path.join(__dirname, 'dist');

function copyDir(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

// Clean dist
if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true });
}

// Copy index.html to dist
fs.mkdirSync(distDir, { recursive: true });
fs.copyFileSync(path.join(__dirname, 'index.html'), path.join(distDir, 'index.html'));

// Copy src/ to dist/src/
copyDir(srcDir, path.join(distDir, 'src'));

// Copy wailsjs/ to dist/wailsjs/
const wailsjsDir = path.join(__dirname, 'wailsjs');
if (fs.existsSync(wailsjsDir)) {
    copyDir(wailsjsDir, path.join(distDir, 'wailsjs'));
}

console.log('Build complete: frontend/dist/');
