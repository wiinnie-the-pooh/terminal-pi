# Pi Coding Agent CLI for VS Code

<p align="center">
  <img src="resources/icons/pi-coding-agent.png" alt="Pi Coding Agent" width="96">
</p>

<p align="center">
  <strong>Make <code>pi</code> feel native in VS Code.</strong><br>
  One click to launch. <code>Ctrl+G</code> to write prompts in your favorite editor.
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

---

## Quick Start

**Prerequisite:** `pi` must be installed and on your PATH.

```sh
npm install -g @mariozechner/pi-coding-agent
```

---

## Features

- **Status bar launcher** -- open a fresh Pi session in one click in VS Code `Editor Area`
- **Ctrl+G external editor** �- write prompt in VS Code; it is sent to the `Pi` session when the file is saved and closed (`Ctrl+F4`)
- **Configurable** -- set default CLI args and choose your editor command

### Status bar launcher

<img src="resources/images/statusbar-click.png" alt="Pi status bar button">

Every click opens a fresh terminal beside your editor. Existing terminals stay untouched.

### Ctrl+G

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
