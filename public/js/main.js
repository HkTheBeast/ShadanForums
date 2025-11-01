(function(){
  // Enhanced Theme Toggle with proper button text
  const themeToggle = document.getElementById('theme-toggle');
  
  function applyTheme(){
    const t = localStorage.getItem('theme') || 'light';
    if(t === 'dark') {
      document.documentElement.setAttribute('data-theme','dark');
      if(themeToggle) themeToggle.textContent = '☀️ Light Mode';
    } else {
      document.documentElement.removeAttribute('data-theme');
      if(themeToggle) themeToggle.textContent = '🌙 Dark Mode';
    }
  }
  
  // Initialize theme
  applyTheme();
  
  // Theme toggle handler
  if(themeToggle) {
    themeToggle.addEventListener('click', () => {
      const current = localStorage.getItem('theme') || 'light';
      const newTheme = current === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', newTheme);
      applyTheme();
    });
  }

  // Elements
  const loginBtn = document.getElementById('login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const userInfo = document.getElementById('user-info');
  const authModal = document.getElementById('auth-modal');
  const authForm = document.getElementById('auth-form');
  const authTitle = document.getElementById('auth-title');
  const authError = document.getElementById('auth-error');
  const authSubmit = document.getElementById('auth-submit');
  const authCancel = document.getElementById('auth-cancel');
  const toggleToRegister = document.getElementById('toggle-to-register');
  const openAuthLinks = document.querySelectorAll('#open-auth, #login-btn');
  const authLinkToggle = {}; // track register vs login

  function showAuthModal(mode){
    if(!authModal) return;
    authModal.classList.remove('hidden');
    authError.textContent='';
    if(mode === 'register'){
      authTitle.textContent = 'Register';
      authSubmit.textContent = 'Register';
      authLinkToggle.mode = 'register';
    } else {
      authTitle.textContent = 'Login';
      authSubmit.textContent = 'Login';
      authLinkToggle.mode = 'login';
    }
  }
  function hideAuthModal(){ if(authModal) authModal.classList.add('hidden'); }

  // Attach handlers
  if(openAuthLinks) openAuthLinks.forEach(el => { if(el) el.addEventListener('click', (e)=>{ e.preventDefault(); showAuthModal('login'); }) });
  if(toggleToRegister) toggleToRegister.addEventListener('click', (e)=>{ e.preventDefault(); showAuthModal('register'); });
  if(authCancel) authCancel.addEventListener('click', (e)=>{ e.preventDefault(); hideAuthModal(); });
  if(loginBtn) loginBtn.addEventListener('click', (e)=>{ e.preventDefault(); showAuthModal('login'); });
  if(logoutBtn) logoutBtn.addEventListener('click', async (e)=>{
    e.preventDefault();
    await fetch('/api/logout', { method:'POST', credentials:'include' });
    refreshAuthUI();
    location.reload();
  });

  async function refreshAuthUI(){
    const res = await fetch('/api/me', { credentials:'include' });
    const data = await res.json();
    if(data && data.user){
      if(loginBtn) loginBtn.classList.add('hidden');
      if(logoutBtn) logoutBtn.classList.remove('hidden');
      if(userInfo){ userInfo.classList.remove('hidden'); userInfo.textContent = 'Logged in as ' + data.user.username; }
    } else {
      if(loginBtn) loginBtn.classList.remove('hidden');
      if(logoutBtn) logoutBtn.classList.add('hidden');
      if(userInfo){ userInfo.classList.add('hidden'); userInfo.textContent = ''; }
    }
  }

  if(authForm){
    authForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const fd = new FormData(authForm);
      const payload = { username: fd.get('username'), password: fd.get('password') };
      const mode = authLinkToggle.mode || 'login';
      const url = mode === 'register' ? '/api/register' : '/api/login';
      const res = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload), credentials: 'include' });
      if(res.ok){
        const j = await res.json();
        hideAuthModal();
        refreshAuthUI();
        // reload to ensure pages (forum) update
        location.reload();
      } else {
        const err = await res.json();
        authError.textContent = err.error || 'Auth failed';
      }
    });
  }

  // Wire toggle links in case multiple pages have them
  document.addEventListener('click', (e)=>{
    if(e.target && e.target.id === 'open-auth'){ e.preventDefault(); showAuthModal('login'); }
  });

  // Initial check
  refreshAuthUI();

  // Collapsible functionality
  var coll = document.getElementsByClassName("collapsible");
  var i;

  for (i = 0; i < coll.length; i++) {
    coll[i].addEventListener("click", function() {
      this.classList.toggle("active");
      var content = this.nextElementSibling;
      if (content.style.maxHeight){
        content.style.maxHeight = null;
      } else {
        content.style.maxHeight = content.scrollHeight + "px"; // Set max-height to content's scroll height
      } 
    });
  }
})();