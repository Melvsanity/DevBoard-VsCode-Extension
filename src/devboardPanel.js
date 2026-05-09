const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
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

    webviewView.webview.onDidReceiveMessage(msg => {
      switch (msg.type) {
        case 'openTodo':
          this._openFile(msg.filePath, msg.line);
          break;
        case 'openPin':
          this._openFile(msg.filePath);
          break;
        case 'unpin':
          this._unpin(msg.filePath);
          break;
        case 'saveNotes':
          this._saveNotes(msg.content);
          break;
        case 'openNotesTab':
          this._openNotesTab();
          break;
      }
    });
  }

  refresh() {
    if (!this._view) return;
    const todos = scanTodos(vscode.workspace.workspaceFolders);
    this._view.webview.postMessage({ type: 'updateTodos', todos });
  }

  pinFile(filePath) {
    const pins = this._getPins();
    if (!pins.includes(filePath)) {
      this._setPins([...pins, filePath]);
      const name = path.basename(filePath);
      vscode.window.showInformationMessage(`DevBoard: Pinned ${name}`);
      if (this._view) {
        this._view.webview.postMessage({ type: 'updatePins', pins: this._getPins() });
      }
    }
  }

  _unpin(filePath) {
    this._setPins(this._getPins().filter(p => p !== filePath));
    if (this._view) {
      this._view.webview.postMessage({ type: 'updatePins', pins: this._getPins() });
    }
  }

  _getPins() {
    return this.context.workspaceState.get('devboard.pins', [])
      .filter(p => { try { return fs.existsSync(p); } catch { return false; } });
  }

  _setPins(pins) {
    this.context.workspaceState.update('devboard.pins', pins);
  }

  _getNotes() {
    const key = this._notesKey();
    return this.context.workspaceState.get(key, '');
  }

  _saveNotes(content) {
    this.context.workspaceState.update(this._notesKey(), content);
  }

  _notesKey() {
    const folders = vscode.workspace.workspaceFolders;
    return `devboard.notes.${folders ? folders[0].name : 'default'}`;
  }

  _openFile(filePath, line = 0) {
    vscode.workspace.openTextDocument(filePath).then(doc => {
      vscode.window.showTextDocument(doc).then(editor => {
        const pos = new vscode.Position(line, 0);
        editor.selection = new vscode.Selection(pos, pos);
        editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
      });
    });
  }

  async _openNotesTab() {
    const folders = vscode.workspace.workspaceFolders;
    const workspaceName = folders ? folders[0].name : 'default';

    let storageUri;
    if (folders) {
      storageUri = vscode.Uri.joinPath(folders[0].uri, '.vscode', 'devboard-notes.md');
    } else {
      storageUri = vscode.Uri.joinPath(this.context.globalStorageUri, 'devboard-notes.md');
    }

    try { await vscode.workspace.fs.stat(storageUri); }
    catch {
      try { await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(storageUri, '..')); } catch {}
      const defaultContent = `# DevBoard Notes\n\nProject: ${workspaceName}\n\n---\n\n## Ideas\n\n## Links\n\n## Decisions\n`;
      await vscode.workspace.fs.writeFile(storageUri, Buffer.from(defaultContent, 'utf8'));
    }

    const doc = await vscode.workspace.openTextDocument(storageUri);
    await vscode.window.showTextDocument(doc, { preview: false, viewColumn: vscode.ViewColumn.One });
  }

  _render() {
    if (!this._view) return;
    const todos = scanTodos(vscode.workspace.workspaceFolders);
    const pins = this._getPins();
    const notes = this._getNotes();
    this._view.webview.html = this._getHtml(todos, pins, notes);
  }

  _getHtml(todos, pins, notes) {
    const todosJson = JSON.stringify(todos);
    const pinsJson = JSON.stringify(pins);
    const notesEscaped = notes
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const TAG_META = {
      FIXME: { color: '#f87171', icon: '⚠' },
      BUG:   { color: '#f87171', icon: '🐛' },
      TODO:  { color: '#60a5fa', icon: '○' },
      HACK:  { color: '#fbbf24', icon: '🔧' },
      NOTE:  { color: '#34d399', icon: 'ℹ' },
      XXX:   { color: '#fb923c', icon: '?' },
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

  /* ── Section ── */
  .section { border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border, rgba(255,255,255,0.08)); }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    cursor: pointer;
    user-select: none;
    background: var(--vscode-sideBarSectionHeader-background);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--vscode-sideBarSectionHeader-foreground, var(--vscode-foreground));
  }

  .section-header:hover { background: var(--vscode-list-hoverBackground); }

  .chevron {
    font-size: 10px;
    transition: transform 0.15s ease;
    opacity: 0.6;
  }
  .chevron.open { transform: rotate(90deg); }

  .section-body { display: none; }
  .section-body.open { display: block; }

  .section-title-left { display: flex; align-items: center; gap: 6px; }

  /* ── Buttons ── */
  .icon-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--vscode-foreground);
    opacity: 0.6;
    padding: 2px 4px;
    border-radius: 3px;
    font-size: 13px;
    line-height: 1;
  }
  .icon-btn:hover { opacity: 1; background: var(--vscode-toolbar-hoverBackground); }

  /* ── TODO section ── */
  .tag-group { padding: 4px 0; }

  .tag-label {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 3px 12px;
    font-size: 11px;
    font-weight: 600;
    opacity: 0.8;
    cursor: pointer;
    user-select: none;
  }
  .tag-label:hover { background: var(--vscode-list-hoverBackground); }

  .tag-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .tag-count {
    margin-left: auto;
    font-size: 10px;
    opacity: 0.5;
    font-weight: 400;
  }

  .tag-items { display: none; }
  .tag-items.open { display: block; }

  .todo-item {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 4px 12px 4px 28px;
    cursor: pointer;
    line-height: 1.4;
  }
  .todo-item:hover { background: var(--vscode-list-hoverBackground); }

  .todo-text {
    flex: 1;
    color: var(--vscode-foreground);
    opacity: 0.85;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .todo-loc {
    font-size: 10px;
    color: var(--vscode-descriptionForeground);
    white-space: nowrap;
    flex-shrink: 0;
  }

  .empty-state {
    padding: 16px 12px;
    color: var(--vscode-descriptionForeground);
    font-size: 11px;
    display: flex;
    align-items: center;
    gap: 6px;
    opacity: 0.7;
  }

  /* ── Pins section ── */
  .pin-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 12px;
    cursor: pointer;
  }
  .pin-item:hover { background: var(--vscode-list-hoverBackground); }
  .pin-item:hover .unpin-btn { opacity: 0.6; }

  .pin-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .pin-path {
    font-size: 10px;
    color: var(--vscode-descriptionForeground);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 80px;
  }

  .unpin-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--vscode-foreground);
    opacity: 0;
    padding: 2px;
    border-radius: 3px;
    font-size: 12px;
    flex-shrink: 0;
    line-height: 1;
  }
  .unpin-btn:hover { opacity: 1 !important; background: var(--vscode-toolbar-hoverBackground); }

  /* ── Notes section ── */
  .notes-body { padding: 8px; display: flex; flex-direction: column; gap: 6px; }

  .notes-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .char-count {
    font-size: 10px;
    color: var(--vscode-descriptionForeground);
    opacity: 0.5;
  }

  .open-tab-btn {
    font-size: 10px;
    padding: 3px 8px;
    background: var(--vscode-button-secondaryBackground, rgba(255,255,255,0.08));
    color: var(--vscode-button-secondaryForeground, var(--vscode-foreground));
    border: none;
    border-radius: 3px;
    cursor: pointer;
  }
  .open-tab-btn:hover { background: var(--vscode-button-secondaryHoverBackground, rgba(255,255,255,0.15)); }

  textarea {
    width: 100%;
    min-height: 160px;
    resize: vertical;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, transparent);
    border-radius: 4px;
    padding: 8px;
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 12px;
    line-height: 1.6;
    outline: none;
  }
  textarea:focus { border-color: var(--vscode-focusBorder); }
  textarea::placeholder { color: var(--vscode-input-placeholderForeground); opacity: 0.5; }

  .saved-flash {
    font-size: 10px;
    color: var(--vscode-descriptionForeground);
    opacity: 0;
    transition: opacity 0.3s;
  }
  .saved-flash.show { opacity: 0.7; }
</style>
</head>
<body>

<!-- ═══════════════════════════════════════════
     TODO TRACKER
════════════════════════════════════════════ -->
<div class="section" id="sec-todos">
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

<!-- ═══════════════════════════════════════════
     PINNED FILES
════════════════════════════════════════════ -->
<div class="section" id="sec-pins">
  <div class="section-header" onclick="toggleSection('pins')">
    <div class="section-title-left">
      <span class="chevron open" id="chev-pins">›</span>
      <span>Pinned Files</span>
    </div>
  </div>
  <div class="section-body open" id="body-pins">
    <div id="pins-content"></div>
  </div>
</div>

<!-- ═══════════════════════════════════════════
     NOTES
════════════════════════════════════════════ -->
<div class="section" id="sec-notes">
  <div class="section-header" onclick="toggleSection('notes')">
    <div class="section-title-left">
      <span class="chevron open" id="chev-notes">›</span>
      <span>Notes</span>
    </div>
  </div>
  <div class="section-body open" id="body-notes">
    <div class="notes-body">
      <div class="notes-toolbar">
        <span class="char-count" id="char-count">0 chars</span>
        <div style="display:flex;gap:6px;align-items:center;">
          <span class="saved-flash" id="saved-flash">✓ saved</span>
          <button class="open-tab-btn" onclick="sendMsg({type:'openNotesTab'})">Open in tab ↗</button>
        </div>
      </div>
      <textarea id="notepad" placeholder="Quick notes, ideas, links…">${notesEscaped}</textarea>
    </div>
  </div>
</div>

<script>
  const vscode = acquireVsCodeApi();

  const TAG_META = ${JSON.stringify(TAG_META)};

  function sendMsg(msg) { vscode.postMessage(msg); }

  // ── Section collapse ──
  function toggleSection(id) {
    const body = document.getElementById('body-' + id);
    const chev = document.getElementById('chev-' + id);
    const isOpen = body.classList.toggle('open');
    chev.classList.toggle('open', isOpen);
  }

  // ── TODO rendering ──
  function renderTodos(todos) {
    const el = document.getElementById('todos-content');
    if (!todos || todos.length === 0) {
      el.innerHTML = '<div class="empty-state">✓ No TODOs found</div>';
      return;
    }
    el.innerHTML = todos.map(({ tag, items }) => {
      const meta = TAG_META[tag] || { color: '#888', icon: '•' };
      const itemsHtml = items.map(({ text, filePath, line }) => {
        const fileName = filePath.split(/[\\\\/]/).pop();
        const safeText = (text || tag).replace(/</g,'&lt;').replace(/>/g,'&gt;');
        const safePath = filePath.replace(/\\\\/g,'\\\\').replace(/'/g,"\\\\'");
        return \`<div class="todo-item" onclick="sendMsg({type:'openTodo',filePath:'\${safePath}',line:\${line}})">
          <span class="todo-text">\${safeText}</span>
          <span class="todo-loc">\${fileName}:\${line+1}</span>
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

  function toggleTag(id) {
    document.getElementById(id)?.classList.toggle('open');
  }

  // ── Pins rendering ──
  function renderPins(pins) {
    const el = document.getElementById('pins-content');
    if (!pins || pins.length === 0) {
      el.innerHTML = '<div class="empty-state">📎 Right-click a file → Pin File</div>';
      return;
    }
    el.innerHTML = pins.map(filePath => {
      const name = filePath.split(/[\\\\/]/).pop();
      const dir = filePath.split(/[\\\\/]/).slice(-2, -1)[0] || '';
      const safe = filePath.replace(/\\\\/g,'\\\\').replace(/'/g,"\\\\'");
      return \`<div class="pin-item">
        <span class="pin-name" onclick="sendMsg({type:'openPin',filePath:'\${safe}'})">\${name}</span>
        <span class="pin-path">\${dir}</span>
        <button class="unpin-btn" onclick="sendMsg({type:'unpin',filePath:'\${safe}'})" title="Unpin">✕</button>
      </div>\`;
    }).join('');
  }

  // ── Notes ──
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
      sendMsg({ type: 'saveNotes', content: textarea.value });
      savedFlash.classList.add('show');
      clearTimeout(flashTimer);
      flashTimer = setTimeout(() => savedFlash.classList.remove('show'), 1500);
    }, 500);
  });

  updateCharCount();

  // ── Message handler ──
  window.addEventListener('message', ({ data }) => {
    if (data.type === 'updateTodos') renderTodos(data.todos);
    if (data.type === 'updatePins') renderPins(data.pins);
  });

  // ── Initial render ──
  renderTodos(${todosJson});
  renderPins(${pinsJson});
</script>
</body>
</html>`;
  }
}

module.exports = { DevBoardPanel };
