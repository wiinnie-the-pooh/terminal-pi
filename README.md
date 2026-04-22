# Pi Dock - Pi Agent Docked in the VS Code Editor Area

<p align="center">
  <img src="resources/icons/pi-dock.png" alt="Pi Dock" width="96">
</p>

<p align="center">
  <strong>Make <code>pi</code> feel native in VS Code.</strong><br>
  One click to launch. <code>Ctrl+G</code> to write prompts in your favorite editor.
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=wiinnie-the-pooh.pi-dock">
    <img src="https://img.shields.io/visual-studio-marketplace/v/wiinnie-the-pooh.pi-dock?label=VS%20Marketplace&color=0066b8" alt="VS Marketplace Version">
  </a>
  <a href="https://marketplace.visualstudio.com/items?itemName=wiinnie-the-pooh.pi-dock">
    <img src="https://img.shields.io/visual-studio-marketplace/i/wiinnie-the-pooh.pi-dock?label=installs&color=0066b8" alt="Installs">
  </a>
  <a href="https://github.com/wiinnie-the-pooh/terminal-pi/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/wiinnie-the-pooh/terminal-pi?color=0066b8" alt="License">
  </a>
</p>

---

<img src="resources/images/statusbar-click.png" alt="Pi Dock in work">

## Quick Start

**Prerequisite:** `pi` must be installed and on your PATH.

```sh
npm install -g @mariozechner/pi-coding-agent
```

---

## Features

- **Status bar launcher** - open a fresh Pi session in one click in VS Code `Editor Area`
- **Skill / Template / Extension actions** - run Pi on Explorer selections or the current file with popup pickers for Pi resources
- **Ctrl+G external editor** - opens the current `Pi` prompt in an external editor; on save and close, it returns to `Pi`.
- **Configurable** - set default CLI args and choose your editor command

### Status bar launcher

- Every click opens a fresh `Pi Dock` session into VS Code `Editor Area`.

### Run Pi with workspace resources

- Right-click selected file(s) in the Explorer or the current editor file to run:
  - `Run Pi with Skill...`
  - `Run Pi with Template...`
  - `Run Pi with Extension...`

- The same flows are also available from the Command Palette:
  - `Pi Dock: Run Pi with Skill...`
  - `Pi Dock: Run Pi with Template...`
  - `Pi Dock: Run Pi with Extension...`

- Resource pickers are popup-only and support multi-select within the chosen type:
  - **Skill** picker shows `SKILL.md` files, but Pi receives the parent directory via repeated `--skill <dir>` flags
  - **Template** picker shows `.md` files and passes them via repeated `--prompt-template <file>` flags
  - **Extension** picker shows `.ts` files and passes them via repeated `--extension <file>` flags

- Explorer actions ignore selected folders and only pass files to Pi.

- If a command is launched from the Command Palette with no active editor file, Pi Dock shows a workspace-file Quick Pick first so you can choose the target file.

### Edit prompts outside the `Pi` session

- Focus the `Pi Dock` session and press `Ctrl+G` to open the external editor. Write your prompt in an editor tab, then save and close - it is sent back to `Pi`.

- By default, Pi Dock auto-detects the current desktop editor and exports a matching `EDITOR` / `VISUAL` command:
  - VS Code Stable -> `code --wait`
  - VS Code Insiders -> `code-insiders --wait`
  - Cursor -> `cursor --wait`

- If auto-detection cannot find a usable CLI on PATH, Pi Dock preserves your existing `VISUAL` / `EDITOR` values. If none are set, `pi` falls back to its own default behavior.

---

## Commands

| Command                               | Description |
|---------------------------------------|-------------|
| Pi Dock: Run Pi Dock                  | Open an interactive `pi` session |
| Pi Dock: Run Pi with Skill...         | Run Pi on selected files with one or more `--skill` resources |
| Pi Dock: Run Pi with Template...      | Run Pi on selected files with one or more `--prompt-template` resources |
| Pi Dock: Run Pi with Extension...     | Run Pi on selected files with one or more `--extension` resources |

---

## Settings

| Setting                              | Default       | Description                                                                          |
|--------------------------------------|---------------|--------------------------------------------------------------------------------------|
| `piDock.defaultArgs`                 | `""`          | Extra CLI flags for every `pi` invocation, e.g. `--model openai/gpt-4o`              |
| `piDock.editorCommand`               | `""` (auto)  | Optional explicit `EDITOR` / `VISUAL` override. Leave empty to auto-detect the current desktop editor CLI |
| `piDock.virtualEnvironmentOverride`  | `true`        | Temporarily disable Python venv activation when creating a Pi terminal               |
| `piDock.virtualEnvironmentDrainMs`   | `150`         | Milliseconds to wait before restoring venv activation (ignored when override is off) |

---

<details>
<summary>Building from source</summary>

```sh
npm install
npm run compile
npm test
```

### Packaging

```sh
npm run package
# Produces: pi-dock-<version>.vsix
code --install-extension pi-dock-<version>.vsix
```

</details>

---

## Links

- [Pi Dock CLI on npm](https://www.npmjs.com/package/@mariozechner/pi-coding-agent)
- [GitHub Repository](https://github.com/wiinnie-the-pooh/terminal-pi)
- [Report an Issue](https://github.com/wiinnie-the-pooh/terminal-pi/issues)
- [Changelog](CHANGELOG.md)
