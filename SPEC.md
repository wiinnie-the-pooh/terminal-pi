# Pi Coding Agent VS Code Extension -- Functional Specification

This document describes the purpose, requirements, and design rationale of the
`pi-coding-agent` VS Code extension. A coding agent reading this file should be
able to understand the goals well enough to produce a correct implementation plan
and reproduce (or improve upon) the current functionality from scratch.

For the build/test/publish workflow see AGENTS.md.
For usage instructions see README.md.

## 1. Purpose

The `pi` command-line tool (pi-coding-agent) is an AI coding agent that runs in
a terminal. Developers already working in VS Code should be able to launch and
interact with `pi` without leaving the editor or opening a separate terminal
application.

This extension is a thin launcher: it does not embed `pi` logic, does not
communicate with the `pi` process over a protocol, and does not parse its output.
It only:

  1. Constructs the correct `pi` shell command for the user's current context.
  2. Opens a VS Code integrated terminal and sends that command to it.
  3. Provides status bar and Command Palette entry points so the launch requires
     minimal user action.

Everything after the command is sent -- the interactive session, model selection,
tool calls, output -- happens inside the terminal and is owned by `pi` itself.

## 2. The `pi` CLI

`pi` is assumed to be installed and available on the system PATH. The extension
does not install it, update it, or verify its version.

### 2.1 Invocation syntax

```
pi [options] [@files...] [messages...]
```

### 2.2 Modes relevant to this extension

| Mode            | Flag(s)        | Behaviour                                              |
|-----------------|---------------|--------------------------------------------------------|
| Interactive     | (default)     | Opens a full terminal session; user types follow-ups   |
| Print           | -p / --print  | Runs once with an inline message, then exits           |
| Continue        | -c            | Resumes the most recent saved session                  |
| Browse sessions | -r            | Shows an interactive session picker                    |

### 2.3 File context

`pi` accepts file or directory paths prefixed with `@`:

```
pi @src/main.ts "Explain this file"
pi @/path/to/workspace "Review the project"
```

The extension uses this to pass the active editor file or workspace root as
context without requiring the user to type the path manually.

### 2.4 Other notable flags (not currently used by the extension)

- `--model <provider/id>` -- select AI model
- `--thinking <level>` -- reasoning depth (off, low, medium, high, xhigh)
- `--tools <list>` -- restrict built-in tools
- `--no-session` -- ephemeral mode (no session saved)
- `--mode rpc` -- machine-readable JSON protocol over stdin/stdout

These are exposed indirectly via the `piCodingAgent.defaultArgs` setting, which
is appended verbatim to every command the extension sends.

## 3. Functional Requirements

### 3.1 Commands

The extension contributes five commands, all in the "Pi" category and all
accessible via the Command Palette.

#### FR-CMD-1  Run Pi Coding Agent

- Command ID: `piCodingAgent.run`
- Sends `pi [defaultArgs]` to the managed terminal.
- No file context is passed. This is the "clean session" entry point.

#### FR-CMD-2  Run Pi Coding Agent with Current File

- Command ID: `piCodingAgent.runWithFile`
- Resolves a file path (see FR-CTX-1) and sends `pi [defaultArgs] @"<path>"`.
- If no path can be resolved, shows a VS Code warning notification and falls
    back to launching `pi` without a file argument (does not silently do nothing).
- Available in the Explorer right-click context menu and the editor
    right-click context menu.

#### FR-CMD-3  Run Pi Coding Agent (Print Mode)

- Command ID: `piCodingAgent.runPrintMode`
- Shows a VS Code input box prompting for a message.
- If the user dismisses the input box (Escape), does nothing.
- Sends `pi -p [defaultArgs] [@"<path>"] "<message>"` where `<path>` is
    resolved the same way as FR-CMD-2.

#### FR-CMD-4  Continue Most Recent Pi Session

- Command ID: `piCodingAgent.continueSession`
- Sends `pi -c [defaultArgs]` to the managed terminal.

#### FR-CMD-5  Browse Pi Sessions

- Command ID: `piCodingAgent.browseSessions`
- Sends `pi -r [defaultArgs]` to the managed terminal.

### 3.2 File path resolution (FR-CTX-1)

When a command needs context, the extension resolves a path in priority order:

  1. The `fsPath` of the active editor's document, if its URI scheme is `file`
     (i.e. a real on-disk file, not an untitled buffer or virtual document).
  2. The `fsPath` of the first workspace folder root.
  3. `undefined` -- no path argument is added to the command.

### 3.3 Terminal management

#### FR-TERM-1  Named terminal

The extension creates terminals with the fixed name "Pi Coding Agent".

#### FR-TERM-2  Fresh terminal per invocation

Each Pi command creates a new terminal. The extension does not attempt to reuse
existing terminals or track terminal liveness across invocations.

#### FR-TERM-3  Terminal visibility

Terminals are shown when a command runs (`terminal.show(false)`). The `false`
argument means the terminal panel opens but editor focus is not stolen.

#### FR-TERM-4  Command delivery

Commands are sent via `terminal.sendText(cmd, true)`. The `true` argument appends
a newline, causing the shell to execute the command immediately.

### 3.4 Status bar button

#### FR-STATUS-1  Button

A status bar item is created during activation:

- Alignment: left
- Priority: 100 (places it left of the language mode indicator)
- Text: `$(terminal) Pi` (uses the built-in `terminal` codicon)
- Tooltip: "Run Pi Coding Agent"
- Click action: triggers `piCodingAgent.run`

### 3.5 Settings

All settings live under the `piCodingAgent` namespace.

| Key                         | Type    | Default | Description                                              |
|-----------------------------|---------|---------|----------------------------------------------------------|
| `piCodingAgent.defaultArgs` | string  | ""      | Raw CLI flags appended to every `pi` invocation          |

`defaultArgs` is inserted between the mode flag (e.g. `-p`, `-c`) and the
`@filepath` argument so the final command shape is always:

```
pi [mode-flag] [defaultArgs] [@"filepath"] ["message"]
```

### 3.6 Activation

The extension uses `"activationEvents": ["onStartupFinished"]`. This causes VS
Code to activate the extension once it has fully loaded, ensuring the status bar
button appears immediately rather than waiting for the user to invoke a command.

### 3.7 Disposal / deactivation

All disposables (commands, event listeners, terminal manager, status bar item)
are added to `context.subscriptions`. VS Code calls `dispose()` on each when
the extension deactivates. The exported `deactivate()` function is a no-op.

## 4. Non-functional Requirements

### NFR-1  No runtime dependencies

The compiled extension must have zero npm runtime dependencies. Only the VS Code
API (provided by the host at runtime) is used. All `devDependencies` (`@types/vscode`,
`typescript`, `@vscode/vsce`) are build-only.

### NFR-2  TypeScript strict mode

The source must compile cleanly under `"strict": true`, `"noImplicitReturns": true`,
and `"noFallthroughCasesInSwitch": true`.

### NFR-3  CommonJS output

The extension host uses Node.js CommonJS module loading. Output must target
`"module": "commonjs"`. ESM is not supported in VS Code extensions as of VS Code 1.94.

### NFR-4  Minimum VS Code version

Target `"vscode": "^1.94.0"`. All APIs used (Terminal, StatusBarItem, codicons,
`terminal.exitStatus`, `accessibilityInformation`) are stable in this version.

### NFR-5  Path quoting

File paths are always wrapped in double quotes in the generated command string to
handle paths containing spaces on all platforms.

## 5. Architecture

### 5.1 Module responsibilities

```
src/config.ts     -- reads and watches piCodingAgent.* workspace settings
src/terminal.ts   -- owns terminal lifecycle; builds command strings
src/extension.ts  -- wires everything together; registers commands and status bar
```

Each file has one clear responsibility. `extension.ts` calls into `config.ts`
and `terminal.ts` but those two modules do not depend on each other.

### 5.2 Command string format

`buildCommand(defaultArgs, modeFlag, filePath?, message?)` in `terminal.ts`
assembles the command:

```
pi [modeFlag] [defaultArgs] [@"filePath"] ["message"]
```

Parts with no value are omitted. The modeFlag for interactive mode is an empty
string (produces just `pi`).

### 5.3 Terminal creation pattern

`PiTerminalManager` creates a fresh VS Code terminal for each command invocation.
It does not cache terminal instances or listen for terminal close events.

## 6. Out of scope

The following are explicitly not part of this extension's responsibilities:

- Installing or updating the `pi` binary.
- Verifying that `pi` is on the PATH before running (failure surfaces naturally
    in the terminal as a "command not found" error).
- Parsing or displaying `pi` output inside the VS Code UI (e.g. webview panels,
    tree views, inline decorations).
- Communicating with `pi` over the RPC protocol (`--mode rpc`).
- Managing `pi` sessions, history, or configuration files.
- Keybinding assignments (users set these in their own `keybindings.json`).
- Automated tests (the VS Code extension test framework requires a live host
    process; the logic is thin enough that manual testing is the primary strategy).

## 7. Potential improvements for a reimplementation

These are areas where a reimplementation with a more modern approach could do better:

- **RPC / webview integration** -- `pi --mode rpc` exposes a JSON-line protocol
    over stdin/stdout. A future version could spawn `pi` as a child process, speak
    RPC, and render output in a VS Code webview or sidebar panel, enabling richer
    UI (streaming output, clickable file links, diff views).

- **Bundling** -- If runtime dependencies are ever added, switching the compile
    step to esbuild or webpack reduces the packaged `.vsix` size and startup time.
    The current setup (plain `tsc`) is intentionally minimal.

- **Model / session picker** -- A QuickPick UI could let users choose a model
    or resume a past session without memorising CLI flags.

- **Configuration validation** -- `defaultArgs` is currently passed verbatim.
    Parsing it and offering completion/validation in settings would improve UX.

- **Automated integration tests** -- `@vscode/test-electron` runs a real VS Code
    host; extracting `buildCommand` as a pure function would make unit testing
    straightforward without a live host.
