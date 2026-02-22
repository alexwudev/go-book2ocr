import { t } from './i18n.js';

let App = null;

async function getApp() {
    if (!App) {
        App = await import('../wailsjs/go/app/App.js');
    }
    return App;
}

function getViewMode() {
    const radio = document.querySelector('input[name="stats-view"]:checked');
    return radio ? radio.value : 'daily';
}

function providerLabel(provider) {
    if (provider === 'google') return 'Google Cloud Vision';
    if (provider === 'ocrspace') return 'OCR.space';
    return provider;
}

function planLabel(plan) {
    if (!plan) return '—';
    return plan.charAt(0).toUpperCase() + plan.slice(1);
}

// Monthly quota limits for OCR.space
const OCRSPACE_MONTHLY_LIMITS = {
    free: 25000,
    pro: 300000,
};

// Pricing per API call (USD)
// Google Cloud Vision DOCUMENT_TEXT_DETECTION: $1.50 per 1000 units
// OCR.space Free: $0 (free tier)
// OCR.space Pro: subscription-based, no per-call cost
function estimateCost(provider, plan, count) {
    if (provider === 'google') {
        return count * 0.0015; // $1.50 / 1000
    }
    return 0;
}

function formatCost(cost) {
    if (cost === 0) return '—';
    return '$' + cost.toFixed(4);
}

async function loadAndRender() {
    try {
        const app = await getApp();
        const stats = await app.GetUsageStats();
        render(stats.records || []);
    } catch (e) {
        console.error('Failed to load stats:', e);
    }
}

function render(records) {
    const mode = getViewMode();
    const tableArea = document.getElementById('stats-table-area');
    const summaryArea = document.getElementById('stats-summary');

    if (!records || records.length === 0) {
        tableArea.innerHTML = `<div class="stats-empty">${t('stats.noData')}</div>`;
        summaryArea.innerHTML = '';
        return;
    }

    let rows;
    let dateHeader;

    if (mode === 'monthly') {
        dateHeader = t('header.month');
        // Aggregate by month + provider + plan
        const agg = {};
        for (const r of records) {
            const month = r.date.substring(0, 7); // "2026-02"
            const key = `${month}|${r.provider}|${r.plan}`;
            if (!agg[key]) {
                agg[key] = { date: month, provider: r.provider, plan: r.plan, count: 0 };
            }
            agg[key].count += r.count;
        }
        rows = Object.values(agg);
    } else {
        dateHeader = t('header.date');
        rows = [...records];
    }

    // Sort by date descending, then provider, then plan
    rows.sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        if (a.provider !== b.provider) return a.provider.localeCompare(b.provider);
        return (a.plan || '').localeCompare(b.plan || '');
    });

    // Build table
    let html = '<table class="stats-table">';
    html += `<thead><tr>`;
    html += `<th>${dateHeader}</th>`;
    html += `<th>${t('header.provider')}</th>`;
    html += `<th>${t('header.plan')}</th>`;
    html += `<th>${t('header.calls')}</th>`;
    html += `<th>${t('header.cost')}</th>`;
    html += `</tr></thead><tbody>`;

    for (const r of rows) {
        const cost = estimateCost(r.provider, r.plan, r.count);
        html += `<tr>`;
        html += `<td>${r.date}</td>`;
        html += `<td>${providerLabel(r.provider)}</td>`;
        html += `<td>${planLabel(r.plan)}</td>`;
        html += `<td>${r.count}</td>`;
        html += `<td>${formatCost(cost)}</td>`;
        html += `</tr>`;
    }
    html += '</tbody></table>';
    tableArea.innerHTML = html;

    // Summary: totals per provider+plan
    const totals = {};
    for (const r of records) {
        const key = `${r.provider}|${r.plan}`;
        if (!totals[key]) {
            totals[key] = { provider: r.provider, plan: r.plan, count: 0 };
        }
        totals[key].count += r.count;
    }

    let totalCost = 0;
    const parts = Object.values(totals).map(item => {
        const cost = estimateCost(item.provider, item.plan, item.count);
        totalCost += cost;
        let label = `${providerLabel(item.provider)}${item.plan ? ' ' + planLabel(item.plan) : ''}: ${item.count}`;
        if (cost > 0) label += ` (${formatCost(cost)})`;
        return label;
    });
    let summaryHtml = `<strong>${t('stats.total')}</strong>: ${parts.join(' / ')}`;
    if (totalCost > 0) {
        summaryHtml += ` — <strong>${t('stats.totalCost')}</strong>: $${totalCost.toFixed(4)}`;
    }

    // Monthly quota for OCR.space
    const now = new Date();
    const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    const monthlyUsage = {};
    for (const r of records) {
        if (r.provider === 'ocrspace' && r.date.startsWith(currentMonth)) {
            const key = r.plan || 'free';
            monthlyUsage[key] = (monthlyUsage[key] || 0) + r.count;
        }
    }

    const quotaParts = [];
    for (const [plan, limit] of Object.entries(OCRSPACE_MONTHLY_LIMITS)) {
        const used = monthlyUsage[plan] || 0;
        const remaining = Math.max(0, limit - used);
        quotaParts.push(
            `OCR.space ${planLabel(plan)}: ${t('stats.used')} ${used} / ${limit.toLocaleString()}` +
            `，${t('stats.remaining')} <strong>${remaining.toLocaleString()}</strong>`
        );
    }
    if (quotaParts.length > 0) {
        summaryHtml += `<br><strong>${t('stats.monthlyQuota')}</strong> (${currentMonth}): ${quotaParts.join(' ｜ ')}`;
    }

    summaryArea.innerHTML = summaryHtml;
}

export async function initStatsTab() {
    document.getElementById('stats-refresh-btn').addEventListener('click', loadAndRender);

    document.getElementById('stats-clear-btn').addEventListener('click', async () => {
        if (!confirm(t('msg.confirmClear'))) return;
        try {
            const app = await getApp();
            await app.ClearUsageStats();
            await loadAndRender();
        } catch (e) {
            console.error('Failed to clear stats:', e);
        }
    });

    document.querySelectorAll('input[name="stats-view"]').forEach(radio => {
        radio.addEventListener('change', loadAndRender);
    });

    await loadAndRender();
}
