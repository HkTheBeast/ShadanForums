const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

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

// Initialize database
const dbFile = path.join(__dirname, 'data.sqlite');
const db = new sqlite3.Database(dbFile);

db.serialize(() => {
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
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Helper: password complexity (simple check)
function validPassword(p){
  // at least 8 chars, 1 letter, 1 number
  return typeof p === 'string' && p.length >= 8 && /[A-Za-z]/.test(p) && /[0-9]/.test(p);
}

// Auth endpoints
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if(!username || !password) return res.status(400).json({ ok:false, error: 'Username and password required' });
  if(!validPassword(password)) return res.status(400).json({ ok:false, error: 'Password must be at least 8 characters and include letters and numbers' });
  const hashed = bcrypt.hashSync(password, 10);
  db.run(`INSERT INTO users (username, password) VALUES (?,?)`, [username, hashed], function(err){
    if(err){
      if(err.message && err.message.includes('UNIQUE')) return res.status(409).json({ ok:false, error: 'Username already taken' });
      return res.status(500).json({ ok:false, error: err.message });
    }
    // set session
    req.session.user = { id: this.lastID, username };
    return res.json({ ok:true, user: { id: this.lastID, username } });
  });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if(!username || !password) return res.status(400).json({ ok:false, error: 'Username and password required' });
  db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, row) => {
    if(err) return res.status(500).json({ ok:false, error: err.message });
    if(!row) return res.status(401).json({ ok:false, error: 'Invalid credentials' });
    const match = bcrypt.compareSync(password, row.password);
    if(!match) return res.status(401).json({ ok:false, error: 'Invalid credentials' });
    req.session.user = { id: row.id, username: row.username };
    return res.json({ ok:true, user: { id: row.id, username: row.username } });
  });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(err => {
    return res.json({ ok: true });
  });
});

app.get('/api/me', (req, res) => {
  if(req.session && req.session.user) return res.json({ ok:true, user: req.session.user });
  return res.json({ ok:true, user: null });
});

function ensureAuth(req, res, next){
  if(req.session && req.session.user){
    return next();
  }
  return res.status(401).json({ ok:false, error: 'Not authenticated' });
}

// Posts API
app.get('/api/posts', (req, res) => {
  db.all(`SELECT * FROM posts ORDER BY created_at DESC`, [], (err, rows) => {
    if(err) return res.status(500).json({ ok:false, error: err.message });
    return res.json({ ok:true, posts: rows });
  });
});

app.post('/api/posts', ensureAuth, (req, res) => {
  const { title, content } = req.body;
  const author = req.session.user.username;
  db.run(`INSERT INTO posts (author, title, content) VALUES (?,?,?)`, [author, title || '', content], function(err){
    if(err) return res.status(500).json({ ok:false, error: err.message });
    db.get(`SELECT * FROM posts WHERE id = ?`, [this.lastID], (e, row) => {
      if(e) return res.status(500).json({ ok:false, error: e.message });
      return res.json({ ok:true, post: row });
    });
  });
});

app.put('/api/posts/:id', ensureAuth, (req, res) => {
  const id = req.params.id;
  const { title, content } = req.body;
  db.get(`SELECT * FROM posts WHERE id = ?`, [id], (err, row) => {
    if(err) return res.status(500).json({ ok:false, error: err.message });
    if(!row) return res.status(404).json({ ok:false, error: 'Post not found' });
    if(row.author !== req.session.user.username) return res.status(403).json({ ok:false, error: 'Not allowed' });
    db.run(`UPDATE posts SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [title || '', content, id], function(e){
      if(e) return res.status(500).json({ ok:false, error: e.message });
      db.get(`SELECT * FROM posts WHERE id = ?`, [id], (ee, updated) => {
        if(ee) return res.status(500).json({ ok:false, error: ee.message });
        return res.json({ ok:true, post: updated });
      });
    });
  });
});

app.delete('/api/posts/:id', ensureAuth, (req, res) => {
  const id = req.params.id;
  db.get(`SELECT * FROM posts WHERE id = ?`, [id], (err, row) => {
    if(err) return res.status(500).json({ ok:false, error: err.message });
    if(!row) return res.status(404).json({ ok:false, error: 'Post not found' });
    if(row.author !== req.session.user.username) return res.status(403).json({ ok:false, error: 'Not allowed' });
    db.run(`DELETE FROM posts WHERE id = ?`, [id], function(e){
      if(e) return res.status(500).json({ ok:false, error: e.message });
      return res.json({ ok:true });
    });
  });
});

app.listen(PORT, () => {
  console.log('Server running on port', PORT);
});
