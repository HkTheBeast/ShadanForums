// Quotes Wall Like System - Connected to Forum Auth
document.addEventListener('DOMContentLoaded', function() {
  initQuotesWall();
});

function initQuotesWall() {
  console.log('🚀 Initializing Quotes Wall with Forum Auth...');
  
  // Check forum auth status
  checkForumAuthStatus();
  
  // Load likes data
  loadLikes();
  
  // Initialize like buttons
  initLikeButtons();
}

function checkForumAuthStatus() {
  fetch('/api/forum/me')
    .then(res => res.json())
    .then(data => {
      const authNotice = document.getElementById('authNotice');
      if (data.ok && data.user) {
        // User is logged in to forum
        if (authNotice) {
          authNotice.innerHTML = '<p>✅ Logged in as ' + data.user.username + '</p>';
        }
        // Enable like buttons
        document.querySelectorAll('.like-btn').forEach(btn => {
          btn.disabled = false;
          btn.title = 'Click to like this quote';
        });
      } else {
        // User not logged in - disable like buttons
        document.querySelectorAll('.like-btn').forEach(btn => {
          btn.disabled = true;
          btn.title = 'Please login to like quotes';
        });
        if (authNotice) {
          authNotice.innerHTML = '<p>🔒 <a href="newforum.html" style="color: white; text-decoration: underline;">Login to forum</a> to like quotes!</p>';
        }
      }
    })
    .catch(err => {
      console.error('Forum auth check failed:', err);
    });
}

function loadLikes() {
  // Load all likes count
  fetch('/api/quotes/likes')
    .then(res => res.json())
    .then(data => {
      if (data.ok) {
        updateLikeCounts(data.likes);
      }
    })
    .catch(err => {
      console.error('Failed to load likes:', err);
    });
  
  // Load user's likes if logged in
  fetch('/api/quotes/my-likes', { credentials: 'include' })
    .then(res => {
      if (res.ok) return res.json();
      return { ok: false };
    })
    .then(data => {
      if (data.ok) {
        updateMyLikes(data.myLikes);
      }
    })
    .catch(err => {
      // This is normal if user is not logged in
    });
}

function updateLikeCounts(likesMap) {
  document.querySelectorAll('.like-btn').forEach(btn => {
    const author = btn.getAttribute('data-author');
    const count = likesMap[author] || 0;
    const countSpan = btn.querySelector('.like-count');
    countSpan.textContent = count;
  });
}

function updateMyLikes(myLikes) {
  document.querySelectorAll('.like-btn').forEach(btn => {
    const author = btn.getAttribute('data-author');
    if (myLikes.includes(author)) {
      btn.classList.add('liked');
    } else {
      btn.classList.remove('liked');
    }
  });
}

function initLikeButtons() {
  document.querySelectorAll('.like-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      if (this.disabled) {
        // Redirect to forum login if not logged in
        window.location.href = 'newforum.html';
        return;
      }
      
      const author = this.getAttribute('data-author');
      toggleLike(author, this);
    });
  });
}

function toggleLike(author, button) {
  // Show loading state
  button.classList.add('loading');
  button.disabled = true;
  
  fetch('/api/quotes/like', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ quoteAuthor: author })
  })
  .then(res => res.json())
  .then(data => {
    if (data.ok) {
      // Update button state
      if (data.liked) {
        button.classList.add('liked');
        // Add a little animation
        button.style.transform = 'scale(1.1)';
        setTimeout(() => {
          button.style.transform = 'scale(1)';
        }, 200);
      } else {
        button.classList.remove('liked');
      }
      
      // Reload all likes to get updated counts
      loadLikes();
    } else {
      if (data.error === 'Not authenticated') {
        // Redirect to forum if not authenticated
        window.location.href = 'newforum.html';
      } else {
        alert('Error: ' + data.error);
      }
    }
  })
  .catch(err => {
    console.error('Like toggle failed:', err);
    alert('Failed to like quote. Please try again.');
  })
  .finally(() => {
    // Remove loading state
    button.classList.remove('loading');
    button.disabled = false;
  });
}

// Refresh likes every 30 seconds to keep counts updated
setInterval(loadLikes, 30000);

// Listen for auth changes (if user logs in/out in another tab)
window.addEventListener('storage', function(e) {
  if (e.key === 'forumAuthUpdate') {
    checkForumAuthStatus();
    loadLikes();
  }
});

// Also check auth when page becomes visible
document.addEventListener('visibilitychange', function() {
  if (!document.hidden) {
    checkForumAuthStatus();
  }
});