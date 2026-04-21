# Pi Coding Agent CLI for VS Code

<p align="center">
  <img src="resources/icons/pi-coding-agent.png" alt="Pi Coding Agent" width="96">
</p>

<p align="center">
  <strong>Make <code>pi</code> feel native in VS Code.</strong><br>
  One click to launch. Right-click to add file context. <code>Ctrl+G</code> to write prompts like a human.
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
4. Start with a request: `Summarize this codebase` or `Find likely test gaps`.

Once that feels comfortable, try the two faster workflows:

- Right-click a file -> **Run Pi Coding Agent with Current File** (adds `@filepath` context automatically)
- Focus the Pi terminal and press `Ctrl+G` to draft long prompts in a real VS Code editor

> **New to Pi?** On first run, authenticate with `/login` or set up your provider API key.

---

## Features

- **Status bar launcher** -- open a fresh Pi session in one click, without leaving your editor
- **File context via right-click** -- launch Pi with the current file already attached as `@filepath`
- **Print mode** -- run a one-off `pi -p "message"` prompt without an interactive session
- **Session management** -- continue the most recent session or browse past sessions
- **Ctrl+G external editor** -- write long, structured prompts in a full VS Code editor tab
- **Configurable** -- set default CLI args, choose your editor command, toggle the status bar button

---

## How It Works

### Status bar launcher

<img src="https://raw.githubusercontent.com/wiinnie-the-pooh/terminal-pi/main/resources/images/statusbar-click.png" alt="Pi status bar button" width="400">

Click **Pi** in the status bar and a new terminal named **Pi Coding Agent** opens beside your editor running `pi`. Every click opens a fresh terminal, so your existing terminals stay untouched.

### Right-click with file context

<img src="https://raw.githubusercontent.com/wiinnie-the-pooh/terminal-pi/main/resources/images/context-menu.png" alt="Run Pi with current file context menu" width="400">

Right-click any file in the Explorer or editor and choose **Run Pi Coding Agent with Current File**. Pi starts with that file attached -- no need to type the path.

Good for: "Explain this module", "Refactor this file", "Write tests for this component", "Find a bug here".

If no editor is open, the extension falls back to the workspace root so Pi still has useful project context.

### Ctrl+G: write long prompts in VS Code

<img src="https://raw.githubusercontent.com/wiinnie-the-pooh/terminal-pi/main/resources/images/ctrl-g-editor.png" alt="Ctrl+G external editor flow" width="600">

Focus a Pi terminal and press `Ctrl+G` to open Pi's external-editor flow. Write your prompt in a real VS Code editor tab -- revise it, paste structured instructions, set constraints -- then save and it lands back in Pi.

Pi terminals created by this extension export `EDITOR` and `VISUAL` as `code --wait`, so the flow opens right in your current VS Code window.

---

## Commands

Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and search for **Pi**.

| Command | Description |
|---|---|
| Pi: Run Pi Coding Agent | Open an interactive `pi` session |
| Pi: Run Pi Coding Agent with Current File | Pass the active file (or workspace root) as `@filepath` context |
| Pi: Run Pi Coding Agent (Print Mode) | Run a one-off `pi -p "message"` prompt |
| Pi: Continue Most Recent Pi Session | Resume the last session with `pi -c` |
| Pi: Browse Pi Sessions | Browse and select a past session with `pi -r` |

---

## Settings

Configure via **File > Preferences > Settings** and search for **Pi Coding Agent**.

| Setting | Type | Default | Description |
|---|---|---|---|
| `piCodingAgent.defaultArgs` | string | `""` | Extra CLI flags added to every `pi` invocation, e.g. `--model openai/gpt-4o` |
| `piCodingAgent.editorCommand` | string | `"code --wait"` | Command exported as `EDITOR` and `VISUAL` for Pi terminals |
| `piCodingAgent.showStatusBar` | boolean | `true` | Show or hide the **Pi** status bar button |

### Example settings.json

```json
{
  "piCodingAgent.defaultArgs": "--model anthropic/claude-sonnet-4-5 --thinking low",
  "piCodingAgent.editorCommand": "code --wait",
  "piCodingAgent.showStatusBar": true
}
```

---

## How It Fits Together

This extension is a thin launcher. It does not embed Pi's logic or parse its output -- it constructs the right `pi` command, opens a VS Code terminal, and sends it. Everything after that is Pi's native terminal experience.

You keep all of Pi's capabilities: interactive sessions, print mode, session management, and Pi's own tool-driven coding workflow.

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
