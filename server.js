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

    // ── Original forum tables ──────────────────────────────────
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        username   TEXT UNIQUE NOT NULL,
        password   TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS posts (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        author     TEXT NOT NULL,
        title      TEXT,
        content    TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME
    )`);

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

    // ── Teacher + Student tables ───────────────────────────────
    db.run(`CREATE TABLE IF NOT EXISTS teacher_accounts (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        username   TEXT UNIQUE NOT NULL,
        password   TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Full students table with all columns
    db.run(`CREATE TABLE IF NOT EXISTS students (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        teacher_id      INTEGER NOT NULL,
        roll_number     TEXT NOT NULL,
        name            TEXT NOT NULL,
        avatar          TEXT,
        assignment1     INTEGER DEFAULT 0,
        assignment2     INTEGER DEFAULT 0,
        highlighted     INTEGER DEFAULT 0,
        warnings        INTEGER DEFAULT 0,
        mark_mid1       REAL,
        mark_mid2       REAL,
        mark_internal_lab REAL,
        mark_external_lab REAL,
        record_book     INTEGER DEFAULT 0,
        obs_book        INTEGER DEFAULT 0,
        ppt_submitted   INTEGER DEFAULT 0,
        created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (teacher_id) REFERENCES teacher_accounts(id) ON DELETE CASCADE,
        UNIQUE(teacher_id, roll_number)
    )`);

    // ── Attendance table ───────────────────────────────────────
    // Each row = one student's status on one date
    // status: 'present' | 'absent' | 'late'
    db.run(`CREATE TABLE IF NOT EXISTS attendance (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        teacher_id INTEGER NOT NULL,
        date       TEXT NOT NULL,
        status     TEXT NOT NULL DEFAULT 'absent',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (teacher_id) REFERENCES teacher_accounts(id) ON DELETE CASCADE,
        UNIQUE(student_id, date)
    )`);

    // Safe migration for databases created before these columns existed
    const safeAdd = (col, type) =>
        db.run(`ALTER TABLE students ADD COLUMN ${col} ${type}`, () => {});

    safeAdd('highlighted',       'INTEGER DEFAULT 0');
    safeAdd('warnings',          'INTEGER DEFAULT 0');
    safeAdd('mark_mid1',         'REAL');
    safeAdd('mark_mid2',         'REAL');
    safeAdd('mark_internal_lab', 'REAL');
    safeAdd('mark_external_lab', 'REAL');
    safeAdd('record_book',       'INTEGER DEFAULT 0');
    safeAdd('obs_book',          'INTEGER DEFAULT 0');
    safeAdd('ppt_submitted',     'INTEGER DEFAULT 0');
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
// FORUM REPLIES  /api/forum/threads/:id/replies
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
// STUDENT CRUD  /api/students/...
// ================================================================

app.get('/api/students', ensureTeacher, (req, res) => {
    db.all(`SELECT * FROM students WHERE teacher_id = ? ORDER BY created_at ASC`,
        [req.session.teacher.id], (err, rows) => {
            if (err) return res.status(500).json({ ok: false, error: 'Server error.' });
            return res.json({ ok: true, students: rows });
        }
    );
});

app.post('/api/students', ensureTeacher, (req, res) => {
    const teacherId = req.session.teacher.id;
    const { roll_number, name, avatar } = req.body;
    if (!roll_number || !name || !roll_number.trim() || !name.trim())
        return res.status(400).json({ ok: false, error: 'Roll number and name are required.' });

    db.run(
        `INSERT INTO students (teacher_id, roll_number, name, avatar) VALUES (?, ?, ?, ?)`,
        [teacherId, roll_number.trim(), name.trim(), avatar || null],
        function (err) {
            if (err) {
                if (err.message.includes('UNIQUE'))
                    return res.status(409).json({ ok: false, error: 'A student with this roll number already exists.' });
                return res.status(500).json({ ok: false, error: 'Server error.' });
            }
            db.get(`SELECT * FROM students WHERE id = ?`, [this.lastID], (e, row) => {
                if (e) return res.status(500).json({ ok: false, error: 'Server error.' });
                return res.json({ ok: true, student: row });
            });
        }
    );
});

app.put('/api/students/:id', ensureTeacher, (req, res) => {
    const teacherId = req.session.teacher.id;
    const studentId = parseInt(req.params.id);
    const { roll_number, name, avatar } = req.body;
    if (!roll_number || !name)
        return res.status(400).json({ ok: false, error: 'Roll number and name are required.' });

    db.get(`SELECT * FROM students WHERE id = ? AND teacher_id = ?`, [studentId, teacherId],
        (err, row) => {
            if (err)  return res.status(500).json({ ok: false, error: 'Server error.' });
            if (!row) return res.status(404).json({ ok: false, error: 'Student not found.' });
            db.run(
                `UPDATE students SET roll_number = ?, name = ?, avatar = ? WHERE id = ? AND teacher_id = ?`,
                [roll_number.trim(), name.trim(), avatar || null, studentId, teacherId],
                function (err2) {
                    if (err2) {
                        if (err2.message.includes('UNIQUE'))
                            return res.status(409).json({ ok: false, error: 'Another student already has this roll number.' });
                        return res.status(500).json({ ok: false, error: 'Server error.' });
                    }
                    db.get(`SELECT * FROM students WHERE id = ?`, [studentId], (e, updated) => {
                        if (e) return res.status(500).json({ ok: false, error: 'Server error.' });
                        return res.json({ ok: true, student: updated });
                    });
                }
            );
        }
    );
});

app.patch('/api/students/:id/assignment', ensureTeacher, (req, res) => {
    const teacherId = req.session.teacher.id;
    const studentId = parseInt(req.params.id);
    const { field, value } = req.body;
    if (field !== 'assignment1' && field !== 'assignment2')
        return res.status(400).json({ ok: false, error: 'field must be assignment1 or assignment2.' });

    db.get(`SELECT * FROM students WHERE id = ? AND teacher_id = ?`, [studentId, teacherId],
        (err, row) => {
            if (err)  return res.status(500).json({ ok: false, error: 'Server error.' });
            if (!row) return res.status(404).json({ ok: false, error: 'Student not found.' });
            db.run(`UPDATE students SET ${field} = ? WHERE id = ? AND teacher_id = ?`,
                [value ? 1 : 0, studentId, teacherId], function (err2) {
                    if (err2) return res.status(500).json({ ok: false, error: 'Server error.' });
                    return res.json({ ok: true, [field]: value });
                }
            );
        }
    );
});

app.patch('/api/students/:id/highlight', ensureTeacher, (req, res) => {
    const teacherId = req.session.teacher.id;
    const studentId = parseInt(req.params.id);
    const { value } = req.body;

    db.get(`SELECT * FROM students WHERE id = ? AND teacher_id = ?`, [studentId, teacherId],
        (err, row) => {
            if (err)  return res.status(500).json({ ok: false, error: 'Server error.' });
            if (!row) return res.status(404).json({ ok: false, error: 'Student not found.' });
            db.run(`UPDATE students SET highlighted = ? WHERE id = ? AND teacher_id = ?`,
                [value ? 1 : 0, studentId, teacherId], function (err2) {
                    if (err2) return res.status(500).json({ ok: false, error: 'Server error.' });
                    return res.json({ ok: true, highlighted: value });
                }
            );
        }
    );
});

app.patch('/api/students/:id/warnings', ensureTeacher, (req, res) => {
    const teacherId = req.session.teacher.id;
    const studentId = parseInt(req.params.id);
    const warnings  = parseInt(req.body.warnings);

    if (isNaN(warnings) || warnings < 0 || warnings > 3)
        return res.status(400).json({ ok: false, error: 'warnings must be 0, 1, 2, or 3.' });

    db.get(`SELECT * FROM students WHERE id = ? AND teacher_id = ?`, [studentId, teacherId],
        (err, row) => {
            if (err)  return res.status(500).json({ ok: false, error: 'Server error.' });
            if (!row) return res.status(404).json({ ok: false, error: 'Student not found.' });
            db.run(`UPDATE students SET warnings = ? WHERE id = ? AND teacher_id = ?`,
                [warnings, studentId, teacherId], function (err2) {
                    if (err2) return res.status(500).json({ ok: false, error: 'Server error.' });
                    return res.json({ ok: true, warnings });
                }
            );
        }
    );
});

app.patch('/api/students/:id/marks', ensureTeacher, (req, res) => {
    const teacherId = req.session.teacher.id;
    const studentId = parseInt(req.params.id);

    const MARK_LIMITS = {
        mark_mid1:         30,
        mark_mid2:         30,
        mark_internal_lab: 50,
        mark_external_lab: 50,
    };

    const updates = {};
    for (const [field, max] of Object.entries(MARK_LIMITS)) {
        if (field in req.body) {
            const raw = req.body[field];
            if (raw === null || raw === '' || raw === undefined) {
                updates[field] = null;
            } else {
                const val = parseFloat(raw);
                if (isNaN(val) || val < 0 || val > max)
                    return res.status(400).json({ ok: false, error: `${field} must be between 0 and ${max}.` });
                updates[field] = val;
            }
        }
    }

    if (Object.keys(updates).length === 0)
        return res.status(400).json({ ok: false, error: 'No mark fields provided.' });

    db.get(`SELECT * FROM students WHERE id = ? AND teacher_id = ?`, [studentId, teacherId],
        (err, row) => {
            if (err)  return res.status(500).json({ ok: false, error: 'Server error.' });
            if (!row) return res.status(404).json({ ok: false, error: 'Student not found.' });

            const setClauses = Object.keys(updates).map(f => `${f} = ?`).join(', ');
            const values     = [...Object.values(updates), studentId, teacherId];

            db.run(`UPDATE students SET ${setClauses} WHERE id = ? AND teacher_id = ?`,
                values, function (err2) {
                    if (err2) return res.status(500).json({ ok: false, error: 'Server error.' });
                    db.get(`SELECT * FROM students WHERE id = ?`, [studentId], (e, updated) => {
                        if (e) return res.status(500).json({ ok: false, error: 'Server error.' });
                        return res.json({ ok: true, student: updated });
                    });
                }
            );
        }
    );
});

app.patch('/api/students/:id/record', ensureTeacher, (req, res) => {
    const teacherId = req.session.teacher.id;
    const studentId = parseInt(req.params.id);
    const { field, value } = req.body;

    const ALLOWED = ['record_book', 'obs_book', 'ppt_submitted'];
    if (!ALLOWED.includes(field))
        return res.status(400).json({ ok: false, error: 'field must be record_book, obs_book, or ppt_submitted.' });

    db.get(`SELECT * FROM students WHERE id = ? AND teacher_id = ?`, [studentId, teacherId],
        (err, row) => {
            if (err)  return res.status(500).json({ ok: false, error: 'Server error.' });
            if (!row) return res.status(404).json({ ok: false, error: 'Student not found.' });
            db.run(`UPDATE students SET ${field} = ? WHERE id = ? AND teacher_id = ?`,
                [value ? 1 : 0, studentId, teacherId], function (err2) {
                    if (err2) return res.status(500).json({ ok: false, error: 'Server error.' });
                    return res.json({ ok: true, [field]: value });
                }
            );
        }
    );
});

app.delete('/api/students/:id', ensureTeacher, (req, res) => {
    const teacherId = req.session.teacher.id;
    const studentId = parseInt(req.params.id);

    db.get(`SELECT * FROM students WHERE id = ? AND teacher_id = ?`, [studentId, teacherId],
        (err, row) => {
            if (err)  return res.status(500).json({ ok: false, error: 'Server error.' });
            if (!row) return res.status(404).json({ ok: false, error: 'Student not found.' });
            db.run(`DELETE FROM students WHERE id = ? AND teacher_id = ?`,
                [studentId, teacherId], function (err2) {
                    if (err2) return res.status(500).json({ ok: false, error: 'Server error.' });
                    return res.json({ ok: true });
                }
            );
        }
    );
});

// ================================================================
// ATTENDANCE  /api/attendance/...
// ================================================================

// GET attendance for a specific date (returns all students with their status for that day)
// GET /api/attendance?date=2024-01-15
app.get('/api/attendance', ensureTeacher, (req, res) => {
    const teacherId = req.session.teacher.id;
    const date      = req.query.date;
    if (!date) return res.status(400).json({ ok: false, error: 'date query param required (YYYY-MM-DD).' });

    // Get all students for this teacher, left-join attendance for the given date
    db.all(
        `SELECT s.id, s.name, s.roll_number, s.avatar,
                COALESCE(a.status, 'absent') AS status
         FROM students s
         LEFT JOIN attendance a ON a.student_id = s.id AND a.date = ?
         WHERE s.teacher_id = ?
         ORDER BY s.created_at ASC`,
        [date, teacherId],
        (err, rows) => {
            if (err) return res.status(500).json({ ok: false, error: 'Server error.' });
            return res.json({ ok: true, date, attendance: rows });
        }
    );
});

// POST /api/attendance  — bulk save attendance for a date
// body: { date: "YYYY-MM-DD", records: [ { student_id, status }, ... ] }
app.post('/api/attendance', ensureTeacher, (req, res) => {
    const teacherId = req.session.teacher.id;
    const { date, records } = req.body;

    if (!date || !Array.isArray(records) || records.length === 0)
        return res.status(400).json({ ok: false, error: 'date and records[] are required.' });

    const VALID_STATUSES = ['present', 'absent', 'late'];
    for (const r of records) {
        if (!r.student_id || !VALID_STATUSES.includes(r.status))
            return res.status(400).json({ ok: false, error: 'Each record needs student_id and valid status.' });
    }

    // Use a transaction for atomicity
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        let errored = false;

        const stmt = db.prepare(
            `INSERT INTO attendance (student_id, teacher_id, date, status)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(student_id, date) DO UPDATE SET status = excluded.status`
        );

        for (const r of records) {
            stmt.run([r.student_id, teacherId, date, r.status], (err) => {
                if (err) errored = true;
            });
        }

        stmt.finalize((err) => {
            if (err || errored) {
                db.run('ROLLBACK');
                return res.status(500).json({ ok: false, error: 'Server error saving attendance.' });
            }
            db.run('COMMIT', (commitErr) => {
                if (commitErr) return res.status(500).json({ ok: false, error: 'Server error committing.' });
                return res.json({ ok: true, date, saved: records.length });
            });
        });
    });
});

// GET /api/attendance/summary — attendance percentage for every student
// Returns: [{ student_id, name, roll_number, total_days, present, late, absent, percentage }]
app.get('/api/attendance/summary', ensureTeacher, (req, res) => {
    const teacherId = req.session.teacher.id;

    db.all(
        `SELECT
            s.id        AS student_id,
            s.name,
            s.roll_number,
            s.avatar,
            COUNT(a.id)                                             AS total_days,
            SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END)  AS present,
            SUM(CASE WHEN a.status = 'late'    THEN 1 ELSE 0 END)  AS late,
            SUM(CASE WHEN a.status = 'absent'  THEN 1 ELSE 0 END)  AS absent
         FROM students s
         LEFT JOIN attendance a ON a.student_id = s.id AND a.teacher_id = ?
         WHERE s.teacher_id = ?
         GROUP BY s.id
         ORDER BY s.created_at ASC`,
        [teacherId, teacherId],
        (err, rows) => {
            if (err) return res.status(500).json({ ok: false, error: 'Server error.' });
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

// GET /api/attendance/history/:studentId — full date-by-date history for one student
app.get('/api/attendance/history/:studentId', ensureTeacher, (req, res) => {
    const teacherId = req.session.teacher.id;
    const studentId = parseInt(req.params.studentId);

    // Verify ownership
    db.get(`SELECT id FROM students WHERE id = ? AND teacher_id = ?`, [studentId, teacherId],
        (err, row) => {
            if (err)  return res.status(500).json({ ok: false, error: 'Server error.' });
            if (!row) return res.status(404).json({ ok: false, error: 'Student not found.' });

            db.all(
                `SELECT date, status FROM attendance
                 WHERE student_id = ? AND teacher_id = ?
                 ORDER BY date ASC`,
                [studentId, teacherId],
                (err2, rows) => {
                    if (err2) return res.status(500).json({ ok: false, error: 'Server error.' });
                    return res.json({ ok: true, studentId, history: rows });
                }
            );
        }
    );
});

// GET /api/attendance/dates — list of all dates attendance was taken for this teacher
app.get('/api/attendance/dates', ensureTeacher, (req, res) => {
    const teacherId = req.session.teacher.id;

    db.all(
        `SELECT DISTINCT date FROM attendance
         WHERE teacher_id = ?
         ORDER BY date DESC`,
        [teacherId],
        (err, rows) => {
            if (err) return res.status(500).json({ ok: false, error: 'Server error.' });
            return res.json({ ok: true, dates: rows.map(r => r.date) });
        }
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