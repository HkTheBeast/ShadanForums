/* ============================================================
   marks.js  —  Requires: classManager.js
   ============================================================ */
'use strict';

let allStudents   = [];
let activeFilter  = 'all';
let currentClassId = null;
let D             = {};

function $(id) { return document.getElementById(id); }
function escapeHTML(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }
function fmtVal(val) {
    if (val === null || val === undefined || val === '') return '';
    const n = parseFloat(val);
    return isNaN(n) ? '' : (n % 1 === 0 ? String(n) : n.toFixed(1));
}
function avg(arr) {
    const nums = arr.filter(v => v !== null && v !== undefined && v !== '');
    if (!nums.length) return null;
    const s = nums.reduce((a, b) => a + parseFloat(b), 0);
    const r = s / nums.length;
    return r % 1 === 0 ? String(r) : r.toFixed(1);
}

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
    if (on) { btn.disabled = true; btn.dataset.orig = btn.innerHTML; btn.innerHTML = '<span class="spinner"></span>'; }
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
    if (!u || !p || !c) return showErr(D.authError, 'Please fill in all fields.');
    if (u.length < 3)   return showErr(D.authError, 'Username must be at least 3 characters.');
    if (p.length < 6)   return showErr(D.authError, 'Password must be at least 6 characters.');
    if (p !== c)        return showErr(D.authError, 'Passwords do not match.');
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

function hasMarks(s) {
    return (s.mark_mid1 !== null && s.mark_mid1 !== undefined) ||
           (s.mark_mid2 !== null && s.mark_mid2 !== undefined) ||
           (s.mark_internal_lab !== null && s.mark_internal_lab !== undefined) ||
           (s.mark_external_lab !== null && s.mark_external_lab !== undefined);
}

function updateStats() {
    const t = allStudents;
    $('statTotal').textContent   = t.length;
    const entered = t.filter(hasMarks);
    $('statEntered').textContent = entered.length;
    $('statPending').textContent = t.length - entered.length;

    const a = (field) => avg(t.map(s => s[field]));
    const a1 = a('mark_mid1'), a2 = a('mark_mid2'), ai = a('mark_internal_lab'), ae = a('mark_external_lab');
    $('statAvgMid1').textContent = a1 !== null ? a1 : '—';
    $('statAvgMid2').textContent = a2 !== null ? a2 : '—';
    $('statAvgInt').textContent  = ai !== null ? ai : '—';
    $('statAvgExt').textContent  = ae !== null ? ae : '—';

    const totals = t.map(s => {
        const vals = [s.mark_mid1, s.mark_mid2, s.mark_internal_lab, s.mark_external_lab]
            .filter(v => v !== null && v !== undefined);
        return vals.length ? vals.reduce((a, b) => a + b, 0) : null;
    }).filter(v => v !== null);
    $('statAvgTotal').textContent = totals.length
        ? (totals.reduce((a, b) => a + b, 0) / totals.length).toFixed(1) : '—';
}

function setFilter(f) {
    activeFilter = f;
    D.btnAll.classList.toggle('active',     f === 'all');
    D.btnMissing.classList.toggle('active', f === 'missing');
    D.btnEntered.classList.toggle('active', f === 'entered');
    renderList();
}

function renderList() {
    updateStats();
    const q = D.searchInput.value.toLowerCase().trim();
    const list = allStudents.filter(s => {
        const matchQ = !q || s.name.toLowerCase().includes(q) || s.roll_number.toLowerCase().includes(q);
        if (!matchQ) return false;
        if (activeFilter === 'entered') return hasMarks(s);
        if (activeFilter === 'missing') return !hasMarks(s);
        return true;
    });

    if (list.length === 0) {
        D.marksList.innerHTML      = '';
        D.marksEmpty.style.display = 'block';
        return;
    }
    D.marksEmpty.style.display = 'none';
    D.marksList.innerHTML = list.map(buildRowHTML).join('');
    list.forEach(s => {
        ['mid1','mid2','int','ext'].forEach(k => {
            const inp = $(`inp-${k}-${s.id}`);
            if (inp) {
                inp.addEventListener('input', () => recalcRow(s.id));
                inp.addEventListener('keydown', e => { if (e.key === 'Enter') saveRow(s.id); });
            }
        });
        const btn = $(`save-btn-${s.id}`);
        if (btn) btn.addEventListener('click', () => saveRow(s.id));
    });
}

function buildRowHTML(s) {
    const avatar = s.avatar
        ? `<img src="${s.avatar}" class="mod-avatar" alt="">`
        : `<div class="mod-avatar-ph">${escapeHTML(s.name.charAt(0).toUpperCase())}</div>`;
    const hm = hasMarks(s);
    const vals = [s.mark_mid1, s.mark_mid2, s.mark_internal_lab, s.mark_external_lab]
        .filter(v => v !== null && v !== undefined);
    const totalDisplay = vals.length ? vals.reduce((a,b)=>a+b,0).toFixed(1).replace(/\.0$/, '') : '—';

    return `
    <div class="marks-row${hm ? ' has-marks' : ''}" id="marks-row-${s.id}">
        <div class="marks-student-cell">
            ${avatar}
            <div>
                <div class="mod-name">${escapeHTML(s.name)}</div>
                <div class="mod-roll"><i class="fas fa-id-badge"></i> ${escapeHTML(s.roll_number)}</div>
            </div>
        </div>
        <div class="mark-cell">
            <span class="mark-cell-label">Mid 1 /30</span>
            <input type="number" class="mark-inp${fmtVal(s.mark_mid1)?' filled':''}" id="inp-mid1-${s.id}" min="0" max="30" step="0.5" value="${fmtVal(s.mark_mid1)}" placeholder="—">
        </div>
        <div class="mark-cell">
            <span class="mark-cell-label">Mid 2 /30</span>
            <input type="number" class="mark-inp${fmtVal(s.mark_mid2)?' filled':''}" id="inp-mid2-${s.id}" min="0" max="30" step="0.5" value="${fmtVal(s.mark_mid2)}" placeholder="—">
        </div>
        <div class="mark-cell">
            <span class="mark-cell-label">Int. Lab /50</span>
            <input type="number" class="mark-inp${fmtVal(s.mark_internal_lab)?' filled':''}" id="inp-int-${s.id}" min="0" max="50" step="0.5" value="${fmtVal(s.mark_internal_lab)}" placeholder="—">
        </div>
        <div class="mark-cell">
            <span class="mark-cell-label">Ext. Lab /50</span>
            <input type="number" class="mark-inp${fmtVal(s.mark_external_lab)?' filled':''}" id="inp-ext-${s.id}" min="0" max="50" step="0.5" value="${fmtVal(s.mark_external_lab)}" placeholder="—">
        </div>
        <div class="marks-total-cell">
            <span class="marks-total-label">Total</span>
            <span class="marks-total-val" id="total-${s.id}">${totalDisplay}</span>
            <span class="marks-total-max">/ 160</span>
        </div>
        <div class="marks-save-cell">
            <button class="btn-save-row" id="save-btn-${s.id}"><i class="fas fa-save"></i> Save</button>
        </div>
    </div>`;
}

function recalcRow(studentId) {
    const keys = ['mid1','mid2','int','ext'];
    const vals = keys.map(k => {
        const el = $(`inp-${k}-${studentId}`);
        if (!el || el.value === '') return null;
        const n = parseFloat(el.value);
        return isNaN(n) ? null : n;
    }).filter(v => v !== null);
    const totalEl = $('total-' + studentId);
    if (totalEl) {
        totalEl.textContent = vals.length === 0 ? '—'
            : (vals.reduce((a,b)=>a+b,0) % 1 === 0
                ? String(vals.reduce((a,b)=>a+b,0))
                : vals.reduce((a,b)=>a+b,0).toFixed(1));
    }
    keys.forEach(k => {
        const el = $(`inp-${k}-${studentId}`);
        if (el) el.classList.toggle('filled', el.value !== '');
    });
}

async function saveRow(studentId) {
    if (!currentClassId) return;
    const s = allStudents.find(x => x.id === studentId);
    if (!s) return;
    const btn = $('save-btn-' + studentId);
    const toVal = (raw, max) => {
        if (raw === '' || raw === null || raw === undefined) return null;
        const n = parseFloat(raw);
        if (isNaN(n) || n < 0 || n > max) return 'ERR';
        return n;
    };
    const mid1     = toVal($(`inp-mid1-${studentId}`).value, 30);
    const mid2     = toVal($(`inp-mid2-${studentId}`).value, 30);
    const internal = toVal($(`inp-int-${studentId}`).value,  50);
    const external = toVal($(`inp-ext-${studentId}`).value,  50);
    if (mid1     === 'ERR') return showToast('Mid 1 must be 0–30.',        true);
    if (mid2     === 'ERR') return showToast('Mid 2 must be 0–30.',        true);
    if (internal === 'ERR') return showToast('Internal Lab must be 0–50.', true);
    if (external === 'ERR') return showToast('External Lab must be 0–50.', true);
    setLoading(btn, true);
    try {
        const data = await api('PATCH', `/api/classes/${currentClassId}/students/${studentId}/marks`, {
            mark_mid1: mid1, mark_mid2: mid2, mark_internal_lab: internal, mark_external_lab: external,
        });
        const idx = allStudents.findIndex(x => x.id === studentId);
        if (idx !== -1) allStudents[idx] = data.student;
        const row = $('marks-row-' + studentId);
        if (row) row.classList.toggle('has-marks', hasMarks(data.student));
        btn.classList.add('saved');
        btn.innerHTML = '<i class="fas fa-check"></i> Saved';
        setTimeout(() => { btn.classList.remove('saved'); btn.innerHTML = '<i class="fas fa-save"></i> Save'; }, 2000);
        updateStats();
        showToast(`Marks saved for ${s.name}!`);
    } catch (e) {
        showToast('Could not save: ' + e.message, true);
    } finally {
        setLoading(btn, false);
        const b2 = $('save-btn-' + studentId);
        if (b2 && !b2.dataset.orig) b2.innerHTML = '<i class="fas fa-save"></i> Save';
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
        marksList: $('marksList'), marksEmpty: $('marksEmpty'),
        searchInput: $('searchInput'),
        btnAll: $('btnAll'), btnMissing: $('btnMissing'), btnEntered: $('btnEntered'),
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

    D.btnAll.addEventListener('click',     () => setFilter('all'));
    D.btnMissing.addEventListener('click', () => setFilter('missing'));
    D.btnEntered.addEventListener('click', () => setFilter('entered'));
    D.searchInput.addEventListener('input', () => renderList());

    initPage();
});