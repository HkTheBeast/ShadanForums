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
    name:              'shadanforums.sid',
    secret:            process.env.SESSION_SECRET || 'replace_this_with_a_strong_secret',
    resave:            false,
    saveUninitialized: false,
    cookie:            { maxAge: 1000 * 60 * 60 * 24, sameSite: 'lax' }
}));
app.use(express.static(path.join(__dirname, 'public')));

// ================================================================
// DATABASE  —  ShadanForums keeps its own data.sqlite
// ================================================================
const dbFile = path.join(__dirname, 'data.sqlite');
const db     = new sqlite3.Database(dbFile);

db.serialize(() => {
    db.run('PRAGMA foreign_keys = ON');

    // ── Forum users ────────────────────────────────────────────
    db.run(`CREATE TABLE IF NOT EXISTS forum_users (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        username   TEXT UNIQUE NOT NULL,
        password   TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // ── Forum threads ──────────────────────────────────────────
    db.run(`CREATE TABLE IF NOT EXISTS forum_threads (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        author     TEXT NOT NULL,
        title      TEXT NOT NULL,
        content    TEXT NOT NULL,
        attachment TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME
    )`);

    // ── Forum replies ──────────────────────────────────────────
    db.run(`CREATE TABLE IF NOT EXISTS forum_replies (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        thread_id  INTEGER NOT NULL,
        author     TEXT NOT NULL,
        content    TEXT NOT NULL,
        attachment TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (thread_id) REFERENCES forum_threads(id) ON DELETE CASCADE
    )`);

    // ── Quote likes ────────────────────────────────────────────
    db.run(`CREATE TABLE IF NOT EXISTS quote_likes (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        quote_author TEXT NOT NULL,
        user_id      INTEGER NOT NULL,
        created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(quote_author, user_id)
    )`);
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
// AUTH GUARD
// ================================================================
function ensureForumAuth(req, res, next) {
    if (req.session && req.session.forumUser) return next();
    return res.status(401).json({ ok: false, error: 'Not authenticated' });
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
// START
// ================================================================
app.listen(PORT, () => {
    console.log(`✅  ShadanForums server  →  http://localhost:${PORT}`);
    console.log(`📁  Database            →  ${dbFile}`);
    console.log(`📂  Uploads             →  ${path.join(__dirname, 'public', 'uploads')}`);
});