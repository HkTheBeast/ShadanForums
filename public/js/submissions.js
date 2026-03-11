/* ============================================================
   submissions.js  —  Requires: classManager.js
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
    const res = await fetch(path, opts);
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

function updateStats() {
    const t = allStudents;
    $('statTotal').textContent   = t.length;
    $('statA1').textContent      = t.filter(s => s.assignment1).length;
    $('statA2').textContent      = t.filter(s => s.assignment2).length;
    $('statBothA').textContent   = t.filter(s => s.assignment1 && s.assignment2).length;
    $('statRec').textContent     = t.filter(s => s.record_book).length;
    $('statObs').textContent     = t.filter(s => s.obs_book).length;
    $('statPpt').textContent     = t.filter(s => s.ppt_submitted).length;
    $('statAllDone').textContent = t.filter(s => s.assignment1 && s.assignment2 && s.record_book && s.obs_book && s.ppt_submitted).length;
}

function setFilter(f) {
    activeFilter = f;
    D.btnAll.classList.toggle('active',      f === 'all');
    D.btnPending.classList.toggle('active',  f === 'pending');
    D.btnComplete.classList.toggle('active', f === 'complete');
    renderList();
}

function renderList() {
    updateStats();
    const q = D.searchInput.value.toLowerCase().trim();
    const list = allStudents.filter(s => {
        const matchQ = !q || s.name.toLowerCase().includes(q) || s.roll_number.toLowerCase().includes(q);
        if (!matchQ) return false;
        const allDone = s.assignment1 && s.assignment2 && s.record_book && s.obs_book && s.ppt_submitted;
        if (activeFilter === 'complete') return !!allDone;
        if (activeFilter === 'pending')  return !allDone;
        return true;
    });

    if (list.length === 0) {
        D.subList.innerHTML      = '';
        D.subEmpty.style.display = 'block';
        return;
    }
    D.subEmpty.style.display = 'none';
    D.subList.innerHTML = list.map(buildRowHTML).join('');
    list.forEach(s => {
        wireToggle(s, 'a1',  'assignment1',   'assignment');
        wireToggle(s, 'a2',  'assignment2',   'assignment');
        wireToggle(s, 'rec', 'record_book',   'record');
        wireToggle(s, 'obs', 'obs_book',      'record');
        wireToggle(s, 'ppt', 'ppt_submitted', 'record');
    });
}

function wireToggle(s, key, dbField, apiType) {
    const chk = $(`chk-${key}-${s.id}`);
    if (!chk) return;
    chk.addEventListener('change', () => handleToggle(s.id, key, dbField, apiType, chk.checked));
}

function buildRowHTML(s) {
    const avatar = s.avatar
        ? `<img src="${s.avatar}" class="mod-avatar" alt="">`
        : `<div class="mod-avatar-ph">${escapeHTML(s.name.charAt(0).toUpperCase())}</div>`;
    const allDone = s.assignment1 && s.assignment2 && s.record_book && s.obs_book && s.ppt_submitted;

    return `
    <div class="sub-row${allDone ? ' all-done' : ''}" id="sub-row-${s.id}">
        <div class="sub-student-cell">
            ${avatar}
            <div>
                <div class="mod-name">${escapeHTML(s.name)}</div>
                <div class="mod-roll"><i class="fas fa-id-badge"></i> ${escapeHTML(s.roll_number)}</div>
            </div>
        </div>
        <div class="sub-cell">
            <label class="toggle-switch"><input type="checkbox" id="chk-a1-${s.id}" ${s.assignment1 ? 'checked' : ''}><span class="toggle-slider"></span></label>
            <span class="sub-mini-label ${s.assignment1 ? 'done-teal' : 'pending'}" id="lbl-a1-${s.id}">${s.assignment1 ? 'Done' : 'Pending'}</span>
        </div>
        <div class="sub-cell">
            <label class="toggle-switch ts-purple"><input type="checkbox" id="chk-a2-${s.id}" ${s.assignment2 ? 'checked' : ''}><span class="toggle-slider"></span></label>
            <span class="sub-mini-label ${s.assignment2 ? 'done-purple' : 'pending'}" id="lbl-a2-${s.id}">${s.assignment2 ? 'Done' : 'Pending'}</span>
        </div>
        <div class="sub-cell">
            <label class="toggle-switch ts-blue"><input type="checkbox" id="chk-rec-${s.id}" ${s.record_book ? 'checked' : ''}><span class="toggle-slider"></span></label>
            <span class="sub-mini-label ${s.record_book ? 'done-blue' : 'pending'}" id="lbl-rec-${s.id}">${s.record_book ? 'Submitted' : 'Pending'}</span>
        </div>
        <div class="sub-cell">
            <label class="toggle-switch ts-amber"><input type="checkbox" id="chk-obs-${s.id}" ${s.obs_book ? 'checked' : ''}><span class="toggle-slider"></span></label>
            <span class="sub-mini-label ${s.obs_book ? 'done-amber' : 'pending'}" id="lbl-obs-${s.id}">${s.obs_book ? 'Submitted' : 'Pending'}</span>
        </div>
        <div class="sub-cell">
            <label class="toggle-switch ts-pink"><input type="checkbox" id="chk-ppt-${s.id}" ${s.ppt_submitted ? 'checked' : ''}><span class="toggle-slider"></span></label>
            <span class="sub-mini-label ${s.ppt_submitted ? 'done-pink' : 'pending'}" id="lbl-ppt-${s.id}">${s.ppt_submitted ? 'Submitted' : 'Pending'}</span>
        </div>
    </div>`;
}

async function handleToggle(studentId, key, dbField, apiType, value) {
    if (!currentClassId) return;
    const s = allStudents.find(x => x.id === studentId);
    if (!s) return;
    const old  = s[dbField];
    s[dbField] = value;
    updateStats();
    updateToggleLabel(studentId, key, dbField, value);
    const row = $('sub-row-' + studentId);
    if (row) {
        const allDone = s.assignment1 && s.assignment2 && s.record_book && s.obs_book && s.ppt_submitted;
        row.classList.toggle('all-done', !!allDone);
    }
    try {
        if (apiType === 'assignment') {
            await api('PATCH', `/api/classes/${currentClassId}/students/${studentId}/assignment`, { field: dbField, value });
        } else {
            await api('PATCH', `/api/classes/${currentClassId}/students/${studentId}/record`, { field: dbField, value });
        }
        showToast(`${labelDone(dbField)} updated!`);
    } catch (e) {
        s[dbField] = old; updateStats(); updateToggleLabel(studentId, key, dbField, old);
        const chk = $(`chk-${key}-${studentId}`);
        if (chk) chk.checked = !!old;
        showToast('Could not save: ' + e.message, true);
    }
}

function labelDone(dbField) {
    const map = { assignment1:'Assignment 1', assignment2:'Assignment 2', record_book:'Record Book', obs_book:'Obs. Book', ppt_submitted:'PPT' };
    return map[dbField] || dbField;
}

const DONE_CLASS = { a1:'done-teal', a2:'done-purple', rec:'done-blue', obs:'done-amber', ppt:'done-pink' };
const DONE_TEXT  = { a1:'Done', a2:'Done', rec:'Submitted', obs:'Submitted', ppt:'Submitted' };

function updateToggleLabel(studentId, key, dbField, value) {
    const lbl = $(`lbl-${key}-${studentId}`);
    if (!lbl) return;
    if (value) { lbl.className = `sub-mini-label ${DONE_CLASS[key]}`; lbl.textContent = DONE_TEXT[key]; }
    else       { lbl.className = 'sub-mini-label pending'; lbl.textContent = 'Pending'; }
}

document.addEventListener('DOMContentLoaded', () => {
    D = {
        loginGate: $('loginGate'), dashboard: $('dashboard'), navUserArea: $('navUserArea'),
        authModal: $('authModal'), authError: $('authError'),
        tabLogin: $('tabLogin'), tabRegister: $('tabRegister'),
        loginForm: $('loginForm'), registerForm: $('registerForm'),
        loginUsername: $('loginUsername'), loginPassword: $('loginPassword'), loginBtn: $('loginBtn'),
        regUsername: $('regUsername'), regPassword: $('regPassword'), regConfirm: $('regConfirm'), registerBtn: $('registerBtn'),
        subList: $('subList'), subEmpty: $('subEmpty'),
        searchInput: $('searchInput'),
        btnAll: $('btnAll'), btnPending: $('btnPending'), btnComplete: $('btnComplete'),
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

    D.btnAll.addEventListener('click',      () => setFilter('all'));
    D.btnPending.addEventListener('click',  () => setFilter('pending'));
    D.btnComplete.addEventListener('click', () => setFilter('complete'));
    D.searchInput.addEventListener('input', () => renderList());

    initPage();
});