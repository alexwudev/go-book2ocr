const MAX_LOG_LINES = 500;
let logLines = [];
let ocrImageDir = '';
let ocrOutputDir = '';
let ocrOutputManuallySet = false;

function showOCRError(msg) {
    // Show error as a log entry so it's visible and copyable
    appendLog({ message: msg, isError: true, filename: '' });
}

let App = null;
let Runtime = null;

async function getApp() {
    if (!App) {
        App = await import('../wailsjs/go/main/App.js');
    }
    return App;
}

async function getRuntime() {
    if (!Runtime) {
        Runtime = await import('../wailsjs/runtime/runtime.js');
    }
    return Runtime;
}

export async function initOCRTab(config) {
    // Wire up buttons
    document.getElementById('ocr-image-dir-btn').addEventListener('click', selectImageDir);
    document.getElementById('ocr-output-dir-btn').addEventListener('click', selectOutputDir);
    document.getElementById('ocr-cred-btn').addEventListener('click', selectCredFile);
    document.getElementById('start-ocr-btn').addEventListener('click', startOCR);
    document.getElementById('stop-ocr-btn').addEventListener('click', stopOCR);

    // Scan mode toggle: sync rename tab when OCR tab changes
    document.querySelectorAll('input[name="scan-mode-ocr"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const mode = getScanModeOCR();
            const renameRadio = document.querySelector(`input[name="scan-mode-rename"][value="${mode}"]`);
            if (renameRadio) renameRadio.checked = true;
        });
    });

    // Concurrency slider
    const slider = document.getElementById('concurrency-slider');
    slider.addEventListener('input', (e) => {
        document.getElementById('concurrency-value').textContent = e.target.value;
    });

    // Populate languages
    await populateLanguages(config.languages || ['en']);

    // Restore config values
    if (config.credFile) {
        document.getElementById('ocr-cred-label').textContent = config.credFile;
    }
    if (config.concurrency) {
        slider.value = config.concurrency;
        document.getElementById('concurrency-value').textContent = config.concurrency;
    }
    if (config.outputDir) {
        ocrOutputDir = config.outputDir;
    }
    if (config.mergeFilename) {
        document.getElementById('merge-filename').value = config.mergeFilename;
    }
    if (config.mergePdf !== undefined) {
        document.getElementById('merge-pdf-check').checked = config.mergePdf;
    }
    if (config.scanMode) {
        const radio = document.querySelector(`input[name="scan-mode-ocr"][value="${config.scanMode}"]`);
        if (radio) radio.checked = true;
        // Also sync rename tab radio
        const renameRadio = document.querySelector(`input[name="scan-mode-rename"][value="${config.scanMode}"]`);
        if (renameRadio) renameRadio.checked = true;
    }

    // Set up event listeners from Go
    setupOCREvents();
}

async function populateLanguages(selectedLangs) {
    try {
        const app = await getApp();
        const langs = await app.GetAvailableLanguages();
        const container = document.getElementById('lang-checkboxes');
        container.innerHTML = '';

        langs.forEach(lang => {
            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = lang.code;
            checkbox.checked = selectedLangs.includes(lang.code);

            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(' ' + lang.display));
            container.appendChild(label);
        });
    } catch (e) {
        console.error('Failed to load languages:', e);
    }
}

async function setupOCREvents() {
    try {
        const runtime = await getRuntime();

        runtime.EventsOn('ocr:progress', (data) => {
            updateProgressBar(data.percent, data.current, data.total);
        });

        runtime.EventsOn('ocr:log', (data) => {
            appendLog(data);
        });

        runtime.EventsOn('ocr:finished', () => {
            document.getElementById('start-ocr-btn').disabled = false;
            document.getElementById('stop-ocr-btn').disabled = true;
            appendLog({ message: '\u8655\u7406\u5B8C\u6210\uFF01', isError: false, filename: '' });

            // Hide top progress bar
            const topProgress = document.getElementById('top-progress');
            if (topProgress) topProgress.classList.add('hidden');
        });
    } catch (e) {
        console.error('Failed to setup events:', e);
    }
}

function updateProgressBar(percent, current, total) {
    const bar = document.getElementById('progress-bar');
    const text = document.getElementById('progress-text');
    const pct = Math.round(percent * 100);
    bar.style.width = pct + '%';
    text.textContent = `${current} / ${total} (${pct}%)`;

    // Update top progress bar
    const topBar = document.getElementById('top-progress-bar');
    const topText = document.getElementById('top-progress-text');
    const topProgress = document.getElementById('top-progress');
    if (topProgress) {
        topProgress.classList.remove('hidden');
        topBar.style.width = pct + '%';
        topText.textContent = `OCR ${pct}%  (${current} / ${total})`;
    }
}

function appendLog(entry) {
    const logArea = document.getElementById('log-area');
    const div = document.createElement('div');

    let prefix = '';
    if (entry.filename) {
        prefix = `[${entry.filename}] `;
    }

    div.className = 'log-line' + (entry.isError ? ' log-error' : '');
    div.textContent = prefix + entry.message;
    logArea.appendChild(div);

    // Truncate old log lines
    while (logArea.childNodes.length > MAX_LOG_LINES) {
        logArea.removeChild(logArea.firstChild);
    }

    // Auto-scroll to bottom
    logArea.scrollTop = logArea.scrollHeight;
}

async function selectImageDir() {
    try {
        const app = await getApp();
        const dir = await app.SelectDirectory('\u9078\u64C7\u5716\u7247\u8CC7\u6599\u593E');
        if (!dir) return;

        ocrImageDir = dir;
        document.getElementById('ocr-image-dir-label').textContent = dir;

        // Auto-set output dir if not manually set
        if (!ocrOutputManuallySet) {
            ocrOutputDir = await app.GetDefaultOutputDir(dir);
            document.getElementById('ocr-output-dir-label').textContent = ocrOutputDir;
        }
    } catch (e) {
        console.error('Failed to select image dir:', e);
    }
}

async function selectOutputDir() {
    try {
        const app = await getApp();
        const dir = await app.SelectDirectory('\u9078\u64C7\u8F38\u51FA\u8CC7\u6599\u593E');
        if (!dir) return;

        ocrOutputDir = dir;
        ocrOutputManuallySet = true;
        document.getElementById('ocr-output-dir-label').textContent = dir;
    } catch (e) {
        console.error('Failed to select output dir:', e);
    }
}

async function selectCredFile() {
    try {
        const app = await getApp();
        const file = await app.SelectFile('\u9078\u64C7 API \u91D1\u9470', 'JSON \u6A94\u6848 (*.json)', '*.json');
        if (!file) return;

        document.getElementById('ocr-cred-label').textContent = file;
    } catch (e) {
        console.error('Failed to select cred file:', e);
    }
}

function getSelectedLanguages() {
    const checkboxes = document.querySelectorAll('#lang-checkboxes input[type="checkbox"]:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

function getScanModeOCR() {
    const radio = document.querySelector('input[name="scan-mode-ocr"]:checked');
    return radio ? radio.value : 'dual';
}

function gatherSettings() {
    return {
        imageDir: ocrImageDir,
        outputDir: ocrOutputDir,
        credFile: document.getElementById('ocr-cred-label').textContent,
        languages: getSelectedLanguages(),
        concurrency: parseInt(document.getElementById('concurrency-slider').value),
        mergePdf: document.getElementById('merge-pdf-check').checked,
        mergeFilename: document.getElementById('merge-filename').value || 'Merge.pdf',
        scanMode: getScanModeOCR(),
    };
}

async function startOCR() {
    const settings = gatherSettings();

    // Validate
    if (!settings.imageDir || settings.imageDir.startsWith('\uFF08')) {
        showOCRError('\u8ACB\u9078\u64C7\u5716\u7247\u8CC7\u6599\u593E');
        return;
    }
    if (!settings.credFile || settings.credFile.startsWith('\uFF08')) {
        showOCRError('\u8ACB\u9078\u64C7 API \u91D1\u9470\u6A94\u6848');
        return;
    }
    if (settings.languages.length === 0) {
        showOCRError('\u8ACB\u81F3\u5C11\u9078\u64C7\u4E00\u7A2E\u8A9E\u8A00');
        return;
    }

    // Auto-set output dir if empty
    if (!settings.outputDir || settings.outputDir.startsWith('\uFF08')) {
        try {
            const app = await getApp();
            settings.outputDir = await app.GetDefaultOutputDir(settings.imageDir);
            ocrOutputDir = settings.outputDir;
            document.getElementById('ocr-output-dir-label').textContent = ocrOutputDir;
        } catch (e) {
            showOCRError('\u7121\u6CD5\u8A2D\u5B9A\u8F38\u51FA\u8CC7\u6599\u593E: ' + e);
            return;
        }
    }

    // Save config
    try {
        const app = await getApp();
        const config = await app.GetConfig();
        config.credFile = settings.credFile;
        config.languages = settings.languages;
        config.concurrency = settings.concurrency;
        config.outputDir = settings.outputDir;
        config.mergePdf = settings.mergePdf;
        config.mergeFilename = settings.mergeFilename;
        config.scanMode = settings.scanMode;
        await app.SaveConfig(config);
    } catch (e) {
        console.error('Failed to save config:', e);
    }

    // Clear UI
    document.getElementById('log-area').innerHTML = '';
    document.getElementById('progress-bar').style.width = '0%';
    document.getElementById('progress-text').textContent = '0 / 0';
    document.getElementById('start-ocr-btn').disabled = true;
    document.getElementById('stop-ocr-btn').disabled = false;

    // Reset top progress bar
    const topProgress = document.getElementById('top-progress');
    if (topProgress) {
        topProgress.classList.remove('hidden');
        document.getElementById('top-progress-bar').style.width = '0%';
        document.getElementById('top-progress-text').textContent = 'OCR 0%';
    }

    // Start OCR
    try {
        const app = await getApp();
        const result = await app.StartOCR(settings);
        if (result) {
            showOCRError(result);
            document.getElementById('start-ocr-btn').disabled = false;
            document.getElementById('stop-ocr-btn').disabled = true;
        }
    } catch (e) {
        console.error('Failed to start OCR:', e);
        document.getElementById('start-ocr-btn').disabled = false;
        document.getElementById('stop-ocr-btn').disabled = true;
    }
}

async function stopOCR() {
    try {
        const app = await getApp();
        await app.StopOCR();
        document.getElementById('stop-ocr-btn').disabled = true;
    } catch (e) {
        console.error('Failed to stop OCR:', e);
    }
}

// Resume from session
export async function resumeOCR(session) {
    ocrImageDir = session.imageDir;
    ocrOutputDir = session.outputDir;
    ocrOutputManuallySet = true;

    document.getElementById('ocr-image-dir-label').textContent = session.imageDir;
    document.getElementById('ocr-output-dir-label').textContent = session.outputDir;
    document.getElementById('ocr-cred-label').textContent = session.credFile;
    document.getElementById('concurrency-slider').value = session.concurrency;
    document.getElementById('concurrency-value').textContent = session.concurrency;
    document.getElementById('merge-pdf-check').checked = session.mergePdf;
    document.getElementById('merge-filename').value = session.mergeFilename;

    // Restore scan mode
    if (session.scanMode) {
        const radio = document.querySelector(`input[name="scan-mode-ocr"][value="${session.scanMode}"]`);
        if (radio) radio.checked = true;
    }

    // Update language checkboxes
    const checkboxes = document.querySelectorAll('#lang-checkboxes input[type="checkbox"]');
    checkboxes.forEach(cb => {
        cb.checked = session.languages.includes(cb.value);
    });

    // Start OCR (session will auto-skip processed files)
    await startOCR();
}
