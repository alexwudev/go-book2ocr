let App = null;
let Runtime = null;
let convertDir = '';

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

function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export async function initConvertTab() {
    document.getElementById('convert-dir-btn').addEventListener('click', selectConvertDir);
    document.getElementById('start-convert-btn').addEventListener('click', startConvert);
    document.getElementById('stop-convert-btn').addEventListener('click', stopConvert);

    const slider = document.getElementById('convert-percent-slider');
    slider.addEventListener('input', (e) => {
        document.getElementById('convert-percent-value').textContent = e.target.value + '%';
    });

    setupConvertEvents();
}

async function setupConvertEvents() {
    try {
        const runtime = await getRuntime();

        runtime.EventsOn('convert:progress', (data) => {
            const bar = document.getElementById('convert-progress-bar');
            const text = document.getElementById('convert-progress-text');
            const pct = Math.round(data.percent * 100);
            bar.style.width = pct + '%';
            text.textContent = `${data.current} / ${data.total} (${pct}%)`;
        });

        runtime.EventsOn('convert:log', (data) => {
            const logArea = document.getElementById('convert-log-area');
            const div = document.createElement('div');
            div.className = 'log-line' + (data.isError ? ' log-error' : '');
            div.textContent = data.message;
            logArea.appendChild(div);
            while (logArea.childNodes.length > 500) {
                logArea.removeChild(logArea.firstChild);
            }
            logArea.scrollTop = logArea.scrollHeight;
        });

        runtime.EventsOn('convert:finished', async () => {
            document.getElementById('start-convert-btn').disabled = false;
            document.getElementById('stop-convert-btn').disabled = true;
            // Reload metadata to show updated file sizes
            if (convertDir) {
                await loadConvertFileList(convertDir);
            }
        });
    } catch (e) {
        console.error('Failed to setup convert events:', e);
    }
}

async function selectConvertDir() {
    try {
        const app = await getApp();
        const dir = await app.SelectDirectory('\u9078\u64C7\u5716\u7247\u8CC7\u6599\u593E');
        if (!dir) return;

        convertDir = dir;
        document.getElementById('convert-dir-label').textContent = dir;
        await loadConvertFileList(dir);
        document.getElementById('start-convert-btn').disabled = false;
    } catch (e) {
        console.error('Failed to select convert dir:', e);
    }
}

async function loadConvertFileList(dir) {
    try {
        const app = await getApp();
        const metadata = await app.GetImageMetadataList(dir);
        const list = document.getElementById('convert-file-list');
        list.innerHTML = '';

        if (metadata.length === 0) {
            list.innerHTML = '<div class="convert-empty">\u8CC7\u6599\u593E\u4E2D\u6C92\u6709\u5716\u7247</div>';
            document.getElementById('start-convert-btn').disabled = true;
            return;
        }

        // Header
        const header = document.createElement('div');
        header.className = 'convert-row convert-header';
        header.innerHTML = `<span class="convert-name">\u6A94\u540D</span><span class="convert-dim">\u5C3A\u5BF8</span><span class="convert-size">\u6A94\u6848\u5927\u5C0F</span>`;
        list.appendChild(header);

        let totalSize = 0;
        metadata.forEach(m => {
            totalSize += m.fileSize;
            const row = document.createElement('div');
            row.className = 'convert-row';
            row.innerHTML = `<span class="convert-name" title="${m.name}">${m.name}</span><span class="convert-dim">${m.width} × ${m.height}</span><span class="convert-size">${formatSize(m.fileSize)}</span>`;
            list.appendChild(row);
        });

        // Summary
        const summary = document.createElement('div');
        summary.className = 'convert-row convert-summary';
        summary.innerHTML = `<span class="convert-name">\u5171 ${metadata.length} \u5F35</span><span class="convert-dim"></span><span class="convert-size">\u7E3D\u8A08 ${formatSize(totalSize)}</span>`;
        list.appendChild(summary);
    } catch (e) {
        console.error('Failed to load metadata:', e);
    }
}

async function startConvert() {
    if (!convertDir) return;

    const percent = parseInt(document.getElementById('convert-percent-slider').value);

    document.getElementById('convert-log-area').innerHTML = '';
    document.getElementById('convert-progress-bar').style.width = '0%';
    document.getElementById('convert-progress-text').textContent = '0 / 0';
    document.getElementById('start-convert-btn').disabled = true;
    document.getElementById('stop-convert-btn').disabled = false;

    try {
        const app = await getApp();
        const result = await app.StartConvert(convertDir, percent);
        if (result) {
            const logArea = document.getElementById('convert-log-area');
            const div = document.createElement('div');
            div.className = 'log-line log-error';
            div.textContent = result;
            logArea.appendChild(div);
            document.getElementById('start-convert-btn').disabled = false;
            document.getElementById('stop-convert-btn').disabled = true;
        }
    } catch (e) {
        console.error('Failed to start convert:', e);
        document.getElementById('start-convert-btn').disabled = false;
        document.getElementById('stop-convert-btn').disabled = true;
    }
}

async function stopConvert() {
    try {
        const app = await getApp();
        await app.StopConvert();
        document.getElementById('stop-convert-btn').disabled = true;
    } catch (e) {
        console.error('Failed to stop convert:', e);
    }
}
