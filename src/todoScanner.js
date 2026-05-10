const fs = require('fs');
const path = require('path');

const TODO_PATTERN = /\/\/\s*(TODO|FIXME|BUG|HACK|NOTE|XXX)\s*[:\-]?\s*(.*)/gi;
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'out', '.vscode', '__pycache__', '.next', 'coverage']);
const CODE_EXTS = new Set([
  '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.c', '.cpp', '.cs',
  '.go', '.rb', '.php', '.swift', '.kt', '.rs', '.vue', '.html', '.css',
  '.scss', '.sh', '.yaml', '.yml', '.md'
]);

const TAG_ORDER = ['FIXME', 'BUG', 'TODO', 'HACK', 'NOTE', 'XXX'];

function scanTodos(workspaceFolders) {
  const byTag = {};

  function scanDir(dirPath) {
    let entries;
    try { entries = fs.readdirSync(dirPath, { withFileTypes: true }); }
    catch { return; }
    for (const entry of entries) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const full = path.join(dirPath, entry.name);
      if (entry.isDirectory()) scanDir(full);
      else if (entry.isFile() && CODE_EXTS.has(path.extname(entry.name).toLowerCase())) {
        scanFile(full);
      }
    }
  }

  function scanFile(filePath) {
    let content;
    try { content = fs.readFileSync(filePath, 'utf8'); }
    catch { return; }
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      TODO_PATTERN.lastIndex = 0;
      let match;
      while ((match = TODO_PATTERN.exec(lines[i])) !== null) {
        const tag = match[1].toUpperCase();
        if (!byTag[tag]) byTag[tag] = [];
        const column = match.index + match[0].indexOf(match[1]);
        byTag[tag].push({ text: match[2].trim(), filePath, line: i, column });
      }
    }
  }

  if (workspaceFolders) {
    for (const folder of workspaceFolders) {
      scanDir(folder.uri.fsPath);
    }
  }

  // Return sorted by tag priority
  const result = [];
  for (const tag of TAG_ORDER) {
    if (byTag[tag]) result.push({ tag, items: byTag[tag] });
  }
  // Any unknown tags
  for (const tag of Object.keys(byTag)) {
    if (!TAG_ORDER.includes(tag)) result.push({ tag, items: byTag[tag] });
  }
  return result;
}

module.exports = { scanTodos };
