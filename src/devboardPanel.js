const vscode = require('vscode');
const { scanTodos } = require('./todoScanner');

class DevBoardPanel {
  constructor(context) {
    this.context = context;
    this._view = null;
  }

  resolveWebviewView(webviewView) {
    this._view = webviewView;
    webviewView.webview.options = { enableScripts: true };
    this._render();

    webviewView.webview.onDidReceiveMessage(async msg => {
      switch (msg.type) {
        case 'openTodo':
          this._openFile(msg.filePath, msg.line, msg.column);
          break;
        case 'refresh':
          this.refresh();
          break;
        case 'saveScratch':
          this._saveScratch(msg.content);
          break;
        case 'newNote':
          await this._newNote();
          break;
        case 'openNote':
          await this._openNote(msg.name);
          break;
        case 'deleteNote':
          await this._deleteNote(msg.name);
          break;
      }
    });
  }

  refresh() {
    if (!this._view) return;
    const todos = scanTodos(vscode.workspace.workspaceFolders);
    this._view.webview.postMessage({ type: 'updateTodos', todos });
  }

  // ── Scratch ────────────────────────────────────────────────

  _scratchKey() {
    const folders = vscode.workspace.workspaceFolders;
    return 'devboard.scratch.' + (folders ? folders[0].name : 'default');
  }

  _getScratch() {
    return this.context.workspaceState.get(this._scratchKey(), '');
  }

  _saveScratch(content) {
    this.context.workspaceState.update(this._scratchKey(), content);
  }

  // ── Notes ──────────────────────────────────────────────────

  _notesDir() {
    const folders = vscode.workspace.workspaceFolders;
    if (folders) return vscode.Uri.joinPath(folders[0].uri, '.vscode');
    return this.context.globalStorageUri;
  }

  _noteUri(name) {
    return vscode.Uri.joinPath(this._notesDir(), 'devboard-' + name + '.md');
  }

  async _getNoteNames() {
    try {
      const entries = await vscode.workspace.fs.readDirectory(this._notesDir());
      return entries
        .filter(([name]) => name.startsWith('devboard-') && name.endsWith('.md'))
        .map(([name]) => name.replace(/^devboard-/, '').replace(/\.md$/, ''))
        .sort();
    } catch {
      return [];
    }
  }

  async _newNote() {
    const input = await vscode.window.showInputBox({
      prompt: 'Note name',
      placeHolder: 'e.g. ideas, bugs, links',
      validateInput: v => (v && v.trim()) ? null : 'Please enter a name'
    });
    if (!input) return;

    const name = input.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '');
    if (!name) return;

    const uri = this._noteUri(name);
    try { await vscode.workspace.fs.stat(uri); }
    catch {
      try { await vscode.workspace.fs.createDirectory(this._notesDir()); } catch {}
      const content = '# ' + input.trim() + '\n\n';
      await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
    }

    await this._openNote(name);
    this._refreshNotesList();
  }

  async _openNote(name) {
    const uri = this._noteUri(name);
    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc, { preview: false, viewColumn: vscode.ViewColumn.One });
  }

  async _deleteNote(name) {
    const answer = await vscode.window.showWarningMessage(
      'Delete "' + name + '.md"?',
      { modal: true },
      'Delete'
    );
    if (answer !== 'Delete') return;
    await vscode.workspace.fs.delete(this._noteUri(name));
    this._refreshNotesList();
  }

  async _refreshNotesList() {
    if (!this._view) return;
    const names = await this._getNoteNames();
    this._view.webview.postMessage({ type: 'updateNotes', names });
  }

  // ── File opener ────────────────────────────────────────────

  _openFile(filePath, line = 0, column = 0) {
    vscode.workspace.openTextDocument(filePath).then(doc => {
      vscode.window.showTextDocument(doc).then(editor => {
        const pos = new vscode.Position(line, column);
        editor.selection = new vscode.Selection(pos, pos);
        editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
      });
    });
  }

  // ── Render ─────────────────────────────────────────────────

  async _render() {
    if (!this._view) return;
    const todos = scanTodos(vscode.workspace.workspaceFolders);
    const noteNames = await this._getNoteNames();
    const scratch = this._getScratch();
    this._view.webview.html = this._getHtml(todos, noteNames, scratch);
  }

  _getHtml(todos, noteNames, scratch) {
    const todosJson = JSON.stringify(todos);
    const notesJson = JSON.stringify(noteNames);
    const scratchEscaped = scratch
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const TAG_META = {
      FIXME: { color: '#f87171' },
      BUG:   { color: '#f87171' },
      TODO:  { color: '#60a5fa' },
      HACK:  { color: '#fbbf24' },
      NOTE:  { color: '#34d399' },
      XXX:   { color: '#fb923c' },
    };

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: var(--vscode-sideBar-background);
    color: var(--vscode-foreground);
    font-family: var(--vscode-font-family);
    font-size: 12px;
    height: 100vh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }

  .section { border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border, rgba(255,255,255,0.08)); }

  .section-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 8px 12px; cursor: pointer; user-select: none;
    background: var(--vscode-sideBarSectionHeader-background);
    font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;
    color: var(--vscode-sideBarSectionHeader-foreground, var(--vscode-foreground));
  }
  .section-header:hover { background: var(--vscode-list-hoverBackground); }
  .section-title-left { display: flex; align-items: center; gap: 6px; }
  .chevron { font-size: 10px; transition: transform 0.15s ease; opacity: 0.6; }
  .chevron.open { transform: rotate(90deg); }
  .section-body { display: none; }
  .section-body.open { display: block; }

  .icon-btn {
    background: none; border: none; cursor: pointer;
    color: var(--vscode-foreground); opacity: 0.6;
    padding: 2px 4px; border-radius: 3px; font-size: 13px; line-height: 1;
  }
  .icon-btn:hover { opacity: 1; background: var(--vscode-toolbar-hoverBackground); }

  /* ── TODO ── */
  .tag-group { padding: 4px 0; }
  .tag-label {
    display: flex; align-items: center; gap: 6px;
    padding: 3px 12px; font-size: 11px; font-weight: 600;
    opacity: 0.8; cursor: pointer; user-select: none;
  }
  .tag-label:hover { background: var(--vscode-list-hoverBackground); }
  .tag-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .tag-count { margin-left: auto; font-size: 10px; opacity: 0.5; font-weight: 400; }
  .tag-items { display: none; }
  .tag-items.open { display: block; }
  .todo-item { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; padding: 8px 12px 8px 28px; cursor: pointer; border-left: 2px solid transparent; }
  .todo-item:hover { background: var(--vscode-list-hoverBackground); }
  .todo-text { width: 100%; font-size: 12px; line-height: 1.4; opacity: 0.92; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .todo-loc { font-size: 10px; line-height: 1.3; color: var(--vscode-descriptionForeground); opacity: 0.7; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .empty-state { padding: 16px 12px; color: var(--vscode-descriptionForeground); font-size: 11px; opacity: 0.7; }

  /* ── Notes ── */
  .new-note-btn {
    background: none; border: none; cursor: pointer;
    color: var(--vscode-foreground); opacity: 0.6;
    padding: 0px 5px; border-radius: 3px; font-size: 18px; line-height: 1;
  }
  .new-note-btn:hover { opacity: 1; background: var(--vscode-toolbar-hoverBackground); }

  /* Scratch area */
  .scratch-wrap { padding: 8px; border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border, rgba(255,255,255,0.08)); }

  .scratch-toolbar {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 5px;
  }
  .scratch-label { font-size: 10px; color: var(--vscode-descriptionForeground); opacity: 0.6; text-transform: uppercase; letter-spacing: 0.05em; }
  .scratch-meta { display: flex; align-items: center; gap: 6px; }
  .char-count { font-size: 10px; color: var(--vscode-descriptionForeground); opacity: 0.5; }
  .saved-flash { font-size: 10px; color: var(--vscode-descriptionForeground); opacity: 0; transition: opacity 0.3s; }
  .saved-flash.show { opacity: 0.6; }

  textarea {
    width: 100%; min-height: 120px; resize: vertical;
    background: var(--vscode-input-background); color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, transparent);
    border-radius: 4px; padding: 8px;
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 12px; line-height: 1.6; outline: none;
  }
  textarea:focus { border-color: var(--vscode-focusBorder); }
  textarea::placeholder { color: var(--vscode-input-placeholderForeground); opacity: 0.5; }

  /* Note file list */
  .note-item {
    display: flex; align-items: center; gap: 6px; padding: 6px 12px;
    border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border, rgba(255,255,255,0.04));
  }
  .note-item:hover { background: var(--vscode-list-hoverBackground); }
  .note-item:hover .note-delete { opacity: 0.5; }
  .note-icon { font-size: 13px; flex-shrink: 0; opacity: 0.7; }
  .note-name {
    flex: 1; cursor: pointer; overflow: hidden;
    text-overflow: ellipsis; white-space: nowrap; font-size: 12px;
  }
  .note-name:hover { color: var(--vscode-textLink-foreground); }
  .note-delete {
    background: none; border: none; cursor: pointer;
    color: var(--vscode-foreground); opacity: 0;
    padding: 2px 4px; border-radius: 3px; font-size: 11px; flex-shrink: 0;
  }
  .note-delete:hover { opacity: 1 !important; color: #f87171; }
  .notes-empty {
    padding: 12px; color: var(--vscode-descriptionForeground);
    font-size: 11px; opacity: 0.6; line-height: 1.8;
  }
</style>
</head>
<body>

<!-- TODO TRACKER -->
<div class="section">
  <div class="section-header" onclick="toggleSection('todos')">
    <div class="section-title-left">
      <span class="chevron open" id="chev-todos">›</span>
      <span>TODO Tracker</span>
    </div>
    <button class="icon-btn" onclick="event.stopPropagation(); sendMsg({type:'refresh'})" title="Refresh">↻</button>
  </div>
  <div class="section-body open" id="body-todos">
    <div id="todos-content"></div>
  </div>
</div>

<!-- NOTES -->
<div class="section">
  <div class="section-header" onclick="toggleSection('notes')">
    <div class="section-title-left">
      <span class="chevron open" id="chev-notes">›</span>
      <span>Notes</span>
    </div>
    <button class="new-note-btn" onclick="event.stopPropagation(); sendMsg({type:'newNote'})" title="New Note">+</button>
  </div>
  <div class="section-body open" id="body-notes">

    <!-- Quick scratch pad -->
    <div class="scratch-wrap">
      <div class="scratch-toolbar">
        <span class="scratch-label">Quick Scratch</span>
        <div class="scratch-meta">
          <span class="saved-flash" id="saved-flash">✓ saved</span>
          <span class="char-count" id="char-count">0 chars</span>
        </div>
      </div>
      <textarea id="notepad" placeholder="Quick thoughts, links, snippets...">${scratchEscaped}</textarea>
    </div>

    <!-- Saved notes list -->
    <div id="notes-content"></div>

  </div>
</div>

<script>
  const vscode = acquireVsCodeApi();
  const TAG_META = ${JSON.stringify(TAG_META)};

  function sendMsg(msg) { vscode.postMessage(msg); }

  function toggleSection(id) {
    const body = document.getElementById('body-' + id);
    const chev = document.getElementById('chev-' + id);
    const isOpen = body.classList.toggle('open');
    chev.classList.toggle('open', isOpen);
  }

  function toggleTag(id) {
    document.getElementById(id)?.classList.toggle('open');
  }

  // ── TODO rendering ──
  function renderTodos(todos) {
    const el = document.getElementById('todos-content');
    if (!todos || todos.length === 0) {
      el.innerHTML = '<div class="empty-state">✓ No TODOs found</div>';
      return;
    }
    el.innerHTML = todos.map(({ tag, items }) => {
      const meta = TAG_META[tag] || { color: '#888' };
      const itemsHtml = items.map(({ text, filePath, line, column }) => {
        const fileName = filePath.split(/[\\/]/).pop();
        const safeText = (text || tag).replace(/</g,'&lt;').replace(/>/g,'&gt;');
        const message = JSON.stringify({ type: 'openTodo', filePath, line, column: column || 0 }).replace(/"/g, '&quot;');
        return \`<div class="todo-item" onclick="sendMsg(\${message})">
          <div class="todo-text">\${safeText}</div>
          <div class="todo-loc">\${filePath}:\${line + 1}</div>
        </div>\`;
      }).join('');
      const groupId = 'tag-' + tag;
      return \`<div class="tag-group">
        <div class="tag-label" onclick="toggleTag('\${groupId}')">
          <span class="tag-dot" style="background:\${meta.color}"></span>
          <span>\${tag}</span>
          <span class="tag-count">\${items.length}</span>
        </div>
        <div class="tag-items open" id="\${groupId}">\${itemsHtml}</div>
      </div>\`;
    }).join('');
  }

  // ── Notes list rendering ──
  function renderNotes(names) {
    const el = document.getElementById('notes-content');
    if (!names || names.length === 0) {
      el.innerHTML = '<div class="notes-empty">No notes yet.<br>Click <strong>+</strong> to create your first note.</div>';
      return;
    }
    el.innerHTML = names.map(name => {
      const openMsg = JSON.stringify({ type: 'openNote', name }).replace(/"/g, '&quot;');
      const deleteMsg = JSON.stringify({ type: 'deleteNote', name }).replace(/"/g, '&quot;');
      return \`<div class="note-item">
        <span class="note-icon">📄</span>
        <span class="note-name" onclick="sendMsg(\${openMsg})">\${name}.md</span>
        <button class="note-delete" onclick="sendMsg(\${deleteMsg})" title="Delete">✕</button>
      </div>\`;
    }).join('');
  }

  // ── Scratch auto-save ──
  const textarea = document.getElementById('notepad');
  const charCount = document.getElementById('char-count');
  const savedFlash = document.getElementById('saved-flash');
  let saveTimer = null;
  let flashTimer = null;

  function updateCharCount() {
    const n = textarea.value.length;
    charCount.textContent = n === 0 ? '0 chars' : n.toLocaleString() + ' chars';
  }

  textarea.addEventListener('input', () => {
    updateCharCount();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      sendMsg({ type: 'saveScratch', content: textarea.value });
      savedFlash.classList.add('show');
      clearTimeout(flashTimer);
      flashTimer = setTimeout(() => savedFlash.classList.remove('show'), 1500);
    }, 500);
  });

  updateCharCount();

  // ── Message handler ──
  window.addEventListener('message', ({ data }) => {
    if (data.type === 'updateTodos') renderTodos(data.todos);
    if (data.type === 'updateNotes') renderNotes(data.names);
  });

  // ── Initial render ──
  renderTodos(${todosJson});
  renderNotes(${notesJson});
</script>
</body>
</html>`;
  }
}

module.exports = { DevBoardPanel };