# Pi Coding Agent

VS Code extension that integrates the [`pi` coding agent CLI](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent) into the integrated terminal.

## Requirements

`pi` must be installed and available in your `PATH`.

## Commands

Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and search for **Pi**:

| Command Palette Title | Description |
|---|---|
| Pi: Run Pi Coding Agent | Open an interactive `pi` session |
| Pi: Run Pi Coding Agent with Current File | Open `pi` and pass the active file (or workspace root) as `@filepath` context |
| Pi: Run Pi Coding Agent (Print Mode) | Prompt for a message and run `pi -p "message"` |
| Pi: Continue Most Recent Pi Session | Run `pi -c` to resume the last session |
| Pi: Browse Pi Sessions | Run `pi -r` to browse and select a past session |

The **right-click context menu** in the Explorer and editor also exposes "Run Pi Coding Agent with Current File".

A **status bar button** (`$(terminal) Pi`) in the bottom-left launches the agent directly.

## Settings

Configure via `File > Preferences > Settings` (search "Pi Coding Agent"):

| Setting | Type | Default | Description |
|---|---|---|---|
| `piCodingAgent.defaultArgs` | string | `""` | Extra CLI flags added to every `pi` invocation, e.g. `--model openai/gpt-4o` |
| `piCodingAgent.reuseTerminal` | boolean | `true` | Reuse the existing Pi terminal; set to `false` to always open a fresh one |
| `piCodingAgent.showStatusBar` | boolean | `true` | Show or hide the status bar button |

### Example `settings.json`

```json
{
  "piCodingAgent.defaultArgs": "--model anthropic/claude-sonnet-4-5 --thinking low",
  "piCodingAgent.reuseTerminal": true,
  "piCodingAgent.showStatusBar": true
}
```

## Building from source

```sh
npm install
npm run compile
```

## Packaging

```sh
npm run package
# Produces: pi-coding-agent-0.1.0.vsix
```

Install locally:

```sh
code --install-extension pi-coding-agent-0.1.0.vsix
```
