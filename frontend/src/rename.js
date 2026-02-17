let currentImages = [];
let currentDir = '';
let currentPreviews = [];

let App = null;

async function getApp() {
    if (!App) {
        App = await import('../wailsjs/go/main/App.js');
    }
    return App;
}

function showError(msg) {
    let errArea = document.getElementById('rename-error');
    if (!errArea) {
        errArea = document.createElement('div');
        errArea.id = 'rename-error';
        errArea.className = 'error-area';
        const controls = document.querySelector('#tab-rename .controls-section');
        controls.parentNode.insertBefore(errArea, controls.nextSibling);
    }
    errArea.textContent = msg;
    errArea.classList.remove('hidden');
    setTimeout(() => errArea.classList.add('hidden'), 15000);
}

function showSuccess(msg) {
    let area = document.getElementById('rename-success');
    if (!area) {
        area = document.createElement('div');
        area.id = 'rename-success';
        area.className = 'success-area';
        const controls = document.querySelector('#tab-rename .controls-section');
        controls.parentNode.insertBefore(area, controls.nextSibling);
    }
    area.textContent = msg;
    area.classList.remove('hidden');
    setTimeout(() => area.classList.add('hidden'), 8000);
}

function getScanModeRename() {
    const radio = document.querySelector('input[name="scan-mode-rename"]:checked');
    return radio ? radio.value : 'dual';
}

export function initRenameTab() {
    const log = window._statusLog || function() {};

    document.getElementById('rename-dir-btn').addEventListener('click', selectFolder);
    document.getElementById('rename-reload-btn').addEventListener('click', reloadFolder);
    document.getElementById('hover-preview').addEventListener('click', closePreview);
    document.getElementById('preview-rename-btn').addEventListener('click', () => {
        log('預覽按鈕已點擊', false);
        if (currentImages.length === 0) {
            showError('\u8ACB\u5148\u9EDE\u64CA\u300C\u700F\u89BD...\u300D\u9078\u64C7\u5716\u7247\u8CC7\u6599\u593E');
            log('錯誤：尚未選擇資料夾', true);
            return;
        }
        previewRename();
    });
    document.getElementById('execute-rename-btn').addEventListener('click', executeRename);

    // Scan mode toggle: update page type options when mode changes + sync OCR tab
    document.querySelectorAll('input[name="scan-mode-rename"]').forEach(radio => {
        radio.addEventListener('change', () => {
            updatePageTypeOptions();
            clearAllPreviews();
            // Sync OCR tab radio
            const ocrRadio = document.querySelector(`input[name="scan-mode-ocr"][value="${getScanModeRename()}"]`);
            if (ocrRadio) ocrRadio.checked = true;
        });
    });

    log('重新命名事件監聯器已綁定', false);
}

function updatePageTypeOptions() {
    const mode = getScanModeRename();
    document.querySelectorAll('.page-type-select').forEach(select => {
        const idx = parseInt(select.dataset.idx);
        if (mode === 'single') {
            // In single-page mode, only Normal and TypeB are valid
            // Reset TypeA/TypeC to Normal
            if (select.value === 'TypeA' || select.value === 'TypeC') {
                select.value = 'Normal';
                currentImages[idx].pageType = 'Normal';
            }
            // Hide TypeA/TypeC options
            Array.from(select.options).forEach(opt => {
                opt.hidden = (opt.value === 'TypeA' || opt.value === 'TypeC');
            });
        } else {
            // Show all options
            Array.from(select.options).forEach(opt => {
                opt.hidden = false;
            });
        }
    });

    // Update override input placeholder
    const placeholder = mode === 'single' ? '\u9801\u78BC' : '\u5DE6\u9801';
    document.querySelectorAll('.page-override-input').forEach(input => {
        input.placeholder = placeholder;
    });
}

async function selectFolder() {
    const log = window._statusLog || function() {};
    try {
        log('正在開啟資料夾選擇對話框...', false);
        const app = await getApp();
        const dir = await app.SelectDirectory('\u9078\u64C7\u5716\u7247\u8CC7\u6599\u593E');
        if (!dir) { log('未選擇資料夾', false); return; }

        currentDir = dir;
        document.getElementById('rename-dir-label').textContent = dir;

        log('載入圖片中: ' + dir, false);
        currentImages = await app.LoadImagesFromFolder(dir);
        log('已載入 ' + currentImages.length + ' 張圖片', false);
        currentPreviews = [];
        renderImageList(currentImages);

        document.getElementById('preview-rename-btn').disabled = false;
        document.getElementById('execute-rename-btn').disabled = true;
        document.getElementById('rename-reload-btn').disabled = false;
    } catch (e) {
        showError('\u8F09\u5165\u5716\u7247\u5931\u6557\uFF1A' + e);
        log('載入圖片失敗: ' + e, true);
    }
}

async function reloadFolder() {
    const log = window._statusLog || function() {};
    if (!currentDir) return;

    // Save current settings keyed by filename
    const savedSettings = {};
    currentImages.forEach(img => {
        if (img.pageType !== 'Normal' || img.leftPageOverride > 0) {
            savedSettings[img.originalName] = {
                pageType: img.pageType,
                leftPageOverride: img.leftPageOverride || 0,
            };
        }
    });

    try {
        log('重新讀取: ' + currentDir, false);
        const app = await getApp();
        currentImages = await app.LoadImagesFromFolder(currentDir);

        // Restore saved settings by filename
        let restored = 0;
        currentImages.forEach(img => {
            const saved = savedSettings[img.originalName];
            if (saved) {
                img.pageType = saved.pageType;
                img.leftPageOverride = saved.leftPageOverride;
                restored++;
            }
        });

        log('已載入 ' + currentImages.length + ' 張圖片' + (restored > 0 ? '，已還原 ' + restored + ' 筆設定' : ''), false);
        currentPreviews = [];
        renderImageList(currentImages);
        document.getElementById('execute-rename-btn').disabled = true;
    } catch (e) {
        showError('\u91CD\u65B0\u8B80\u53D6\u5931\u6557\uFF1A' + e);
        log('重新讀取失敗: ' + e, true);
    }
}

function renderImageList(images) {
    const list = document.getElementById('image-list');
    list.innerHTML = '';
    const mode = getScanModeRename();
    const isSingle = mode === 'single';
    const hiddenA = isSingle ? 'hidden' : '';
    const hiddenC = isSingle ? 'hidden' : '';
    const placeholder = isSingle ? '\u9801\u78BC' : '\u5DE6\u9801';
    const typeBLabel = isSingle ? 'Type B (\u5716\u7247)' : 'Type B (\u96D9\u5716)';

    images.forEach((img, idx) => {
        const item = document.createElement('div');
        item.className = 'image-item';
        item.dataset.idx = idx;
        const overrideVal = img.leftPageOverride || '';
        item.innerHTML = `
            <div class="thumb-container" data-path="${img.originalPath}" data-idx="${idx}">
                <span class="thumb-badge">${idx + 1}</span>
                <div class="thumb-placeholder">${idx + 1}</div>
            </div>
            <div class="image-info">
                <span class="filename" title="${img.originalName}">${img.originalName}</span>
                <span class="new-filename hidden" data-role="new-name"></span>
                <div class="page-controls">
                    <select class="page-type-select" data-idx="${idx}">
                        <option value="Normal" ${img.pageType === 'Normal' ? 'selected' : ''}>Normal</option>
                        <option value="TypeA" ${img.pageType === 'TypeA' ? 'selected' : ''} ${hiddenA}>Type A (\u53F3\u5716)</option>
                        <option value="TypeB" ${img.pageType === 'TypeB' ? 'selected' : ''}>${typeBLabel}</option>
                        <option value="TypeC" ${img.pageType === 'TypeC' ? 'selected' : ''} ${hiddenC}>Type C (\u5DE6\u5716)</option>
                        <option value="Skip" ${img.pageType === 'Skip' ? 'selected' : ''}>\u4E0D\u547D\u540D</option>
                    </select>
                    <input class="page-override-input" data-idx="${idx}" type="number" min="1" placeholder="${placeholder}" value="${overrideVal}" title="\u624B\u52D5\u6307\u5B9A\u9801\u78BC\uFF08\u7A7A\u767D=\u81EA\u52D5\uFF09">
                </div>
            </div>
        `;
        list.appendChild(item);

        // Thumbnail loading is deferred to batched loader below

        const thumbContainer = item.querySelector('.thumb-container');
        thumbContainer.addEventListener('click', togglePreview);

        item.querySelector('.page-type-select').addEventListener('change', (e) => {
            currentImages[idx].pageType = e.target.value;
            clearAllPreviews();
        });

        item.querySelector('.page-override-input').addEventListener('change', (e) => {
            const val = parseInt(e.target.value) || 0;
            currentImages[idx].leftPageOverride = val;
            clearAllPreviews();
        });
    });

    // Load thumbnails in batches to avoid memory spikes
    const thumbItems = [];
    list.querySelectorAll('.thumb-container').forEach(container => {
        thumbItems.push({ container, path: container.dataset.path });
    });
    loadThumbnailsBatched(thumbItems);
}

async function loadThumbnailsBatched(items, batchSize = 4) {
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        await Promise.all(batch.map(({ container, path }) => loadThumbnailLazy(container, path)));
    }
}

function clearAllPreviews() {
    document.querySelectorAll('#image-list [data-role="new-name"]').forEach(el => {
        el.classList.add('hidden');
        el.textContent = '';
    });
    document.getElementById('execute-rename-btn').disabled = true;
}

async function loadThumbnailLazy(container, path) {
    try {
        const app = await getApp();
        const dataUrl = await app.GetImageThumbnail(path, 180);
        // Preserve the badge
        const badge = container.querySelector('.thumb-badge');
        container.innerHTML = '';
        container.appendChild(badge);
        const imgEl = document.createElement('img');
        imgEl.src = dataUrl;
        imgEl.alt = 'thumb';
        container.appendChild(imgEl);
    } catch (e) {
        console.error('Thumbnail load failed:', e);
    }
}

// --- Click preview ---

let activePreviewPath = null;

function togglePreview(e) {
    const thumbContainer = e.currentTarget;
    const path = thumbContainer.dataset.path;
    const preview = document.getElementById('hover-preview');

    // If clicking the same thumbnail that's already open, close it
    if (!preview.classList.contains('hidden') && activePreviewPath === path) {
        closePreview();
        return;
    }

    loadClickPreview(thumbContainer);
}

function closePreview() {
    const preview = document.getElementById('hover-preview');
    preview.classList.add('hidden');
    document.getElementById('hover-preview-img').src = '';
    activePreviewPath = null;
}

async function loadClickPreview(thumbContainer) {
    const path = thumbContainer.dataset.path;
    const preview = document.getElementById('hover-preview');
    const img = document.getElementById('hover-preview-img');

    try {
        const app = await getApp();
        const dataUrl = await app.GetImageThumbnail(path, 960);
        img.src = dataUrl;
        activePreviewPath = path;

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
        console.error('Preview load failed:', err);
    }
}

async function previewRename() {
    const log = window._statusLog || function() {};
    try {
        log('正在計算命名預覽...', false);
        const app = await getApp();
        const arabicStartIdx = parseInt(document.getElementById('arabic-start-idx').value) || 0;
        const romanStart = parseInt(document.getElementById('roman-start').value) || 1;
        const arabicStart = parseInt(document.getElementById('arabic-start').value) || 1;
        const mode = getScanModeRename();

        if (mode === 'single') {
            currentPreviews = await app.ComputeRenamePreviewSingle(
                currentImages, arabicStartIdx, romanStart, arabicStart
            );
        } else {
            currentPreviews = await app.ComputeRenamePreview(
                currentImages, arabicStartIdx, romanStart, arabicStart
            );
        }

        log('預覽計算完成: ' + currentPreviews.length + ' 筆結果', false);
        updatePreviewOnCards(currentPreviews);
        document.getElementById('execute-rename-btn').disabled = false;
    } catch (e) {
        showError('\u9810\u89BD\u547D\u540D\u5931\u6557\uFF1A' + e);
        log('預覽命名失敗: ' + e, true);
    }
}

function updatePreviewOnCards(previews) {
    const items = document.querySelectorAll('#image-list .image-item');
    previews.forEach((p, idx) => {
        if (idx >= items.length) return;
        const item = items[idx];
        const newNameEl = item.querySelector('[data-role="new-name"]');
        if (!newNameEl) return;

        const changed = p.originalName !== p.newName;
        if (changed) {
            newNameEl.textContent = '\u2192 ' + p.newName;
            newNameEl.className = 'new-filename new-filename-changed';
        } else {
            newNameEl.textContent = '\u2192 ' + p.newName + ' (\u4E0D\u8B8A)';
            newNameEl.className = 'new-filename new-filename-same';
        }
        newNameEl.classList.remove('hidden');
    });
}

async function executeRename() {
    if (currentPreviews.length === 0) return;

    const hasChanges = currentPreviews.some(p => p.originalName !== p.newName);
    if (!hasChanges) {
        showError('\u6C92\u6709\u9700\u8981\u91CD\u65B0\u547D\u540D\u7684\u6A94\u6848');
        return;
    }

    try {
        const app = await getApp();
        await app.ExecuteRename(currentDir, currentPreviews);
        showSuccess('\u91CD\u65B0\u547D\u540D\u5B8C\u6210\uFF01');

        currentImages = await app.LoadImagesFromFolder(currentDir);
        currentPreviews = [];
        renderImageList(currentImages);
        document.getElementById('execute-rename-btn').disabled = true;
    } catch (e) {
        showError('\u91CD\u65B0\u547D\u540D\u5931\u6557\uFF1A' + e);
    }
}
