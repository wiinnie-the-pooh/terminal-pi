# Pi Coding Agent

[Pi](https://www.npmjs.com/package/@mariozechner/pi-coding-agent) is an open-source AI coding agent that runs in your terminal. Pi Coding Agent docks it right inside the VS Code editor area -- one click to launch, zero context switches. Feed Pi your skills and templates from the Explorer or Command Palette, use `Ctrl+G` to compose prompts in a full editor tab, and never lose a session: Pi Coding Agent automatically restores your sessions when VS Code restarts, so you pick up right where you left off.

![Pi Coding Agent in the VS Code editor area](resources/images/statusbar-click.png)

## Quick Start

1. Install the [Pi CLI](https://www.npmjs.com/package/@mariozechner/pi-coding-agent): `npm install -g @mariozechner/pi-coding-agent`
2. Install Pi Coding Agent from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=wiinnie-the-pooh.pi-agent).
3. Click the Pi icon in the editor title bar -- a Pi session opens in your editor area.

## Features

- **One-click launch** -- Click the status bar or the editor title bar icon to open a fresh Pi session docked in the editor area. No new windows. No browser tabs. No terminal juggling.

- **Workspace resources** -- Right-click files in the Explorer or use the Command Palette to launch Pi with your [Skills](https://www.npmjs.com/package/@mariozechner/pi-coding-agent), Templates, Extensions, or Prompts. Multi-select is supported.

- **Ctrl+G editor integration** -- Focus a Pi session and press `Ctrl+G` to compose your prompt in a full VS Code editor tab. Save and close the tab to send it back to Pi. Your flow state, protected.

- **Session persistent** -- Pi sessions restore automatically when VS Code restarts. Close your laptop, reboot, update VS Code -- your Pi sessions are waiting when you come back.

- **Configurable** -- Set default CLI flags (`--model openai/gpt-4o`), choose your external editor command, and fine-tune terminal behavior through VS Code settings.

- **VS Code-friendly hotkeys** -- Alternate shortcuts for actions VS Code would otherwise intercept (`Ctrl+C`, `Ctrl+L`, etc.). Type `/hotkeys-original` to revert to Pi's built-in keys, or `/hotkeys-piagent` to bring them back.

<details>
<summary>Resource type details</summary>

Each "Run Pi with..." command accepts specific file types:

| Command | Accepted files | Pi CLI flag |
| ------- | -------------- | ----------- |
| Run Pi with Skill... | `SKILL.md` | `--skill <parent-dir>` |
| Run Pi with Template... | `.md` files (excluding `SKILL.md`) | `--prompt-template <file>` |
| Run Pi with Extension... | `.ts` files | `--extension <file>` |
| Run Pi with Prompt... | Any text file | `@<file>` |

- **Explorer context menu**: Right-click selected files to run the matching command. All selected files must match the command's file type.
- **Editor context menu**: Right-click in the editor to run a command with the current file.
- **Command Palette**: Opens a Quick Pick to browse and multi-select matching files from your workspace.

</details>

<details>
<summary>External editor auto-detection</summary>

Pi Coding Agent auto-detects your VS Code variant and exports a matching `EDITOR` / `VISUAL` command for Pi's external editor flow:

- VS Code Stable -> `code --wait`
- VS Code Insiders -> `code-insiders --wait`
- Cursor -> `cursor --wait`

If auto-detection fails, Pi Coding Agent preserves your existing `VISUAL` / `EDITOR` values. Override this with the `piAgent.editorCommand` setting.

</details>

## Additional Shortcuts in Pi Coding Agent

Pi Coding Agent adds alternate shortcuts for the keys VS Code would otherwise steal. Most of Pi's `Ctrl` shortcuts become `Alt`:

| Pi Coding Agent shortcut | Action | Pi built-in shortcut |
| ---------------- | ------ | -------------------- |
| `Alt+C` | Clear editor | `Ctrl+C` |
| `Alt+D` | Exit when editor is empty | `Ctrl+D` |
| `Alt+T` | Cycle thinking level | `Shift+Tab` |
| `Alt+P` | Cycle to next model | `Ctrl+P` |
| `Shift+Alt+P` | Cycle to previous model | `Shift+Ctrl+P` |
| `Alt+O` | Toggle tool output | `Ctrl+O` |
| `Ctrl+Shift+Enter` | Queue follow-up message | `Alt+Enter` |

Use these slash commands inside Pi Coding Agent:

- `/hotkeys-piagent` -- enable the Pi Coding Agent shortcut layer
- `/hotkeys-original` -- revert to Pi's built-in shortcuts

## Commands

| Command | Description |
| ------- | ----------- |
| Pi Coding Agent: Run Pi Coding Agent | Open an interactive Pi session in the editor area |
| Pi Coding Agent: Run Pi with Skill... | Launch Pi with one or more Skill resources (`SKILL.md` files) |
| Pi Coding Agent: Run Pi with Template... | Launch Pi with one or more prompt templates (`.md` files) |
| Pi Coding Agent: Run Pi with Extension... | Launch Pi with one or more extensions (`.ts` files) |
| Pi Coding Agent: Run Pi with Prompt... | Launch Pi with a text file as a prompt reference |

## Settings

| Setting | Default | Description |
| ------- | ------- | ----------- |
| `piAgent.defaultArgs` | `""` | Extra CLI flags for every Pi invocation (e.g. `--model openai/gpt-4o`) |
| `piAgent.editorCommand` | `""` (auto) | Override the `EDITOR` / `VISUAL` command. Leave empty to auto-detect |
| `piAgent.promptExtraContext` | `""` | Extra context appended after the `@file` reference in Prompt invocations |
| `piAgent.virtualEnvironmentOverride` | `true` | Temporarily disable Python venv activation when creating a Pi terminal |
| `piAgent.virtualEnvironmentDrainMs` | `150` | Milliseconds to wait before restoring venv activation (ignored when override is off) |
| `piAgent.restoreSessionsOnStartup` | `true` | Reopen previous Pi sessions on VS Code startup |

<details>
<summary>Building from source</summary>

```sh
npm install
npm run compile
npm test
```

For manual verification in a live VS Code instance, see `TESTING.md`.

### Packaging

```sh
npm run package
# Produces: pi-agent-<version>.vsix
code --install-extension pi-agent-<version>.vsix
```

</details>

## Links

- [Pi CLI on npm](https://www.npmjs.com/package/@mariozechner/pi-coding-agent)
- [GitHub Repository](https://github.com/wiinnie-the-pooh/terminal-pi)
- [Report an Issue](https://github.com/wiinnie-the-pooh/terminal-pi/issues)
- [Changelog](CHANGELOG.md)
