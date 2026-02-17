import { initRenameTab } from './rename.js';
import { initOCRTab, resumeOCR } from './ocr.js';
import { initConvertTab } from './convert.js';
import { initTheme } from './theme.js';

async function init() {
    const log = window._statusLog || function() {};
    log('初始化中...', false);

    let App;
    try {
        log('載入 Wails bindings...', false);
        App = await import('../wailsjs/go/main/App.js');
        log('Wails bindings 載入成功', false);
    } catch (e) {
        log('Wails bindings 載入失敗: ' + e, true);
        return;
    }

    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Load config and initialize
    let config;
    try {
        log('載入設定...', false);
        config = await App.GetConfig();
    } catch (e) {
        console.error('Failed to load config:', e);
        config = { theme: 'dark', languages: ['en'], concurrency: 5, mergePdf: true, mergeFilename: 'Merge.pdf' };
    }

    try {
        initTheme(config.theme);
        log('主題初始化完成', false);
    } catch (e) {
        log('主題初始化失敗: ' + e, true);
    }

    try {
        initRenameTab();
        log('重新命名 Tab 初始化完成', false);
    } catch (e) {
        log('重新命名 Tab 初始化失敗: ' + e, true);
    }

    try {
        await initOCRTab(config);
        log('OCR Tab 初始化完成', false);
    } catch (e) {
        log('OCR Tab 初始化失敗: ' + e, true);
    }

    try {
        await initConvertTab();
        log('轉檔 Tab 初始化完成', false);
    } catch (e) {
        log('轉檔 Tab 初始化失敗: ' + e, true);
    }

    // Check for pending session
    try {
        const session = await App.GetPendingSession();
        if (session && session.imageDir) {
            showSessionBanner(session, App.ClearSession);
        }
    } catch (e) {
        console.error('Failed to check session:', e);
    }

    log('系統就緒', false);
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === `tab-${tabName}`);
    });
}

function showSessionBanner(session, clearSessionFn) {
    const banner = document.getElementById('session-banner');
    const text = document.getElementById('session-banner-text');

    const processed = session.processedFiles ? session.processedFiles.length : 0;
    text.textContent = `\u4E0A\u6B21\u8655\u7406\u5230\u7B2C ${processed}/${session.totalFiles} \u5F35\uFF0C\u662F\u5426\u7E7C\u7E8C\uFF1F`;
    banner.classList.remove('hidden');

    document.getElementById('session-resume-btn').addEventListener('click', () => {
        banner.classList.add('hidden');
        switchTab('ocr');
        resumeOCR(session);
    }, { once: true });

    document.getElementById('session-dismiss-btn').addEventListener('click', async () => {
        banner.classList.add('hidden');
        try {
            await clearSessionFn();
        } catch (e) {
            console.error('Failed to clear session:', e);
        }
    }, { once: true });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
