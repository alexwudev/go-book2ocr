import { t } from './i18n.js';
import { Timer } from './timer.js';

const MAX_LOG_LINES = 500;
const ocrTimer = new Timer('ocr-elapsed');
let logLines = [];
let ocrImageDir = '';
let ocrOutputDir = '';
let ocrOutputManuallySet = false;
let ocrImages = [];
let ocrActivePreviewPath = null;
let ocrLastClickedIdx = -1;

function showOCRError(msg) {
    // Show error as a log entry so it's visible and copyable
    appendLog({ message: msg, isError: true, filename: '' });
}

let App = null;
let Runtime = null;

async function getApp() {
    if (!App) {
        App = await import('../wailsjs/go/app/App.js');
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

    // Provider toggle: show/hide provider-specific fields
    document.querySelectorAll('input[name="ocr-provider"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const selected = e.target.value;
            ['google', 'ocrspace', 'tesseract'].forEach(p => {
                document.querySelectorAll(`.provider-${p}`).forEach(el =>
                    el.classList.toggle('hidden', selected !== p));
            });
        });
    });

    // Tesseract: browse for tesseract.exe
    document.getElementById('tesseract-browse-btn').addEventListener('click', async () => {
        try {
            const app = await getApp();
            const file = await app.SelectFile(t('label.tesseractPath'), 'Tesseract (tesseract.exe)', '*.exe');
            if (file) {
                document.getElementById('tesseract-path-label').textContent = file;
            }
        } catch (e) {
            console.error('Failed to select tesseract path:', e);
        }
    });

    // Tesseract: auto-detect
    document.getElementById('tesseract-detect-btn').addEventListener('click', async () => {
        try {
            const app = await getApp();
            const path = await app.DetectTesseract();
            if (path) {
                document.getElementById('tesseract-path-label').textContent = path;
                appendLog({ message: t('msg.tesseractDetected', { path }), isError: false, filename: '' });
            } else {
                appendLog({ message: t('msg.tesseractNotFound'), isError: true, filename: '' });
            }
        } catch (e) {
            console.error('Failed to detect tesseract:', e);
        }
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

    // Restore provider selection
    if (config.provider) {
        const providerRadio = document.querySelector(`input[name="ocr-provider"][value="${config.provider}"]`);
        if (providerRadio) {
            providerRadio.checked = true;
            providerRadio.dispatchEvent(new Event('change'));
        }
    }
    if (config.ocrSpaceApiKey) {
        document.getElementById('ocrspace-apikey').value = config.ocrSpaceApiKey;
    }
    if (config.ocrSpaceEngine) {
        document.getElementById('ocrspace-engine').value = config.ocrSpaceEngine;
    }
    if (config.ocrSpacePlan) {
        const planRadio = document.querySelector(`input[name="ocrspace-plan"][value="${config.ocrSpacePlan}"]`);
        if (planRadio) planRadio.checked = true;
    }
    if (config.tesseractPath) {
        document.getElementById('tesseract-path-label').textContent = config.tesseractPath;
    }

    // Restore last used imageDir from config and auto-load images
    if (config.imageDir) {
        ocrImageDir = config.imageDir;
        try {
            const app = await getApp();
            ocrImages = await app.LoadImagesFromFolder(config.imageDir) || [];
            document.getElementById('ocr-image-dir-label').textContent = config.imageDir + ' (' + ocrImages.length + ')';
            if (ocrImages.length > 0) renderOCRImageList(ocrImages);
            // Auto-set output dir if not manually set
            if (!ocrOutputManuallySet && !config.outputDir) {
                ocrOutputDir = await app.GetDefaultOutputDir(config.imageDir);
                document.getElementById('ocr-output-dir-label').textContent = ocrOutputDir;
            }
        } catch (e) {
            console.error('Failed to restore imageDir:', e);
            document.getElementById('ocr-image-dir-label').textContent = config.imageDir;
        }
    }

    // OCR batch select-all checkbox
    document.getElementById('ocr-batch-select-all').addEventListener('change', (e) => {
        document.querySelectorAll('.ocr-thumb-checkbox').forEach(cb => {
            cb.checked = e.target.checked;
            cb.closest('.image-item').classList.toggle('selected', e.target.checked);
        });
        updateOCRBatchCount();
    });

    // OCR sub-tab switching
    document.querySelectorAll('#tab-ocr .subtab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchOCRSubtab(btn.dataset.subtab));
    });

    // Click on hover-preview to close (from OCR tab)
    document.getElementById('hover-preview').addEventListener('click', ocrClosePreview);

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
            appendLog({ message: t('msg.processingComplete'), isError: false, filename: '' });

            // Stop timer
            ocrTimer.stop();

            // Hide top progress bar
            const topProgress = document.getElementById('top-progress');
            if (topProgress) topProgress.classList.add('hidden');

            // Reset title bar
            const titlebarFill = document.getElementById('titlebar-fill');
            const titlebarTitle = document.getElementById('titlebar-title');
            if (titlebarFill) {
                titlebarFill.style.width = '0%';
                titlebarFill.classList.remove('done');
            }
            if (titlebarTitle) titlebarTitle.textContent = 'OCR Tool';
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

    // Update title bar fill
    const titlebarFill = document.getElementById('titlebar-fill');
    const titlebarTitle = document.getElementById('titlebar-title');
    if (titlebarFill) {
        titlebarFill.style.width = pct + '%';
        titlebarFill.classList.toggle('done', pct >= 100);
    }
    if (titlebarTitle && pct > 0 && pct < 100) {
        titlebarTitle.textContent = `${pct}% - OCR Tool`;
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
        const dir = await app.SelectDirectory(t('msg.selectImageDir'), ocrImageDir);
        if (!dir) return;

        ocrImageDir = dir;

        // Load images and render list
        ocrImages = await app.LoadImagesFromFolder(dir) || [];
        document.getElementById('ocr-image-dir-label').textContent = dir + ' (' + ocrImages.length + ')';
        renderOCRImageList(ocrImages);
        switchOCRSubtab('ocr-preview');

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
        const dir = await app.SelectDirectory(t('label.outputDir'), ocrOutputDir);
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
        const file = await app.SelectFile(t('label.apiKey'), 'JSON (*.json)', '*.json');
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

function getSelectedProvider() {
    const radio = document.querySelector('input[name="ocr-provider"]:checked');
    return radio ? radio.value : 'google';
}

function getSelectedPlan() {
    const radio = document.querySelector('input[name="ocrspace-plan"]:checked');
    return radio ? radio.value : 'free';
}

function gatherSettings() {
    // Collect checked file paths
    const selectedFiles = [];
    document.querySelectorAll('.ocr-thumb-checkbox:checked').forEach(cb => {
        const idx = parseInt(cb.dataset.idx);
        if (ocrImages[idx]) selectedFiles.push(ocrImages[idx].originalPath);
    });

    return {
        imageDir: ocrImageDir,
        outputDir: ocrOutputDir,
        credFile: document.getElementById('ocr-cred-label').textContent,
        languages: getSelectedLanguages(),
        concurrency: parseInt(document.getElementById('concurrency-slider').value),
        mergePdf: document.getElementById('merge-pdf-check').checked,
        mergeFilename: document.getElementById('merge-filename').value || 'Merge.pdf',
        scanMode: getScanModeOCR(),
        provider: getSelectedProvider(),
        ocrSpaceApiKey: document.getElementById('ocrspace-apikey').value.trim(),
        ocrSpaceEngine: parseInt(document.getElementById('ocrspace-engine').value) || 1,
        ocrSpacePlan: getSelectedPlan(),
        tesseractPath: document.getElementById('tesseract-path-label').textContent,
        selectedFiles: selectedFiles,
    };
}

async function startOCR() {
    const settings = gatherSettings();

    // Validate
    if (!settings.imageDir || settings.imageDir.startsWith('\uFF08') || settings.imageDir === t('placeholder.notSelected')) {
        showOCRError(t('msg.selectImageDir'));
        return;
    }
    if (settings.provider === 'ocrspace') {
        if (!settings.ocrSpaceApiKey) {
            showOCRError(t('msg.enterApiKey'));
            return;
        }
    } else if (settings.provider === 'tesseract') {
        if (!settings.tesseractPath || settings.tesseractPath.startsWith('\uFF08') || settings.tesseractPath === t('placeholder.notSelected')) {
            showOCRError(t('msg.selectTesseractPath'));
            return;
        }
    } else {
        if (!settings.credFile || settings.credFile.startsWith('\uFF08') || settings.credFile === t('placeholder.notSelected')) {
            showOCRError(t('msg.selectApiKey'));
            return;
        }
    }
    if (settings.languages.length === 0) {
        showOCRError(t('msg.selectAtLeastOneLang'));
        return;
    }
    if (settings.selectedFiles.length === 0) {
        showOCRError(t('msg.selectAtLeastOneImage'));
        return;
    }

    // Auto-set output dir if empty
    if (!settings.outputDir || settings.outputDir.startsWith('\uFF08') || settings.outputDir === t('placeholder.autoDefault')) {
        try {
            const app = await getApp();
            settings.outputDir = await app.GetDefaultOutputDir(settings.imageDir);
            ocrOutputDir = settings.outputDir;
            document.getElementById('ocr-output-dir-label').textContent = ocrOutputDir;
        } catch (e) {
            showOCRError(t('msg.cannotSetOutputDir') + e);
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
        config.provider = settings.provider;
        config.ocrSpaceApiKey = settings.ocrSpaceApiKey;
        config.ocrSpaceEngine = settings.ocrSpaceEngine;
        config.ocrSpacePlan = settings.ocrSpacePlan;
        config.tesseractPath = settings.tesseractPath;
        config.imageDir = settings.imageDir;
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

    // Start timer
    ocrTimer.reset();
    ocrTimer.start();

    // Reset top progress bar
    const topProgress = document.getElementById('top-progress');
    if (topProgress) {
        topProgress.classList.remove('hidden');
        document.getElementById('top-progress-bar').style.width = '0%';
        document.getElementById('top-progress-text').textContent = 'OCR 0%';
    }

    // Reset title bar fill
    const titlebarFill = document.getElementById('titlebar-fill');
    if (titlebarFill) {
        titlebarFill.style.width = '0%';
        titlebarFill.classList.remove('done');
    }

    // Switch to log sub-tab
    switchOCRSubtab('ocr-log');

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

    // Restore provider
    if (session.provider) {
        const providerRadio = document.querySelector(`input[name="ocr-provider"][value="${session.provider}"]`);
        if (providerRadio) {
            providerRadio.checked = true;
            providerRadio.dispatchEvent(new Event('change'));
        }
    }
    if (session.ocrSpaceApiKey) {
        document.getElementById('ocrspace-apikey').value = session.ocrSpaceApiKey;
    }
    if (session.ocrSpaceEngine) {
        document.getElementById('ocrspace-engine').value = session.ocrSpaceEngine;
    }
    if (session.ocrSpacePlan) {
        const planRadio = document.querySelector(`input[name="ocrspace-plan"][value="${session.ocrSpacePlan}"]`);
        if (planRadio) planRadio.checked = true;
    }
    if (session.tesseractPath) {
        document.getElementById('tesseract-path-label').textContent = session.tesseractPath;
    }

    // Update language checkboxes
    const checkboxes = document.querySelectorAll('#lang-checkboxes input[type="checkbox"]');
    checkboxes.forEach(cb => {
        cb.checked = session.languages.includes(cb.value);
    });

    // Restore image list from session selectedFiles
    if (session.selectedFiles && session.selectedFiles.length > 0) {
        ocrImages = session.selectedFiles.map((path, idx) => ({
            originalPath: path,
            originalName: path.split(/[\\/]/).pop(),
            index: idx,
        }));
        renderOCRImageList(ocrImages);
    }

    // Start OCR (session will auto-skip processed files)
    await startOCR();
}

// ===== OCR Image List =====

function renderOCRImageList(images) {
    ocrLastClickedIdx = -1;
    const list = document.getElementById('ocr-image-list');
    list.innerHTML = '';

    // Show batch action bar
    const bar = document.getElementById('ocr-batch-action-bar');
    bar.classList.toggle('visible', images.length > 0);

    images.forEach((img, idx) => {
        const item = document.createElement('div');
        item.className = 'image-item selected';
        item.innerHTML = `
            <div class="thumb-container" data-path="${img.originalPath}" data-idx="${idx}">
                <span class="thumb-badge">${idx + 1}</span>
                <input type="checkbox" class="ocr-thumb-checkbox" data-idx="${idx}" checked>
                <div class="thumb-placeholder">${idx + 1}</div>
            </div>
            <div class="image-info">
                <span class="filename" title="${img.originalName}">${img.originalName}</span>
            </div>
        `;
        list.appendChild(item);

        // Checkbox events with shift+click range support
        const cb = item.querySelector('.ocr-thumb-checkbox');
        cb.addEventListener('click', (e) => {
            e.stopPropagation();
            const currentIdx = parseInt(cb.dataset.idx);
            if (e.shiftKey && ocrLastClickedIdx >= 0) {
                const from = Math.min(ocrLastClickedIdx, currentIdx);
                const to = Math.max(ocrLastClickedIdx, currentIdx);
                const state = cb.checked;
                for (let i = from; i <= to; i++) {
                    const box = list.querySelector(`.ocr-thumb-checkbox[data-idx="${i}"]`);
                    if (box) {
                        box.checked = state;
                        box.closest('.image-item').classList.toggle('selected', state);
                    }
                }
            } else {
                item.classList.toggle('selected', cb.checked);
            }
            ocrLastClickedIdx = currentIdx;
            updateOCRBatchCount();
        });

        // Click to preview
        item.querySelector('.thumb-container').addEventListener('click', ocrTogglePreview);
    });

    // Load thumbnails in batches
    const thumbItems = [];
    list.querySelectorAll('.thumb-container').forEach(container => {
        thumbItems.push({ container, path: container.dataset.path });
    });
    loadOCRThumbnailsBatched(thumbItems);

    updateOCRBatchCount();
}

async function loadOCRThumbnailsBatched(items, batchSize = 4) {
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        await Promise.all(batch.map(({ container, path }) => loadOCRThumbnailLazy(container, path)));
    }
}

async function loadOCRThumbnailLazy(container, path) {
    try {
        const app = await getApp();
        const dataUrl = await app.GetImageThumbnail(path, 180);
        const badge = container.querySelector('.thumb-badge');
        const checkbox = container.querySelector('.ocr-thumb-checkbox');
        container.innerHTML = '';
        container.appendChild(badge);
        if (checkbox) container.appendChild(checkbox);
        const imgEl = document.createElement('img');
        imgEl.src = dataUrl;
        imgEl.alt = 'thumb';
        container.appendChild(imgEl);
    } catch (e) {
        console.error('OCR thumbnail load failed:', e);
    }
}

function updateOCRBatchCount() {
    const total = document.querySelectorAll('.ocr-thumb-checkbox').length;
    const checked = document.querySelectorAll('.ocr-thumb-checkbox:checked').length;
    document.getElementById('ocr-batch-count').textContent =
        checked > 0 ? `(${checked}/${total})` : '';
    const selectAll = document.getElementById('ocr-batch-select-all');
    selectAll.checked = checked === total && total > 0;
    selectAll.indeterminate = checked > 0 && checked < total;
}

// ===== OCR Sub-tab Switching =====

function switchOCRSubtab(name) {
    document.querySelectorAll('#tab-ocr .subtab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.subtab === name);
    });
    document.querySelectorAll('#tab-ocr .subtab-panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === `subtab-${name}`);
    });
}

// ===== OCR Click Preview =====

function ocrTogglePreview(e) {
    const thumbContainer = e.currentTarget;
    const path = thumbContainer.dataset.path;
    const preview = document.getElementById('hover-preview');

    if (!preview.classList.contains('hidden') && ocrActivePreviewPath === path) {
        ocrClosePreview();
        return;
    }
    loadOCRClickPreview(thumbContainer);
}

function ocrClosePreview() {
    const preview = document.getElementById('hover-preview');
    preview.classList.add('hidden');
    document.getElementById('hover-preview-img').src = '';
    ocrActivePreviewPath = null;
}

async function loadOCRClickPreview(thumbContainer) {
    const path = thumbContainer.dataset.path;
    const preview = document.getElementById('hover-preview');
    const img = document.getElementById('hover-preview-img');

    try {
        const app = await getApp();
        const dataUrl = await app.GetImageThumbnail(path, 960);
        img.src = dataUrl;
        ocrActivePreviewPath = path;

        const rect = thumbContainer.getBoundingClientRect();
        const margin = 20;
        const previewW = 980;
        const previewH = 980;
        let left = rect.right + margin;
        let top = rect.top - 50;

        const vw = window.innerWidth;
        const vh = window.innerHeight;
        if (left + previewW > vw) left = rect.left - previewW - margin;
        if (left < 10) left = 10;
        if (top < 10) top = 10;
        if (top + previewH > vh) top = Math.max(10, vh - previewH - 10);

        preview.style.left = left + 'px';
        preview.style.top = top + 'px';
        preview.classList.remove('hidden');
    } catch (err) {
        console.error('OCR preview load failed:', err);
    }
}
