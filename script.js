const SUPABASE_URL = 'https://ryvvflskzncnwmkaspyp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_IDI632zGCQ4vczLPR2qoeg_SGY3NykP';
const WORKER_URL = 'https://quiet-salad-91c4.tanyong2396.workers.dev';

function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav button').forEach(el => el.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    if (tabName === 'dashboard') loadDashboard();
    if (tabName === 'tracking') loadAllRecords();
}

async function fetchWithTimeout(url, options, timeout = 5000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

async function loadDashboard() {
    try {
        const response = await fetchWithTimeout(
            `${SUPABASE_URL}/rest/v1/email_tracking?select=*`,
            {
                headers: { 
                    'apikey': SUPABASE_KEY, 
                    'Authorization': `Bearer ${SUPABASE_KEY}` 
                }
            },
            5000
        );
        const data = await response.json();
        const totalSent = data.length;
        const emails = [...new Set(data.map(item => item.email))];
        document.getElementById('totalSent').textContent = totalSent;
        document.getElementById('totalOpened').textContent = emails.length;
        document.getElementById('openRate').textContent = totalSent > 0 ? Math.round((emails.length / totalSent) * 100) + '%' : '0%';
        
        const grouped = {};
        data.forEach(item => {
            const key = item.email;
            if (!grouped[key]) grouped[key] = { email: key, count: 0, firstOpen: item.opened_at, lastOpen: item.opened_at, countries: new Set(), cities: new Set() };
            grouped[key].count++;
            if (item.opened_at < grouped[key].firstOpen) grouped[key].firstOpen = item.opened_at;
            if (item.opened_at > grouped[key].lastOpen) grouped[key].lastOpen = item.opened_at;
            if (item.country) grouped[key].countries.add(item.country);
            if (item.city) grouped[key].cities.add(item.city);
        });
        
        const records = Object.values(grouped).sort((a, b) => new Date(b.lastOpen) - new Date(a.lastOpen)).slice(0, 10);
        document.getElementById('recentBody').innerHTML = records.map(r => {
            const firstTime = formatTime(r.firstOpen);
            const lastTime = formatTime(r.lastOpen);
            const location = [...r.countries].join(',') + ' / ' + [...r.cities].join(',');
            return `<tr><td>${r.email}</td><td>${r.count}</td><td>${firstTime}</td><td>${lastTime}</td><td>${location}</td></tr>`;
        }).join('');
    } catch(e) {
        document.getElementById('recentBody').innerHTML = '<tr><td colspan="5">⚠️ 加载失败，请检查网络或刷新重试</td></tr>';
        console.error('Dashboard error:', e);
    }
}

async function loadAllRecords() {
    try {
        const response = await fetchWithTimeout(
            `${SUPABASE_URL}/rest/v1/email_tracking?select=*&order=opened_at.desc`,
            {
                headers: { 
                    'apikey': SUPABASE_KEY, 
                    'Authorization': `Bearer ${SUPABASE_KEY}` 
                }
            },
            5000
        );
        const data = await response.json();
        document.getElementById('allBody').innerHTML = data.map(item => 
            `<tr><td>${item.email}</td><td>${item.campaign || '-'}</td><td>${formatTime(item.opened_at)}</td><td>${item.country || '-'}</td><td>${item.city || '-'}</td></tr>`
        ).join('');
    } catch(e) {
        document.getElementById('allBody').innerHTML = '<tr><td colspan="5">⚠️ 加载失败，请检查网络或刷新重试</td></tr>';
        console.error('Tracking error:', e);
    }
}

function generateLink() {
    const email = document.getElementById('emailInput').value;
    const campaign = document.getElementById('campaignInput').value;
    if (!email) { alert('请输入客户邮箱'); return; }
    const link = `${WORKER_URL}/track?email=${encodeURIComponent(email)}&campaign=${encodeURIComponent(campaign || 'general')}`;
    document.getElementById('trackingLink').value = link;
    document.getElementById('linkResult').style.display = 'block';
}

function copyLink() {
    const textarea = document.getElementById('trackingLink');
    textarea.select();
    document.execCommand('copy');
    alert('✅ 已复制！粘贴到 Gmail 插入图片 → 网址');
}

function formatTime(utcTime) {
    if (!utcTime) return '-';
    const date = new Date(utcTime);
    return date.toLocaleString('zh-CN', { 
        hour12: false,
        timeZone: 'Asia/Shanghai'
    });
}

window.onload = loadDashboard;
