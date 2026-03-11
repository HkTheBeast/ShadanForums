/* ============================================================
   planner.js  —  place in:  public/js/planner.js
   Teaching Planner: Progress Trackers, Curriculum, Timetable
   ============================================================ */
'use strict';

/* ── State ────────────────────────────────────────────────── */
let trackers  = [];
let subjects  = [];   // each subject has .topics array; each topic has .subtopics array
let slots     = [];
let activeTab = 'schedule';
let sectionFilter = 'all';
let D = {};

/* ── Helpers ──────────────────────────────────────────────── */
function $(id) { return document.getElementById(id); }
function esc(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }

let _toastTimer;
function showToast(msg, isError = false) {
    D.toast.className     = 'toast' + (isError ? ' error' : '');
    D.toastIcon.className = isError ? 'fas fa-exclamation-circle' : 'fas fa-check-circle';
    D.toastMsg.textContent = msg;
    D.toast.classList.add('show');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => D.toast.classList.remove('show'), 3200);
}
function setLoading(btn, on) {
    if (on) { btn.disabled = true; btn.dataset.orig = btn.innerHTML; btn.innerHTML = '<span class="spinner"></span> Please wait…'; }
    else    { btn.disabled = false; btn.innerHTML = btn.dataset.orig || btn.innerHTML; }
}
function showPErr(el, msg) { el.textContent = msg; el.classList.add('show'); }
function clearPErr(el)     { el.textContent = '';  el.classList.remove('show'); }

/* ── API wrapper ──────────────────────────────────────────── */
async function api(method, path, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin' };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const res  = await fetch(path, opts);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Server error');
    return data;
}

/* ── Hamburger nav ────────────────────────────────────────── */
function initHamburger() {
    const btn   = $('navHamburger');
    const links = $('navLinks');
    if (!btn || !links) return;
    btn.addEventListener('click', () => { btn.classList.toggle('open'); links.classList.toggle('open'); });
    links.querySelectorAll('.nav-link-btn').forEach(link => {
        link.addEventListener('click', () => { btn.classList.remove('open'); links.classList.remove('open'); });
    });
    document.addEventListener('click', e => {
        if (!btn.contains(e.target) && !links.contains(e.target)) {
            btn.classList.remove('open'); links.classList.remove('open');
        }
    });
}

/* ── Auth ─────────────────────────────────────────────────── */
function openAuthModal()  { clearPErr(D.authError); D.authModal.classList.add('active'); D.loginUsername.focus(); }
function closeAuthModal() { D.authModal.classList.remove('active'); }

function switchAuthTab(tab) {
    const isLogin = tab === 'login';
    D.loginForm.style.display    = isLogin ? 'block' : 'none';
    D.registerForm.style.display = isLogin ? 'none'  : 'block';
    D.tabLogin.classList.toggle('active',    isLogin);
    D.tabRegister.classList.toggle('active', !isLogin);
    clearPErr(D.authError);
}

async function handleLogin() {
    const u = D.loginUsername.value.trim(), p = D.loginPassword.value;
    if (!u || !p) return showPErr(D.authError, 'Please fill in all fields.');
    clearPErr(D.authError); setLoading(D.loginBtn, true);
    try {
        await api('POST', '/api/teacher/login', { username: u, password: p });
        closeAuthModal(); await initPage(); showToast('Welcome back, ' + u + '!');
    } catch (e) { showPErr(D.authError, e.message); }
    finally { setLoading(D.loginBtn, false); }
}

async function handleRegister() {
    const u = D.regUsername.value.trim(), p = D.regPassword.value, c = D.regConfirm.value;
    if (!u || !p || !c)    return showPErr(D.authError, 'Please fill in all fields.');
    if (u.length < 3)      return showPErr(D.authError, 'Username must be at least 3 characters.');
    if (p.length < 6)      return showPErr(D.authError, 'Password must be at least 6 characters.');
    if (p !== c)           return showPErr(D.authError, 'Passwords do not match.');
    clearPErr(D.authError); setLoading(D.registerBtn, true);
    try {
        await api('POST', '/api/teacher/register', { username: u, password: p });
        closeAuthModal(); await initPage(); showToast('Account created! Welcome, ' + u + '!');
    } catch (e) { showPErr(D.authError, e.message); }
    finally { setLoading(D.registerBtn, false); }
}

async function handleLogout() {
    try { await api('POST', '/api/teacher/logout'); } catch (_) {}
    trackers = []; subjects = []; slots = [];
    await initPage();
    showToast('Logged out.');
}

/* ── Init page ────────────────────────────────────────────── */
async function initPage() {
    let teacher = null;
    try { const d = await api('GET', '/api/teacher/me'); teacher = d.teacher; } catch (_) {}

    if (teacher) {
        D.navUserArea.innerHTML = `
            <div class="nav-user-badge"><i class="fas fa-user-circle"></i><span>${esc(teacher.username)}</span></div>
            <button class="nav-link-btn" id="logoutBtn"><i class="fas fa-sign-out-alt"></i> Logout</button>`;
        $('logoutBtn').addEventListener('click', handleLogout);
        D.loginGate.style.display = 'none';
        D.dashboard.style.display = 'block';
        await loadAll();
    } else {
        D.navUserArea.innerHTML = `<button class="nav-link-btn" id="navLoginBtn"><i class="fas fa-sign-in-alt"></i> Login</button>`;
        $('navLoginBtn').addEventListener('click', openAuthModal);
        D.loginGate.style.display = 'block';
        D.dashboard.style.display = 'none';
    }
}

/* ── Load all data ────────────────────────────────────────── */
async function loadAll() {
    try {
        const [td, sd, sld] = await Promise.all([
            api('GET', '/api/planner/trackers'),
            api('GET', '/api/planner/subjects'),
            api('GET', '/api/planner/slots')
        ]);
        trackers = td.trackers;
        subjects = sd.subjects;
        slots    = sld.slots;
        renderTrackers();
        renderCurriculum();
        renderTimetable();
    } catch (e) { showToast('Could not load planner data: ' + e.message, true); }
}

/* ════════════════════════════════════════════
   TABS
   ════════════════════════════════════════════ */
function switchTab(tab) {
    activeTab = tab;
    document.querySelectorAll('.planner-tab').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
    document.querySelectorAll('.planner-panel').forEach(p => p.classList.remove('active'));
    const panel = { schedule: 'panelSchedule', curriculum: 'panelCurriculum', timetable: 'panelTimetable' }[tab];
    if (panel) $(panel).classList.add('active');
}

/* ════════════════════════════════════════════
   COLOR PICKER HELPER
   ════════════════════════════════════════════ */
function initColorPicker(containerId) {
    const container = $(containerId);
    if (!container) return;
    container.querySelectorAll('.cpick').forEach(dot => {
        dot.addEventListener('click', () => {
            container.querySelectorAll('.cpick').forEach(d => d.classList.remove('active'));
            dot.classList.add('active');
        });
    });
}
function getPickedColor(containerId) {
    const container = $(containerId);
    const active = container && container.querySelector('.cpick.active');
    return active ? active.dataset.color : 'teal';
}
function setPickedColor(containerId, color) {
    const container = $(containerId);
    if (!container) return;
    container.querySelectorAll('.cpick').forEach(d => d.classList.toggle('active', d.dataset.color === color));
}

/* ════════════════════════════════════════════
   PROGRESS TRACKERS
   ════════════════════════════════════════════ */
function renderTrackers() {
    if (trackers.length === 0) {
        $('trackerList').innerHTML  = '';
        $('trackerEmpty').style.display = 'block';
        return;
    }
    $('trackerEmpty').style.display = 'none';
    $('trackerList').innerHTML = trackers.map(buildTrackerCard).join('');

    trackers.forEach(t => {
        const stepInp = $('step-inp-' + t.id);
        if (stepInp) {
            stepInp.addEventListener('change', () => {
                let v = parseFloat(stepInp.value);
                if (isNaN(v)) v = t.current_val;
                v = Math.max(t.min_val, Math.min(t.max_val, v));
                stepInp.value = v;
                saveTrackerValue(t.id, v);
            });
        }
        const stepUp   = $('step-up-' + t.id);
        const stepDown = $('step-dn-' + t.id);
        const stepBig  = $('step-up5-' + t.id);
        const stepDn5  = $('step-dn5-' + t.id);
        if (stepUp)   stepUp.addEventListener('click',   () => adjustTracker(t.id, 1));
        if (stepDown) stepDown.addEventListener('click', () => adjustTracker(t.id, -1));
        if (stepBig)  stepBig.addEventListener('click',  () => adjustTracker(t.id, 5));
        if (stepDn5)  stepDn5.addEventListener('click',  () => adjustTracker(t.id, -5));

        const editBtn = $('trk-edit-' + t.id);
        const delBtn  = $('trk-del-' + t.id);
        if (editBtn) editBtn.addEventListener('click', () => openTrackerModal(t));
        if (delBtn)  delBtn.addEventListener('click',  () => deleteTracker(t.id));
    });
}

function buildTrackerCard(t) {
    const range = t.max_val - t.min_val;
    const pct   = range > 0 ? Math.round(((t.current_val - t.min_val) / range) * 100) : 0;
    const clamp = Math.max(0, Math.min(100, pct));
    const r = 36, circ = 2 * Math.PI * r;
    const offset = circ - (clamp / 100) * circ;
    const barW   = clamp;

    return `
    <div class="tracker-card tc-${t.color}" id="tracker-card-${t.id}">
        <div class="tracker-card-top">
            <div>
                <div class="tracker-name">${esc(t.name)}</div>
                ${t.description ? `<div class="tracker-desc">${esc(t.description)}</div>` : ''}
            </div>
            <div class="tracker-card-actions">
                <button class="tcard-btn" id="trk-edit-${t.id}" title="Edit"><i class="fas fa-pen"></i></button>
                <button class="tcard-btn del" id="trk-del-${t.id}" title="Delete"><i class="fas fa-trash"></i></button>
            </div>
        </div>
        <div class="tracker-progress-wrap">
            <div class="tracker-ring-wrap">
                <svg class="tracker-ring" width="88" height="88" viewBox="0 0 88 88">
                    <circle class="tracker-ring-bg"   cx="44" cy="44" r="${r}" stroke-width="7"/>
                    <circle class="tracker-ring-fill" cx="44" cy="44" r="${r}" stroke-width="7"
                        stroke-dasharray="${circ}" stroke-dashoffset="${offset}"/>
                </svg>
                <div class="tracker-ring-pct">${clamp}%</div>
            </div>
            <div class="tracker-nums">
                <div class="tracker-current-val">${t.current_val}</div>
                <div class="tracker-max-label">of ${t.max_val} ${t.unit ? esc(t.unit) : ''}</div>
                <div class="tracker-unit">min: ${t.min_val}</div>
            </div>
        </div>
        <div class="tracker-stepper">
            <button class="step-btn" id="step-dn5-${t.id}" title="-5">−5</button>
            <button class="step-btn" id="step-dn-${t.id}"  title="-1">−</button>
            <input type="number" class="step-input" id="step-inp-${t.id}" value="${t.current_val}" min="${t.min_val}" max="${t.max_val}">
            <button class="step-btn" id="step-up-${t.id}"  title="+1">+</button>
            <button class="step-btn" id="step-up5-${t.id}" title="+5">+5</button>
        </div>
        <div class="tracker-bar-wrap">
            <div class="tracker-bar-fill" style="width:${barW}%"></div>
        </div>
    </div>`;
}

function adjustTracker(id, delta) {
    const t = trackers.find(x => x.id === id);
    if (!t) return;
    const newVal = Math.max(t.min_val, Math.min(t.max_val, t.current_val + delta));
    if (newVal === t.current_val) return;
    saveTrackerValue(id, newVal);
}

let _trackerSaveTimers = {};
function saveTrackerValue(id, val) {
    const t = trackers.find(x => x.id === id);
    if (!t) return;
    t.current_val = val;
    updateTrackerCardUI(t);
    clearTimeout(_trackerSaveTimers[id]);
    _trackerSaveTimers[id] = setTimeout(async () => {
        try {
            await api('PATCH', `/api/planner/trackers/${id}/value`, { current_val: val });
        } catch (e) { showToast('Could not save tracker: ' + e.message, true); }
    }, 500);
}

function updateTrackerCardUI(t) {
    const card = $('tracker-card-' + t.id);
    if (!card) return;
    const range = t.max_val - t.min_val;
    const pct   = range > 0 ? Math.round(((t.current_val - t.min_val) / range) * 100) : 0;
    const clamp = Math.max(0, Math.min(100, pct));
    const r = 36, circ = 2 * Math.PI * r;
    const offset = circ - (clamp / 100) * circ;
    const fill = card.querySelector('.tracker-ring-fill');
    const pctEl = card.querySelector('.tracker-ring-pct');
    const curEl = card.querySelector('.tracker-current-val');
    const barEl = card.querySelector('.tracker-bar-fill');
    const inp   = $('step-inp-' + t.id);
    if (fill)  fill.style.strokeDashoffset = offset;
    if (pctEl) pctEl.textContent = clamp + '%';
    if (curEl) curEl.textContent = t.current_val;
    if (barEl) barEl.style.width = clamp + '%';
    if (inp && document.activeElement !== inp) inp.value = t.current_val;
}

/* Tracker Modal */
function openTrackerModal(t = null) {
    $('trkId').value      = t ? t.id : '';
    $('trkName').value    = t ? t.name : '';
    $('trkDesc').value    = t ? (t.description || '') : '';
    $('trkCurrent').value = t ? t.current_val : 0;
    $('trkMin').value     = t ? t.min_val : 0;
    $('trkMax').value     = t ? t.max_val : 100;
    $('trkUnit').value    = t ? (t.unit || '') : '';
    setPickedColor('trkColorPicker', t ? t.color : 'teal');
    $('trackerModalTitle').innerHTML = t
        ? '<i class="fas fa-pen"></i> Edit Tracker'
        : '<i class="fas fa-chart-line"></i> New Tracker';
    clearPErr($('trkError'));
    $('trackerModal').classList.add('active');
    $('trkName').focus();
}
function closeTrackerModal() { $('trackerModal').classList.remove('active'); }

async function saveTracker() {
    const name = $('trkName').value.trim();
    if (!name) return showPErr($('trkError'), 'Tracker name is required.');
    const cur = parseFloat($('trkCurrent').value) || 0;
    const min = parseFloat($('trkMin').value) || 0;
    const max = parseFloat($('trkMax').value) || 100;
    if (min >= max) return showPErr($('trkError'), 'Maximum must be greater than minimum.');
    if (cur < min || cur > max) return showPErr($('trkError'), 'Current value must be between min and max.');

    const payload = {
        name, description: $('trkDesc').value.trim(),
        current_val: cur, min_val: min, max_val: max,
        unit: $('trkUnit').value.trim(), color: getPickedColor('trkColorPicker')
    };
    const id = $('trkId').value;
    setLoading($('trkSaveBtn'), true);
    try {
        if (id) {
            await api('PUT', `/api/planner/trackers/${id}`, payload);
            const idx = trackers.findIndex(x => x.id == id);
            if (idx >= 0) trackers[idx] = { ...trackers[idx], ...payload };
        } else {
            const d = await api('POST', '/api/planner/trackers', payload);
            trackers.push(d.tracker);
        }
        closeTrackerModal();
        renderTrackers();
        showToast(id ? 'Tracker updated!' : 'Tracker created!');
    } catch (e) { showPErr($('trkError'), e.message); }
    finally { setLoading($('trkSaveBtn'), false); }
}

async function deleteTracker(id) {
    if (!confirm('Delete this tracker?')) return;
    try {
        await api('DELETE', `/api/planner/trackers/${id}`);
        trackers = trackers.filter(x => x.id !== id);
        renderTrackers();
        showToast('Tracker deleted.');
    } catch (e) { showToast('Could not delete: ' + e.message, true); }
}

/* ════════════════════════════════════════════
   CURRICULUM
   ════════════════════════════════════════════ */
function getAllSections() {
    const set = new Set();
    subjects.forEach(s => { if (s.section) set.add(s.section); });
    return [...set].sort();
}

function renderSectionFilter() {
    const sections = getAllSections();
    const btns = $('sectionFilterBtns');
    if (!btns) return;
    btns.innerHTML = `<button class="sfbtn${sectionFilter === 'all' ? ' active' : ''}" data-section="all">All</button>`;
    sections.forEach(sec => {
        const btn = document.createElement('button');
        btn.className = 'sfbtn' + (sectionFilter === sec ? ' active' : '');
        btn.dataset.section = sec;
        btn.textContent = sec;
        btns.appendChild(btn);
    });
    btns.querySelectorAll('.sfbtn').forEach(btn => {
        btn.addEventListener('click', () => {
            sectionFilter = btn.dataset.section;
            renderCurriculum();
        });
    });
}

function renderCurriculum() {
    renderSectionFilter();
    const filtered = sectionFilter === 'all' ? subjects : subjects.filter(s => s.section === sectionFilter);

    if (filtered.length === 0) {
        $('subjectList').innerHTML       = '';
        $('subjectEmpty').style.display  = 'block';
        return;
    }
    $('subjectEmpty').style.display = 'none';
    $('subjectList').innerHTML = filtered.map(s => buildSubjectCard(s)).join('');

    filtered.forEach(s => {
        // subject expand/collapse
        const hdr = $('subj-hdr-' + s.id);
        if (hdr) hdr.addEventListener('click', e => {
            if (e.target.closest('button')) return;
            toggleSubjectExpand(s.id);
        });
        // subject edit/delete
        const editBtn = $('subj-edit-' + s.id);
        const delBtn  = $('subj-del-' + s.id);
        if (editBtn) editBtn.addEventListener('click', () => openSubjectModal(s));
        if (delBtn)  delBtn.addEventListener('click',  () => deleteSubject(s.id));
        // add topic
        const addTopicBtn = $('add-topic-' + s.id);
        if (addTopicBtn) addTopicBtn.addEventListener('click', () => openTopicModal(null, s.id));

        // topics
        (s.topics || []).forEach(t => {
            const tHdr = $('topic-hdr-' + t.id);
            if (tHdr) tHdr.addEventListener('click', e => {
                if (e.target.closest('button')) return;
                toggleTopicExpand(t.id);
            });
            const tCheck = $('topic-check-' + t.id);
            if (tCheck) tCheck.addEventListener('click', e => { e.stopPropagation(); toggleTopicDone(s.id, t.id); });
            const tEdit = $('topic-edit-' + t.id);
            const tDel  = $('topic-del-' + t.id);
            const tAdd  = $('add-sub-' + t.id);
            const tToggle = $('topic-toggle-' + t.id);
            if (tEdit) tEdit.addEventListener('click', () => openTopicModal(t, s.id));
            if (tDel)  tDel.addEventListener('click',  () => deleteTopic(s.id, t.id));
            if (tAdd)  tAdd.addEventListener('click',  () => openSubtopicModal(null, t.id));
            if (tToggle) tToggle.addEventListener('click', e => { e.stopPropagation(); toggleTopicExpand(t.id); });

            // subtopics
            (t.subtopics || []).forEach(st => {
                const stCheck = $('stcheck-' + st.id);
                const stEdit  = $('stedit-' + st.id);
                const stDel   = $('stdel-' + st.id);
                if (stCheck) stCheck.addEventListener('click', () => toggleSubtopicDone(s.id, t.id, st.id));
                if (stEdit)  stEdit.addEventListener('click',  () => openSubtopicModal(st, t.id));
                if (stDel)   stDel.addEventListener('click',   () => deleteSubtopic(s.id, t.id, st.id));
            });
        });
    });
}

function buildSubjectCard(s) {
    const topics    = s.topics || [];
    const totalSub  = topics.reduce((a, t) => a + (t.subtopics || []).length, 0);
    const doneSub   = topics.reduce((a, t) => a + (t.subtopics || []).filter(x => x.done).length, 0);
    const doneTopic = topics.filter(t => t.done).length;
    const pct       = totalSub > 0 ? Math.round((doneSub / totalSub) * 100) : (topics.length > 0 ? Math.round((doneTopic / topics.length) * 100) : 0);
    const expanded  = s._expanded ? 'expanded' : '';

    return `
    <div class="subject-card ${expanded}" id="subj-card-${s.id}">
        <div class="subject-header" id="subj-hdr-${s.id}">
            <div class="subject-header-left">
                <div class="subject-color-dot sdot-${s.color}"></div>
                <div>
                    <div class="subject-name">${esc(s.name)}</div>
                    <div class="subject-meta">
                        ${s.section ? `<span class="subject-section-badge">${esc(s.section)}</span>` : ''}
                        <span class="subject-progress-chip">${doneTopic}/${topics.length} topics · ${pct}% done</span>
                    </div>
                </div>
            </div>
            <div class="subject-header-right">
                <button class="tact-btn" id="subj-edit-${s.id}" title="Edit subject"><i class="fas fa-pen"></i></button>
                <button class="tact-btn del" id="subj-del-${s.id}" title="Delete subject"><i class="fas fa-trash"></i></button>
                <i class="fas fa-chevron-down subject-chevron"></i>
            </div>
        </div>
        <div class="subject-body">
            <div class="topic-list" id="topic-list-${s.id}">
                ${topics.map(t => buildTopicRow(t)).join('')}
            </div>
            <div class="subject-footer">
                <button class="btn-add-inner" id="add-topic-${s.id}"><i class="fas fa-plus"></i> Add Topic</button>
            </div>
        </div>
    </div>`;
}

function buildTopicRow(t) {
    const subs = t.subtopics || [];
    const doneSubs = subs.filter(s => s.done).length;
    const topicExpanded = t._expanded ? 'topic-expanded' : '';

    return `
    <div class="topic-row ${t.done ? 'is-done' : ''} ${topicExpanded}" id="topic-row-${t.id}">
        <div class="topic-header" id="topic-hdr-${t.id}">
            <button class="topic-toggle-btn" id="topic-toggle-${t.id}" title="Expand"><i class="fas fa-chevron-right"></i></button>
            <div class="topic-check ${t.done ? 'done' : ''}" id="topic-check-${t.id}" title="Mark complete"></div>
            <div class="topic-name">${esc(t.name)}</div>
            ${t.notes ? `<div class="topic-notes-preview" title="${esc(t.notes)}">${esc(t.notes)}</div>` : ''}
            ${subs.length > 0 ? `<span style="font-size:.7rem;color:var(--text-muted);white-space:nowrap;">${doneSubs}/${subs.length}</span>` : ''}
            <div class="topic-actions">
                <button class="tact-btn" id="topic-edit-${t.id}" title="Edit topic"><i class="fas fa-pen"></i></button>
                <button class="tact-btn del" id="topic-del-${t.id}" title="Delete topic"><i class="fas fa-trash"></i></button>
            </div>
        </div>
        <div class="subtopic-list" id="sub-list-${t.id}">
            ${subs.map(st => buildSubtopicRow(st)).join('')}
            <button class="btn-add-inner" id="add-sub-${t.id}"><i class="fas fa-plus"></i> Add Subtopic</button>
        </div>
    </div>`;
}

function buildSubtopicRow(st) {
    return `
    <div class="subtopic-row ${st.done ? 'is-done' : ''}" id="strow-${st.id}">
        <div class="subtopic-check ${st.done ? 'done' : ''}" id="stcheck-${st.id}" title="Toggle done"></div>
        <div class="subtopic-name">${esc(st.name)}</div>
        ${st.section ? `<span class="subtopic-section-chip">${esc(st.section)}</span>` : ''}
        <div class="subtopic-actions">
            <button class="tact-btn" id="stedit-${st.id}" title="Edit"><i class="fas fa-pen"></i></button>
            <button class="tact-btn del" id="stdel-${st.id}" title="Delete"><i class="fas fa-trash"></i></button>
        </div>
    </div>`;
}

function toggleSubjectExpand(id) {
    const s = subjects.find(x => x.id === id);
    if (!s) return;
    s._expanded = !s._expanded;
    const card = $('subj-card-' + id);
    if (card) card.classList.toggle('expanded', s._expanded);
}

function toggleTopicExpand(id) {
    for (const s of subjects) {
        const t = (s.topics || []).find(x => x.id === id);
        if (t) { t._expanded = !t._expanded; const row = $('topic-row-' + id); if (row) row.classList.toggle('topic-expanded', t._expanded); break; }
    }
}

async function toggleTopicDone(subjId, topicId) {
    const s = subjects.find(x => x.id === subjId);
    const t = s && (s.topics || []).find(x => x.id === topicId);
    if (!t) return;
    t.done = !t.done;
    const check = $('topic-check-' + topicId);
    const row   = $('topic-row-' + topicId);
    if (check) check.classList.toggle('done', t.done);
    if (row)   row.classList.toggle('is-done', t.done);
    updateSubjectProgress(subjId);
    try {
        await api('PATCH', `/api/planner/topics/${topicId}/done`, { done: t.done });
    } catch (e) { t.done = !t.done; showToast('Could not save: ' + e.message, true); renderCurriculum(); }
}

async function toggleSubtopicDone(subjId, topicId, subId) {
    const s  = subjects.find(x => x.id === subjId);
    const t  = s && (s.topics || []).find(x => x.id === topicId);
    const st = t && (t.subtopics || []).find(x => x.id === subId);
    if (!st) return;
    st.done = !st.done;
    const check = $('stcheck-' + subId);
    const row   = $('strow-' + subId);
    if (check) check.classList.toggle('done', st.done);
    if (row)   row.classList.toggle('is-done', st.done);
    updateSubjectProgress(subjId);
    try {
        await api('PATCH', `/api/planner/subtopics/${subId}/done`, { done: st.done });
    } catch (e) { st.done = !st.done; showToast('Could not save: ' + e.message, true); renderCurriculum(); }
}

function updateSubjectProgress(subjId) {
    const s = subjects.find(x => x.id === subjId);
    if (!s) return;
    const topics   = s.topics || [];
    const totalSub = topics.reduce((a, t) => a + (t.subtopics || []).length, 0);
    const doneSub  = topics.reduce((a, t) => a + (t.subtopics || []).filter(x => x.done).length, 0);
    const doneTopic = topics.filter(t => t.done).length;
    const pct = totalSub > 0 ? Math.round((doneSub / totalSub) * 100) : (topics.length > 0 ? Math.round((doneTopic / topics.length) * 100) : 0);
    const chip = document.querySelector(`#subj-card-${subjId} .subject-progress-chip`);
    if (chip) chip.textContent = `${doneTopic}/${topics.length} topics · ${pct}% done`;
}

/* Subject modal */
function openSubjectModal(s = null) {
    $('subjId').value      = s ? s.id : '';
    $('subjName').value    = s ? s.name : '';
    $('subjSection').value = s ? (s.section || '') : '';
    setPickedColor('subjColorPicker', s ? s.color : 'teal');
    $('subjectModalTitle').innerHTML = s ? '<i class="fas fa-pen"></i> Edit Subject' : '<i class="fas fa-book"></i> New Subject';
    clearPErr($('subjError'));
    $('subjectModal').classList.add('active');
    $('subjName').focus();
}
function closeSubjectModal() { $('subjectModal').classList.remove('active'); }

async function saveSubject() {
    const name = $('subjName').value.trim();
    if (!name) return showPErr($('subjError'), 'Subject name is required.');
    const payload = { name, section: $('subjSection').value.trim(), color: getPickedColor('subjColorPicker') };
    const id = $('subjId').value;
    setLoading($('subjSaveBtn'), true);
    try {
        if (id) {
            await api('PUT', `/api/planner/subjects/${id}`, payload);
            const idx = subjects.findIndex(x => x.id == id);
            if (idx >= 0) subjects[idx] = { ...subjects[idx], ...payload };
        } else {
            const d = await api('POST', '/api/planner/subjects', payload);
            subjects.push({ ...d.subject, topics: [] });
        }
        closeSubjectModal();
        renderCurriculum();
        showToast(id ? 'Subject updated!' : 'Subject added!');
    } catch (e) { showPErr($('subjError'), e.message); }
    finally { setLoading($('subjSaveBtn'), false); }
}

async function deleteSubject(id) {
    if (!confirm('Delete this subject and all its topics?')) return;
    try {
        await api('DELETE', `/api/planner/subjects/${id}`);
        subjects = subjects.filter(x => x.id !== id);
        renderCurriculum();
        showToast('Subject deleted.');
    } catch (e) { showToast('Could not delete: ' + e.message, true); }
}

/* Topic modal */
function openTopicModal(t = null, subjId = '') {
    $('topicId').value        = t ? t.id : '';
    $('topicSubjectId').value = subjId || (t ? t.subject_id : '');
    $('topicName').value      = t ? t.name : '';
    $('topicNotes').value     = t ? (t.notes || '') : '';
    $('topicModalTitle').innerHTML = t ? '<i class="fas fa-pen"></i> Edit Topic' : '<i class="fas fa-list"></i> New Topic';
    clearPErr($('topicError'));
    $('topicModal').classList.add('active');
    $('topicName').focus();
}
function closeTopicModal() { $('topicModal').classList.remove('active'); }

async function saveTopic() {
    const name    = $('topicName').value.trim();
    const subjId  = $('topicSubjectId').value;
    if (!name) return showPErr($('topicError'), 'Topic name is required.');
    const payload = { name, notes: $('topicNotes').value.trim(), subject_id: parseInt(subjId) };
    const id = $('topicId').value;
    setLoading($('topicSaveBtn'), true);
    try {
        if (id) {
            await api('PUT', `/api/planner/topics/${id}`, payload);
            const s = subjects.find(x => x.id == subjId);
            if (s) { const idx = (s.topics || []).findIndex(x => x.id == id); if (idx >= 0) s.topics[idx] = { ...s.topics[idx], ...payload }; }
        } else {
            const d = await api('POST', '/api/planner/topics', payload);
            const s = subjects.find(x => x.id == subjId);
            if (s) { if (!s.topics) s.topics = []; s.topics.push({ ...d.topic, subtopics: [] }); }
        }
        closeTopicModal();
        renderCurriculum();
        showToast(id ? 'Topic updated!' : 'Topic added!');
    } catch (e) { showPErr($('topicError'), e.message); }
    finally { setLoading($('topicSaveBtn'), false); }
}

async function deleteTopic(subjId, topicId) {
    if (!confirm('Delete this topic and all its subtopics?')) return;
    try {
        await api('DELETE', `/api/planner/topics/${topicId}`);
        const s = subjects.find(x => x.id === subjId);
        if (s) s.topics = (s.topics || []).filter(x => x.id !== topicId);
        renderCurriculum();
        showToast('Topic deleted.');
    } catch (e) { showToast('Could not delete: ' + e.message, true); }
}

/* Subtopic modal */
function openSubtopicModal(st = null, topicId = '') {
    $('subtopicId').value      = st ? st.id : '';
    $('subtopicTopicId').value = topicId || (st ? st.topic_id : '');
    $('subtopicName').value    = st ? st.name : '';
    $('subtopicSection').value = st ? (st.section || '') : '';
    $('subtopicModalTitle').innerHTML = st ? '<i class="fas fa-pen"></i> Edit Subtopic' : '<i class="fas fa-circle-dot"></i> New Subtopic';
    clearPErr($('subtopicError'));
    $('subtopicModal').classList.add('active');
    $('subtopicName').focus();
}
function closeSubtopicModal() { $('subtopicModal').classList.remove('active'); }

async function saveSubtopic() {
    const name    = $('subtopicName').value.trim();
    const topicId = $('subtopicTopicId').value;
    if (!name) return showPErr($('subtopicError'), 'Subtopic name is required.');
    const payload = { name, section: $('subtopicSection').value.trim(), topic_id: parseInt(topicId) };
    const id = $('subtopicId').value;
    setLoading($('subtopicSaveBtn'), true);
    try {
        if (id) {
            await api('PUT', `/api/planner/subtopics/${id}`, payload);
            for (const s of subjects) {
                for (const t of (s.topics || [])) {
                    const idx = (t.subtopics || []).findIndex(x => x.id == id);
                    if (idx >= 0) { t.subtopics[idx] = { ...t.subtopics[idx], ...payload }; break; }
                }
            }
        } else {
            const d = await api('POST', '/api/planner/subtopics', payload);
            for (const s of subjects) {
                const t = (s.topics || []).find(x => x.id == topicId);
                if (t) { if (!t.subtopics) t.subtopics = []; t.subtopics.push(d.subtopic); break; }
            }
        }
        closeSubtopicModal();
        renderCurriculum();
        showToast(id ? 'Subtopic updated!' : 'Subtopic added!');
    } catch (e) { showPErr($('subtopicError'), e.message); }
    finally { setLoading($('subtopicSaveBtn'), false); }
}

async function deleteSubtopic(subjId, topicId, subId) {
    if (!confirm('Delete this subtopic?')) return;
    try {
        await api('DELETE', `/api/planner/subtopics/${subId}`);
        const s = subjects.find(x => x.id === subjId);
        const t = s && (s.topics || []).find(x => x.id === topicId);
        if (t) t.subtopics = (t.subtopics || []).filter(x => x.id !== subId);
        renderCurriculum();
        showToast('Subtopic deleted.');
    } catch (e) { showToast('Could not delete: ' + e.message, true); }
}

/* ════════════════════════════════════════════
   TIMETABLE
   ════════════════════════════════════════════ */
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function renderTimetable() {
    const slotsByDay = {};
    DAYS.forEach(d => { slotsByDay[d] = []; });
    slots.forEach(s => { if (slotsByDay[s.day]) slotsByDay[s.day].push(s); });

    const hasAny = slots.length > 0;
    $('timetableEmpty').style.display = hasAny ? 'none' : 'block';
    if (!hasAny) { $('timetableGrid').innerHTML = ''; return; }

    $('timetableGrid').innerHTML = DAYS.map(day => {
        const daySlots = slotsByDay[day];
        const hasSlotsClass = daySlots.length > 0 ? ' has-slots' : '';
        return `
        <div class="timetable-day-col">
            <div class="timetable-day-header${hasSlotsClass}">${day.substring(0,3)}</div>
            ${daySlots.sort((a,b) => a.sort_order - b.sort_order).map(s => buildSlotHTML(s)).join('')}
            <button class="slot-add-btn" data-day="${day}" title="Add slot for ${day}">+</button>
        </div>`;
    }).join('');

    $('timetableGrid').querySelectorAll('.slot-add-btn').forEach(btn => {
        btn.addEventListener('click', () => openSlotModal(null, btn.dataset.day));
    });
    $('timetableGrid').querySelectorAll('.slot-del-btn').forEach(btn => {
        btn.addEventListener('click', e => { e.stopPropagation(); deleteSlot(parseInt(btn.dataset.id)); });
    });
    $('timetableGrid').querySelectorAll('.timetable-slot').forEach(el => {
        el.addEventListener('click', e => {
            if (e.target.closest('.slot-del-btn')) return;
            const id = parseInt(el.dataset.id);
            const s  = slots.find(x => x.id === id);
            if (s) openSlotModal(s);
        });
    });
}

function buildSlotHTML(s) {
    return `
    <div class="timetable-slot ts-${s.color}" data-id="${s.id}">
        <div class="slot-time">${esc(s.time_period)}</div>
        <div class="slot-subject">${esc(s.subject)}</div>
        ${s.section ? `<div class="slot-section">${esc(s.section)}</div>` : ''}
        ${s.room    ? `<div class="slot-room"><i class="fas fa-door-open"></i> ${esc(s.room)}</div>` : ''}
        <button class="slot-del-btn" data-id="${s.id}" title="Delete"><i class="fas fa-times"></i></button>
    </div>`;
}

/* Slot modal */
function openSlotModal(s = null, prefillDay = null) {
    $('slotId').value      = s ? s.id : '';
    $('slotDay').value     = s ? s.day : (prefillDay || 'Monday');
    $('slotTime').value    = s ? s.time_period : '';
    $('slotSubject').value = s ? s.subject : '';
    $('slotSection').value = s ? (s.section || '') : '';
    $('slotRoom').value    = s ? (s.room || '') : '';
    setPickedColor('slotColorPicker', s ? s.color : 'teal');
    $('slotModalTitle').innerHTML = s ? '<i class="fas fa-pen"></i> Edit Slot' : '<i class="fas fa-clock"></i> Add Timetable Slot';
    clearPErr($('slotError'));
    $('slotModal').classList.add('active');
    $('slotTime').focus();
}
function closeSlotModal() { $('slotModal').classList.remove('active'); }

async function saveSlot() {
    const subject = $('slotSubject').value.trim();
    const time    = $('slotTime').value.trim();
    if (!subject) return showPErr($('slotError'), 'Subject is required.');
    if (!time)    return showPErr($('slotError'), 'Time / period is required.');
    const payload = {
        day: $('slotDay').value, time_period: time, subject,
        section: $('slotSection').value.trim(), room: $('slotRoom').value.trim(),
        color: getPickedColor('slotColorPicker')
    };
    const id = $('slotId').value;
    setLoading($('slotSaveBtn'), true);
    try {
        if (id) {
            await api('PUT', `/api/planner/slots/${id}`, payload);
            const idx = slots.findIndex(x => x.id == id);
            if (idx >= 0) slots[idx] = { ...slots[idx], ...payload };
        } else {
            const d = await api('POST', '/api/planner/slots', payload);
            slots.push(d.slot);
        }
        closeSlotModal();
        renderTimetable();
        showToast(id ? 'Slot updated!' : 'Slot added!');
    } catch (e) { showPErr($('slotError'), e.message); }
    finally { setLoading($('slotSaveBtn'), false); }
}

async function deleteSlot(id) {
    if (!confirm('Delete this timetable slot?')) return;
    try {
        await api('DELETE', `/api/planner/slots/${id}`);
        slots = slots.filter(x => x.id !== id);
        renderTimetable();
        showToast('Slot deleted.');
    } catch (e) { showToast('Could not delete: ' + e.message, true); }
}

/* ════════════════════════════════════════════
   DOM READY
   ════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
    D = {
        loginGate: $('loginGate'), dashboard: $('dashboard'), navUserArea: $('navUserArea'),
        authModal: $('authModal'), authError: $('authError'),
        tabLogin: $('tabLogin'), tabRegister: $('tabRegister'),
        loginForm: $('loginForm'), registerForm: $('registerForm'),
        loginUsername: $('loginUsername'), loginPassword: $('loginPassword'), loginBtn: $('loginBtn'),
        regUsername: $('regUsername'), regPassword: $('regPassword'), regConfirm: $('regConfirm'), registerBtn: $('registerBtn'),
        toast: $('toast'), toastIcon: $('toastIcon'), toastMsg: $('toastMsg'),
    };

    initHamburger();

    // auth modal bindings
    $('openAuthBtn') && $('openAuthBtn').addEventListener('click', openAuthModal);
    D.tabLogin.addEventListener('click',    () => switchAuthTab('login'));
    D.tabRegister.addEventListener('click', () => switchAuthTab('register'));
    D.loginBtn.addEventListener('click',    handleLogin);
    D.registerBtn.addEventListener('click', handleRegister);
    D.authModal.addEventListener('click',   e => { if (e.target === D.authModal) closeAuthModal(); });
    [D.loginUsername, D.loginPassword].forEach(el => el.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); }));
    [D.regUsername, D.regPassword, D.regConfirm].forEach(el => el.addEventListener('keydown', e => { if (e.key === 'Enter') handleRegister(); }));

    // tabs
    document.querySelectorAll('.planner-tab').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));

    // tracker modal
    $('btnAddTracker').addEventListener('click', () => openTrackerModal());
    $('trackerModalClose').addEventListener('click',  closeTrackerModal);
    $('trackerModalCancel').addEventListener('click', closeTrackerModal);
    $('trkSaveBtn').addEventListener('click', saveTracker);
    initColorPicker('trkColorPicker');
    $('trackerModal').addEventListener('click', e => { if (e.target === $('trackerModal')) closeTrackerModal(); });

    // subject modal
    $('btnAddSubject').addEventListener('click', () => openSubjectModal());
    $('subjectModalClose').addEventListener('click',  closeSubjectModal);
    $('subjectModalCancel').addEventListener('click', closeSubjectModal);
    $('subjSaveBtn').addEventListener('click', saveSubject);
    initColorPicker('subjColorPicker');
    $('subjectModal').addEventListener('click', e => { if (e.target === $('subjectModal')) closeSubjectModal(); });

    // topic modal
    $('topicModalClose').addEventListener('click',  closeTopicModal);
    $('topicModalCancel').addEventListener('click', closeTopicModal);
    $('topicSaveBtn').addEventListener('click', saveTopic);
    $('topicModal').addEventListener('click', e => { if (e.target === $('topicModal')) closeTopicModal(); });

    // subtopic modal
    $('subtopicModalClose').addEventListener('click',  closeSubtopicModal);
    $('subtopicModalCancel').addEventListener('click', closeSubtopicModal);
    $('subtopicSaveBtn').addEventListener('click', saveSubtopic);
    $('subtopicModal').addEventListener('click', e => { if (e.target === $('subtopicModal')) closeSubtopicModal(); });

    // slot modal
    $('btnAddSlot').addEventListener('click', () => openSlotModal());
    $('slotModalClose').addEventListener('click',  closeSlotModal);
    $('slotModalCancel').addEventListener('click', closeSlotModal);
    $('slotSaveBtn').addEventListener('click', saveSlot);
    initColorPicker('slotColorPicker');
    $('slotModal').addEventListener('click', e => { if (e.target === $('slotModal')) closeSlotModal(); });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            closeTrackerModal(); closeSubjectModal(); closeTopicModal();
            closeSubtopicModal(); closeSlotModal(); closeAuthModal();
        }
    });

    initPage();
});