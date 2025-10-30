document.addEventListener('DOMContentLoaded', () => {
  const editor = new Quill('#editor', {
    theme: 'snow',
    modules: { toolbar: [['bold','italic','underline','strike'], ['link','image','video'], [{ 'list': 'ordered' }, { 'list': 'bullet' }]] }
  });
  const submitBtn = document.getElementById('submit-post');
  const postsEl = document.getElementById('posts');
  const titleInput = document.getElementById('post-title');
  const authWarning = document.getElementById('auth-warning');

  let currentUser = null;

  async function checkAuth(){
    const r = await fetch('/api/me', { credentials: 'include' });
    const j = await r.json();
    currentUser = j.user;
    updateUIByAuth();
  }

  function updateUIByAuth(){
    if(currentUser){
      if(authWarning) authWarning.style.display = 'none';
      enableEditor(true);
    } else {
      if(authWarning) authWarning.style.display = 'block';
      enableEditor(false);
    }
  }

  function enableEditor(enable){
    const submitBtn = document.getElementById('submit-post');
    const titleInput = document.getElementById('post-title');
    if(!submitBtn || !titleInput) return;
    submitBtn.disabled = !enable;
    titleInput.disabled = !enable;
    // quill enable/disable
    editor.enable(!!enable);
  }

  async function loadPosts(){
    const res = await fetch('/api/posts', { credentials: 'include' });
    const data = await res.json();
    postsEl.innerHTML = '';
    if(data.posts && data.posts.length){
      data.posts.forEach(p => {
        const div = document.createElement('div');
        div.className = 'post card';
        div.innerHTML = `
          <div class="meta"><strong>${escapeHtml(p.author)}</strong> • ${new Date(p.created_at).toLocaleString()}</div>
          ${p.title ? `<h3>${escapeHtml(p.title)}</h3>` : ''}
          <div class="content">${p.content}</div>
          <div class="controls"></div>
        `;
        const controls = div.querySelector('.controls');
        if(currentUser && currentUser.username === p.author){
          const editBtn = document.createElement('button'); editBtn.textContent='Edit';
          const delBtn = document.createElement('button'); delBtn.textContent='Delete';
          controls.appendChild(editBtn); controls.appendChild(delBtn);

          editBtn.addEventListener('click', () => startEdit(p, div));
          delBtn.addEventListener('click', async () => {
            if(!confirm('Delete post?')) return;
            const r = await fetch('/api/posts/' + p.id, { method:'DELETE', credentials: 'include' });
            if(r.ok) loadPosts(); else alert('Delete failed');
          });
        }
        postsEl.appendChild(div);
      });
    } else {
      postsEl.innerHTML = '<p class="hint">No posts yet.</p>';
    }
  }

  function escapeHtml(s){ return (s||'').replace(/[&<>"']/g, (m)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }

  async function startEdit(post, container){
    titleInput.value = post.title || '';
    editor.root.innerHTML = post.content;
    submitBtn.textContent = 'Update';
    submitBtn.dataset.editing = post.id;
    window.scrollTo({ top: container.offsetTop - 80, behavior: 'smooth' });
  }

  submitBtn.addEventListener('click', async () => {
    const html = editor.root.innerHTML;
    const title = titleInput.value;
    if(!currentUser){
      alert('Please register or login before posting.');
      return;
    }
    // Editing
    if(submitBtn.dataset.editing){
      const id = submitBtn.dataset.editing;
      const res = await fetch('/api/posts/' + id, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ title, content: html }), credentials: 'include' });
      if(res.ok){
        submitBtn.textContent = 'Post';
        delete submitBtn.dataset.editing;
        titleInput.value = '';
        editor.root.innerHTML = '';
        loadPosts();
      } else {
        alert('Update failed');
      }
      return;
    }

    const res = await fetch('/api/posts', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ title, content: html }), credentials: 'include' });
    if(res.ok){
      titleInput.value = '';
      editor.root.innerHTML = '';
      loadPosts();
    } else {
      if(res.status === 401) alert('You must register or login to post.');
      else alert('Post failed.');
    }
  });

  // Init
  checkAuth().then(loadPosts);
});
