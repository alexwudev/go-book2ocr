import { initRenameTab } from './rename.js';
import { initOCRTab, resumeOCR } from './ocr.js';
import { initConvertTab } from './convert.js';
import { initTheme } from './theme.js';
import { t, setLanguage, uiLanguages, getCurrentLang } from './i18n.js';

async function init() {
    const log = window._statusLog || function() {};
    log(t('status.initializing'), false);

    let App;
    try {
        log(t('status.loadingBindings'), false);
        App = await import('../wailsjs/go/main/App.js');
        log(t('status.bindingsLoaded'), false);
    } catch (e) {
        log(t('msg.bindingsLoadFailed') + e, true);
        return;
    }

    // Wire up title bar window controls
    try {
        const { WindowMinimise, WindowToggleMaximise, Quit } = await import('../wailsjs/runtime/runtime.js');
        document.getElementById('tb-minimize').addEventListener('click', () => WindowMinimise());
        document.getElementById('tb-maximize').addEventListener('click', () => WindowToggleMaximise());
        document.getElementById('tb-close').addEventListener('click', () => Quit());
    } catch (e) {
        console.error('Failed to wire window controls:', e);
    }

    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Load config and initialize
    let config;
    try {
        log(t('status.loadingConfig'), false);
        config = await App.GetConfig();
    } catch (e) {
        console.error('Failed to load config:', e);
        config = { theme: 'dark', languages: ['en'], concurrency: 5, mergePdf: true, mergeFilename: 'Merge.pdf', uiLang: 'zh-TW' };
    }

    // Initialize UI language FIRST so everything renders in correct language
    initLanguageSelector(config.uiLang || 'zh-TW', App);

    try {
        initTheme(config.theme);
        log(t('status.themeInit'), false);
    } catch (e) {
        log(t('msg.themeInitFailed') + e, true);
    }

    try {
        initRenameTab();
        log(t('status.renameTabInit'), false);
    } catch (e) {
        log(t('msg.renameTabInitFailed') + e, true);
    }

    try {
        await initOCRTab(config);
        log(t('status.ocrTabInit'), false);
    } catch (e) {
        log(t('msg.ocrTabInitFailed') + e, true);
    }

    try {
        await initConvertTab();
        log(t('status.convertTabInit'), false);
    } catch (e) {
        log(t('msg.convertTabInitFailed') + e, true);
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

    log(t('status.ready'), false);
}

function initLanguageSelector(savedLang, App) {
    const select = document.getElementById('ui-lang-select');
    if (!select) return;

    // Populate options
    select.innerHTML = '';
    uiLanguages.forEach(lang => {
        const opt = document.createElement('option');
        opt.value = lang.code;
        opt.textContent = lang.name;
        select.appendChild(opt);
    });

    // Set saved language
    select.value = savedLang;
    setLanguage(savedLang);

    // Listen for changes
    select.addEventListener('change', async () => {
        const lang = select.value;
        setLanguage(lang);

        // Save to config
        try {
            const config = await App.GetConfig();
            config.uiLang = lang;
            await App.SaveConfig(config);
        } catch (e) {
            console.error('Failed to save UI language:', e);
        }
    });
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
    text.textContent = t('msg.sessionResume', { processed, total: session.totalFiles });
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
