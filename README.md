# DevBoard

> Your developer dashboard, living right in the sidebar.

DevBoard is a lightweight VSCode extension that keeps everything you need in one place — track TODOs across your codebase, pin your most-used files, and jot down project notes without ever leaving the editor.

---

## Features

### 📋 TODO Tracker
Never lose a TODO again. DevBoard scans your entire project and groups every comment tag by type so you can see what needs attention at a glance.

- Detects `TODO`, `FIXME`, `BUG`, `HACK`, `NOTE`, and `XXX`
- Grouped and color-coded by tag
- Click any item to jump straight to that line
- Auto-refreshes every time you save a file
- Skips `node_modules`, `.git`, `dist`, and other non-source folders

### 📎 Pinned Files
Keep your most important files one click away, even after closing tabs.

- Right-click any file in the Explorer → **DevBoard: Pin File**
- Pinned files persist across sessions and restarts
- Click to open, hover to reveal the unpin button

### ✏️ Notes
A persistent markdown scratch pad tied to your workspace.

- Write freely inside the sidebar panel
- Auto-saves as you type
- Click **Open in tab ↗** to open as a full editor tab
- Each workspace keeps its own separate notes
- Saved to `.vscode/devboard-notes.md` — a real file you can commit or gitignore

---

## Usage

Once installed, click the **DevBoard icon** in the Activity Bar to open the panel. All three sections live together in one place and can be collapsed individually.

### Pinning a file
1. Right-click any file in the Explorer
2. Select **DevBoard: Pin File**
3. It appears instantly in the Pinned Files section

### Refreshing TODOs
Click the **↻** button in the TODO Tracker header, or simply save any file — DevBoard refreshes automatically.

### Opening notes in a full tab
Click the **Open in tab ↗** button inside the Notes section to open your notes as a full Markdown editor tab.

---

## Supported Languages

DevBoard scans TODO comments in the following file types:

`js` `ts` `jsx` `tsx` `py` `java` `c` `cpp` `cs` `go` `rb` `php` `swift` `kt` `rs` `vue` `html` `css` `scss` `sh` `yaml` `yml` `md`

---

## Extension Settings

No configuration required. DevBoard works out of the box.

---

## Gitignore

If you don't want your project notes committed to git, add this to your `.gitignore`:

```
.vscode/devboard-notes.md
```

---

## Release Notes

### 2.0.0
- Rebuilt as a single unified panel — no more accidentally hiding sections
- All three features live in one unbreakable sidebar view
- Collapsible sections with chevron indicators
- Improved notes toolbar with character count and save indicator

### 1.0.0
- Initial release
- TODO Tracker, Pinned Files, and Project Notepad

---

## Contributing

Found a bug or have a feature request? Open an issue on [GitHub](https://github.com/yourusername/devboard).

Pull requests are welcome!

---

## License

MIT © melvsanity
