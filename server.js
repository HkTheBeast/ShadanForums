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
