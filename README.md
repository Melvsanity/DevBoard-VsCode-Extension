<div align="center">

<img src="images/todonexus-extension-icon.png" alt="TodoNexus Logo" width="128" height="128" />

# TodoNexus

**Your developer nexus for TODOs, notes, and workspace focus — all in the sidebar.**

![Version](https://img.shields.io/badge/version-1.0.0-pink?style=flat-square)
![VS Code](https://img.shields.io/badge/VS%20Code-%5E1.75.0-blue?style=flat-square\&logo=visualstudiocode)
![License](https://img.shields.io/badge/license-MIT-purple?style=flat-square)

Track TODOs · Take notes · Stay focused — without leaving your editor.

</div>

---

## Overview

TodoNexus is a zero-config VSCode extension that brings your development workflow into one unified sidebar hub. It automatically and continuously scans your entire workspace and **detects and tracks every important code comment in real time**, including:

**`TODO` · `FIXME` · `BUG` · `HACK` · `NOTE` · `XXX`**

This means you never lose track of work again — tasks are surfaced instantly, grouped automatically, and always visible inside your sidebar.

Everything updates as you code. No manual refresh needed.

No setup. No backend. No distractions.

---

## Features

### 📋 TODO Tracker

Never lose a TODO again. TodoNexus scans your entire workspace and organizes comment tags into a clean, navigable view.

* Detects **`TODO`**, **`FIXME`**, **`BUG`**, **`HACK`**, **`NOTE`**, and **`XXX`**
* Fully automatic scanning and live tracking across your project
* Grouped by tag with color indicators
* Click to jump directly to the exact line in code
* Auto-refreshes on file save
* Ignores `node_modules`, `dist`, `build`, `.git`, and other noise folders

---

### ✏️ Notes

A persistent workspace-aware markdown scratch system for ideas, reminders, and snippets.

* Fast sidebar note creation
* Auto-saves while typing
* Open notes in full editor tab
* Stored per workspace for separation
* Saved as `.vscode/todonexus-notes.md`

---

### 🧠 Quick Scratch Pad

A lightweight always-available text area for temporary thoughts.

* Instant autosave
* Character counter
* Perfect for quick snippets or debugging notes

---

## Installation

**Via Marketplace:**

1. Open VSCode
2. Press `Ctrl+P` (or `Cmd+P` on Mac)
3. Run:

   ```
   ext install melvsanity.todonexus
   ```

**Via VSIX:**

1. Download the latest `.vsix` from [Releases](https://github.com/Melvsanity/TodoNexus/releases)
2. Open VSCode → Extensions → `···` → **Install from VSIX**

---

## Usage

Click the **TodoNexus icon** in the Activity Bar to open the sidebar panel.

### Using TODO Tracker

* Save any file → TODOs update automatically
* Click any item → jump to code location

### Creating Notes

* Click **+** in Notes section
* Open or delete notes directly from sidebar

### Scratch Pad

* Just type — it saves automatically
* Use it for temporary thoughts, links, or debugging notes

---

## Supported Languages

TodoNexus scans TODO comments across all major languages:

| Category                | Extensions                            |
| ----------------------- | ------------------------------------- |
| JavaScript / TypeScript | `js` `ts` `jsx` `tsx`                 |
| Systems                 | `c` `cpp` `cs` `rs` `go` `swift` `kt` |
| Backend                 | `py` `java` `rb` `php`                |
| Web                     | `vue` `html` `css` `scss`             |
| Config & Docs           | `sh` `yaml` `yml` `md`                |

---

## Gitignore

To avoid tracking workspace notes:

```gitignore
.vscode/todonexus-notes.md
```

---

## Requirements

* VSCode `1.75.0` or higher
* No dependencies

---

## Contributing

Contributions are welcome:

1. Open an issue
2. Fork the repo
3. Create a feature branch
4. Submit a pull request

---

## License

MIT © [melvsanity](https://github.com/Melvsanity)