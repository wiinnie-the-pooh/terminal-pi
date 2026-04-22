# Pi Dock -- Pi agent docked in VS Code

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

- **Status bar launcher** -- open a fresh Pi session in one click in VS Code `Editor Area`
- **Ctrl+G external editor** -- write prompt in VS Code; it is sent to the `Pi` session when the file is saved and closed (`Ctrl+F4`)
- **Configurable** -- set default CLI args and choose your editor command

### Status bar launcher

- Every click opens a fresh `Pi Dock` session into VS Code `Editor Area`.

### Edit prompts outside the `Pi` session

- Focus the `Pi Dock` session and press `Ctrl+G` to open the external editor. Write your prompt in a VS Code tab, then save and close -- it is sent back to `Pi`.

- `Pi` terminals created by this extension set `EDITOR` and `VISUAL` to `code --wait`. This opens an anonymous file in the VS Code `Editor area`.

---

## Commands

| Command                  | Description                      |
|--------------------------|----------------------------------|
| Pi Dock: Run Pi Dock     | Open an interactive `pi` session |

---

## Settings

| Setting                              | Default       | Description                                                                          |
|--------------------------------------|---------------|--------------------------------------------------------------------------------------|
| `piDock.defaultArgs`                 | `""`          | Extra CLI flags for every `pi` invocation, e.g. `--model openai/gpt-4o`              |
| `piDock.editorCommand`               | `code --wait` | Command exported as `EDITOR` / `VISUAL` in Pi terminals                              |
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
