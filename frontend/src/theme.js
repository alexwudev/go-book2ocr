export function initTheme(savedTheme) {
    const theme = savedTheme || 'dark';
    applyTheme(theme);

    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const icon = document.getElementById('theme-icon');
    icon.textContent = theme === 'dark' ? '\u263E' : '\u2600';
}

async function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);

    // Save to config
    try {
        const { GetConfig, SaveConfig } = await import('../wailsjs/go/main/App.js');
        const config = await GetConfig();
        config.theme = next;
        await SaveConfig(config);
    } catch (e) {
        console.error('Failed to save theme:', e);
    }
}

export function getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'dark';
}
