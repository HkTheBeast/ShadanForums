/* ==============================================
   classManager.js  —  place in:  public/js/classManager.js
   Shared class selection + management UI.
   Include BEFORE page-specific JS.
   ============================================== */
'use strict';

window.ClassManager = (function () {

    // ── State ────────────────────────────────────────────────
    let _classes     = [];
    let _activeClass = null;           // full class object
    let _onSelect    = null;           // callback(classObj)
    let _editingId   = null;           // for edit form
    let _chosenColor = 'teal';
    const COLORS     = ['teal','purple','pink','amber','blue','gold','red','green'];

    // ── Helpers ──────────────────────────────────────────────
    function colorVar(c) {
        const map = {
            teal:'#2afadf', purple:'#8a2be2', pink:'#ff2e63',
            amber:'#ff9a3c', blue:'#4fc3f7', gold:'#ffd700',
            red:'#ff4444', green:'#4caf50'
        };
        return map[c] || map.teal;
    }

    function escHTML(str) {
        const d = document.createElement('div'); d.textContent = str; return d.innerHTML;
    }

    async function api(method, path, body) {
        const opts = { method, headers:{'Content-Type':'application/json'}, credentials:'same-origin' };
        if (body !== undefined) opts.body = JSON.stringify(body);
        const res  = await fetch(path, opts);
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || 'Server error');
        return data;
    }

    // ── Load classes from server ──────────────────────────────
    async function loadClasses() {
        const data = await api('GET', '/api/classes');
        _classes   = data.classes || [];
        renderSelectorChips();
        renderManageList();
        // restore previously selected class if still valid
        if (_activeClass) {
            const still = _classes.find(c => c.id === _activeClass.id);
            if (still) { _activeClass = still; }
            else       { _activeClass = null; }
        }
        // auto-select if only one class
        if (!_activeClass && _classes.length === 1) {
            selectClass(_classes[0]);
        }
        renderSelectorChips(); // re-render after potential auto-select
    }

    // ── Chip selector bar ─────────────────────────────────────
    function renderSelectorChips() {
        const wrap = document.getElementById('classChipsWrap');
        if (!wrap) return;
        if (_classes.length === 0) {
            wrap.innerHTML = `<span style="font-size:.85rem;color:var(--text-muted)">No classes yet — click <strong style="color:var(--accent-teal)">Manage Classes</strong> to create one.</span>`;
            return;
        }
        wrap.innerHTML = _classes.map(c => {
            const isActive = _activeClass && _activeClass.id === c.id;
            const meta = [c.section, c.subject].filter(Boolean).join(' · ');
            return `<button class="class-chip${isActive ? ' active cc-'+c.color : ''}"
                        data-id="${c.id}" title="${escHTML(meta || c.name)}">
                <span class="class-chip-dot cc-dot-${c.color}"></span>
                ${escHTML(c.name)}${meta ? `<span style="font-size:.72rem;opacity:.7"> ${escHTML(meta)}</span>` : ''}
                <span class="class-count-badge">${c.student_count ?? 0}</span>
            </button>`;
        }).join('');

        wrap.querySelectorAll('.class-chip').forEach(btn => {
            btn.addEventListener('click', () => {
                const cls = _classes.find(c => c.id === parseInt(btn.dataset.id));
                if (cls) selectClass(cls);
            });
        });
    }

    function selectClass(cls) {
        _activeClass = cls;
        renderSelectorChips();
        renderActiveClassHeader();
        if (typeof _onSelect === 'function') _onSelect(cls);
    }

    function renderActiveClassHeader() {
        const h = document.getElementById('activeClassHeader');
        if (!h) return;
        if (!_activeClass) { h.style.display = 'none'; return; }
        const meta = [_activeClass.section, _activeClass.subject].filter(Boolean).join(' · ');
        h.style.display = 'flex';
        h.innerHTML = `
            <div class="active-class-dot" style="background:${colorVar(_activeClass.color)}"></div>
            <span class="active-class-name">${escHTML(_activeClass.name)}</span>
            ${meta ? `<span class="active-class-meta">${escHTML(meta)}</span>` : ''}
            <span class="active-class-sep"></span>
            <span class="active-class-count"><i class="fas fa-users"></i> ${_activeClass.student_count ?? 0} students</span>`;
    }

    // ── Manage modal ──────────────────────────────────────────
    function openManageModal() {
        _editingId   = null;
        _chosenColor = 'teal';
        resetAddForm();
        renderManageList();
        const mo = document.getElementById('classesModal');
        if (mo) mo.classList.add('active');
    }
    function closeManageModal() {
        const mo = document.getElementById('classesModal');
        if (mo) mo.classList.remove('active');
    }

    function renderManageList() {
        const list = document.getElementById('classManageList');
        if (!list) return;
        if (_classes.length === 0) {
            list.innerHTML = `<div class="classes-empty"><i class="fas fa-chalkboard"></i>No classes yet. Create one below.</div>`;
            return;
        }
        list.innerHTML = _classes.map(c => {
            const meta = [c.section, c.subject].filter(Boolean).join(' · ');
            return `<div class="class-manage-row" id="cmr-${c.id}">
                <div class="class-color-dot" style="background:${colorVar(c.color)}"></div>
                <div class="class-manage-info">
                    <div class="class-manage-name">${escHTML(c.name)}</div>
                    <div class="class-manage-meta">${meta ? escHTML(meta)+' · ' : ''}${c.student_count ?? 0} students</div>
                </div>
                <div class="class-manage-actions">
                    <button class="btn-icon" onclick="ClassManager.startEdit(${c.id})" title="Edit"><i class="fas fa-pen"></i></button>
                    <button class="btn-icon danger" onclick="ClassManager.confirmDeleteClass(${c.id}, '${escHTML(c.name)}')" title="Delete"><i class="fas fa-trash"></i></button>
                </div>
            </div>`;
        }).join('');
    }

    function resetAddForm() {
        const f = {
            classNameInp:    document.getElementById('classNameInp'),
            classSectionInp: document.getElementById('classSectionInp'),
            classSubjectInp: document.getElementById('classSubjectInp'),
            addClassFormTitle: document.getElementById('addClassFormTitle'),
            btnAddClass:     document.getElementById('btnAddClass'),
        };
        if (f.classNameInp)    f.classNameInp.value    = '';
        if (f.classSectionInp) f.classSectionInp.value = '';
        if (f.classSubjectInp) f.classSubjectInp.value = '';
        if (f.addClassFormTitle) f.addClassFormTitle.textContent = '+ Add New Class';
        if (f.btnAddClass) { f.btnAddClass.innerHTML = '<i class="fas fa-plus"></i> Add Class'; }
        _chosenColor = 'teal';
        _editingId   = null;
        syncSwatches();
    }

    function syncSwatches() {
        document.querySelectorAll('.color-swatch').forEach(sw => {
            sw.classList.toggle('active', sw.dataset.color === _chosenColor);
        });
    }

    function startEdit(id) {
        const cls = _classes.find(c => c.id === id);
        if (!cls) return;
        _editingId   = id;
        _chosenColor = cls.color || 'teal';
        const ni = document.getElementById('classNameInp');
        const si = document.getElementById('classSectionInp');
        const subi = document.getElementById('classSubjectInp');
        const title = document.getElementById('addClassFormTitle');
        const btn   = document.getElementById('btnAddClass');
        if (ni)    ni.value    = cls.name;
        if (si)    si.value    = cls.section || '';
        if (subi)  subi.value  = cls.subject || '';
        if (title) title.textContent = '✏️ Edit Class';
        if (btn)   btn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
        syncSwatches();
        if (ni) ni.focus();
    }

    async function submitAddClass(showToastFn) {
        const name    = (document.getElementById('classNameInp')?.value    || '').trim();
        const section = (document.getElementById('classSectionInp')?.value || '').trim();
        const subject = (document.getElementById('classSubjectInp')?.value || '').trim();
        if (!name) { if (showToastFn) showToastFn('Class name is required.', true); return; }

        try {
            if (_editingId) {
                await api('PUT', `/api/classes/${_editingId}`, { name, section, subject, color: _chosenColor });
                if (showToastFn) showToastFn('Class updated!');
            } else {
                await api('POST', '/api/classes', { name, section, subject, color: _chosenColor });
                if (showToastFn) showToastFn('Class created!');
            }
            await loadClasses();
            resetAddForm();
        } catch (e) {
            if (showToastFn) showToastFn(e.message, true);
        }
    }

    async function confirmDeleteClass(id, name) {
        const dm = document.getElementById('deleteClassModal');
        const msg = document.getElementById('deleteClassMsg');
        if (!dm) return;
        if (msg) msg.textContent = `Delete class "${name}"? All students and records in this class will be permanently removed.`;
        dm.classList.add('active');
        dm.dataset.pendingId = id;
    }

    async function doDeleteClass(showToastFn) {
        const dm = document.getElementById('deleteClassModal');
        if (!dm) return;
        const id = parseInt(dm.dataset.pendingId);
        dm.classList.remove('active');
        try {
            await api('DELETE', `/api/classes/${id}`);
            if (_activeClass && _activeClass.id === id) {
                _activeClass = null;
                renderActiveClassHeader();
                if (typeof _onSelect === 'function') _onSelect(null);
            }
            await loadClasses();
            if (showToastFn) showToastFn('Class deleted.');
        } catch (e) {
            if (showToastFn) showToastFn(e.message, true);
        }
    }

    // ── Public init ───────────────────────────────────────────
    function init(options = {}) {
        _onSelect = options.onSelect || null;

        // Manage button
        const manageBtn = document.getElementById('btnManageClasses');
        if (manageBtn) manageBtn.addEventListener('click', openManageModal);

        // Modal close
        const mo = document.getElementById('classesModal');
        if (mo) mo.addEventListener('click', e => { if (e.target === mo) closeManageModal(); });
        const closeBtn = document.getElementById('closeClassesModal');
        if (closeBtn) closeBtn.addEventListener('click', closeManageModal);

        // Color swatches
        document.querySelectorAll('.color-swatch').forEach(sw => {
            sw.addEventListener('click', () => {
                _chosenColor = sw.dataset.color;
                syncSwatches();
            });
        });

        // Add / Save class
        const addBtn = document.getElementById('btnAddClass');
        if (addBtn) addBtn.addEventListener('click', () => submitAddClass(options.showToast));

        // Cancel edit
        const cancelBtn = document.getElementById('btnCancelEditClass');
        if (cancelBtn) cancelBtn.addEventListener('click', resetAddForm);

        // Delete class modal
        const delModal = document.getElementById('deleteClassModal');
        if (delModal) {
            const confirmBtn = document.getElementById('confirmDeleteClassBtn');
            const cancelDelBtn = document.getElementById('cancelDeleteClassBtn');
            if (confirmBtn) confirmBtn.addEventListener('click', () => doDeleteClass(options.showToast));
            if (cancelDelBtn) cancelDelBtn.addEventListener('click', () => delModal.classList.remove('active'));
            delModal.addEventListener('click', e => { if (e.target === delModal) delModal.classList.remove('active'); });
        }

        // ESC key
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                closeManageModal();
                if (delModal) delModal.classList.remove('active');
            }
        });

        return loadClasses();
    }

    // ── Public API ────────────────────────────────────────────
    return {
        init,
        loadClasses,
        getActive:            () => _activeClass,
        getActiveId:          () => _activeClass ? _activeClass.id : null,
        startEdit,
        confirmDeleteClass,
        refreshCount: async function (classId, delta) {
            const cls = _classes.find(c => c.id === classId);
            if (cls) {
                cls.student_count = (cls.student_count || 0) + delta;
                if (_activeClass && _activeClass.id === classId)
                    _activeClass.student_count = cls.student_count;
                renderSelectorChips();
                renderActiveClassHeader();
            }
        },
        setActiveClass: selectClass,
    };
})();