const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json({limit: '5mb'}));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  name: 'uniforum.sid',
  secret: process.env.SESSION_SECRET || 'replace_this_with_a_strong_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24, sameSite: 'lax' } // 1 day
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Initialize database
const dbFile = path.join(__dirname, 'data.sqlite');
const db = new sqlite3.Database(dbFile);

// Create all tables
db.serialize(() => {
  // Old forum tables
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  
  db.run(`CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    author TEXT NOT NULL,
    title TEXT,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME
  )`);

  // New forum tables
  db.run(`CREATE TABLE IF NOT EXISTS forum_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  
  db.run(`CREATE TABLE IF NOT EXISTS forum_threads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    author TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    attachment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME
  )`);
  
  db.run(`CREATE TABLE IF NOT EXISTS forum_replies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    thread_id INTEGER NOT NULL,
    author TEXT NOT NULL,
    content TEXT NOT NULL,
    attachment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (thread_id) REFERENCES forum_threads(id) ON DELETE CASCADE
  )`);
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images, PDF, and DOC files are allowed'));
    }
  }
});

// Helper: password complexity (simple check)
function validPassword(p){
  // at least 8 chars, 1 letter, 1 number
  return typeof p === 'string' && p.length >= 8 && /[A-Za-z]/.test(p) && /[0-9]/.test(p);
}

// Middleware to check auth
function ensureAuth(req, res, next){
  if(req.session && req.session.user){
    return next();
  }
  return res.status(401).json({ ok:false, error: 'Not authenticated' });
}

function ensureForumAuth(req, res, next) {
  if (req.session && req.session.forumUser) {
    return next();
  }
  return res.status(401).json({ ok: false, error: 'Not authenticated' });
}

// ===== NEW FORUM AUTH ROUTES =====
app.post('/api/forum/register', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ ok: false, error: 'Username and password required' });
  }
  
  if (password.length < 8) {
    return res.status(400).json({ ok: false, error: 'Password must be at least 8 characters' });
  }
  
  const hashed = bcrypt.hashSync(password, 10);
  
  db.run(`INSERT INTO forum_users (username, password) VALUES (?, ?)`, 
    [username, hashed], 
    function(err) {
      if (err) {
        if (err.message && err.message.includes('UNIQUE')) {
          return res.status(409).json({ ok: false, error: 'Username already taken' });
        }
        return res.status(500).json({ ok: false, error: err.message });
      }
      
      req.session.forumUser = { id: this.lastID, username };
      return res.json({ ok: true, user: { id: this.lastID, username } });
    }
  );
});

app.post('/api/forum/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ ok: false, error: 'Username and password required' });
  }
  
  db.get(`SELECT * FROM forum_users WHERE username = ?`, [username], (err, row) => {
    if (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
    if (!row) {
      return res.status(401).json({ ok: false, error: 'Invalid credentials' });
    }
    
    const match = bcrypt.compareSync(password, row.password);
    if (!match) {
      return res.status(401).json({ ok: false, error: 'Invalid credentials' });
    }
    
    req.session.forumUser = { id: row.id, username: row.username };
    return res.json({ ok: true, user: { id: row.id, username: row.username } });
  });
});

app.post('/api/forum/logout', (req, res) => {
  req.session.forumUser = null;
  return res.json({ ok: true });
});

app.get('/api/forum/me', (req, res) => {
  if (req.session && req.session.forumUser) {
    return res.json({ ok: true, user: req.session.forumUser });
  }
  return res.json({ ok: true, user: null });
});

// ===== NEW FORUM THREAD ROUTES =====
app.get('/api/forum/threads', (req, res) => {
  db.all(`
    SELECT 
      t.*,
      (SELECT COUNT(*) FROM forum_replies WHERE thread_id = t.id) as reply_count
    FROM forum_threads t
    ORDER BY t.created_at DESC
  `, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
    return res.json({ ok: true, threads: rows });
  });
});

app.get('/api/forum/threads/:id', (req, res) => {
  const id = req.params.id;
  
  db.get(`SELECT * FROM forum_threads WHERE id = ?`, [id], (err, row) => {
    if (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
    if (!row) {
      return res.status(404).json({ ok: false, error: 'Thread not found' });
    }
    return res.json({ ok: true, thread: row });
  });
});

app.post('/api/forum/threads', ensureForumAuth, upload.single('attachment'), (req, res) => {
  const { title, content } = req.body;
  const author = req.session.forumUser.username;
  const attachment = req.file ? req.file.filename : null;
  
  if (!title || !content) {
    return res.status(400).json({ ok: false, error: 'Title and content required' });
  }
  
  db.run(
    `INSERT INTO forum_threads (author, title, content, attachment) VALUES (?, ?, ?, ?)`,
    [author, title, content, attachment],
    function(err) {
      if (err) {
        return res.status(500).json({ ok: false, error: err.message });
      }
      
      db.get(`SELECT * FROM forum_threads WHERE id = ?`, [this.lastID], (e, row) => {
        if (e) {
          return res.status(500).json({ ok: false, error: e.message });
        }
        return res.json({ ok: true, thread: row });
      });
    }
  );
});

app.delete('/api/forum/threads/:id', ensureForumAuth, (req, res) => {
  const id = req.params.id;
  
  db.get(`SELECT * FROM forum_threads WHERE id = ?`, [id], (err, row) => {
    if (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
    if (!row) {
      return res.status(404).json({ ok: false, error: 'Thread not found' });
    }
    if (row.author !== req.session.forumUser.username) {
      return res.status(403).json({ ok: false, error: 'Not authorized' });
    }
    
    // Delete attachment file if exists
    if (row.attachment) {
      const filePath = path.join(__dirname, 'public', 'uploads', row.attachment);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    // Delete thread (CASCADE will delete replies)
    db.run(`DELETE FROM forum_threads WHERE id = ?`, [id], function(e) {
      if (e) {
        return res.status(500).json({ ok: false, error: e.message });
      }
      return res.json({ ok: true });
    });
  });
});

// ===== NEW FORUM REPLY ROUTES =====
app.get('/api/forum/threads/:id/replies', (req, res) => {
  const threadId = req.params.id;
  
  db.all(
    `SELECT * FROM forum_replies WHERE thread_id = ? ORDER BY created_at ASC`,
    [threadId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ ok: false, error: err.message });
      }
      return res.json({ ok: true, replies: rows });
    }
  );
});

app.post('/api/forum/threads/:id/replies', ensureForumAuth, upload.single('attachment'), (req, res) => {
  const threadId = req.params.id;
  const { content } = req.body;
  const author = req.session.forumUser.username;
  const attachment = req.file ? req.file.filename : null;
  
  if (!content) {
    return res.status(400).json({ ok: false, error: 'Content required' });
  }
  
  db.run(
    `INSERT INTO forum_replies (thread_id, author, content, attachment) VALUES (?, ?, ?, ?)`,
    [threadId, author, content, attachment],
    function(err) {
      if (err) {
        return res.status(500).json({ ok: false, error: err.message });
      }
      
      db.get(`SELECT * FROM forum_replies WHERE id = ?`, [this.lastID], (e, row) => {
        if (e) {
          return res.status(500).json({ ok: false, error: e.message });
        }
        return res.json({ ok: true, reply: row });
      });
    }
  );
});

// ===== START SERVER (MUST BE LAST!) =====
app.listen(PORT, () => {
  console.log('✅ Server running on port', PORT);
  console.log('📁 Uploads directory:', path.join(__dirname, 'public', 'uploads'));
});