/* ==============================================
   students.js  —  place in:  js/students.js
   Talks to the Express API routes in server.js
   ============================================== */

'use strict';

// ─── State ───────────────────────────────────
let allStudents   = [];   // local cache from server
let currentEditId = null; // null = add mode, number = edit mode
let pendingDelete = null; // student id waiting for delete confirm
let pendingAvatar = null; // base64 string or null

// ─── DOM refs (filled on DOMContentLoaded) ───
let D = {};

// ─── Helpers ─────────────────────────────────
function $(id) { return document.getElementById(id); }

function escapeHTML(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}

let toastTimer;
function showToast(msg, isError = false) {
    D.toast.className    = 'toast' + (isError ? ' error' : '');
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

function showError(el, msg) {
    el.textContent = msg;
    el.classList.add('show');
}
function clearError(el) {
    el.textContent = '';
    el.classList.remove('show');
}

// ─── API wrapper ─────────────────────────────
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

// ─── Auth modal ──────────────────────────────
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
    await initPage();
    showToast('Logged out successfully.');
}

// ─── Page init ───────────────────────────────
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
        await loadStudents();
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

// ─── Load & render students ──────────────────
async function loadStudents() {
    try {
        const data = await api('GET', '/api/students');
        allStudents = data.students;
        renderStudents(D.searchInput.value);
    } catch (err) {
        showToast('Could not load students: ' + err.message, true);
    }
}

function updateStats() {
    D.statTotal.textContent = allStudents.length;
    D.statA1.textContent    = allStudents.filter(s => s.assignment1).length;
    D.statA2.textContent    = allStudents.filter(s => s.assignment2).length;
    D.statBoth.textContent  = allStudents.filter(s => s.assignment1 && s.assignment2).length;
}

function renderStudents(filter = '') {
    updateStats();

    let list = allStudents;
    const f = filter.toLowerCase().trim();
    if (f) {
        list = list.filter(s =>
            s.name.toLowerCase().includes(f) ||
            s.roll_number.toLowerCase().includes(f)
        );
    }

    if (list.length === 0) {
        D.studentsGrid.innerHTML = '';
        D.emptyState.style.display = 'block';
        return;
    }
    D.emptyState.style.display = 'none';
    D.studentsGrid.innerHTML   = list.map(buildCardHTML).join('');

    // Wire up listeners per card
    list.forEach(s => {
        $('edit-btn-' + s.id).addEventListener('click', () => openEditModal(s.id));
        $('del-btn-'  + s.id).addEventListener('click', () => openDeleteModal(s.id, s.name));
        $('chk-a1-'   + s.id).addEventListener('change', (e) => toggleAssignment(s.id, 'assignment1', e.target.checked));
        $('chk-a2-'   + s.id).addEventListener('change', (e) => toggleAssignment(s.id, 'assignment2', e.target.checked));
    });
}

function buildCardHTML(s) {
    const avatar = s.avatar
        ? `<img src="${s.avatar}" class="student-avatar" alt="${escapeHTML(s.name)}">`
        : `<div class="student-avatar-placeholder">${escapeHTML(s.name.charAt(0).toUpperCase())}</div>`;

    return `
    <div class="student-card" id="card-${s.id}">
        <div class="card-top">
            ${avatar}
            <div class="student-info">
                <div class="student-name">${escapeHTML(s.name)}</div>
                <div class="student-roll"><i class="fas fa-id-badge"></i> ${escapeHTML(s.roll_number)}</div>
            </div>
            <div class="card-actions">
                <button class="btn-icon" id="edit-btn-${s.id}" title="Edit"><i class="fas fa-pen"></i></button>
                <button class="btn-icon danger" id="del-btn-${s.id}" title="Delete"><i class="fas fa-trash"></i></button>
            </div>
        </div>
        <div class="assignments">
            <div class="assignment-row">
                <span class="assignment-label"><i class="fas fa-file-alt"></i> Assignment 1</span>
                <div class="assignment-right">
                    <span class="status-badge ${s.assignment1 ? 'status-done' : 'status-pending'}" id="badge-a1-${s.id}">
                        ${s.assignment1 ? 'Done' : 'Pending'}
                    </span>
                    <label class="toggle-switch">
                        <input type="checkbox" id="chk-a1-${s.id}" ${s.assignment1 ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
            <div class="assignment-row">
                <span class="assignment-label"><i class="fas fa-file-alt"></i> Assignment 2</span>
                <div class="assignment-right">
                    <span class="status-badge ${s.assignment2 ? 'status-done' : 'status-pending'}" id="badge-a2-${s.id}">
                        ${s.assignment2 ? 'Done' : 'Pending'}
                    </span>
                    <label class="toggle-switch">
                        <input type="checkbox" id="chk-a2-${s.id}" ${s.assignment2 ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
        </div>
    </div>`;
}

// ─── Toggle assignment ───────────────────────
async function toggleAssignment(id, field, value) {
    // Optimistic UI update
    const student = allStudents.find(s => s.id === id);
    if (student) student[field] = value;
    updateStats();

    const badge = $('badge-' + (field === 'assignment1' ? 'a1' : 'a2') + '-' + id);
    if (badge) {
        badge.className   = 'status-badge ' + (value ? 'status-done' : 'status-pending');
        badge.textContent = value ? 'Done' : 'Pending';
    }

    try {
        await api('PATCH', `/api/students/${id}/assignment`, { field, value });
    } catch (err) {
        // Revert on failure
        if (student) student[field] = !value;
        updateStats();
        showToast('Could not save: ' + err.message, true);
        renderStudents(D.searchInput.value);
    }
}

// ─── Delete ──────────────────────────────────
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

        // Animate card out, then remove from local list
        const card = $('card-' + id);
        if (card) {
            card.style.transition = 'opacity .25s, transform .25s';
            card.style.opacity    = '0';
            card.style.transform  = 'scale(.95)';
            setTimeout(() => {
                allStudents = allStudents.filter(s => s.id !== id);
                closeDeleteModal();
                renderStudents(D.searchInput.value);
            }, 260);
        } else {
            allStudents = allStudents.filter(s => s.id !== id);
            closeDeleteModal();
            renderStudents(D.searchInput.value);
        }
        showToast('Student deleted.');
    } catch (err) {
        showToast('Delete failed: ' + err.message, true);
    } finally {
        setLoading(D.confirmDeleteBtn, false);
    }
}

// ─── Add / Edit modal ────────────────────────
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
    D.studentModalTitle.textContent = 'Edit Student';
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
            // PUT update
            const data = await api('PUT', `/api/students/${currentEditId}`, {
                roll_number: roll,
                name,
                avatar: pendingAvatar,
            });
            const idx = allStudents.findIndex(s => s.id === currentEditId);
            if (idx !== -1) allStudents[idx] = data.student;
            showToast('Student updated!');
        } else {
            // POST create
            const data = await api('POST', '/api/students', {
                roll_number: roll,
                name,
                avatar: pendingAvatar,
            });
            allStudents.push(data.student);
            showToast('Student added!');
        }
        closeStudentModal();
        renderStudents(D.searchInput.value);
    } catch (err) {
        showError(D.studentError, err.message);
    } finally {
        setLoading(D.saveStudentBtn, false);
    }
}

function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
        showToast('Image too large — max 2 MB.', true);
        return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
        pendingAvatar = ev.target.result;
        D.avatarPreview.innerHTML =
            `<img src="${ev.target.result}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
    };
    reader.readAsDataURL(file);
}

// ─── Event wiring ────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    D = {
        loginGate:       $('loginGate'),
        dashboard:       $('dashboard'),
        navUserArea:     $('navUserArea'),

        authModal:       $('authModal'),
        tabLogin:        $('tabLogin'),
        tabRegister:     $('tabRegister'),
        loginForm:       $('loginForm'),
        registerForm:    $('registerForm'),
        authError:       $('authError'),
        loginUsername:   $('loginUsername'),
        loginPassword:   $('loginPassword'),
        loginBtn:        $('loginBtn'),
        regUsername:     $('regUsername'),
        regPassword:     $('regPassword'),
        regConfirm:      $('regConfirm'),
        registerBtn:     $('registerBtn'),

        studentModal:        $('studentModal'),
        studentModalTitle:   $('studentModalTitle'),
        studentError:        $('studentError'),
        avatarPreview:       $('avatarPreview'),
        avatarUploadBtn:     $('avatarUploadBtn'),
        avatarFileInput:     $('avatarFileInput'),
        studentRoll:         $('studentRoll'),
        studentName:         $('studentName'),
        saveStudentBtn:      $('saveStudentBtn'),
        cancelStudentBtn:    $('cancelStudentBtn'),

        deleteModal:     $('deleteModal'),
        deleteModalMsg:  $('deleteModalMsg'),
        confirmDeleteBtn:$('confirmDeleteBtn'),
        cancelDeleteBtn: $('cancelDeleteBtn'),

        openAuthBtn:     $('openAuthBtn'),
        addStudentBtn:   $('addStudentBtn'),
        searchInput:     $('searchInput'),
        studentsGrid:    $('studentsGrid'),
        emptyState:      $('emptyState'),

        statTotal: $('statTotal'),
        statA1:    $('statA1'),
        statA2:    $('statA2'),
        statBoth:  $('statBoth'),

        toast:     $('toast'),
        toastIcon: $('toastIcon'),
        toastMsg:  $('toastMsg'),
    };

    // Auth modal
    D.openAuthBtn.addEventListener('click', openAuthModal);
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
    D.searchInput.addEventListener('input', e => renderStudents(e.target.value));

    // Enter key support
    [D.loginUsername, D.loginPassword].forEach(el =>
        el.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); }));
    [D.regUsername, D.regPassword, D.regConfirm].forEach(el =>
        el.addEventListener('keydown', e => { if (e.key === 'Enter') handleRegister(); }));
    [D.studentRoll, D.studentName].forEach(el =>
        el.addEventListener('keydown', e => { if (e.key === 'Enter') saveStudent(); }));

    // ESC closes any open modal
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') { closeAuthModal(); closeStudentModal(); closeDeleteModal(); }
    });

    initPage();
});