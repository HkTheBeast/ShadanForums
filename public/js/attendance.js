/* ==============================================
   attendance.js  —  place in:  js/attendance.js
   ============================================== */

'use strict';

// ─── State ────────────────────────────────────────────────────────
let attRecords = {};   // { studentId: 'present'|'absent'|'late' }
let attStudents = [];  // students returned by the API for selected date
let summaryData = [];  // full summary from /api/attendance/summary

// ─── DOM refs ────────────────────────────────────────────────────
let D = {};

// ─── Helpers ─────────────────────────────────────────────────────
function $(id) { return document.getElementById(id); }

function escapeHTML(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}

let toastTimer;
function showToast(msg, isError = false) {
    D.toast.className     = 'toast' + (isError ? ' error' : '');
    D.toastIcon.className = isError ? 'fas fa-exclamation-circle' : 'fas fa-check-circle';
    D.toastMsg.textContent = msg;
    D.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => D.toast.classList.remove('show'), 3200);
}

function setLoading(btn, loading) {
    if (loading) {
        btn.disabled = true;
        btn.dataset.original = btn.innerHTML;
        btn.innerHTML = '<span class="spinner"></span> Please wait…';
    } else {
        btn.disabled = false;
        btn.innerHTML = btn.dataset.original || btn.innerHTML;
    }
}

function showError(el, msg) { el.textContent = msg; el.classList.add('show'); }
function clearError(el)     { el.textContent = '';  el.classList.remove('show'); }

function todayISO() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dy = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dy}`;
}

function formatDateDisplay(iso) {
    if (!iso) return '';
    const [y, m, day] = iso.split('-');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${day} ${months[parseInt(m) - 1]} ${y}`;
}

// ─── API wrapper ─────────────────────────────────────────────────
async function api(method, path, body) {
    const opts = {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
    };
    if (body) opts.body = JSON.stringify(body);
    const res  = await fetch(path, opts);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Server error');
    return data;
}

// ─── Auth modal ───────────────────────────────────────────────────
function openAuthModal() {
    clearError(D.authError);
    D.authModal.classList.add('active');
    D.loginUsername.focus();
}
function closeAuthModal() { D.authModal.classList.remove('active'); }

function switchTab(tab) {
    const isLogin = tab === 'login';
    D.loginForm.style.display    = isLogin ? 'block' : 'none';
    D.registerForm.style.display = isLogin ? 'none'  : 'block';
    D.tabLogin.classList.toggle('active',    isLogin);
    D.tabRegister.classList.toggle('active', !isLogin);
    clearError(D.authError);
}

async function handleLogin() {
    const username = D.loginUsername.value.trim();
    const password = D.loginPassword.value;
    if (!username || !password) return showError(D.authError, 'Please fill in all fields.');
    clearError(D.authError);
    setLoading(D.loginBtn, true);
    try {
        await api('POST', '/api/teacher/login', { username, password });
        closeAuthModal();
        await initPage();
        showToast('Welcome back, ' + username + '!');
    } catch (err) {
        showError(D.authError, err.message);
    } finally {
        setLoading(D.loginBtn, false);
    }
}

async function handleRegister() {
    const username = D.regUsername.value.trim();
    const password = D.regPassword.value;
    const confirm  = D.regConfirm.value;
    if (!username || !password || !confirm) return showError(D.authError, 'Please fill in all fields.');
    if (username.length < 3) return showError(D.authError, 'Username must be at least 3 characters.');
    if (password.length < 6) return showError(D.authError, 'Password must be at least 6 characters.');
    if (password !== confirm) return showError(D.authError, 'Passwords do not match.');
    clearError(D.authError);
    setLoading(D.registerBtn, true);
    try {
        await api('POST', '/api/teacher/register', { username, password });
        closeAuthModal();
        await initPage();
        showToast('Account created! Welcome, ' + username + '!');
    } catch (err) {
        showError(D.authError, err.message);
    } finally {
        setLoading(D.registerBtn, false);
    }
}

async function handleLogout() {
    try { await api('POST', '/api/teacher/logout'); } catch (_) {}
    attRecords = {};
    attStudents = [];
    summaryData = [];
    await initPage();
    showToast('Logged out successfully.');
}

// ─── Page init ────────────────────────────────────────────────────
async function initPage() {
    let teacher = null;
    try {
        const data = await api('GET', '/api/teacher/me');
        teacher = data.teacher;
    } catch (_) {}

    if (teacher) {
        D.navUserArea.innerHTML = `
            <div class="nav-user-badge">
                <i class="fas fa-user-circle"></i>
                <span>${escapeHTML(teacher.username)}</span>
            </div>
            <button class="nav-link-btn" id="logoutBtn">
                <i class="fas fa-sign-out-alt"></i> Logout
            </button>`;
        $('logoutBtn').addEventListener('click', handleLogout);
        D.loginGate.style.display = 'none';
        D.dashboard.style.display = 'block';
        // Set today's date and load
        D.attDate.value = todayISO();
        await loadAttendanceForDate(D.attDate.value);
    } else {
        D.navUserArea.innerHTML = `
            <button class="nav-link-btn" id="navLoginBtn">
                <i class="fas fa-sign-in-alt"></i> Login
            </button>`;
        $('navLoginBtn').addEventListener('click', openAuthModal);
        D.loginGate.style.display = 'block';
        D.dashboard.style.display = 'none';
    }
}

// ─── Tab switching ────────────────────────────────────────────────
function switchMainTab(tab) {
    const isTake = tab === 'take';
    D.tabTake.classList.toggle('active', isTake);
    D.tabSummary.classList.toggle('active', !isTake);
    D.paneTake.style.display    = isTake ? 'block' : 'none';
    D.paneSummary.style.display = isTake ? 'none'  : 'block';
    if (!isTake) loadSummary();
}

// ─── Load attendance for a given date ────────────────────────────
async function loadAttendanceForDate(date) {
    if (!date) return;
    try {
        const data = await api('GET', `/api/attendance?date=${date}`);
        attStudents = data.attendance;  // [{ id, name, roll_number, avatar, status }]

        // Reset local record map from what server returned
        attRecords = {};
        attStudents.forEach(s => { attRecords[s.id] = s.status; });

        renderAttList();
    } catch (err) {
        showToast('Could not load attendance: ' + err.message, true);
    }
}

// ─── Render attendance list ───────────────────────────────────────
function renderAttList() {
    if (attStudents.length === 0) {
        D.attList.innerHTML   = '';
        D.attEmpty.style.display  = 'block';
        D.attSaveRow.style.display = 'none';
        updateDayStats();
        return;
    }
    D.attEmpty.style.display   = 'none';
    D.attSaveRow.style.display = 'flex';

    D.attList.innerHTML = attStudents.map(s => buildAttRowHTML(s)).join('');

    // Wire up buttons
    attStudents.forEach(s => {
        ['present', 'late', 'absent'].forEach(status => {
            const btn = $(`att-${status}-${s.id}`);
            if (btn) btn.addEventListener('click', () => setStatus(s.id, status));
        });
        // Reflect current state
        reflectStatus(s.id, attRecords[s.id] || 'absent');
    });

    updateDayStats();
}

function buildAttRowHTML(s) {
    const avatar = s.avatar
        ? `<img src="${s.avatar}" class="att-avatar" alt="${escapeHTML(s.name)}">`
        : `<div class="att-avatar-placeholder">${escapeHTML(s.name.charAt(0).toUpperCase())}</div>`;

    const status = attRecords[s.id] || 'absent';

    return `
    <div class="att-row" id="att-row-${s.id}" data-status="${status}">
        ${avatar}
        <div class="att-student-info">
            <div class="att-student-name">${escapeHTML(s.name)}</div>
            <div class="att-student-roll"><i class="fas fa-id-badge"></i> ${escapeHTML(s.roll_number)}</div>
        </div>
        <div class="att-status-btns">
            <button class="att-status-btn btn-present" id="att-present-${s.id}">
                <i class="fas fa-check"></i> Present
            </button>
            <button class="att-status-btn btn-late" id="att-late-${s.id}">
                <i class="fas fa-clock"></i> Late
            </button>
            <button class="att-status-btn btn-absent" id="att-absent-${s.id}">
                <i class="fas fa-times"></i> Absent
            </button>
        </div>
    </div>`;
}

function setStatus(studentId, status) {
    attRecords[studentId] = status;
    reflectStatus(studentId, status);
    updateDayStats();
}

function reflectStatus(studentId, status) {
    const row = $('att-row-' + studentId);
    if (row) row.dataset.status = status;

    ['present', 'late', 'absent'].forEach(s => {
        const btn = $(`att-${s}-${studentId}`);
        if (btn) btn.classList.toggle('active', s === status);
    });
}

function updateDayStats() {
    const statuses = Object.values(attRecords);
    const present  = statuses.filter(s => s === 'present').length;
    const late     = statuses.filter(s => s === 'late').length;
    const absent   = statuses.filter(s => s === 'absent').length;
    const total    = attStudents.length;

    D.dayPresent.textContent = present;
    D.dayLate.textContent    = late;
    D.dayAbsent.textContent  = absent;
    D.dayTotal.textContent   = total;
}

// ─── Mark all ─────────────────────────────────────────────────────
function markAll(status) {
    attStudents.forEach(s => setStatus(s.id, status));
}

// ─── Save attendance ──────────────────────────────────────────────
async function saveAttendance() {
    const date = D.attDate.value;
    if (!date) return showToast('Please select a date.', true);
    if (attStudents.length === 0) return showToast('No students to save.', true);

    const records = attStudents.map(s => ({
        student_id: s.id,
        status:     attRecords[s.id] || 'absent',
    }));

    setLoading(D.saveAttendanceBtn, true);
    try {
        await api('POST', '/api/attendance', { date, records });
        showToast(`✅ Attendance saved for ${formatDateDisplay(date)}!`);
    } catch (err) {
        showToast('Could not save: ' + err.message, true);
    } finally {
        setLoading(D.saveAttendanceBtn, false);
    }
}

// ─── Summary tab ─────────────────────────────────────────────────
async function loadSummary() {
    try {
        const data = await api('GET', '/api/attendance/summary');
        summaryData = data.summary;
        renderSummary();
    } catch (err) {
        showToast('Could not load summary: ' + err.message, true);
    }
}

function renderSummary() {
    if (summaryData.length === 0) {
        D.summaryGrid.innerHTML   = '';
        D.summaryEmpty.style.display = 'block';
        return;
    }
    D.summaryEmpty.style.display = 'none';
    D.summaryGrid.innerHTML      = summaryData.map(buildSummaryCardHTML).join('');

    summaryData.forEach(s => {
        const btn = $('hist-btn-' + s.student_id);
        if (btn) btn.addEventListener('click', () => openHistoryModal(s.student_id, s.name, s.roll_number));
    });
}

function buildSummaryCardHTML(s) {
    const pct = s.percentage;
    const noData = pct === null || s.total_days === 0;

    const pctClass = noData ? '' : pct >= 75 ? 'high' : pct >= 50 ? 'mid' : 'low';
    const isLow    = !noData && pct < 75;

    // SVG ring
    const radius = 26;
    const circ   = 2 * Math.PI * radius;
    const offset = noData ? circ : circ - (pct / 100) * circ;

    const avatar = s.avatar
        ? `<img src="${s.avatar}" class="summary-avatar" alt="${escapeHTML(s.name)}">`
        : `<div class="summary-avatar-placeholder">${escapeHTML(s.name.charAt(0).toUpperCase())}</div>`;

    const lowBadge = isLow
        ? `<div class="low-att-badge"><i class="fas fa-exclamation-triangle"></i> Low Attendance</div>`
        : '';

    const barWidth = noData ? '0' : pct;

    return `
    <div class="summary-card ${isLow ? 'low-att' : ''}">
        <div class="summary-top">
            ${avatar}
            <div>
                <div class="summary-name">${escapeHTML(s.name)}</div>
                <div class="summary-roll"><i class="fas fa-id-badge"></i> ${escapeHTML(s.roll_number)}</div>
            </div>
        </div>

        ${lowBadge}

        <div class="summary-pct-row">
            <div class="pct-ring-wrap">
                <svg width="64" height="64" viewBox="0 0 64 64">
                    <circle class="pct-ring-bg" cx="32" cy="32" r="${radius}"/>
                    <circle class="pct-ring-fg ${pctClass}"
                        cx="32" cy="32" r="${radius}"
                        stroke-dasharray="${circ}"
                        stroke-dashoffset="${offset}"/>
                </svg>
                <div class="pct-ring-text">
                    ${noData
                        ? '<span class="pct-ring-na">N/A</span>'
                        : `<span>${pct}%</span>`}
                </div>
            </div>

            <div class="summary-counts">
                <div class="sc-row">
                    <span class="sc-label"><span class="sc-dot present"></span> Present</span>
                    <span class="sc-val">${s.present || 0}</span>
                </div>
                <div class="sc-row">
                    <span class="sc-label"><span class="sc-dot late"></span> Late</span>
                    <span class="sc-val">${s.late || 0}</span>
                </div>
                <div class="sc-row">
                    <span class="sc-label"><span class="sc-dot absent"></span> Absent</span>
                    <span class="sc-val">${s.absent || 0}</span>
                </div>
                <div class="sc-row" style="margin-top:.2rem;border-top:1px solid rgba(42,250,223,.07);padding-top:.2rem;">
                    <span class="sc-label" style="color:var(--text-secondary)">Total Days</span>
                    <span class="sc-val">${s.total_days || 0}</span>
                </div>
            </div>
        </div>

        <div class="summary-progress-wrap">
            <div class="summary-progress-bar ${pctClass}" style="width:${barWidth}%"></div>
        </div>

        <button class="btn-history" id="hist-btn-${s.student_id}">
            <i class="fas fa-history"></i> View Full History
        </button>
    </div>`;
}

// ─── History modal ────────────────────────────────────────────────
async function openHistoryModal(studentId, name, roll) {
    D.historyModalTitle.innerHTML = '<i class="fas fa-history"></i> Attendance History';
    D.historyModalSubtitle.textContent = `${name} — ${roll}`;
    D.historyContent.innerHTML = '<div class="hist-empty"><i class="fas fa-spinner fa-spin"></i> Loading…</div>';
    D.historyModal.classList.add('active');

    try {
        const data = await api('GET', `/api/attendance/history/${studentId}`);
        const history = data.history;

        if (history.length === 0) {
            D.historyContent.innerHTML = '<div class="hist-empty">No attendance records found for this student.</div>';
            return;
        }

        // Build from newest to oldest
        const reversed = [...history].reverse();
        D.historyContent.innerHTML = reversed.map(h => `
            <div class="hist-row">
                <span class="hist-date"><i class="fas fa-calendar-day"></i> ${formatDateDisplay(h.date)}</span>
                <span class="hist-status ${h.status}">${h.status.charAt(0).toUpperCase() + h.status.slice(1)}</span>
            </div>
        `).join('');
    } catch (err) {
        D.historyContent.innerHTML = `<div class="hist-empty" style="color:#ff6b6b">${err.message}</div>`;
    }
}

function closeHistoryModal() {
    D.historyModal.classList.remove('active');
}

// ─── Wire everything ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    D = {
        loginGate:         $('loginGate'),
        dashboard:         $('dashboard'),
        navUserArea:       $('navUserArea'),

        authModal:         $('authModal'),
        tabLogin:          $('tabLogin'),
        tabRegister:       $('tabRegister'),
        loginForm:         $('loginForm'),
        registerForm:      $('registerForm'),
        authError:         $('authError'),
        loginUsername:     $('loginUsername'),
        loginPassword:     $('loginPassword'),
        loginBtn:          $('loginBtn'),
        regUsername:       $('regUsername'),
        regPassword:       $('regPassword'),
        regConfirm:        $('regConfirm'),
        registerBtn:       $('registerBtn'),

        tabTake:           $('tabTake'),
        tabSummary:        $('tabSummary'),
        paneTake:          $('paneTake'),
        paneSummary:       $('paneSummary'),

        attDate:           $('attDate'),
        markAllPresent:    $('markAllPresent'),
        markAllAbsent:     $('markAllAbsent'),
        dayPresent:        $('dayPresent'),
        dayLate:           $('dayLate'),
        dayAbsent:         $('dayAbsent'),
        dayTotal:          $('dayTotal'),
        attList:           $('attList'),
        attEmpty:          $('attEmpty'),
        attSaveRow:        $('attSaveRow'),
        saveAttendanceBtn: $('saveAttendanceBtn'),

        summaryGrid:       $('summaryGrid'),
        summaryEmpty:      $('summaryEmpty'),

        historyModal:      $('historyModal'),
        historyModalTitle: $('historyModalTitle'),
        historyModalSubtitle: $('historyModalSubtitle'),
        historyContent:    $('historyContent'),
        closeHistoryBtn:   $('closeHistoryBtn'),

        toast:             $('toast'),
        toastIcon:         $('toastIcon'),
        toastMsg:          $('toastMsg'),
    };

    // Auth
    D.openAuthBtn && D.openAuthBtn.addEventListener('click', openAuthModal);
    D.tabLogin.addEventListener('click',    () => switchTab('login'));
    D.tabRegister.addEventListener('click', () => switchTab('register'));
    D.loginBtn.addEventListener('click',    handleLogin);
    D.registerBtn.addEventListener('click', handleRegister);
    D.authModal.addEventListener('click',   e => { if (e.target === D.authModal) closeAuthModal(); });

    // Main tabs
    D.tabTake.addEventListener('click',    () => switchMainTab('take'));
    D.tabSummary.addEventListener('click', () => switchMainTab('summary'));

    // Date change
    D.attDate.addEventListener('change', e => loadAttendanceForDate(e.target.value));

    // Quick mark all
    D.markAllPresent.addEventListener('click', () => markAll('present'));
    D.markAllAbsent.addEventListener('click',  () => markAll('absent'));

    // Save attendance
    D.saveAttendanceBtn.addEventListener('click', saveAttendance);

    // History modal
    D.closeHistoryBtn.addEventListener('click', closeHistoryModal);
    D.historyModal.addEventListener('click', e => { if (e.target === D.historyModal) closeHistoryModal(); });

    // Enter key for login
    [D.loginUsername, D.loginPassword].forEach(el =>
        el.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); }));
    [D.regUsername, D.regPassword, D.regConfirm].forEach(el =>
        el.addEventListener('keydown', e => { if (e.key === 'Enter') handleRegister(); }));

    // ESC closes modals
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') { closeAuthModal(); closeHistoryModal(); }
    });

    // Handle the login gate button (rendered after initPage)
    document.addEventListener('click', e => {
        if (e.target && e.target.id === 'openAuthBtn') openAuthModal();
    });

    initPage();
});