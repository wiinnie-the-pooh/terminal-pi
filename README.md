# Pi Coding Agent CLI for VS Code

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="resources/icons/pi-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="resources/icons/pi-light.svg">
    <img src="resources/icons/pi-dark.svg" alt="Pi Coding Agent icon" width="72">
  </picture>
</p>

<p align="center">
  <strong>Make <code>pi</code> feel native in VS Code.</strong><br>
  Launch it from the status bar, send the current file with a right-click, and use Pi's external-editor flow directly in VS Code.
</p>

Pi itself is a minimal, extensible coding agent CLI. This extension keeps that terminal-first experience intact, but gives it the launch points VS Code users actually want.

## Start here: the status bar button

If you only use one feature, make it this one.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="resources/icons/pi-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="resources/icons/pi-light.svg">
  <img src="resources/icons/pi-dark.svg" alt="Pi status bar icon" width="18">
</picture>
**Pi** appears in the VS Code status bar and opens a fresh Pi terminal with one click.

Why it matters:

- no need to leave your editor and type `pi` manually
- every launch opens a fresh terminal beside your code
- it is the fastest way to jump from “I need help here” to an active agent session

For day-to-day use, this becomes the most natural entry point: open a workspace, click **Pi**, and start asking.

## The three workflows that make this extension feel useful

### 1. Launch Pi exactly when you need it
Click the status bar button and a new terminal named **Pi Coding Agent** opens beside your editor and runs `pi`.

This is ideal when you want to:

- explore a codebase
- ask for a refactor plan
- review recent changes
- start a fresh session without touching your existing terminals

### 2. Use the right-click context menu for focused context
The Explorer and editor context menus include **Run Pi Coding Agent with Current File**.

When you already have a file open in the editor, this lets you jump straight into a Pi session with `@filepath` already attached.

Typical use cases:

- “Explain this module”
- “Refactor this file but keep public APIs unchanged”
- “Write tests for this component”
- “Find a bug in this file and suggest a fix”

If no editor is open, the extension falls back to the workspace root, so Pi still starts with useful project context.

### 3. Edit longer prompts in VS Code with `Ctrl+G`
With a **Pi terminal focused**, pressing `Ctrl+G` sends the control sequence Pi uses for **Edit message in external editor**.

That is a surprisingly big quality-of-life improvement.

Instead of squeezing a long instruction into a terminal input, you can draft it in a real VS Code editor, revise it comfortably, save, and drop back into Pi. This is especially helpful when you want to:

- write a detailed implementation request
- paste and refine structured instructions
- prepare a careful bug report for the agent
- edit a long multi-step prompt without fighting terminal editing

By default, Pi terminals created by this extension export `EDITOR` and `VISUAL` as `code --wait`, so the external-editor flow lands right back in VS Code.

## A simple story: how this fits into a real VS Code workflow

You open a project and notice a piece of code you do not fully trust.

First, you click the **Pi** status bar button to start a fresh session. Pi opens beside your editor, already in the workspace you are working in.

Then you narrow the task. While viewing the file, you right-click in the editor and choose **Run Pi Coding Agent with Current File**. Now Pi starts with that file attached as context, so you do not need to explain where to look.

As the task becomes more nuanced, you want to give Pi a better prompt: constraints, edge cases, things not to change. Instead of typing a long message in the terminal, you focus the Pi terminal and press `Ctrl+G`. VS Code opens the external-editor flow, you write the prompt properly, save it, and send it back.

That is the value of this extension in one loop: **start fast, target the right file, and escalate to a full editor when the prompt deserves it**.

## What this extension adds to Pi

This extension does not replace Pi's CLI or hide it behind a custom panel. Instead, it makes the real Pi workflow easier to access inside VS Code.

You keep Pi's normal capabilities, including:

- interactive terminal sessions
- print mode for one-off prompts
- continuing the most recent session
- browsing previous sessions
- Pi's own tool-driven coding workflow

## Quick start

### Requirements

You need `pi` installed and available in your `PATH`.

```sh
npm install -g @mariozechner/pi-coding-agent
```

Then open a terminal and verify it starts:

```sh
pi
```

If you are new to Pi, authenticate on first run with `/login` or your provider API key setup.

### In VS Code

1. Install this extension.
2. Open any workspace folder.
3. Click **Pi** in the status bar.
4. Start with a natural request, for example:
   - `Summarize this codebase`
   - `Review the active project structure`
   - `Find likely test gaps`

Once that feels good, try the two faster context-driven workflows:

- right-click in the editor and run **Pi Coding Agent with Current File**
- focus the Pi terminal and press `Ctrl+G` to edit a longer message in VS Code

## Settings

Configure via **File > Preferences > Settings** and search for **Pi Coding Agent**.

| Setting | Type | Default | Description |
|---|---|---|---|
| `piCodingAgent.defaultArgs` | string | `""` | Extra CLI flags added to every `pi` invocation, for example `--model openai/gpt-4o` |
| `piCodingAgent.editorCommand` | string | `"code --wait"` | Command exported as `EDITOR` and `VISUAL` for Pi terminals |
| `piCodingAgent.showStatusBar` | boolean | `true` | Show or hide the **Pi** status bar button |

### Example `settings.json`

```json
{
  "piCodingAgent.defaultArgs": "--model anthropic/claude-sonnet-4-5 --thinking low",
  "piCodingAgent.editorCommand": "code --wait",
  "piCodingAgent.showStatusBar": true
}
```

## Advanced: Command Palette and extra commands

If you prefer keyboard-driven launching, open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and search for **Pi**.

| Command Palette Title | Description |
|---|---|
| Pi: Run Pi Coding Agent | Open an interactive `pi` session |
| Pi: Run Pi Coding Agent with Current File | Open `pi` and pass the active file, or workspace root, as `@filepath` context |
| Pi: Run Pi Coding Agent (Print Mode) | Prompt for a message and run `pi -p "message"` |
| Pi: Continue Most Recent Pi Session | Run `pi -c` to resume the last session |
| Pi: Browse Pi Sessions | Run `pi -r` to browse and select a past session |

Additional integration points:

- **Explorer context menu**: launch the command from the file tree while staying in your flow
- **Editor context menu**: launch Pi for the file you are currently editing
- **Pi terminal + `Ctrl+G`**: trigger Pi's external-editor flow in VS Code

Each Pi command opens a fresh terminal.

## Building from source

```sh
npm install
npm test
npm run compile
```

## Packaging

```sh
npm run package
# Produces: pi-coding-agent-<version>.vsix
```

Install locally:

```sh
code --install-extension pi-coding-agent-<version>.vsix
```
