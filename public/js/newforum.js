// ===== NEW FORUMS PAGE JAVASCRIPT =====

(function() {
  console.log('🚀 New Forums Module Loading...');

  // State
  let currentUser = null;
  let currentThreadId = null;
  let authMode = 'login'; // 'login' or 'register'

  // Elements
  const loginBtn = document.getElementById('forum-login-btn');
  const logoutBtn = document.getElementById('forum-logout-btn');
  const userInfo = document.getElementById('forum-user-info');
  const createThreadBtn = document.getElementById('create-thread-btn');
  const threadsContainer = document.getElementById('threads-container');

  // Auth Modal Elements
  const authModal = document.getElementById('auth-modal');
  const authModalClose = document.getElementById('auth-modal-close');
  const authForm = document.getElementById('auth-form');
  const authModalTitle = document.getElementById('auth-modal-title');
  const authSubmitBtn = document.getElementById('auth-submit-btn');
  const authCancelBtn = document.getElementById('auth-cancel-btn');
  const authToggleLink = document.getElementById('auth-toggle-link');
  const authToggleText = document.getElementById('auth-toggle-text');
  const authError = document.getElementById('auth-error');
  const confirmPasswordGroup = document.getElementById('confirm-password-group');

  // Thread Modal Elements
  const threadModal = document.getElementById('thread-modal');
  const threadModalClose = document.getElementById('thread-modal-close');
  const threadForm = document.getElementById('thread-form');
  const threadCancelBtn = document.getElementById('thread-cancel-btn');
  const threadError = document.getElementById('thread-error');

  // View Thread Modal Elements
  const viewThreadModal = document.getElementById('view-thread-modal');
  const viewThreadClose = document.getElementById('view-thread-close');
  const viewThreadTitle = document.getElementById('view-thread-title');
  const threadDetailsContent = document.getElementById('thread-details-content');
  const repliesContainer = document.getElementById('replies-container');
  const replyForm = document.getElementById('reply-form');
  const replyError = document.getElementById('reply-error');

  // Initialize
  init();

  function init() {
    console.log('Initializing new forums...');
    checkAuth();
    loadThreads();
    setupEventListeners();
  }

  function setupEventListeners() {
    // Auth Events
    if (loginBtn) loginBtn.addEventListener('click', () => openAuthModal('login'));
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    if (authModalClose) authModalClose.addEventListener('click', closeAuthModal);
    if (authCancelBtn) authCancelBtn.addEventListener('click', closeAuthModal);
    if (authToggleLink) authToggleLink.addEventListener('click', toggleAuthMode);
    if (authForm) authForm.addEventListener('submit', handleAuth);

    // Thread Events
    if (createThreadBtn) createThreadBtn.addEventListener('click', openThreadModal);
    if (threadModalClose) threadModalClose.addEventListener('click', closeThreadModal);
    if (threadCancelBtn) threadCancelBtn.addEventListener('click', closeThreadModal);
    if (threadForm) threadForm.addEventListener('submit', handleCreateThread);

    // View Thread Events
    if (viewThreadClose) viewThreadClose.addEventListener('click', closeViewThreadModal);
    if (replyForm) replyForm.addEventListener('submit', handleReply);

    // Close modals on overlay click
    if (authModal) authModal.addEventListener('click', (e) => {
      if (e.target === authModal) closeAuthModal();
    });
    if (threadModal) threadModal.addEventListener('click', (e) => {
      if (e.target === threadModal) closeThreadModal();
    });
    if (viewThreadModal) viewThreadModal.addEventListener('click', (e) => {
      if (e.target === viewThreadModal) closeViewThreadModal();
    });
  }

  // Auth Functions
  async function checkAuth() {
    try {
      const res = await fetch('/api/forum/me', { credentials: 'include' });
      const data = await res.json();
      
      if (data.ok && data.user) {
        currentUser = data.user;
        updateAuthUI(true);
      } else {
        currentUser = null;
        updateAuthUI(false);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      updateAuthUI(false);
    }
  }

  function updateAuthUI(isLoggedIn) {
    if (isLoggedIn && currentUser) {
      if (loginBtn) loginBtn.style.display = 'none';
      if (logoutBtn) logoutBtn.style.display = 'block';
      if (userInfo) {
        userInfo.style.display = 'block';
        userInfo.textContent = `👤 ${currentUser.username}`;
      }
      if (createThreadBtn) createThreadBtn.style.display = 'flex';
    } else {
      if (loginBtn) loginBtn.style.display = 'block';
      if (logoutBtn) logoutBtn.style.display = 'none';
      if (userInfo) {
        userInfo.style.display = 'none';
        userInfo.textContent = '';
      }
      if (createThreadBtn) createThreadBtn.style.display = 'none';
    }
  }

  function openAuthModal(mode) {
    authMode = mode;
    if (authModalTitle) authModalTitle.textContent = mode === 'login' ? 'Login' : 'Register';
    if (authSubmitBtn) authSubmitBtn.textContent = mode === 'login' ? 'Login' : 'Register';
    if (authToggleText) authToggleText.textContent = mode === 'login' ? "Don't have an account?" : "Already have an account?";
    if (authToggleLink) authToggleLink.textContent = mode === 'login' ? 'Register' : 'Login';
    if (confirmPasswordGroup) confirmPasswordGroup.style.display = mode === 'register' ? 'block' : 'none';
    if (authError) authError.textContent = '';
    if (authForm) authForm.reset();
    if (authModal) authModal.style.display = 'flex';
  }

  function closeAuthModal() {
    if (authModal) authModal.style.display = 'none';
  }

  function toggleAuthMode(e) {
    e.preventDefault();
    openAuthModal(authMode === 'login' ? 'register' : 'login');
  }

  async function handleAuth(e) {
    e.preventDefault();
    if (authError) authError.textContent = '';

    const formData = new FormData(authForm);
    const username = formData.get('username');
    const password = formData.get('password');
    const confirmPassword = formData.get('confirm_password');

    // Validation
    if (!username || !password) {
      if (authError) authError.textContent = 'Please fill in all fields';
      return;
    }

    if (authMode === 'register' && password !== confirmPassword) {
      if (authError) authError.textContent = 'Passwords do not match';
      return;
    }

    try {
      const endpoint = authMode === 'login' ? '/api/forum/login' : '/api/forum/register';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (data.ok) {
        currentUser = data.user;
        closeAuthModal();
        updateAuthUI(true);
        loadThreads();
      } else {
        if (authError) authError.textContent = data.error || 'Authentication failed';
      }
    } catch (error) {
      console.error('Auth error:', error);
      if (authError) authError.textContent = 'Server error. Please try again.';
    }
  }

  async function handleLogout() {
    try {
      await fetch('/api/forum/logout', { method: 'POST', credentials: 'include' });
      currentUser = null;
      updateAuthUI(false);
      loadThreads();
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  // Thread Functions
  async function loadThreads() {
    if (!threadsContainer) return;
    
    threadsContainer.innerHTML = '<div class="forum-loading">Loading threads...</div>';

    try {
      const res = await fetch('/api/forum/threads', { credentials: 'include' });
      const data = await res.json();

      if (data.ok && data.threads) {
        displayThreads(data.threads);
      } else {
        threadsContainer.innerHTML = '<div class="forum-loading">No threads found. Create the first one!</div>';
      }
    } catch (error) {
      console.error('Load threads error:', error);
      threadsContainer.innerHTML = '<div class="forum-loading">Error loading threads</div>';
    }
  }

  function displayThreads(threads) {
    if (!threadsContainer) return;

    if (threads.length === 0) {
      threadsContainer.innerHTML = '<div class="forum-loading">No threads yet. Be the first to post!</div>';
      return;
    }

    threadsContainer.innerHTML = threads.map(thread => {
      const excerpt = thread.content.substring(0, 200) + (thread.content.length > 200 ? '...' : '');
      const isOwner = currentUser && currentUser.username === thread.author;
      const hasAttachment = thread.attachment ? '📎' : '';

      return `
        <div class="forum-thread-card" data-thread-id="${thread.id}">
          <div class="forum-thread-header">
            <h3 class="forum-thread-title">${escapeHtml(thread.title)}</h3>
            ${hasAttachment ? '<span class="forum-attachment-badge">📎 Attachment</span>' : ''}
          </div>
          <div class="forum-thread-meta">
            <div class="forum-meta-item">
              <span>👤</span>
              <span>${escapeHtml(thread.author)}</span>
            </div>
            <div class="forum-meta-item">
              <span>🕐</span>
              <span>${formatDate(thread.created_at)}</span>
            </div>
          </div>
          <div class="forum-thread-excerpt">${escapeHtml(excerpt)}</div>
          <div class="forum-thread-footer">
            <div class="forum-thread-stats">
              <span>💬 ${thread.reply_count || 0} replies</span>
            </div>
            <div class="forum-thread-actions">
              <button class="forum-action-btn view-thread-btn" data-thread-id="${thread.id}">
                View Thread
              </button>
              ${isOwner ? `
                <button class="forum-action-btn forum-delete-btn delete-thread-btn" data-thread-id="${thread.id}">
                  Delete
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Add click listeners
    document.querySelectorAll('.view-thread-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        viewThread(btn.dataset.threadId);
      });
    });

    document.querySelectorAll('.delete-thread-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteThread(btn.dataset.threadId);
      });
    });

    // Click card to view thread
    document.querySelectorAll('.forum-thread-card').forEach(card => {
      card.addEventListener('click', () => {
        viewThread(card.dataset.threadId);
      });
    });
  }

  function openThreadModal() {
    if (!currentUser) {
      openAuthModal('login');
      return;
    }
    if (threadError) threadError.textContent = '';
    if (threadForm) threadForm.reset();
    if (threadModal) threadModal.style.display = 'flex';
  }

  function closeThreadModal() {
    if (threadModal) threadModal.style.display = 'none';
  }

  async function handleCreateThread(e) {
    e.preventDefault();
    if (threadError) threadError.textContent = '';

    const formData = new FormData(threadForm);
    const title = formData.get('title');
    const content = formData.get('content');
    const attachment = formData.get('attachment');

    if (!title || !content) {
      if (threadError) threadError.textContent = 'Please fill in all required fields';
      return;
    }

    // Check file size
    if (attachment && attachment.size > 5 * 1024 * 1024) {
      if (threadError) threadError.textContent = 'File size must be less than 5MB';
      return;
    }

    try {
      const submitFormData = new FormData();
      submitFormData.append('title', title);
      submitFormData.append('content', content);
      if (attachment && attachment.size > 0) {
        submitFormData.append('attachment', attachment);
      }

      const res = await fetch('/api/forum/threads', {
        method: 'POST',
        credentials: 'include',
        body: submitFormData
      });

      const data = await res.json();

      if (data.ok) {
        closeThreadModal();
        loadThreads();
      } else {
        if (threadError) threadError.textContent = data.error || 'Failed to create thread';
      }
    } catch (error) {
      console.error('Create thread error:', error);
      if (threadError) threadError.textContent = 'Server error. Please try again.';
    }
  }

  async function viewThread(threadId) {
    currentThreadId = threadId;

    try {
      const res = await fetch(`/api/forum/threads/${threadId}`, { credentials: 'include' });
      const data = await res.json();

      if (data.ok && data.thread) {
        displayThreadDetails(data.thread);
        loadReplies(threadId);
        if (viewThreadModal) viewThreadModal.style.display = 'flex';
      } else {
        alert('Failed to load thread');
      }
    } catch (error) {
      console.error('View thread error:', error);
      alert('Failed to load thread');
    }
  }

  function displayThreadDetails(thread) {
    if (viewThreadTitle) viewThreadTitle.textContent = thread.title;

    let attachmentHtml = '';
    if (thread.attachment) {
      const isImage = /\.(jpg|jpeg|png|gif)$/i.test(thread.attachment);
      if (isImage) {
        attachmentHtml = `
          <div class="forum-attachment-display">
            <strong>📎 Attachment:</strong>
            <img src="/uploads/${thread.attachment}" alt="Attachment">
          </div>
        `;
      } else {
        attachmentHtml = `
          <div class="forum-attachment-display">
            <strong>📎 Attachment:</strong>
            <a href="/uploads/${thread.attachment}" class="forum-attachment-link" download>
              📄 Download ${thread.attachment}
            </a>
          </div>
        `;
      }
    }

    if (threadDetailsContent) {
      threadDetailsContent.innerHTML = `
        <div class="forum-thread-meta">
          <div class="forum-meta-item">
            <span>👤</span>
            <span>${escapeHtml(thread.author)}</span>
          </div>
          <div class="forum-meta-item">
            <span>🕐</span>
            <span>${formatDate(thread.created_at)}</span>
          </div>
        </div>
        <div class="forum-thread-content">
          <p>${escapeHtml(thread.content)}</p>
          ${attachmentHtml}
        </div>
      `;
    }
  }

  async function loadReplies(threadId) {
    if (!repliesContainer) return;

    repliesContainer.innerHTML = '<div class="forum-loading">Loading replies...</div>';

    try {
      const res = await fetch(`/api/forum/threads/${threadId}/replies`, { credentials: 'include' });
      const data = await res.json();

      if (data.ok && data.replies) {
        displayReplies(data.replies);
      } else {
        repliesContainer.innerHTML = '<p style="text-align: center; color: var(--muted); padding: 2rem;">No replies yet. Be the first to reply!</p>';
      }
    } catch (error) {
      console.error('Load replies error:', error);
      repliesContainer.innerHTML = '<p style="text-align: center; color: var(--crimson);">Error loading replies</p>';
    }
  }

  function displayReplies(replies) {
    if (!repliesContainer) return;

    if (replies.length === 0) {
      repliesContainer.innerHTML = '<p style="text-align: center; color: var(--muted); padding: 2rem;">No replies yet. Be the first to reply!</p>';
      return;
    }

    repliesContainer.innerHTML = `
      <h3 style="color: var(--emerald); margin: 2rem 0 1rem 0;">Replies (${replies.length})</h3>
      ${replies.map(reply => {
        let attachmentHtml = '';
        if (reply.attachment) {
          const isImage = /\.(jpg|jpeg|png|gif)$/i.test(reply.attachment);
          if (isImage) {
            attachmentHtml = `
              <div class="forum-attachment-display">
                <img src="/uploads/${reply.attachment}" alt="Reply attachment" style="max-width: 300px;">
              </div>
            `;
          } else {
            attachmentHtml = `
              <div class="forum-attachment-display">
                <a href="/uploads/${reply.attachment}" class="forum-attachment-link" download>
                  📄 ${reply.attachment}
                </a>
              </div>
            `;
          }
        }

        return `
          <div class="forum-reply-card">
            <div class="forum-reply-header">
              <span class="forum-reply-author">👤 ${escapeHtml(reply.author)}</span>
              <span class="forum-reply-date">${formatDate(reply.created_at)}</span>
            </div>
            <div class="forum-reply-content">${escapeHtml(reply.content)}</div>
            ${attachmentHtml}
          </div>
        `;
      }).join('')}
    `;
  }

  async function handleReply(e) {
    e.preventDefault();
    if (!currentUser) {
      closeViewThreadModal();
      openAuthModal('login');
      return;
    }

    if (replyError) replyError.textContent = '';

    const formData = new FormData(replyForm);
    const content = formData.get('reply_content');
    const attachment = formData.get('reply_attachment');

    if (!content) {
      if (replyError) replyError.textContent = 'Please enter reply content';
      return;
    }

    if (attachment && attachment.size > 5 * 1024 * 1024) {
      if (replyError) replyError.textContent = 'File size must be less than 5MB';
      return;
    }

    try {
      const submitFormData = new FormData();
      submitFormData.append('content', content);
      if (attachment && attachment.size > 0) {
        submitFormData.append('attachment', attachment);
      }

      const res = await fetch(`/api/forum/threads/${currentThreadId}/replies`, {
        method: 'POST',
        credentials: 'include',
        body: submitFormData
      });

      const data = await res.json();

      if (data.ok) {
        replyForm.reset();
        loadReplies(currentThreadId);
        loadThreads(); // Refresh to update reply count
      } else {
        if (replyError) replyError.textContent = data.error || 'Failed to post reply';
      }
    } catch (error) {
      console.error('Reply error:', error);
      if (replyError) replyError.textContent = 'Server error. Please try again.';
    }
  }

  function closeViewThreadModal() {
    if (viewThreadModal) viewThreadModal.style.display = 'none';
    currentThreadId = null;
  }

  async function deleteThread(threadId) {
    if (!confirm('Are you sure you want to delete this thread? This action cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch(`/api/forum/threads/${threadId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await res.json();

      if (data.ok) {
        loadThreads();
      } else {
        alert(data.error || 'Failed to delete thread');
      }
    } catch (error) {
      console.error('Delete thread error:', error);
      alert('Failed to delete thread');
    }
  }

  // Utility Functions
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  console.log('✅ New Forums Module Loaded');
})();