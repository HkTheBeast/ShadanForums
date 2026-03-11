'use strict';
const express    = require('express');
const session    = require('express-session');
const bodyParser = require('body-parser');
const sqlite3    = require('sqlite3').verbose();
const path       = require('path');
const bcrypt     = require('bcryptjs');
const multer     = require('multer');
const fs         = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

// ================================================================
// MIDDLEWARE
// ================================================================
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    name:              'svlent.sid',
    secret:            process.env.SESSION_SECRET || 'replace_this_with_a_strong_secret',
    resave:            false,
    saveUninitialized: false,
    cookie:            { maxAge: 1000 * 60 * 60 * 24, sameSite: 'lax' }
}));
app.use(express.static(path.join(__dirname, 'public')));

// ================================================================
// DATABASE
// ================================================================
const dbFile = path.join(__dirname, 'data.sqlite');
const db     = new sqlite3.Database(dbFile);

db.serialize(() => {
    db.run('PRAGMA foreign_keys = ON');

    // ── Forum tables ───────────────────────────────────────────
    db.run(`CREATE TABLE IF NOT EXISTS forum_users (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        username   TEXT UNIQUE NOT NULL,
        password   TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS forum_threads (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        author     TEXT NOT NULL,
        title      TEXT NOT NULL,
        content    TEXT NOT NULL,
        attachment TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS forum_replies (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        thread_id  INTEGER NOT NULL,
        author     TEXT NOT NULL,
        content    TEXT NOT NULL,
        attachment TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (thread_id) REFERENCES forum_threads(id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS quote_likes (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        quote_author TEXT NOT NULL,
        user_id      INTEGER NOT NULL,
        created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(quote_author, user_id)
    )`);

    // ── Teacher accounts ───────────────────────────────────────
    db.run(`CREATE TABLE IF NOT EXISTS teacher_accounts (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        username   TEXT UNIQUE NOT NULL,
        password   TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // ── Classes ────────────────────────────────────────────────
    db.run(`CREATE TABLE IF NOT EXISTS classes (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        teacher_id  INTEGER NOT NULL,
        name        TEXT NOT NULL,
        section     TEXT DEFAULT '',
        subject     TEXT DEFAULT '',
        color       TEXT DEFAULT 'teal',
        created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (teacher_id) REFERENCES teacher_accounts(id) ON DELETE CASCADE
    )`);

    // ── Students — NO unique constraint on roll_number ─────────
    // roll_number can repeat across classes and across teachers.
    // Only the primary key (id) is unique.
    db.run(`CREATE TABLE IF NOT EXISTS students (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        teacher_id        INTEGER NOT NULL,
        class_id          INTEGER NOT NULL DEFAULT 0,
        roll_number       TEXT NOT NULL,
        name              TEXT NOT NULL,
        avatar            TEXT,
        highlighted       INTEGER DEFAULT 0,
        warnings          INTEGER DEFAULT 0,
        assignment1       INTEGER DEFAULT 0,
        assignment2       INTEGER DEFAULT 0,
        mark_mid1         REAL,
        mark_mid2         REAL,
        mark_internal_lab REAL,
        mark_external_lab REAL,
        record_book       INTEGER DEFAULT 0,
        obs_book          INTEGER DEFAULT 0,
        ppt_submitted     INTEGER DEFAULT 0,
        created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (teacher_id) REFERENCES teacher_accounts(id) ON DELETE CASCADE,
        FOREIGN KEY (class_id)   REFERENCES classes(id) ON DELETE CASCADE
    )`);

    // ── Attendance ─────────────────────────────────────────────
    db.run(`CREATE TABLE IF NOT EXISTS attendance (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        teacher_id INTEGER NOT NULL,
        class_id   INTEGER NOT NULL DEFAULT 0,
        date       TEXT NOT NULL,
        status     TEXT NOT NULL DEFAULT 'absent',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (teacher_id) REFERENCES teacher_accounts(id) ON DELETE CASCADE,
        FOREIGN KEY (class_id)   REFERENCES classes(id) ON DELETE CASCADE,
        UNIQUE(student_id, date)
    )`);

    // ── Planner tables ─────────────────────────────────────────
    db.run(`CREATE TABLE IF NOT EXISTS planner_trackers (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        teacher_id  INTEGER NOT NULL,
        name        TEXT NOT NULL,
        description TEXT DEFAULT '',
        current_val REAL DEFAULT 0,
        min_val     REAL DEFAULT 0,
        max_val     REAL DEFAULT 100,
        unit        TEXT DEFAULT '',
        color       TEXT DEFAULT 'teal',
        created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (teacher_id) REFERENCES teacher_accounts(id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS planner_subjects (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        teacher_id  INTEGER NOT NULL,
        name        TEXT NOT NULL,
        section     TEXT DEFAULT '',
        color       TEXT DEFAULT 'teal',
        created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (teacher_id) REFERENCES teacher_accounts(id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS planner_topics (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        subject_id  INTEGER NOT NULL,
        teacher_id  INTEGER NOT NULL,
        name        TEXT NOT NULL,
        notes       TEXT DEFAULT '',
        done        INTEGER DEFAULT 0,
        sort_order  INTEGER DEFAULT 0,
        created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (subject_id) REFERENCES planner_subjects(id) ON DELETE CASCADE,
        FOREIGN KEY (teacher_id) REFERENCES teacher_accounts(id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS planner_subtopics (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        topic_id    INTEGER NOT NULL,
        teacher_id  INTEGER NOT NULL,
        name        TEXT NOT NULL,
        section     TEXT DEFAULT '',
        done        INTEGER DEFAULT 0,
        sort_order  INTEGER DEFAULT 0,
        created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (topic_id)   REFERENCES planner_topics(id) ON DELETE CASCADE,
        FOREIGN KEY (teacher_id) REFERENCES teacher_accounts(id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS planner_slots (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        teacher_id  INTEGER NOT NULL,
        day         TEXT NOT NULL,
        time_period TEXT NOT NULL,
        subject     TEXT NOT NULL,
        section     TEXT DEFAULT '',
        room        TEXT DEFAULT '',
        color       TEXT DEFAULT 'teal',
        sort_order  INTEGER DEFAULT 0,
        created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (teacher_id) REFERENCES teacher_accounts(id) ON DELETE CASCADE
    )`);

    // ── Safe migrations: add columns that may not exist ────────
    const safeAdd = (table, col, type) =>
        db.run(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`, () => {});

    safeAdd('students', 'class_id',          'INTEGER DEFAULT 0');
    safeAdd('students', 'highlighted',        'INTEGER DEFAULT 0');
    safeAdd('students', 'warnings',           'INTEGER DEFAULT 0');
    safeAdd('students', 'mark_mid1',          'REAL');
    safeAdd('students', 'mark_mid2',          'REAL');
    safeAdd('students', 'mark_internal_lab',  'REAL');
    safeAdd('students', 'mark_external_lab',  'REAL');
    safeAdd('students', 'record_book',        'INTEGER DEFAULT 0');
    safeAdd('students', 'obs_book',           'INTEGER DEFAULT 0');
    safeAdd('students', 'ppt_submitted',      'INTEGER DEFAULT 0');
    safeAdd('attendance', 'class_id',         'INTEGER DEFAULT 0');
    safeAdd('classes', 'subject',             'TEXT DEFAULT ""');

    // ── Drop ANY unique constraint on roll_number ───────────────
    // If old DB had UNIQUE(roll_number), UNIQUE(class_id, roll_number),
    // or similar, recreate the table without it.
    db.get(`SELECT sql FROM sqlite_master WHERE type='table' AND name='students'`, (err, row) => {
        if (err || !row) return;
        const sql = row.sql || '';
        // Check for any roll_number uniqueness
        const hasUnique = sql.includes('UNIQUE') && sql.toLowerCase().includes('roll_number');
        if (!hasUnique) return; // already clean, nothing to do

        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS students_new (
                id                INTEGER PRIMARY KEY AUTOINCREMENT,
                teacher_id        INTEGER NOT NULL,
                class_id          INTEGER NOT NULL DEFAULT 0,
                roll_number       TEXT NOT NULL,
                name              TEXT NOT NULL,
                avatar            TEXT,
                highlighted       INTEGER DEFAULT 0,
                warnings          INTEGER DEFAULT 0,
                assignment1       INTEGER DEFAULT 0,
                assignment2       INTEGER DEFAULT 0,
                mark_mid1         REAL,
                mark_mid2         REAL,
                mark_internal_lab REAL,
                mark_external_lab REAL,
                record_book       INTEGER DEFAULT 0,
                obs_book          INTEGER DEFAULT 0,
                ppt_submitted     INTEGER DEFAULT 0,
                created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (teacher_id) REFERENCES teacher_accounts(id) ON DELETE CASCADE,
                FOREIGN KEY (class_id)   REFERENCES classes(id) ON DELETE CASCADE
            )`);
            db.run(`INSERT OR IGNORE INTO students_new
                SELECT id, teacher_id,
                    COALESCE(class_id, 0),
                    roll_number, name, avatar,
                    COALESCE(highlighted, 0),
                    COALESCE(warnings, 0),
                    COALESCE(assignment1, 0),
                    COALESCE(assignment2, 0),
                    mark_mid1, mark_mid2,
                    mark_internal_lab, mark_external_lab,
                    COALESCE(record_book, 0),
                    COALESCE(obs_book, 0),
                    COALESCE(ppt_submitted, 0),
                    created_at
                FROM students`);
            db.run('DROP TABLE students');
            db.run('ALTER TABLE students_new RENAME TO students', () => {
                console.log('✅ Migrated students table — roll_number uniqueness removed.');
            });
        });
    });
});

// ================================================================
// FILE UPLOAD  (forum attachments)
// ================================================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, 'public', 'uploads');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + '-' + file.originalname);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const ok = /jpeg|jpg|png|gif|pdf|doc|docx/.test(
            path.extname(file.originalname).toLowerCase()
        );
        ok ? cb(null, true) : cb(new Error('Only images, PDF, and DOC files are allowed'));
    }
});

// ================================================================
// AUTH GUARDS
// ================================================================
function ensureForumAuth(req, res, next) {
    if (req.session && req.session.forumUser) return next();
    return res.status(401).json({ ok: false, error: 'Not authenticated' });
}
function ensureTeacher(req, res, next) {
    if (req.session && req.session.teacher) return next();
    return res.status(401).json({ ok: false, error: 'Not authenticated as teacher' });
}

// ── Helper: verify class belongs to teacher ────────────────────
function verifyClass(teacherId, classId, cb) {
    db.get(`SELECT id FROM classes WHERE id = ? AND teacher_id = ?`, [classId, teacherId],
        (err, row) => {
            if (err)  return cb(err);
            if (!row) return cb(new Error('Class not found or access denied.'));
            cb(null, row);
        }
    );
}

// ================================================================
// FORUM AUTH  /api/forum/...
// ================================================================
app.post('/api/forum/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password)
        return res.status(400).json({ ok: false, error: 'Username and password required' });
    if (password.length < 8)
        return res.status(400).json({ ok: false, error: 'Password must be at least 8 characters' });

    const hashed = bcrypt.hashSync(password, 10);
    db.run(`INSERT INTO forum_users (username, password) VALUES (?, ?)`, [username, hashed],
        function (err) {
            if (err) {
                if (err.message.includes('UNIQUE'))
                    return res.status(409).json({ ok: false, error: 'Username already taken' });
                return res.status(500).json({ ok: false, error: err.message });
            }
            req.session.forumUser = { id: this.lastID, username };
            return res.json({ ok: true, user: { id: this.lastID, username } });
        }
    );
});

app.post('/api/forum/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password)
        return res.status(400).json({ ok: false, error: 'Username and password required' });

    db.get(`SELECT * FROM forum_users WHERE username = ?`, [username], (err, row) => {
        if (err)  return res.status(500).json({ ok: false, error: err.message });
        if (!row) return res.status(401).json({ ok: false, error: 'Invalid credentials' });
        if (!bcrypt.compareSync(password, row.password))
            return res.status(401).json({ ok: false, error: 'Invalid credentials' });
        req.session.forumUser = { id: row.id, username: row.username };
        return res.json({ ok: true, user: { id: row.id, username: row.username } });
    });
});

app.post('/api/forum/logout', (req, res) => {
    req.session.forumUser = null;
    return res.json({ ok: true });
});

app.get('/api/forum/me', (req, res) => {
    if (req.session && req.session.forumUser)
        return res.json({ ok: true, user: req.session.forumUser });
    return res.json({ ok: true, user: null });
});

// ================================================================
// QUOTE LIKES  /api/quotes/...
// ================================================================
app.get('/api/quotes/likes', (req, res) => {
    db.all(`SELECT quote_author, COUNT(*) as like_count FROM quote_likes GROUP BY quote_author`,
        [], (err, rows) => {
            if (err) return res.status(500).json({ ok: false, error: err.message });
            const map = {};
            rows.forEach(r => { map[r.quote_author] = r.like_count; });
            return res.json({ ok: true, likes: map });
        }
    );
});

app.post('/api/quotes/like', ensureForumAuth, (req, res) => {
    const { quoteAuthor } = req.body;
    const userId = req.session.forumUser.id;
    if (!quoteAuthor)
        return res.status(400).json({ ok: false, error: 'Quote author required' });

    db.get(`SELECT * FROM quote_likes WHERE quote_author = ? AND user_id = ?`,
        [quoteAuthor, userId], (err, row) => {
            if (err) return res.status(500).json({ ok: false, error: err.message });
            if (row) {
                db.run(`DELETE FROM quote_likes WHERE quote_author = ? AND user_id = ?`,
                    [quoteAuthor, userId], err2 => {
                        if (err2) return res.status(500).json({ ok: false, error: err2.message });
                        return res.json({ ok: true, liked: false });
                    });
            } else {
                db.run(`INSERT INTO quote_likes (quote_author, user_id) VALUES (?, ?)`,
                    [quoteAuthor, userId], err2 => {
                        if (err2) return res.status(500).json({ ok: false, error: err2.message });
                        return res.json({ ok: true, liked: true });
                    });
            }
        }
    );
});

app.get('/api/quotes/my-likes', ensureForumAuth, (req, res) => {
    db.all(`SELECT quote_author FROM quote_likes WHERE user_id = ?`,
        [req.session.forumUser.id], (err, rows) => {
            if (err) return res.status(500).json({ ok: false, error: err.message });
            return res.json({ ok: true, myLikes: rows.map(r => r.quote_author) });
        }
    );
});

// ================================================================
// FORUM THREADS  /api/forum/threads/...
// ================================================================
app.get('/api/forum/threads', (req, res) => {
    db.all(
        `SELECT t.*, (SELECT COUNT(*) FROM forum_replies WHERE thread_id = t.id) AS reply_count
         FROM forum_threads t ORDER BY t.created_at DESC`,
        [], (err, rows) => {
            if (err) return res.status(500).json({ ok: false, error: err.message });
            return res.json({ ok: true, threads: rows });
        }
    );
});

app.get('/api/forum/threads/:id', (req, res) => {
    db.get(`SELECT * FROM forum_threads WHERE id = ?`, [req.params.id], (err, row) => {
        if (err)  return res.status(500).json({ ok: false, error: err.message });
        if (!row) return res.status(404).json({ ok: false, error: 'Thread not found' });
        return res.json({ ok: true, thread: row });
    });
});

app.post('/api/forum/threads', ensureForumAuth, upload.single('attachment'), (req, res) => {
    const { title, content } = req.body;
    const author     = req.session.forumUser.username;
    const attachment = req.file ? req.file.filename : null;
    if (!title || !content)
        return res.status(400).json({ ok: false, error: 'Title and content required' });

    db.run(`INSERT INTO forum_threads (author, title, content, attachment) VALUES (?, ?, ?, ?)`,
        [author, title, content, attachment], function (err) {
            if (err) return res.status(500).json({ ok: false, error: err.message });
            db.get(`SELECT * FROM forum_threads WHERE id = ?`, [this.lastID], (e, row) => {
                if (e) return res.status(500).json({ ok: false, error: e.message });
                return res.json({ ok: true, thread: row });
            });
        }
    );
});

app.delete('/api/forum/threads/:id', ensureForumAuth, (req, res) => {
    db.get(`SELECT * FROM forum_threads WHERE id = ?`, [req.params.id], (err, row) => {
        if (err)  return res.status(500).json({ ok: false, error: err.message });
        if (!row) return res.status(404).json({ ok: false, error: 'Thread not found' });
        if (row.author !== req.session.forumUser.username)
            return res.status(403).json({ ok: false, error: 'Not authorized' });
        if (row.attachment) {
            const fp = path.join(__dirname, 'public', 'uploads', row.attachment);
            if (fs.existsSync(fp)) fs.unlinkSync(fp);
        }
        db.run(`DELETE FROM forum_threads WHERE id = ?`, [req.params.id], e => {
            if (e) return res.status(500).json({ ok: false, error: e.message });
            return res.json({ ok: true });
        });
    });
});

// ================================================================
// FORUM REPLIES
// ================================================================
app.get('/api/forum/threads/:id/replies', (req, res) => {
    db.all(`SELECT * FROM forum_replies WHERE thread_id = ? ORDER BY created_at ASC`,
        [req.params.id], (err, rows) => {
            if (err) return res.status(500).json({ ok: false, error: err.message });
            return res.json({ ok: true, replies: rows });
        }
    );
});

app.post('/api/forum/threads/:id/replies', ensureForumAuth, upload.single('attachment'), (req, res) => {
    const { content } = req.body;
    const author      = req.session.forumUser.username;
    const attachment  = req.file ? req.file.filename : null;
    if (!content)
        return res.status(400).json({ ok: false, error: 'Content required' });

    db.run(`INSERT INTO forum_replies (thread_id, author, content, attachment) VALUES (?, ?, ?, ?)`,
        [req.params.id, author, content, attachment], function (err) {
            if (err) return res.status(500).json({ ok: false, error: err.message });
            db.get(`SELECT * FROM forum_replies WHERE id = ?`, [this.lastID], (e, row) => {
                if (e) return res.status(500).json({ ok: false, error: e.message });
                return res.json({ ok: true, reply: row });
            });
        }
    );
});

// ================================================================
// TEACHER AUTH  /api/teacher/...
// ================================================================
app.post('/api/teacher/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password)
        return res.status(400).json({ ok: false, error: 'Username and password are required.' });
    if (username.trim().length < 3)
        return res.status(400).json({ ok: false, error: 'Username must be at least 3 characters.' });
    if (password.length < 6)
        return res.status(400).json({ ok: false, error: 'Password must be at least 6 characters.' });

    const hashed = bcrypt.hashSync(password, 10);
    db.run(`INSERT INTO teacher_accounts (username, password) VALUES (?, ?)`,
        [username.trim(), hashed], function (err) {
            if (err) {
                if (err.message.includes('UNIQUE'))
                    return res.status(409).json({ ok: false, error: 'Username already taken.' });
                return res.status(500).json({ ok: false, error: 'Server error.' });
            }
            req.session.teacher = { id: this.lastID, username: username.trim() };
            return res.json({ ok: true, teacher: { id: this.lastID, username: username.trim() } });
        }
    );
});

app.post('/api/teacher/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password)
        return res.status(400).json({ ok: false, error: 'Username and password are required.' });

    db.get(`SELECT * FROM teacher_accounts WHERE username = ?`, [username.trim()], (err, row) => {
        if (err)  return res.status(500).json({ ok: false, error: 'Server error.' });
        if (!row) return res.status(401).json({ ok: false, error: 'Username not found.' });
        if (!bcrypt.compareSync(password, row.password))
            return res.status(401).json({ ok: false, error: 'Incorrect password.' });
        req.session.teacher = { id: row.id, username: row.username };
        return res.json({ ok: true, teacher: { id: row.id, username: row.username } });
    });
});

app.post('/api/teacher/logout', (req, res) => {
    req.session.teacher = null;
    return res.json({ ok: true });
});

app.get('/api/teacher/me', (req, res) => {
    if (req.session && req.session.teacher)
        return res.json({ ok: true, teacher: req.session.teacher });
    return res.json({ ok: true, teacher: null });
});

// ================================================================
// CLASSES  /api/classes/...
// ================================================================
app.get('/api/classes', ensureTeacher, (req, res) => {
    const tid = req.session.teacher.id;
    db.all(
        `SELECT c.*,
            (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id AND s.teacher_id = c.teacher_id) AS student_count
         FROM classes c WHERE c.teacher_id = ? ORDER BY c.created_at ASC`,
        [tid], (err, rows) => {
            if (err) return res.status(500).json({ ok: false, error: 'Server error.' });
            return res.json({ ok: true, classes: rows });
        }
    );
});

app.post('/api/classes', ensureTeacher, (req, res) => {
    const tid = req.session.teacher.id;
    const { name, section = '', subject = '', color = 'teal' } = req.body;
    if (!name || !name.trim())
        return res.status(400).json({ ok: false, error: 'Class name is required.' });

    db.run(`INSERT INTO classes (teacher_id, name, section, subject, color) VALUES (?, ?, ?, ?, ?)`,
        [tid, name.trim(), section.trim(), subject.trim(), color],
        function (err) {
            if (err) return res.status(500).json({ ok: false, error: 'Server error.' });
            db.get(`SELECT * FROM classes WHERE id = ?`, [this.lastID], (e, row) => {
                if (e) return res.status(500).json({ ok: false, error: 'Server error.' });
                return res.json({ ok: true, class: { ...row, student_count: 0 } });
            });
        }
    );
});

app.put('/api/classes/:id', ensureTeacher, (req, res) => {
    const tid = req.session.teacher.id;
    const cid = parseInt(req.params.id);
    const { name, section = '', subject = '', color = 'teal' } = req.body;
    if (!name || !name.trim())
        return res.status(400).json({ ok: false, error: 'Class name is required.' });

    db.run(`UPDATE classes SET name = ?, section = ?, subject = ?, color = ? WHERE id = ? AND teacher_id = ?`,
        [name.trim(), section.trim(), subject.trim(), color, cid, tid],
        function (err) {
            if (err) return res.status(500).json({ ok: false, error: 'Server error.' });
            if (this.changes === 0) return res.status(404).json({ ok: false, error: 'Class not found.' });
            db.get(`SELECT * FROM classes WHERE id = ?`, [cid], (e, row) =>
                res.json({ ok: true, class: row })
            );
        }
    );
});

app.delete('/api/classes/:id', ensureTeacher, (req, res) => {
    const tid = req.session.teacher.id;
    const cid = parseInt(req.params.id);

    db.get(`SELECT id FROM classes WHERE id = ? AND teacher_id = ?`, [cid, tid], (err, row) => {
        if (err)  return res.status(500).json({ ok: false, error: 'Server error.' });
        if (!row) return res.status(404).json({ ok: false, error: 'Class not found.' });
        db.run(`DELETE FROM classes WHERE id = ? AND teacher_id = ?`, [cid, tid], err2 => {
            if (err2) return res.status(500).json({ ok: false, error: 'Server error.' });
            return res.json({ ok: true });
        });
    });
});

// ================================================================
// STUDENT CRUD  /api/classes/:classId/students/...
// ================================================================
app.get('/api/classes/:classId/students', ensureTeacher, (req, res) => {
    const tid = req.session.teacher.id;
    const cid = parseInt(req.params.classId);

    verifyClass(tid, cid, (err) => {
        if (err) return res.status(403).json({ ok: false, error: err.message });
        db.all(`SELECT * FROM students WHERE teacher_id = ? AND class_id = ? ORDER BY created_at ASC`,
            [tid, cid], (err2, rows) => {
                if (err2) return res.status(500).json({ ok: false, error: 'Server error.' });
                return res.json({ ok: true, students: rows });
            }
        );
    });
});

app.post('/api/classes/:classId/students', ensureTeacher, (req, res) => {
    const tid = req.session.teacher.id;
    const cid = parseInt(req.params.classId);
    const { roll_number, name, avatar } = req.body;
    if (!roll_number || !name || !roll_number.trim() || !name.trim())
        return res.status(400).json({ ok: false, error: 'Roll number and name are required.' });

    verifyClass(tid, cid, (err) => {
        if (err) return res.status(403).json({ ok: false, error: err.message });
        // No uniqueness check — same roll number is allowed in any class or across teachers
        db.run(
            `INSERT INTO students (teacher_id, class_id, roll_number, name, avatar) VALUES (?, ?, ?, ?, ?)`,
            [tid, cid, roll_number.trim(), name.trim(), avatar || null],
            function (err2) {
                if (err2) return res.status(500).json({ ok: false, error: 'Server error: ' + err2.message });
                db.get(`SELECT * FROM students WHERE id = ?`, [this.lastID], (e, row) => {
                    if (e) return res.status(500).json({ ok: false, error: 'Server error.' });
                    return res.json({ ok: true, student: row });
                });
            }
        );
    });
});

app.put('/api/classes/:classId/students/:id', ensureTeacher, (req, res) => {
    const tid = req.session.teacher.id;
    const cid = parseInt(req.params.classId);
    const sid = parseInt(req.params.id);
    const { roll_number, name, avatar } = req.body;
    if (!roll_number || !name)
        return res.status(400).json({ ok: false, error: 'Roll number and name are required.' });

    verifyClass(tid, cid, (err) => {
        if (err) return res.status(403).json({ ok: false, error: err.message });
        db.get(`SELECT * FROM students WHERE id = ? AND teacher_id = ? AND class_id = ?`, [sid, tid, cid],
            (err2, row) => {
                if (err2)  return res.status(500).json({ ok: false, error: 'Server error.' });
                if (!row)  return res.status(404).json({ ok: false, error: 'Student not found.' });
                db.run(
                    `UPDATE students SET roll_number = ?, name = ?, avatar = ? WHERE id = ? AND teacher_id = ? AND class_id = ?`,
                    [roll_number.trim(), name.trim(), avatar || null, sid, tid, cid],
                    function (err3) {
                        if (err3) return res.status(500).json({ ok: false, error: 'Server error.' });
                        db.get(`SELECT * FROM students WHERE id = ?`, [sid], (e, updated) => {
                            if (e) return res.status(500).json({ ok: false, error: 'Server error.' });
                            return res.json({ ok: true, student: updated });
                        });
                    }
                );
            }
        );
    });
});

app.delete('/api/classes/:classId/students/:id', ensureTeacher, (req, res) => {
    const tid = req.session.teacher.id;
    const cid = parseInt(req.params.classId);
    const sid = parseInt(req.params.id);

    verifyClass(tid, cid, (err) => {
        if (err) return res.status(403).json({ ok: false, error: err.message });
        db.get(`SELECT id FROM students WHERE id = ? AND teacher_id = ? AND class_id = ?`, [sid, tid, cid],
            (err2, row) => {
                if (err2)  return res.status(500).json({ ok: false, error: 'Server error.' });
                if (!row)  return res.status(404).json({ ok: false, error: 'Student not found.' });
                db.run(`DELETE FROM students WHERE id = ? AND teacher_id = ? AND class_id = ?`,
                    [sid, tid, cid], err3 => {
                        if (err3) return res.status(500).json({ ok: false, error: 'Server error.' });
                        return res.json({ ok: true });
                    }
                );
            }
        );
    });
});

// ── Patch helper ───────────────────────────────────────────────
function patchStudent(req, res, fields) {
    const tid = req.session.teacher.id;
    const cid = parseInt(req.params.classId);
    const sid = parseInt(req.params.id);

    verifyClass(tid, cid, (err) => {
        if (err) return res.status(403).json({ ok: false, error: err.message });
        db.get(`SELECT id FROM students WHERE id = ? AND teacher_id = ? AND class_id = ?`, [sid, tid, cid],
            (err2, row) => {
                if (err2)  return res.status(500).json({ ok: false, error: 'Server error.' });
                if (!row)  return res.status(404).json({ ok: false, error: 'Student not found.' });

                const setClauses = Object.keys(fields).map(f => `${f} = ?`).join(', ');
                const values     = [...Object.values(fields), sid, tid, cid];

                db.run(`UPDATE students SET ${setClauses} WHERE id = ? AND teacher_id = ? AND class_id = ?`,
                    values, function (err3) {
                        if (err3) return res.status(500).json({ ok: false, error: 'Server error.' });
                        db.get(`SELECT * FROM students WHERE id = ?`, [sid], (e, updated) =>
                            res.json({ ok: true, student: updated, ...fields })
                        );
                    }
                );
            }
        );
    });
}

app.patch('/api/classes/:classId/students/:id/assignment', ensureTeacher, (req, res) => {
    const { field, value } = req.body;
    if (field !== 'assignment1' && field !== 'assignment2')
        return res.status(400).json({ ok: false, error: 'field must be assignment1 or assignment2.' });
    patchStudent(req, res, { [field]: value ? 1 : 0 });
});

app.patch('/api/classes/:classId/students/:id/highlight', ensureTeacher, (req, res) => {
    patchStudent(req, res, { highlighted: req.body.value ? 1 : 0 });
});

app.patch('/api/classes/:classId/students/:id/warnings', ensureTeacher, (req, res) => {
    const warnings = parseInt(req.body.warnings);
    if (isNaN(warnings) || warnings < 0 || warnings > 3)
        return res.status(400).json({ ok: false, error: 'warnings must be 0–3.' });
    patchStudent(req, res, { warnings });
});

app.patch('/api/classes/:classId/students/:id/marks', ensureTeacher, (req, res) => {
    const MARK_LIMITS = {
        mark_mid1: 30, mark_mid2: 30,
        mark_internal_lab: 50, mark_external_lab: 50,
    };
    const updates = {};
    for (const [field, max] of Object.entries(MARK_LIMITS)) {
        if (field in req.body) {
            const raw = req.body[field];
            if (raw === null || raw === '' || raw === undefined) { updates[field] = null; continue; }
            const val = parseFloat(raw);
            if (isNaN(val) || val < 0 || val > max)
                return res.status(400).json({ ok: false, error: `${field} must be between 0 and ${max}.` });
            updates[field] = val;
        }
    }
    if (Object.keys(updates).length === 0)
        return res.status(400).json({ ok: false, error: 'No mark fields provided.' });
    patchStudent(req, res, updates);
});

app.patch('/api/classes/:classId/students/:id/record', ensureTeacher, (req, res) => {
    const { field, value } = req.body;
    if (!['record_book', 'obs_book', 'ppt_submitted'].includes(field))
        return res.status(400).json({ ok: false, error: 'Invalid field.' });
    patchStudent(req, res, { [field]: value ? 1 : 0 });
});

// ================================================================
// ATTENDANCE  /api/classes/:classId/attendance/...
// ================================================================
app.get('/api/classes/:classId/attendance', ensureTeacher, (req, res) => {
    const tid  = req.session.teacher.id;
    const cid  = parseInt(req.params.classId);
    const date = req.query.date;
    if (!date) return res.status(400).json({ ok: false, error: 'date query param required (YYYY-MM-DD).' });

    verifyClass(tid, cid, (err) => {
        if (err) return res.status(403).json({ ok: false, error: err.message });
        db.all(
            `SELECT s.id, s.name, s.roll_number, s.avatar,
                    COALESCE(a.status, 'absent') AS status
             FROM students s
             LEFT JOIN attendance a ON a.student_id = s.id AND a.date = ?
             WHERE s.teacher_id = ? AND s.class_id = ?
             ORDER BY s.created_at ASC`,
            [date, tid, cid],
            (err2, rows) => {
                if (err2) return res.status(500).json({ ok: false, error: 'Server error.' });
                return res.json({ ok: true, date, attendance: rows });
            }
        );
    });
});

app.post('/api/classes/:classId/attendance', ensureTeacher, (req, res) => {
    const tid = req.session.teacher.id;
    const cid = parseInt(req.params.classId);
    const { date, records } = req.body;
    if (!date || !Array.isArray(records) || records.length === 0)
        return res.status(400).json({ ok: false, error: 'date and records[] are required.' });
    const VALID = ['present', 'absent', 'late'];
    for (const r of records) {
        if (!r.student_id || !VALID.includes(r.status))
            return res.status(400).json({ ok: false, error: 'Each record needs student_id and valid status.' });
    }

    verifyClass(tid, cid, (err) => {
        if (err) return res.status(403).json({ ok: false, error: err.message });
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            let errored = false;
            const stmt = db.prepare(
                `INSERT INTO attendance (student_id, teacher_id, class_id, date, status)
                 VALUES (?, ?, ?, ?, ?)
                 ON CONFLICT(student_id, date) DO UPDATE SET status = excluded.status`
            );
            for (const r of records) {
                stmt.run([r.student_id, tid, cid, date, r.status], (e) => { if (e) errored = true; });
            }
            stmt.finalize((e) => {
                if (e || errored) { db.run('ROLLBACK'); return res.status(500).json({ ok: false, error: 'Error saving attendance.' }); }
                db.run('COMMIT', (ce) => {
                    if (ce) return res.status(500).json({ ok: false, error: 'Commit error.' });
                    return res.json({ ok: true, date, saved: records.length });
                });
            });
        });
    });
});

app.get('/api/classes/:classId/attendance/summary', ensureTeacher, (req, res) => {
    const tid = req.session.teacher.id;
    const cid = parseInt(req.params.classId);

    verifyClass(tid, cid, (err) => {
        if (err) return res.status(403).json({ ok: false, error: err.message });
        db.all(
            `SELECT
                s.id AS student_id, s.name, s.roll_number, s.avatar,
                COUNT(a.id) AS total_days,
                SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END) AS present,
                SUM(CASE WHEN a.status='late'    THEN 1 ELSE 0 END) AS late,
                SUM(CASE WHEN a.status='absent'  THEN 1 ELSE 0 END) AS absent
             FROM students s
             LEFT JOIN attendance a ON a.student_id = s.id AND a.teacher_id = ?
             WHERE s.teacher_id = ? AND s.class_id = ?
             GROUP BY s.id ORDER BY s.created_at ASC`,
            [tid, tid, cid],
            (err2, rows) => {
                if (err2) return res.status(500).json({ ok: false, error: 'Server error.' });
                const summary = rows.map(r => ({
                    ...r,
                    percentage: r.total_days > 0
                        ? Math.round(((r.present + r.late) / r.total_days) * 100)
                        : null
                }));
                return res.json({ ok: true, summary });
            }
        );
    });
});

app.get('/api/classes/:classId/attendance/history/:studentId', ensureTeacher, (req, res) => {
    const tid = req.session.teacher.id;
    const cid = parseInt(req.params.classId);
    const sid = parseInt(req.params.studentId);

    verifyClass(tid, cid, (err) => {
        if (err) return res.status(403).json({ ok: false, error: err.message });
        db.get(`SELECT id FROM students WHERE id = ? AND teacher_id = ? AND class_id = ?`, [sid, tid, cid],
            (err2, row) => {
                if (err2)  return res.status(500).json({ ok: false, error: 'Server error.' });
                if (!row)  return res.status(404).json({ ok: false, error: 'Student not found.' });
                db.all(
                    `SELECT date, status FROM attendance WHERE student_id = ? AND teacher_id = ? ORDER BY date ASC`,
                    [sid, tid], (err3, rows) => {
                        if (err3) return res.status(500).json({ ok: false, error: 'Server error.' });
                        return res.json({ ok: true, studentId: sid, history: rows });
                    }
                );
            }
        );
    });
});

// ================================================================
// PLANNER — TRACKERS  /api/planner/trackers
// ================================================================
app.get('/api/planner/trackers', ensureTeacher, (req, res) => {
    db.all(`SELECT * FROM planner_trackers WHERE teacher_id = ? ORDER BY created_at ASC`,
        [req.session.teacher.id], (err, rows) =>
            res.json(err ? { ok: false, error: err.message } : { ok: true, trackers: rows })
    );
});

app.post('/api/planner/trackers', ensureTeacher, (req, res) => {
    const { name, description='', current_val=0, min_val=0, max_val=100, unit='', color='teal' } = req.body;
    if (!name) return res.status(400).json({ ok: false, error: 'Name is required.' });
    db.run(
        `INSERT INTO planner_trackers (teacher_id,name,description,current_val,min_val,max_val,unit,color) VALUES (?,?,?,?,?,?,?,?)`,
        [req.session.teacher.id, name, description, current_val, min_val, max_val, unit, color],
        function (err) {
            if (err) return res.status(500).json({ ok: false, error: err.message });
            db.get(`SELECT * FROM planner_trackers WHERE id=?`, [this.lastID], (e, row) =>
                res.json({ ok: true, tracker: row })
            );
        }
    );
});

app.put('/api/planner/trackers/:id', ensureTeacher, (req, res) => {
    const { name, description='', current_val, min_val, max_val, unit='', color='teal' } = req.body;
    if (!name) return res.status(400).json({ ok: false, error: 'Name is required.' });
    db.run(
        `UPDATE planner_trackers SET name=?,description=?,current_val=?,min_val=?,max_val=?,unit=?,color=? WHERE id=? AND teacher_id=?`,
        [name, description, current_val, min_val, max_val, unit, color, req.params.id, req.session.teacher.id],
        err => res.json(err ? { ok: false, error: err.message } : { ok: true })
    );
});

app.patch('/api/planner/trackers/:id/value', ensureTeacher, (req, res) => {
    db.run(`UPDATE planner_trackers SET current_val=? WHERE id=? AND teacher_id=?`,
        [req.body.current_val, req.params.id, req.session.teacher.id],
        err => res.json(err ? { ok: false, error: err.message } : { ok: true })
    );
});

app.delete('/api/planner/trackers/:id', ensureTeacher, (req, res) => {
    db.run(`DELETE FROM planner_trackers WHERE id=? AND teacher_id=?`,
        [req.params.id, req.session.teacher.id],
        err => res.json(err ? { ok: false, error: err.message } : { ok: true })
    );
});

// ================================================================
// PLANNER — SUBJECTS  /api/planner/subjects
// ================================================================
app.get('/api/planner/subjects', ensureTeacher, (req, res) => {
    const tid = req.session.teacher.id;
    db.all(`SELECT * FROM planner_subjects WHERE teacher_id=? ORDER BY created_at ASC`, [tid], (err, subjs) => {
        if (err) return res.status(500).json({ ok: false, error: err.message });
        if (subjs.length === 0) return res.json({ ok: true, subjects: [] });
        db.all(`SELECT * FROM planner_topics WHERE teacher_id=? ORDER BY sort_order ASC, created_at ASC`, [tid], (err2, topics) => {
            if (err2) return res.status(500).json({ ok: false, error: err2.message });
            db.all(`SELECT * FROM planner_subtopics WHERE teacher_id=? ORDER BY sort_order ASC, created_at ASC`, [tid], (err3, subtopics) => {
                if (err3) return res.status(500).json({ ok: false, error: err3.message });
                topics.forEach(t => {
                    t.done = !!t.done;
                    t.subtopics = subtopics.filter(st => st.topic_id === t.id).map(st => ({ ...st, done: !!st.done }));
                });
                subjs.forEach(s => { s.topics = topics.filter(t => t.subject_id === s.id); });
                return res.json({ ok: true, subjects: subjs });
            });
        });
    });
});

app.post('/api/planner/subjects', ensureTeacher, (req, res) => {
    const { name, section='', color='teal' } = req.body;
    if (!name) return res.status(400).json({ ok: false, error: 'Name is required.' });
    db.run(`INSERT INTO planner_subjects (teacher_id,name,section,color) VALUES (?,?,?,?)`,
        [req.session.teacher.id, name, section, color],
        function (err) {
            if (err) return res.status(500).json({ ok: false, error: err.message });
            db.get(`SELECT * FROM planner_subjects WHERE id=?`, [this.lastID], (e, row) =>
                res.json({ ok: true, subject: row })
            );
        }
    );
});

app.put('/api/planner/subjects/:id', ensureTeacher, (req, res) => {
    const { name, section='', color='teal' } = req.body;
    if (!name) return res.status(400).json({ ok: false, error: 'Name is required.' });
    db.run(`UPDATE planner_subjects SET name=?,section=?,color=? WHERE id=? AND teacher_id=?`,
        [name, section, color, req.params.id, req.session.teacher.id],
        err => res.json(err ? { ok: false, error: err.message } : { ok: true })
    );
});

app.delete('/api/planner/subjects/:id', ensureTeacher, (req, res) => {
    const sid = req.params.id, tid = req.session.teacher.id;
    db.all(`SELECT id FROM planner_topics WHERE subject_id=? AND teacher_id=?`, [sid, tid], (err, topics) => {
        const ids = topics ? topics.map(t => t.id) : [];
        const doDelete = () => db.run(`DELETE FROM planner_subjects WHERE id=? AND teacher_id=?`, [sid, tid],
            err2 => res.json(err2 ? { ok: false, error: err2.message } : { ok: true }));
        if (ids.length === 0) return doDelete();
        const ph = ids.map(() => '?').join(',');
        db.run(`DELETE FROM planner_subtopics WHERE topic_id IN (${ph})`, ids, () => {
            db.run(`DELETE FROM planner_topics WHERE subject_id=? AND teacher_id=?`, [sid, tid], doDelete);
        });
    });
});

// ================================================================
// PLANNER — TOPICS  /api/planner/topics
// ================================================================
app.post('/api/planner/topics', ensureTeacher, (req, res) => {
    const { name, notes='', subject_id } = req.body;
    if (!name)       return res.status(400).json({ ok: false, error: 'Name is required.' });
    if (!subject_id) return res.status(400).json({ ok: false, error: 'subject_id is required.' });
    db.run(`INSERT INTO planner_topics (teacher_id,subject_id,name,notes) VALUES (?,?,?,?)`,
        [req.session.teacher.id, subject_id, name, notes],
        function (err) {
            if (err) return res.status(500).json({ ok: false, error: err.message });
            db.get(`SELECT * FROM planner_topics WHERE id=?`, [this.lastID], (e, row) =>
                res.json({ ok: true, topic: { ...row, done: !!row.done, subtopics: [] } })
            );
        }
    );
});

app.put('/api/planner/topics/:id', ensureTeacher, (req, res) => {
    const { name, notes='' } = req.body;
    if (!name) return res.status(400).json({ ok: false, error: 'Name is required.' });
    db.run(`UPDATE planner_topics SET name=?,notes=? WHERE id=? AND teacher_id=?`,
        [name, notes, req.params.id, req.session.teacher.id],
        err => res.json(err ? { ok: false, error: err.message } : { ok: true })
    );
});

app.patch('/api/planner/topics/:id/done', ensureTeacher, (req, res) => {
    db.run(`UPDATE planner_topics SET done=? WHERE id=? AND teacher_id=?`,
        [req.body.done ? 1 : 0, req.params.id, req.session.teacher.id],
        err => res.json(err ? { ok: false, error: err.message } : { ok: true })
    );
});

app.delete('/api/planner/topics/:id', ensureTeacher, (req, res) => {
    const tid = req.params.id;
    db.run(`DELETE FROM planner_subtopics WHERE topic_id=?`, [tid], () => {
        db.run(`DELETE FROM planner_topics WHERE id=? AND teacher_id=?`,
            [tid, req.session.teacher.id],
            err => res.json(err ? { ok: false, error: err.message } : { ok: true })
        );
    });
});

// ================================================================
// PLANNER — SUBTOPICS  /api/planner/subtopics
// ================================================================
app.post('/api/planner/subtopics', ensureTeacher, (req, res) => {
    const { name, section='', topic_id } = req.body;
    if (!name)     return res.status(400).json({ ok: false, error: 'Name is required.' });
    if (!topic_id) return res.status(400).json({ ok: false, error: 'topic_id is required.' });
    db.run(`INSERT INTO planner_subtopics (teacher_id,topic_id,name,section) VALUES (?,?,?,?)`,
        [req.session.teacher.id, topic_id, name, section],
        function (err) {
            if (err) return res.status(500).json({ ok: false, error: err.message });
            db.get(`SELECT * FROM planner_subtopics WHERE id=?`, [this.lastID], (e, row) =>
                res.json({ ok: true, subtopic: { ...row, done: !!row.done } })
            );
        }
    );
});

app.put('/api/planner/subtopics/:id', ensureTeacher, (req, res) => {
    const { name, section='' } = req.body;
    if (!name) return res.status(400).json({ ok: false, error: 'Name is required.' });
    db.run(`UPDATE planner_subtopics SET name=?,section=? WHERE id=? AND teacher_id=?`,
        [name, section, req.params.id, req.session.teacher.id],
        err => res.json(err ? { ok: false, error: err.message } : { ok: true })
    );
});

app.patch('/api/planner/subtopics/:id/done', ensureTeacher, (req, res) => {
    db.run(`UPDATE planner_subtopics SET done=? WHERE id=? AND teacher_id=?`,
        [req.body.done ? 1 : 0, req.params.id, req.session.teacher.id],
        err => res.json(err ? { ok: false, error: err.message } : { ok: true })
    );
});

app.delete('/api/planner/subtopics/:id', ensureTeacher, (req, res) => {
    db.run(`DELETE FROM planner_subtopics WHERE id=? AND teacher_id=?`,
        [req.params.id, req.session.teacher.id],
        err => res.json(err ? { ok: false, error: err.message } : { ok: true })
    );
});

// ================================================================
// PLANNER — TIMETABLE SLOTS  /api/planner/slots
// ================================================================
app.get('/api/planner/slots', ensureTeacher, (req, res) => {
    db.all(`SELECT * FROM planner_slots WHERE teacher_id=? ORDER BY day ASC, sort_order ASC, created_at ASC`,
        [req.session.teacher.id],
        (err, rows) => res.json(err ? { ok: false, error: err.message } : { ok: true, slots: rows })
    );
});

app.post('/api/planner/slots', ensureTeacher, (req, res) => {
    const { day, time_period, subject, section='', room='', color='teal' } = req.body;
    if (!day || !time_period || !subject)
        return res.status(400).json({ ok: false, error: 'Day, time, and subject are required.' });
    db.run(`INSERT INTO planner_slots (teacher_id,day,time_period,subject,section,room,color) VALUES (?,?,?,?,?,?,?)`,
        [req.session.teacher.id, day, time_period, subject, section, room, color],
        function (err) {
            if (err) return res.status(500).json({ ok: false, error: err.message });
            db.get(`SELECT * FROM planner_slots WHERE id=?`, [this.lastID], (e, row) =>
                res.json({ ok: true, slot: row })
            );
        }
    );
});

app.put('/api/planner/slots/:id', ensureTeacher, (req, res) => {
    const { day, time_period, subject, section='', room='', color='teal' } = req.body;
    if (!day || !time_period || !subject)
        return res.status(400).json({ ok: false, error: 'Day, time, and subject are required.' });
    db.run(`UPDATE planner_slots SET day=?,time_period=?,subject=?,section=?,room=?,color=? WHERE id=? AND teacher_id=?`,
        [day, time_period, subject, section, room, color, req.params.id, req.session.teacher.id],
        err => {
            if (err) return res.status(500).json({ ok: false, error: err.message });
            db.get(`SELECT * FROM planner_slots WHERE id=?`, [req.params.id], (e, row) =>
                res.json({ ok: true, slot: row })
            );
        }
    );
});

app.delete('/api/planner/slots/:id', ensureTeacher, (req, res) => {
    db.run(`DELETE FROM planner_slots WHERE id=? AND teacher_id=?`,
        [req.params.id, req.session.teacher.id],
        err => res.json(err ? { ok: false, error: err.message } : { ok: true })
    );
});

// ================================================================
// START
// ================================================================
app.listen(PORT, () => {
    console.log(`✅  Svlent server  →  http://localhost:${PORT}`);
    console.log(`📁  Database       →  ${dbFile}`);
    console.log(`📂  Uploads        →  ${path.join(__dirname, 'public', 'uploads')}`);
});