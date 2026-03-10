/* ==============================================
   students.js  —  Profile Hub + Analytics
   Fetches: /api/students, /api/attendance/summary
   No assignment/marks editing here — all on dedicated pages
   ============================================== */
'use strict';

// ─── State ────────────────────────────────────────────────────────
let allStudents    = [];   // raw from /api/students
let attSummary     = {};   // { studentId: { percentage, present, late, absent, total_days } }
let compositeData  = [];   // merged analytics per student
let activeFilter   = 'all';
let currentEditId  = null;
let pendingDelete  = null;
let pendingAvatar  = null;

let D = {};

// ─── Helpers ──────────────────────────────────────────────────────
function $(id) { return document.getElementById(id); }

function escapeHTML(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}

let toastTimer;
function showToast(msg, isError = false) {
    D.toast.className      = 'toast' + (isError ? ' error' : '');
    D.toastIcon.className  = isError ? 'fas fa-exclamation-circle' : 'fas fa-check-circle';
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

// ─── API wrapper ──────────────────────────────────────────────────
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
    allStudents = [];
    attSummary  = {};
    compositeData = [];
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
            <div style="display:flex;align-items:center;gap:.6rem;">
                <div class="nav-user-badge">
                    <i class="fas fa-user-circle"></i>
                    <span>${escapeHTML(teacher.username)}</span>
                </div>
                <button class="nav-link-btn" id="logoutBtn">
                    <i class="fas fa-sign-out-alt"></i> Logout
                </button>
            </div>`;
        $('logoutBtn').addEventListener('click', handleLogout);
        D.loginGate.style.display = 'none';
        D.dashboard.style.display = 'block';
        await loadAll();
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

// ─── Load all data ────────────────────────────────────────────────
async function loadAll() {
    // Show skeletons
    D.profileGrid.innerHTML = [1,2,3,4,5,6].map(() =>
        '<div class="skeleton-card"></div>'
    ).join('');

    try {
        // Parallel fetch
        const [studentsData, summaryData] = await Promise.all([
            api('GET', '/api/students'),
            api('GET', '/api/attendance/summary').catch(() => ({ summary: [] }))
        ]);

        allStudents = studentsData.students;

        // Build attendance lookup
        attSummary = {};
        (summaryData.summary || []).forEach(s => {
            attSummary[s.student_id] = s;
        });

        buildCompositeData();
        renderProfiles();
    } catch (err) {
        showToast('Could not load data: ' + err.message, true);
        D.profileGrid.innerHTML = '';
    }
}

// ─── Build composite analytics per student ────────────────────────
function buildCompositeData() {
    compositeData = allStudents.map(s => {
        const att  = attSummary[s.id] || null;

        // ── Attendance score (0–100) ──────────────────────────
        const attPct = att && att.total_days > 0
            ? Math.round(((att.present + att.late) / att.total_days) * 100)
            : null;

        // ── Submissions score (0–100) — 5 items ──────────────
        const subItems = [s.assignment1, s.assignment2, s.record_book, s.obs_book, s.ppt_submitted];
        const subDone  = subItems.filter(Boolean).length;
        const subPct   = Math.round((subDone / 5) * 100);

        // ── Marks score (0–100) — total /160 ─────────────────
        const markVals = [s.mark_mid1, s.mark_mid2, s.mark_internal_lab, s.mark_external_lab]
            .filter(v => v !== null && v !== undefined);
        const markTotal = markVals.reduce((a, b) => a + b, 0);
        const markMax   = 160;
        const markPct   = markVals.length > 0 ? Math.round((markTotal / markMax) * 100) : null;

        // ── Behaviour score (0–100) — warnings reduce, highlight adds ──
        // Base: 100. -25 per warning. +10 if highlighted (capped at 100).
        let behScore = 100 - (s.warnings * 25);
        if (s.highlighted) behScore = Math.min(100, behScore + 10);
        behScore = Math.max(0, behScore);

        // ── Composite score ───────────────────────────────────
        // Weights: Attendance 30%, Submissions 20%, Marks 35%, Behaviour 15%
        let composite = null;
        const hasAny = attPct !== null || markPct !== null;

        if (hasAny) {
            const attW  = attPct  !== null ? attPct  : 50; // assume 50 if no data
            const markW = markPct !== null ? markPct : 50;
            composite = Math.round(
                attW  * 0.30 +
                subPct * 0.20 +
                markW * 0.35 +
                behScore * 0.15
            );
        }

        // ── Grade ─────────────────────────────────────────────
        let grade = 'N';
        if (composite !== null) {
            if (composite >= 90) grade = 'S';
            else if (composite >= 75) grade = 'A';
            else if (composite >= 60) grade = 'B';
            else if (composite >= 45) grade = 'C';
            else grade = 'D';
        }

        return {
            ...s,
            attPct, subPct, markPct, behScore, markTotal, markMax,
            composite, grade,
            attRaw: att,
            subDone
        };
    });
}

// ─── Render ───────────────────────────────────────────────────────
function renderProfiles() {
    updateOverview();

    const q = D.searchInput.value.toLowerCase().trim();

    const filtered = compositeData.filter(s => {
        const matchQ = !q ||
            s.name.toLowerCase().includes(q) ||
            s.roll_number.toLowerCase().includes(q);
        if (!matchQ) return false;
        if (activeFilter === 'all') return true;
        return s.grade === activeFilter.toUpperCase();
    });

    if (filtered.length === 0) {
        D.profileGrid.innerHTML   = '';
        D.emptyState.style.display = 'block';
        return;
    }
    D.emptyState.style.display = 'none';
    D.profileGrid.innerHTML = filtered.map(buildCardHTML).join('');

    // Wire action buttons
    filtered.forEach(s => {
        $('pc-edit-'   + s.id).addEventListener('click', () => openEditModal(s.id));
        $('pc-delete-' + s.id).addEventListener('click', () => openDeleteModal(s.id, s.name));
    });
}

function updateOverview() {
    const grades = { S: 0, A: 0, B: 0, C: 0, D: 0, N: 0 };
    compositeData.forEach(s => { grades[s.grade] = (grades[s.grade] || 0) + 1; });

    $('ovTotal').textContent = compositeData.length;
    $('ovS').textContent = grades.S;
    $('ovA').textContent = grades.A;
    $('ovB').textContent = grades.B;
    $('ovC').textContent = grades.C;
    $('ovD').textContent = grades.D;
    $('ovN').textContent = grades.N;
}

// ─── Build one profile card ───────────────────────────────────────
function buildCardHTML(s) {
    const avatar = s.avatar
        ? `<img src="${s.avatar}" class="pc-avatar" alt="${escapeHTML(s.name)}">`
        : `<div class="pc-avatar-ph">${escapeHTML(s.name.charAt(0).toUpperCase())}</div>`;

    const gradeClass = 'grade-' + s.grade;

    // SVG ring
    const r    = 34;
    const circ = 2 * Math.PI * r;
    const pct  = s.composite !== null ? s.composite : 0;
    const offset = circ - (pct / 100) * circ;
    const ringClass = 'r' + s.grade;

    // Grade badge label
    const gradeLabel = s.grade === 'N'
        ? '<i class="fas fa-question"></i>'
        : s.grade;

    // Score display
    const scoreDisplay = s.composite !== null
        ? `${s.composite}<span>%</span>`
        : `<span style="font-size:.7rem">N/A</span>`;

    // Metric bars
    const attVal  = s.attPct  !== null ? s.attPct  + '%' : 'N/A';
    const attW    = s.attPct  !== null ? s.attPct  : 0;
    const markVal = s.markPct !== null ? s.markPct + '%' : 'N/A';
    const markW   = s.markPct !== null ? s.markPct : 0;

    // Chips
    const chips = buildChips(s);

    return `
    <div class="profile-card ${gradeClass}" id="pc-card-${s.id}">

        <div class="pc-header">
            ${avatar}
            <div class="pc-info">
                <div class="pc-name">${escapeHTML(s.name)}</div>
                <div class="pc-roll"><i class="fas fa-id-badge"></i> ${escapeHTML(s.roll_number)}</div>
            </div>
            <div class="pc-grade-badge">${gradeLabel}</div>
            <div class="pc-actions">
                <button class="btn-icon" id="pc-edit-${s.id}" title="Edit Profile"><i class="fas fa-pen"></i></button>
                <button class="btn-icon danger" id="pc-delete-${s.id}" title="Delete"><i class="fas fa-trash"></i></button>
            </div>
        </div>

        <div class="pc-score-row">
            <div class="pc-score-ring">
                <svg width="80" height="80" viewBox="0 0 80 80">
                    <circle class="ring-bg" cx="40" cy="40" r="${r}"/>
                    <circle class="ring-fg ${ringClass}" cx="40" cy="40" r="${r}"
                        stroke-dasharray="${circ.toFixed(2)}"
                        stroke-dashoffset="${offset.toFixed(2)}"/>
                </svg>
                <div class="pc-score-num">${scoreDisplay}</div>
            </div>

            <div class="pc-metrics">
                <div class="pc-metric">
                    <span class="pm-label"><i class="fas fa-calendar-check" style="color:var(--accent-teal)"></i> Attendance</span>
                    <div class="pm-bar-wrap"><div class="pm-bar att" style="width:${attW}%"></div></div>
                    <span class="pm-val">${attVal}</span>
                </div>
                <div class="pc-metric">
                    <span class="pm-label"><i class="fas fa-tasks" style="color:var(--accent-blue)"></i> Submissions</span>
                    <div class="pm-bar-wrap"><div class="pm-bar sub" style="width:${s.subPct}%"></div></div>
                    <span class="pm-val">${s.subDone}/5</span>
                </div>
                <div class="pc-metric">
                    <span class="pm-label"><i class="fas fa-chart-bar" style="color:#b06aff"></i> Marks</span>
                    <div class="pm-bar-wrap"><div class="pm-bar mrk" style="width:${markW}%"></div></div>
                    <span class="pm-val">${markVal}</span>
                </div>
                <div class="pc-metric">
                    <span class="pm-label"><i class="fas fa-user-check" style="color:var(--accent-amber)"></i> Behaviour</span>
                    <div class="pm-bar-wrap"><div class="pm-bar beh" style="width:${s.behScore}%"></div></div>
                    <span class="pm-val">${s.behScore}%</span>
                </div>
            </div>
        </div>

        <div class="pc-divider"></div>

        <div class="pc-chips">
            ${chips}
        </div>

        <div class="pc-nav">
            <a href="attendance.html" class="pc-nav-btn att" title="Attendance">
                <i class="fas fa-calendar-check"></i> Attendance
            </a>
            <a href="submissions.html" class="pc-nav-btn sub" title="Submissions">
                <i class="fas fa-tasks"></i> Submissions
            </a>
            <a href="marks.html" class="pc-nav-btn mrk" title="Marks">
                <i class="fas fa-chart-bar"></i> Marks
            </a>
        </div>
    </div>`;
}

function buildChips(s) {
    const chips = [];

    // Attendance chip
    if (s.attPct !== null) {
        chips.push(`<span class="pc-chip chip-att"><i class="fas fa-calendar-check"></i> ${s.attPct}% Att.</span>`);
    } else {
        chips.push(`<span class="pc-chip chip-nodata"><i class="fas fa-calendar-times"></i> No Att. Data</span>`);
    }

    // Marks chip
    if (s.markPct !== null) {
        chips.push(`<span class="pc-chip chip-marks"><i class="fas fa-chart-bar"></i> ${s.markTotal}/${s.markMax} Marks</span>`);
    } else {
        chips.push(`<span class="pc-chip chip-nodata"><i class="fas fa-file-alt"></i> No Marks</span>`);
    }

    // Submissions chip
    chips.push(`<span class="pc-chip chip-sub"><i class="fas fa-tasks"></i> ${s.subDone}/5 Subs.</span>`);

    // Highlight chip
    if (s.highlighted) {
        chips.push(`<span class="pc-chip chip-hl"><i class="fas fa-star"></i> Highlighted</span>`);
    }

    // Warnings chip
    if (s.warnings > 0) {
        chips.push(`<span class="pc-chip chip-warn"><i class="fas fa-exclamation-triangle"></i> ${s.warnings}/3 Warnings</span>`);
    }

    return chips.join('');
}

// ─── Add / Edit modal ─────────────────────────────────────────────
function openAddModal() {
    currentEditId = null;
    pendingAvatar = null;
    D.studentModalTitle.textContent = 'Add Student';
    D.studentRoll.value             = '';
    D.studentName.value             = '';
    D.avatarPreview.innerHTML       = '<i class="fas fa-camera"></i>';
    clearError(D.studentError);
    D.studentModal.classList.add('active');
    D.studentRoll.focus();
}

function openEditModal(id) {
    const s = allStudents.find(x => x.id === id);
    if (!s) return;
    currentEditId = id;
    pendingAvatar = s.avatar || null;
    D.studentModalTitle.textContent = 'Edit Profile';
    D.studentRoll.value             = s.roll_number;
    D.studentName.value             = s.name;
    D.avatarPreview.innerHTML       = s.avatar
        ? `<img src="${s.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
        : '<i class="fas fa-camera"></i>';
    clearError(D.studentError);
    D.studentModal.classList.add('active');
    D.studentName.focus();
}

function closeStudentModal() {
    D.studentModal.classList.remove('active');
    pendingAvatar = null;
    currentEditId = null;
}

async function saveStudent() {
    const roll = D.studentRoll.value.trim();
    const name = D.studentName.value.trim();
    if (!roll || !name) return showError(D.studentError, 'Roll number and name are required.');
    clearError(D.studentError);
    setLoading(D.saveStudentBtn, true);
    try {
        if (currentEditId) {
            const data = await api('PUT', `/api/students/${currentEditId}`, {
                roll_number: roll, name, avatar: pendingAvatar,
            });
            const idx = allStudents.findIndex(s => s.id === currentEditId);
            if (idx !== -1) allStudents[idx] = data.student;
            showToast('Profile updated!');
        } else {
            const data = await api('POST', '/api/students', {
                roll_number: roll, name, avatar: pendingAvatar,
            });
            allStudents.push(data.student);
            showToast('Student added!');
        }
        closeStudentModal();
        buildCompositeData();
        renderProfiles();
    } catch (err) {
        showError(D.studentError, err.message);
    } finally {
        setLoading(D.saveStudentBtn, false);
    }
}

function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast('Image too large — max 2 MB.', true); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
        pendingAvatar = ev.target.result;
        D.avatarPreview.innerHTML =
            `<img src="${ev.target.result}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
    };
    reader.readAsDataURL(file);
}

// ─── Delete ───────────────────────────────────────────────────────
function openDeleteModal(id, name) {
    pendingDelete = id;
    D.deleteModalMsg.textContent = `Delete "${name}"? This cannot be undone.`;
    D.deleteModal.classList.add('active');
}
function closeDeleteModal() {
    pendingDelete = null;
    D.deleteModal.classList.remove('active');
}

async function confirmDelete() {
    if (!pendingDelete) return;
    const id = pendingDelete;
    setLoading(D.confirmDeleteBtn, true);
    try {
        await api('DELETE', `/api/students/${id}`);
        allStudents = allStudents.filter(s => s.id !== id);
        delete attSummary[id];
        closeDeleteModal();
        buildCompositeData();
        renderProfiles();
        showToast('Student deleted.');
    } catch (err) {
        showToast('Delete failed: ' + err.message, true);
    } finally {
        setLoading(D.confirmDeleteBtn, false);
    }
}

// ─── Grade filter ─────────────────────────────────────────────────
function setFilter(f) {
    activeFilter = f;
    ['All', 'S', 'A', 'B', 'C', 'D', 'N'].forEach(g => {
        const el = $('gf' + (g === 'All' ? 'All' : g));
        if (el) el.classList.toggle('active', f === (g === 'All' ? 'all' : g));
    });
    renderProfiles();
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

        studentModal:      $('studentModal'),
        studentModalTitle: $('studentModalTitle'),
        studentError:      $('studentError'),
        avatarPreview:     $('avatarPreview'),
        avatarUploadBtn:   $('avatarUploadBtn'),
        avatarFileInput:   $('avatarFileInput'),
        studentRoll:       $('studentRoll'),
        studentName:       $('studentName'),
        saveStudentBtn:    $('saveStudentBtn'),
        cancelStudentBtn:  $('cancelStudentBtn'),

        deleteModal:       $('deleteModal'),
        deleteModalMsg:    $('deleteModalMsg'),
        confirmDeleteBtn:  $('confirmDeleteBtn'),
        cancelDeleteBtn:   $('cancelDeleteBtn'),

        addStudentBtn:     $('addStudentBtn'),
        searchInput:       $('searchInput'),
        profileGrid:       $('profileGrid'),
        emptyState:        $('emptyState'),

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

    // Student modal
    D.addStudentBtn.addEventListener('click',    openAddModal);
    D.saveStudentBtn.addEventListener('click',   saveStudent);
    D.cancelStudentBtn.addEventListener('click', closeStudentModal);
    D.avatarUploadBtn.addEventListener('click',  () => D.avatarFileInput.click());
    D.avatarPreview.addEventListener('click',    () => D.avatarFileInput.click());
    D.avatarFileInput.addEventListener('change', handleAvatarUpload);
    D.studentModal.addEventListener('click',     e => { if (e.target === D.studentModal) closeStudentModal(); });

    // Delete modal
    D.confirmDeleteBtn.addEventListener('click', confirmDelete);
    D.cancelDeleteBtn.addEventListener('click',  closeDeleteModal);
    D.deleteModal.addEventListener('click',      e => { if (e.target === D.deleteModal) closeDeleteModal(); });

    // Search
    D.searchInput.addEventListener('input', () => renderProfiles());

    // Grade filters
    $('gfAll').addEventListener('click', () => setFilter('all'));
    $('gfS').addEventListener('click',   () => setFilter('S'));
    $('gfA').addEventListener('click',   () => setFilter('A'));
    $('gfB').addEventListener('click',   () => setFilter('B'));
    $('gfC').addEventListener('click',   () => setFilter('C'));
    $('gfD').addEventListener('click',   () => setFilter('D'));
    $('gfN').addEventListener('click',   () => setFilter('N'));

    // Enter keys
    [D.loginUsername, D.loginPassword].forEach(el =>
        el.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); }));
    [D.regUsername, D.regPassword, D.regConfirm].forEach(el =>
        el.addEventListener('keydown', e => { if (e.key === 'Enter') handleRegister(); }));
    [D.studentRoll, D.studentName].forEach(el =>
        el.addEventListener('keydown', e => { if (e.key === 'Enter') saveStudent(); }));

    // ESC
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            closeAuthModal();
            closeStudentModal();
            closeDeleteModal();
        }
    });

    // Auth gate button (dynamically rendered)
    document.addEventListener('click', e => {
        if (e.target && e.target.id === 'openAuthBtn') openAuthModal();
    });

    initPage();
});