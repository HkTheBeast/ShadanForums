/* ============================================================
   highlights.js  —  Requires: classManager.js
   ============================================================ */
'use strict';

let allStudents   = [];
let activeFilter  = 'all';
let currentClassId = null;
let D             = {};

function $(id) { return document.getElementById(id); }
function escapeHTML(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }

let _toastTimer;
function showToast(msg, isError = false) {
    D.toast.className      = 'toast' + (isError ? ' error' : '');
    D.toastIcon.className  = isError ? 'fas fa-exclamation-circle' : 'fas fa-check-circle';
    D.toastMsg.textContent = msg;
    D.toast.classList.add('show');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => D.toast.classList.remove('show'), 3200);
}
function setLoading(btn, on) {
    if (on) { btn.disabled = true; btn.dataset.orig = btn.innerHTML; btn.innerHTML = '<span class="spinner"></span> Please wait…'; }
    else    { btn.disabled = false; btn.innerHTML = btn.dataset.orig || btn.innerHTML; }
}
function showErr(el, msg) { el.textContent = msg; el.classList.add('show'); }
function clearErr(el)     { el.textContent = '';  el.classList.remove('show'); }

async function api(method, path, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin' };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const res  = await fetch(path, opts);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Server error');
    return data;
}

function initHamburger() {
    const btn   = $('navHamburger');
    const links = $('navLinks');
    if (!btn || !links) return;
    btn.addEventListener('click', () => { btn.classList.toggle('open'); links.classList.toggle('open'); });
    links.querySelectorAll('.nav-link-btn').forEach(link =>
        link.addEventListener('click', () => { btn.classList.remove('open'); links.classList.remove('open'); }));
    document.addEventListener('click', e => {
        if (!btn.contains(e.target) && !links.contains(e.target)) { btn.classList.remove('open'); links.classList.remove('open'); }
    });
}

function openAuthModal()  { clearErr(D.authError); D.authModal.classList.add('active'); D.loginUsername.focus(); }
function closeAuthModal() { D.authModal.classList.remove('active'); }

function switchAuthTab(tab) {
    const isLogin = tab === 'login';
    D.loginForm.style.display    = isLogin ? 'block' : 'none';
    D.registerForm.style.display = isLogin ? 'none'  : 'block';
    D.tabLogin.classList.toggle('active', isLogin);
    D.tabRegister.classList.toggle('active', !isLogin);
    clearErr(D.authError);
}

async function handleLogin() {
    const u = D.loginUsername.value.trim(), p = D.loginPassword.value;
    if (!u || !p) return showErr(D.authError, 'Please fill in all fields.');
    clearErr(D.authError); setLoading(D.loginBtn, true);
    try {
        await api('POST', '/api/teacher/login', { username: u, password: p });
        closeAuthModal(); await initPage(); showToast('Welcome back, ' + u + '!');
    } catch (e) { showErr(D.authError, e.message); }
    finally { setLoading(D.loginBtn, false); }
}

async function handleRegister() {
    const u = D.regUsername.value.trim(), p = D.regPassword.value, c = D.regConfirm.value;
    if (!u || !p || !c)    return showErr(D.authError, 'Please fill in all fields.');
    if (u.length < 3)      return showErr(D.authError, 'Username must be at least 3 characters.');
    if (p.length < 6)      return showErr(D.authError, 'Password must be at least 6 characters.');
    if (p !== c)           return showErr(D.authError, 'Passwords do not match.');
    clearErr(D.authError); setLoading(D.registerBtn, true);
    try {
        await api('POST', '/api/teacher/register', { username: u, password: p });
        closeAuthModal(); await initPage(); showToast('Account created! Welcome, ' + u + '!');
    } catch (e) { showErr(D.authError, e.message); }
    finally { setLoading(D.registerBtn, false); }
}

async function handleLogout() {
    try { await api('POST', '/api/teacher/logout'); } catch (_) {}
    allStudents = []; currentClassId = null;
    await initPage(); showToast('Logged out.');
}

async function initPage() {
    let teacher = null;
    try { const d = await api('GET', '/api/teacher/me'); teacher = d.teacher; } catch (_) {}

    if (teacher) {
        D.navUserArea.innerHTML = `
            <div class="nav-user-badge"><i class="fas fa-user-circle"></i><span>${escapeHTML(teacher.username)}</span></div>
            <button class="nav-link-btn" id="logoutBtn"><i class="fas fa-sign-out-alt"></i> Logout</button>`;
        $('logoutBtn').addEventListener('click', handleLogout);
        D.loginGate.style.display = 'none';
        D.dashboard.style.display = 'block';
        await ClassManager.init({ showToast, onSelect: onClassSelected });
    } else {
        D.navUserArea.innerHTML = `<button class="nav-link-btn" id="navLoginBtn"><i class="fas fa-sign-in-alt"></i> Login</button>`;
        $('navLoginBtn').addEventListener('click', openAuthModal);
        D.loginGate.style.display = 'block';
        D.dashboard.style.display = 'none';
    }
}

async function onClassSelected(cls) {
    currentClassId = cls ? cls.id : null;
    D.noClassPlaceholder.style.display = cls ? 'none' : 'block';
    D.classContent.style.display       = cls ? 'block' : 'none';
    if (!cls) { allStudents = []; return; }
    await loadStudents();
}

async function loadStudents() {
    if (!currentClassId) return;
    try {
        const d = await api('GET', `/api/classes/${currentClassId}/students`);
        allStudents = d.students;
        renderList();
    } catch (e) { showToast('Could not load students: ' + e.message, true); }
}

function updateStats() {
    $('statTotal').textContent = allStudents.length;
    $('statHL').textContent    = allStudents.filter(s => s.highlighted).length;
    $('statClean').textContent = allStudents.filter(s => !s.warnings).length;
    $('statW1').textContent    = allStudents.filter(s => s.warnings === 1).length;
    $('statW2').textContent    = allStudents.filter(s => s.warnings === 2).length;
    $('statW3').textContent    = allStudents.filter(s => s.warnings >= 3).length;
}

function setFilter(f) {
    activeFilter = f;
    D.btnAll.classList.toggle('active',  f === 'all');
    D.btnHL.classList.toggle('active',   f === 'highlighted');
    D.btnWarn.classList.toggle('active', f === 'warned');
    renderList();
}

function renderList() {
    updateStats();
    const q = D.searchInput.value.toLowerCase().trim();
    const list = allStudents.filter(s => {
        const matchQ = !q || s.name.toLowerCase().includes(q) || s.roll_number.toLowerCase().includes(q);
        if (!matchQ) return false;
        if (activeFilter === 'highlighted') return !!s.highlighted;
        if (activeFilter === 'warned')      return s.warnings > 0;
        return true;
    });

    if (list.length === 0) {
        D.hlList.innerHTML      = '';
        D.hlEmpty.style.display = 'block';
        return;
    }
    D.hlEmpty.style.display = 'none';
    D.hlList.innerHTML = list.map(buildRowHTML).join('');
    list.forEach(s => {
        $('hl-btn-' + s.id).addEventListener('click', () => toggleHighlight(s.id));
        [1,2,3].forEach(dot => {
            $(`wdot-${s.id}-${dot}`).addEventListener('click', () => handleWarningClick(s.id, dot));
        });
    });
}

function buildRowHTML(s) {
    const avatar = s.avatar
        ? `<img src="${s.avatar}" class="mod-avatar" alt="">`
        : `<div class="mod-avatar-ph">${escapeHTML(s.name.charAt(0).toUpperCase())}</div>`;
    const rowClass = ['hl-row', s.highlighted ? 'is-highlighted' : '', s.warnings >= 3 ? 'is-warned' : ''].filter(Boolean).join(' ');
    const hlClass  = 'hl-btn' + (s.highlighted ? ' active' : '');
    const hlLabel  = s.highlighted ? '★ Highlighted' : '☆ Highlight';
    const dots     = [1,2,3].map(d => `<div class="w-dot${d <= s.warnings ? ' filled' : ''}" id="wdot-${s.id}-${d}" title="Warning ${d}"></div>`).join('');
    let warnBadge  = '';
    if (s.warnings > 0) warnBadge = `<span class="warn-badge${s.warnings >= 3 ? ' max' : ''}">${s.warnings}/3</span>`;
    return `
    <div class="${rowClass}" id="hl-row-${s.id}">
        <div class="hl-student">
            ${avatar}
            <div class="hl-student-text">
                <div class="mod-name">${escapeHTML(s.name)}</div>
                <div class="mod-roll"><i class="fas fa-id-badge"></i> ${escapeHTML(s.roll_number)}</div>
            </div>
        </div>
        <button class="${hlClass}" id="hl-btn-${s.id}"><i class="fas fa-star"></i> ${hlLabel}</button>
        <div class="warn-area">
            <span class="warn-label" id="warn-label-${s.id}">Warnings ${warnBadge}</span>
            <div class="warn-dots">${dots}</div>
        </div>
    </div>`;
}

async function toggleHighlight(id) {
    const s = allStudents.find(x => x.id === id);
    if (!s) return;
    const newVal = !s.highlighted;
    s.highlighted = newVal;
    const row = $('hl-row-' + id);
    const btn = $('hl-btn-' + id);
    if (row) row.classList.toggle('is-highlighted', newVal);
    if (btn) { btn.className = 'hl-btn' + (newVal ? ' active' : ''); btn.innerHTML = `<i class="fas fa-star"></i> ${newVal ? '★ Highlighted' : '☆ Highlight'}`; }
    updateStats();
    try {
        await api('PATCH', `/api/classes/${currentClassId}/students/${id}/highlight`, { value: newVal });
        showToast(newVal ? '⭐ Student highlighted!' : 'Highlight removed.');
    } catch (e) {
        s.highlighted = !newVal; updateStats(); renderList();
        showToast('Could not save: ' + e.message, true);
    }
}

async function handleWarningClick(id, dot) {
    const s = allStudents.find(x => x.id === id);
    if (!s) return;
    const newW = s.warnings === dot ? dot - 1 : dot;
    const oldW = s.warnings;
    s.warnings  = newW;
    updateWarningDotsUI(id, newW); updateStats();
    try {
        await api('PATCH', `/api/classes/${currentClassId}/students/${id}/warnings`, { warnings: newW });
        if (newW === 3)       showToast('⚠️ Maximum warnings reached!', true);
        else if (newW > oldW) showToast(`Warning ${newW}/3 added.`);
        else                  showToast(`Warning reduced to ${newW}/3.`);
    } catch (e) {
        s.warnings = oldW; updateWarningDotsUI(id, oldW); updateStats();
        showToast('Could not save: ' + e.message, true);
    }
}

function updateWarningDotsUI(id, warnings) {
    [1,2,3].forEach(d => { const el = $(`wdot-${id}-${d}`); if (el) el.classList.toggle('filled', d <= warnings); });
    const row = $('hl-row-' + id);
    if (row) row.classList.toggle('is-warned', warnings >= 3);
    const labelEl = $('warn-label-' + id);
    if (labelEl) {
        let badge = '';
        if (warnings > 0) badge = `<span class="warn-badge${warnings >= 3 ? ' max' : ''}">${warnings}/3</span>`;
        labelEl.innerHTML = `Warnings ${badge}`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    D = {
        loginGate: $('loginGate'), dashboard: $('dashboard'), navUserArea: $('navUserArea'),
        authModal: $('authModal'), authError: $('authError'),
        tabLogin: $('tabLogin'), tabRegister: $('tabRegister'),
        loginForm: $('loginForm'), registerForm: $('registerForm'),
        loginUsername: $('loginUsername'), loginPassword: $('loginPassword'), loginBtn: $('loginBtn'),
        regUsername: $('regUsername'), regPassword: $('regPassword'), regConfirm: $('regConfirm'), registerBtn: $('registerBtn'),
        hlList: $('hlList'), hlEmpty: $('hlEmpty'),
        searchInput: $('searchInput'),
        btnAll: $('btnAll'), btnHL: $('btnHL'), btnWarn: $('btnWarn'),
        noClassPlaceholder: $('noClassPlaceholder'), classContent: $('classContent'),
        toast: $('toast'), toastIcon: $('toastIcon'), toastMsg: $('toastMsg'),
    };

    initHamburger();
    $('openAuthBtn') && $('openAuthBtn').addEventListener('click', openAuthModal);
    D.tabLogin.addEventListener('click',    () => switchAuthTab('login'));
    D.tabRegister.addEventListener('click', () => switchAuthTab('register'));
    D.loginBtn.addEventListener('click',    handleLogin);
    D.registerBtn.addEventListener('click', handleRegister);
    D.authModal.addEventListener('click',   e => { if (e.target === D.authModal) closeAuthModal(); });
    [D.loginUsername, D.loginPassword].forEach(el => el.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); }));
    [D.regUsername, D.regPassword, D.regConfirm].forEach(el => el.addEventListener('keydown', e => { if (e.key === 'Enter') handleRegister(); }));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAuthModal(); });

    D.btnAll.addEventListener('click',  () => setFilter('all'));
    D.btnHL.addEventListener('click',   () => setFilter('highlighted'));
    D.btnWarn.addEventListener('click', () => setFilter('warned'));
    D.searchInput.addEventListener('input', () => renderList());

    initPage();
});