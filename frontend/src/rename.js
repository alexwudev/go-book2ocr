import { t } from './i18n.js';

let currentImages = [];
let currentDir = '';
let currentPreviews = [];

let App = null;

async function getApp() {
    if (!App) {
        App = await import('../wailsjs/go/app/App.js');
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
        log(t('msg.previewClicked'), false);
        if (currentImages.length === 0) {
            showError(t('msg.selectFolderFirst'));
            log(t('msg.errorNoFolder'), true);
            return;
        }
        previewRename();
    });
    document.getElementById('execute-rename-btn').addEventListener('click', executeRename);

    // Batch select-all checkbox
    document.getElementById('batch-select-all').addEventListener('change', (e) => {
        const checked = e.target.checked;
        document.querySelectorAll('.thumb-checkbox').forEach(cb => {
            cb.checked = checked;
            cb.closest('.image-item').classList.toggle('selected', checked);
        });
        updateBatchCount();
    });

    // Batch apply button
    document.getElementById('batch-apply-btn').addEventListener('click', () => {
        const type = document.getElementById('batch-type-select').value;
        document.querySelectorAll('.thumb-checkbox:checked').forEach(cb => {
            const idx = parseInt(cb.dataset.idx);
            currentImages[idx].pageType = type;
            cb.closest('.image-item').querySelector('.page-type-select').value = type;
        });
        clearAllPreviews();
    });

    // Scan mode toggle: update page type options when mode changes + sync OCR tab
    document.querySelectorAll('input[name="scan-mode-rename"]').forEach(radio => {
        radio.addEventListener('change', () => {
            updatePageTypeOptions();
            updateBatchTypeOptions();
            clearAllPreviews();
            // Sync OCR tab radio
            const ocrRadio = document.querySelector(`input[name="scan-mode-ocr"][value="${getScanModeRename()}"]`);
            if (ocrRadio) ocrRadio.checked = true;
        });
    });

    log(t('msg.renameEvtBound'), false);
}

function updatePageTypeOptions() {
    const mode = getScanModeRename();
    document.querySelectorAll('#image-list .page-type-select').forEach(select => {
        const idx = parseInt(select.dataset.idx);
        if (mode === 'single') {
            if (select.value === 'TypeA' || select.value === 'TypeC') {
                select.value = 'Normal';
                currentImages[idx].pageType = 'Normal';
            }
            Array.from(select.options).forEach(opt => {
                opt.hidden = (opt.value === 'TypeA' || opt.value === 'TypeC');
            });
        } else {
            Array.from(select.options).forEach(opt => {
                opt.hidden = false;
            });
        }
    });

    // Update override input placeholder
    const placeholder = mode === 'single' ? t('placeholder.pageNum') : t('placeholder.leftPage');
    document.querySelectorAll('.page-override-input').forEach(input => {
        input.placeholder = placeholder;
    });
}

function updateBatchTypeOptions() {
    const mode = getScanModeRename();
    const isSingle = mode === 'single';
    const typeBLabel = isSingle ? t('pageType.typeB.single') : t('pageType.typeB.dual');
    const select = document.getElementById('batch-type-select');
    const currentVal = select.value;
    select.innerHTML = `
        <option value="Normal">${t('pageType.normal')}</option>
        <option value="TypeA" ${isSingle ? 'hidden' : ''}>${t('pageType.typeA')}</option>
        <option value="TypeB">${typeBLabel}</option>
        <option value="TypeC" ${isSingle ? 'hidden' : ''}>${t('pageType.typeC')}</option>
        <option value="Skip">${t('pageType.skip')}</option>
    `;
    // Restore previous selection if still valid
    if (!isSingle || (currentVal !== 'TypeA' && currentVal !== 'TypeC')) {
        select.value = currentVal;
    }
}

function updateBatchCount() {
    const total = document.querySelectorAll('.thumb-checkbox').length;
    const checked = document.querySelectorAll('.thumb-checkbox:checked').length;
    const countEl = document.getElementById('batch-count');
    countEl.textContent = checked > 0 ? `(${checked}/${total})` : '';
    const selectAll = document.getElementById('batch-select-all');
    selectAll.checked = checked === total && total > 0;
    selectAll.indeterminate = checked > 0 && checked < total;
}

async function selectFolder() {
    const log = window._statusLog || function() {};
    try {
        log(t('msg.openingFolderDialog'), false);
        const app = await getApp();
        const dir = await app.SelectDirectory(t('label.imageDir'));
        if (!dir) { log(t('msg.noFolderSelected'), false); return; }

        currentDir = dir;
        document.getElementById('rename-dir-label').textContent = dir;

        log(t('msg.loadingImages') + dir, false);
        currentImages = await app.LoadImagesFromFolder(dir);
        log(t('msg.loadedImages', { count: currentImages.length }), false);
        currentPreviews = [];
        renderImageList(currentImages);

        document.getElementById('preview-rename-btn').disabled = false;
        document.getElementById('execute-rename-btn').disabled = true;
        document.getElementById('rename-reload-btn').disabled = false;
    } catch (e) {
        showError(t('msg.loadImageFailed') + e);
        log(t('msg.loadImageFailed') + e, true);
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
        log(t('msg.reloadFolder') + currentDir, false);
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

        let msg = t('msg.loadedImages', { count: currentImages.length });
        if (restored > 0) {
            msg += t('msg.restoredSettings', { count: restored });
        }
        log(msg, false);
        currentPreviews = [];
        renderImageList(currentImages);
        document.getElementById('execute-rename-btn').disabled = true;
    } catch (e) {
        showError(t('msg.reloadFailed') + e);
        log(t('msg.reloadFailed') + e, true);
    }
}

function renderImageList(images) {
    const list = document.getElementById('image-list');
    list.innerHTML = '';
    const mode = getScanModeRename();
    const isSingle = mode === 'single';
    const hiddenA = isSingle ? 'hidden' : '';
    const hiddenC = isSingle ? 'hidden' : '';
    const placeholder = isSingle ? t('placeholder.pageNum') : t('placeholder.leftPage');
    const typeBLabel = isSingle ? t('pageType.typeB.single') : t('pageType.typeB.dual');

    images.forEach((img, idx) => {
        const item = document.createElement('div');
        item.className = 'image-item';
        item.dataset.idx = idx;
        const overrideVal = img.leftPageOverride || '';
        item.innerHTML = `
            <div class="thumb-container" data-path="${img.originalPath}" data-idx="${idx}">
                <span class="thumb-badge">${idx + 1}</span>
                <input type="checkbox" class="thumb-checkbox" data-idx="${idx}">
                <div class="thumb-placeholder">${idx + 1}</div>
            </div>
            <div class="image-info">
                <span class="filename" title="${img.originalName}">${img.originalName}</span>
                <span class="new-filename hidden" data-role="new-name"></span>
                <div class="page-controls">
                    <select class="page-type-select" data-idx="${idx}">
                        <option value="Normal" ${img.pageType === 'Normal' ? 'selected' : ''}>${t('pageType.normal')}</option>
                        <option value="TypeA" ${img.pageType === 'TypeA' ? 'selected' : ''} ${hiddenA}>${t('pageType.typeA')}</option>
                        <option value="TypeB" ${img.pageType === 'TypeB' ? 'selected' : ''}>${typeBLabel}</option>
                        <option value="TypeC" ${img.pageType === 'TypeC' ? 'selected' : ''} ${hiddenC}>${t('pageType.typeC')}</option>
                        <option value="Skip" ${img.pageType === 'Skip' ? 'selected' : ''}>${t('pageType.skip')}</option>
                    </select>
                    <input class="page-override-input" data-idx="${idx}" type="number" min="1" placeholder="${placeholder}" value="${overrideVal}" title="${t('tooltip.overridePage')}">
                </div>
            </div>
        `;
        list.appendChild(item);

        // Checkbox for batch selection
        item.querySelector('.thumb-checkbox').addEventListener('change', (e) => {
            e.stopPropagation();
            item.classList.toggle('selected', e.target.checked);
            updateBatchCount();
        });
        // Prevent checkbox click from triggering preview
        item.querySelector('.thumb-checkbox').addEventListener('click', (e) => e.stopPropagation());

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

    // Show/hide batch action bar and populate its options
    const batchBar = document.getElementById('batch-action-bar');
    batchBar.classList.toggle('visible', images.length > 0);
    if (images.length > 0) updateBatchTypeOptions();
    document.getElementById('batch-select-all').checked = false;
    document.getElementById('batch-count').textContent = '';

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
        // Preserve the badge and checkbox
        const badge = container.querySelector('.thumb-badge');
        const checkbox = container.querySelector('.thumb-checkbox');
        container.innerHTML = '';
        container.appendChild(badge);
        if (checkbox) container.appendChild(checkbox);
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
        log(t('msg.previewCalculating'), false);
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

        log(t('msg.previewDone', { count: currentPreviews.length }), false);
        updatePreviewOnCards(currentPreviews);
        document.getElementById('execute-rename-btn').disabled = false;
    } catch (e) {
        showError(t('msg.previewFailed') + e);
        log(t('msg.previewFailed') + e, true);
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
            newNameEl.textContent = '\u2192 ' + p.newName + ' ' + t('msg.unchanged');
            newNameEl.className = 'new-filename new-filename-same';
        }
        newNameEl.classList.remove('hidden');
    });
}

async function executeRename() {
    if (currentPreviews.length === 0) return;

    const hasChanges = currentPreviews.some(p => p.originalName !== p.newName);
    if (!hasChanges) {
        showError(t('msg.noRenameNeeded'));
        return;
    }

    try {
        const app = await getApp();
        await app.ExecuteRename(currentDir, currentPreviews);
        showSuccess(t('msg.renameComplete'));

        currentImages = await app.LoadImagesFromFolder(currentDir);
        currentPreviews = [];
        renderImageList(currentImages);
        document.getElementById('execute-rename-btn').disabled = true;
    } catch (e) {
        showError(t('msg.renameFailed') + e);
    }
}
