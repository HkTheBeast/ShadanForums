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

// ================= MIDDLEWARE =================
app.use(bodyParser.json({limit: '5mb'}));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  name: 'uniforum.sid',
  secret: process.env.SESSION_SECRET || 'replace_this_with_a_strong_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 1000 * 60 * 60 * 24, 
    sameSite: 'lax',
    httpOnly: true
  }
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Set view engine for HTML pages
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');
app.engine('html', require('ejs').renderFile);

// ================= DATABASE SETUP =================
const dbFile = path.join(__dirname, 'data.sqlite');
const db = new sqlite3.Database(dbFile);

// Create all tables (EXACTLY AS YOU HAD THEM)
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

  // Quote likes table
  db.run(`CREATE TABLE IF NOT EXISTS quote_likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quote_author TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(quote_author, user_id)
  )`);
});

// ================= MULTER FOR FILE UPLOADS =================
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

// ================= HELPER FUNCTIONS =================
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

// ================= PAGE ROUTES (NEW - FOR TEACHER PORTAL) =================
app.get('/', (req, res) => {
  if (req.session.user) {
    return res.redirect('/home');
  }
  res.redirect('/login');
});

app.get('/home', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  res.render('AZhome.html', { 
    user: req.session.user,
    isAuthenticated: true 
  });
});

app.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect('/home');
  }
  res.render('login.html', { 
    error: null,
    isAuthenticated: false 
  });
});

app.get('/register', (req, res) => {
  if (req.session.user) {
    return res.redirect('/home');
  }
  res.render('register.html', { 
    error: null,
    isAuthenticated: false 
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/login');
  });
});

// ================= TEACHER PORTAL AUTHENTICATION API =================
app.post('/api/auth/register', async (req, res) => {
  const { username, password, confirmPassword } = req.body;
  
  console.log('Teacher Portal Registration attempt:', { username });
  
  // Validation
  if (!username || !password || !confirmPassword) {
    return res.status(400).json({ 
      success: false, 
      message: 'All fields are required' 
    });
  }
  
  if (password !== confirmPassword) {
    return res.status(400).json({ 
      success: false, 
      message: 'Passwords do not match' 
    });
  }
  
  if (password.length < 8) {
    return res.status(400).json({ 
      success: false, 
      message: 'Password must be at least 8 characters' 
    });
  }
  
  if (username.length < 3) {
    return res.status(400).json({ 
      success: false, 
      message: 'Username must be at least 3 characters' 
    });
  }
  
  // Check username format
  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  if (!usernameRegex.test(username)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Username can only contain letters, numbers, and underscores' 
    });
  }
  
  // Check if username exists in users table
  db.get('SELECT id FROM users WHERE username = ?', [username], async (err, row) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Server error. Please try again.' 
      });
    }
    
    if (row) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username already taken' 
      });
    }
    
    try {
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      // Insert user
      db.run(
        'INSERT INTO users (username, password) VALUES (?, ?)',
        [username, hashedPassword],
        function(err) {
          if (err) {
            console.error('Insert error:', err);
            return res.status(500).json({ 
              success: false, 
              message: 'Registration failed. Please try again.' 
            });
          }
          
          // Create session for teacher portal
          req.session.user = { 
            id: this.lastID, 
            username: username 
          };
          
          console.log('Teacher Portal Registration successful for user:', username);
          
          return res.json({ 
            success: true, 
            message: 'Registration successful! Redirecting...',
            redirect: '/home'
          });
        }
      );
    } catch (error) {
      console.error('Hash error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Server error. Please try again.' 
      });
    }
  });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  console.log('Teacher Portal Login attempt:', { username });
  
  if (!username || !password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Username and password are required' 
    });
  }
  
  // Find user in users table
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Server error. Please try again.' 
      });
    }
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid username or password' 
      });
    }
    
    // Compare password
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) {
        console.error('Password comparison error:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Server error. Please try again.' 
        });
      }
      
      if (!isMatch) {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid username or password' 
        });
      }
      
      // Create session for teacher portal
      req.session.user = { 
        id: user.id, 
        username: user.username 
      };
      
      console.log('Teacher Portal Login successful for user:', username);
      
      return res.json({ 
        success: true, 
        message: 'Login successful! Redirecting...',
        redirect: '/home'
      });
    });
  });
});

// Check authentication status
app.get('/api/auth/status', (req, res) => {
  if (req.session.user) {
    return res.json({ 
      isAuthenticated: true, 
      user: req.session.user 
    });
  }
  return res.json({ 
    isAuthenticated: false 
  });
});

// ================= EXISTING FORUM AUTH ROUTES (KEEPING EVERYTHING) =====
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

// ================= QUOTE LIKES ROUTES (KEEPING EVERYTHING) =====
app.get('/api/quotes/likes', (req, res) => {
  db.all(`SELECT quote_author, COUNT(*) as like_count FROM quote_likes GROUP BY quote_author`, 
    [], (err, rows) => {
      if (err) {
        return res.status(500).json({ ok: false, error: err.message });
      }
      
      // Convert to object for easier access
      const likesMap = {};
      rows.forEach(row => {
        likesMap[row.quote_author] = row.like_count;
      });
      
      return res.json({ ok: true, likes: likesMap });
    }
  );
});

app.post('/api/quotes/like', ensureForumAuth, (req, res) => {
  const { quoteAuthor } = req.body;
  const userId = req.session.forumUser.id;
  
  if (!quoteAuthor) {
    return res.status(400).json({ ok: false, error: 'Quote author required' });
  }
  
  // Check if already liked
  db.get(`SELECT * FROM quote_likes WHERE quote_author = ? AND user_id = ?`, 
    [quoteAuthor, userId], (err, row) => {
      if (err) {
        return res.status(500).json({ ok: false, error: err.message });
      }
      
      if (row) {
        // Unlike if already liked
        db.run(`DELETE FROM quote_likes WHERE quote_author = ? AND user_id = ?`, 
          [quoteAuthor, userId], function(err) {
            if (err) {
              return res.status(500).json({ ok: false, error: err.message });
            }
            return res.json({ ok: true, liked: false });
          }
        );
      } else {
        // Like if not already liked
        db.run(`INSERT INTO quote_likes (quote_author, user_id) VALUES (?, ?)`, 
          [quoteAuthor, userId], function(err) {
            if (err) {
              return res.status(500).json({ ok: false, error: err.message });
            }
            return res.json({ ok: true, liked: true });
          }
        );
      }
    }
  );
});

app.get('/api/quotes/my-likes', ensureForumAuth, (req, res) => {
  const userId = req.session.forumUser.id;
  
  db.all(`SELECT quote_author FROM quote_likes WHERE user_id = ?`, 
    [userId], (err, rows) => {
      if (err) {
        return res.status(500).json({ ok: false, error: err.message });
      }
      
      const myLikes = rows.map(row => row.quote_author);
      return res.json({ ok: true, myLikes });
    }
  );
});

// ================= NEW FORUM THREAD ROUTES (KEEPING EVERYTHING) =====
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

// ================= NEW FORUM REPLY ROUTES (KEEPING EVERYTHING) =====
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

// ================= ERROR HANDLING =================
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ 
      success: false, 
      message: 'File upload error: ' + err.message 
    });
  }
  
  // For HTML pages, render error page
  if (req.accepts('html')) {
    return res.status(500).render('login.html', { 
      error: 'Something went wrong! Please try again.',
      isAuthenticated: false 
    });
  }
  
  // For API calls, return JSON
  if (req.accepts('json')) {
    return res.status(500).json({ 
      ok: false, 
      error: 'Something went wrong!' 
    });
  }
});

// 404 handler
app.use((req, res) => {
  if (req.accepts('html')) {
    return res.status(404).render('login.html', { 
      error: 'Page not found',
      isAuthenticated: false 
    });
  }
  
  if (req.accepts('json')) {
    return res.status(404).json({ 
      ok: false, 
      error: 'Not found' 
    });
  }
});

// ================= START SERVER =================
app.listen(PORT, () => {
  console.log('✅ Server running on port', PORT);
  console.log('📁 Uploads directory:', path.join(__dirname, 'public', 'uploads'));
  console.log('📁 Views directory:', path.join(__dirname, 'views'));
  console.log('🌐 Teacher Portal: http://localhost:' + PORT + '/home');
  console.log('🔐 Login: http://localhost:' + PORT + '/login');
  console.log('📝 Register: http://localhost:' + PORT + '/register');
});