# Pi Coding Agent CLI for VS Code

<p align="center">
  <img src="resources/icons/pi-coding-agent.png" alt="Pi Coding Agent" width="96">
</p>

<p align="center">
  <strong>Make <code>pi</code> feel native in VS Code.</strong><br>
  One click to launch. <code>Ctrl+G</code> to write prompts like a human.
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=wiinnie-the-pooh.pi-coding-agent">
    <img src="https://img.shields.io/visual-studio-marketplace/v/wiinnie-the-pooh.pi-coding-agent?label=VS%20Marketplace&color=0066b8" alt="VS Marketplace Version">
  </a>
  <a href="https://marketplace.visualstudio.com/items?itemName=wiinnie-the-pooh.pi-coding-agent">
    <img src="https://img.shields.io/visual-studio-marketplace/i/wiinnie-the-pooh.pi-coding-agent?label=installs&color=0066b8" alt="Installs">
  </a>
  <a href="https://github.com/wiinnie-the-pooh/terminal-pi/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/wiinnie-the-pooh/terminal-pi?color=0066b8" alt="License">
  </a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/wiinnie-the-pooh/terminal-pi/main/resources/images/hero.png" alt="Pi Coding Agent in action" width="800">
</p>

---

## Quick Start

**Prerequisite:** `pi` must be installed and on your PATH.

```sh
npm install -g @mariozechner/pi-coding-agent
```

1. Install this extension from the VS Code Marketplace.
2. Open any workspace folder.
3. Click **Pi** in the status bar -- a Pi terminal opens beside your editor.

---

## Features

- **Status bar launcher** -- open a fresh Pi session in one click, without leaving your editor
- **Ctrl+G external editor** -- write long, structured prompts in a full VS Code editor tab, then send on save
- **Configurable** -- set default CLI args, choose your editor command, toggle the status bar button

### Status bar launcher

<img src="https://raw.githubusercontent.com/wiinnie-the-pooh/terminal-pi/main/resources/images/statusbar-click.png" alt="Pi status bar button" width="400">

Every click opens a fresh terminal beside your editor. Existing terminals stay untouched.

### Ctrl+G

<img src="https://raw.githubusercontent.com/wiinnie-the-pooh/terminal-pi/main/resources/images/ctrl-g-editor.png" alt="Ctrl+G external editor flow" width="600">

Focus a Pi terminal and press `Ctrl+G` to open Pi's external-editor flow. Write your prompt in a real VS Code editor tab, then save -- it lands back in Pi.

Pi terminals created by this extension export `EDITOR` and `VISUAL` as `code --wait`, so the flow opens right in your current window.

---

## Commands

| Command | Description |
|---|---|
| Pi: Run Pi Coding Agent | Open an interactive `pi` session |

---

## Settings

| Setting | Type | Default | Description |
|---|---|---|---|
| `piCodingAgent.defaultArgs` | string | `""` | Extra CLI flags added to every `pi` invocation, e.g. `--model openai/gpt-4o` |
| `piCodingAgent.editorCommand` | string | `"code --wait"` | Command exported as `EDITOR` and `VISUAL` for Pi terminals |
| `piCodingAgent.showStatusBar` | boolean | `true` | Show or hide the **Pi** status bar button |

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
# Produces: pi-coding-agent-<version>.vsix
code --install-extension pi-coding-agent-<version>.vsix
```

</details>

---

## Links

- [GitHub Repository](https://github.com/wiinnie-the-pooh/terminal-pi)
- [Report an Issue](https://github.com/wiinnie-the-pooh/terminal-pi/issues)
- [Pi Coding Agent CLI on npm](https://www.npmjs.com/package/@mariozechner/pi-coding-agent)
- [Changelog](CHANGELOG.md)
