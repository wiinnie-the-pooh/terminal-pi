# Pi Dock VS Code Extension -- Functional Specification

This document describes the intended behavior of the `pi-dock` VS Code extension as it exists today and as the current resource-action fixes should behave.

It is intentionally focused on the extension's real scope. Obsolete requirements from earlier iterations have been removed.

For build, packaging, publishing, and contributor workflow see `AGENTS.md`.
For human verification and manual smoke testing see `TESTING.md`.
For user-facing usage examples see `README.md`.

## 1. Purpose

`pi-dock` makes the `pi` CLI feel native inside VS Code.

The extension is a thin launcher. It does not embed Pi, parse Pi output, or speak a protocol to Pi. It only:

1. determines which Pi command should be launched for the current user action
2. creates a fresh VS Code terminal configured for Pi
3. starts Pi directly in that terminal

Everything after launch remains Pi's responsibility.

## 2. Current Scope

The extension currently provides:

- a status-bar launcher for a fresh interactive Pi session
- four resource actions:
  - `Run Pi with Skill...`
  - `Run Pi with Template...`
  - `Run Pi with Extension...`
  - `Run Pi with Prompt...`
- Explorer context-menu entry points
- Editor / Current File entry points
- Command Palette entry points
- editor environment configuration (`EDITOR` / `VISUAL`) for Pi's external-editor flow
- a Python virtual-environment activation guard for clean Pi terminals

The extension does **not** currently specify or require:

- print mode commands
- browse-session commands
- a target-file-plus-resource workflow for the resource actions
- a pasted-path workflow for the resource actions

## 3. Terms

### 3.1 Invocation source

The UI surface that started the action:

- **Explorer View**
- **Command Palette**
- **Editor / Current File**

### 3.2 Resource mode

The command family being invoked:

- **Skill**
- **Template**
- **Extension**
- **Prompt**

### 3.3 Resource file

The file that directly backs a resource action.

Examples:

- `C:\repo\.pi\skills\review\SKILL.md`
- `C:\repo\.pi\prompts\review.md`
- `C:\repo\.pi\extensions\helper.ts`

### 3.4 Eligible selection

A selection is **eligible** for a resource command only if **all selected files** satisfy that command's criteria.

### 3.5 Ineligible selection

A selection is **ineligible** if any of the following is true:

- the selection is empty
- any selected item is a folder
- any selected item is not file-backed
- any selected item fails the command's file-type criteria
- the selection mixes files from different resource modes

### 3.6 Resource normalization

The conversion from the selected or picked resource file to the Pi CLI argument actually passed to Pi.

Only **Skill** resources are normalized:

- selected file: `...\some-skill\SKILL.md`
- Pi flag value: `...\some-skill`

Template and Extension resources are passed through unchanged.

## 4. Relevant Pi CLI Surface

Pi supports many flags, but the extension relies on only a small subset here.

### 4.1 Interactive launch

```text
pi [defaultArgs...]
```

This is used by the status-bar launcher.

### 4.2 Session continuity

```text
pi --session-dir <dir>   scope all session I/O to a specific directory
pi --continue            resume the most recent session in the current session-dir
```

The extension always passes `--session-dir <unique-dir>` so each Pi terminal writes its session to an isolated directory. On restart, `--continue --session-dir <stored-dir>` resumes the session in that directory.

### 4.2 Resource actions

```text
pi [defaultArgs...] --skill <dir> [--skill <dir> ...]
pi [defaultArgs...] --prompt-template <file> [--prompt-template <file> ...]
pi [defaultArgs...] --extension <file> [--extension <file> ...]
pi [defaultArgs...] @<file> [extraContext]
```

For these resource actions:

- Skill resources come from `SKILL.md` files but are passed as parent directories
- Template resources are `.md` files excluding `SKILL.md`
- Extension resources are `.ts` files only

### 4.3 Default arguments

`piDock.defaultArgs` is split on whitespace and prepended before resource-specific flags.

Example:

```text
pi --thinking low --prompt-template C:\repo\.pi\prompts\review.md
```

## 5. Functional Requirements

### 5.1 Commands

The extension contributes four user-facing commands in the `Pi Dock` category.

#### FR-CMD-1  Run Pi Dock

- Command ID: `piDock.run`
- Behavior: launch an interactive Pi session with configured default arguments
- Pi shape: `pi [defaultArgs...]`
- Surface: Command Palette and status bar

#### FR-CMD-2  Run Pi with Skill

- Command ID: `piDock.runWithSkill`
- Behavior: launch Pi with one or more Skill resources
- Pi shape: `pi [defaultArgs...] --skill <dir> [...]`

#### FR-CMD-3  Run Pi with Template

- Command ID: `piDock.runWithTemplate`
- Behavior: launch Pi with one or more Template resources
- Pi shape: `pi [defaultArgs...] --prompt-template <file> [...]`

#### FR-CMD-4  Run Pi with Extension

- Command ID: `piDock.runWithExtension`
- Behavior: launch Pi with one or more Extension resources
- Pi shape: `pi [defaultArgs...] --extension <file> [...]`

#### FR-CMD-5  Run Pi with Prompt

- Command ID: `piDock.runWithPrompt`
- Behavior: launch Pi with a file as a prompt reference
- Pi shape: `pi [defaultArgs...] @<file> [extraContext]`
- `extraContext` is the trimmed value of `piDock.promptExtraContext`; omitted when empty

### 5.2 Resource classification rules

#### FR-RES-1  Skill criteria

A file is a Skill resource iff:

- it is file-backed
- its basename is exactly `SKILL.md`

#### FR-RES-2  Template criteria

A file is a Template resource iff:

- it is file-backed
- its extension is `.md`
- its basename is **not** `SKILL.md`

#### FR-RES-3  Extension criteria

A file is an Extension resource iff:

- it is file-backed
- its extension is `.ts`

#### FR-RES-5  Prompt criteria

A file is eligible for the Prompt command iff:

- it is file-backed
- its extension is not a known binary type (as determined by `isEligibleFile`)

Files without an extension (e.g. `Makefile`, `Dockerfile`) are eligible.

#### FR-RES-4  No partial filtering

Resource actions must not silently ignore mismatched files.

If the user's current Explorer selection contains a mix that does not fully satisfy the invoked mode, the command is ineligible and must not launch Pi using only a matching subset.

### 5.3 Invocation source workflows

#### FR-SRC-1  Explorer View

Explorer uses the **explicitly selected files** as the resource input.

Behavior:

1. read the current Explorer selection
2. validate that the entire selection is eligible for the invoked mode
3. if eligible, use those selected files directly
4. if ineligible, warn and stop
5. normalize resources as needed
6. launch Pi

Explorer must **not** open an additional resource picker for these actions.

#### FR-SRC-2  Editor / Current File

Editor / Current File uses the **active file-backed editor document** as the resource input.

Behavior:

1. resolve the active editor document URI
2. validate that the current file is eligible for the invoked mode
3. if eligible, use that file directly
4. if ineligible, warn and stop
5. normalize resources as needed
6. launch Pi

Editor / Current File must **not** open an additional resource picker for these actions.

#### FR-SRC-3  Command Palette

Command Palette has no implicit current-file behavior for these resource actions.

Behavior:

1. discover workspace files matching the invoked mode
2. show a mode-filtered Quick Pick of those matching files
3. allow the user to choose one or more matching files
4. if the picker is cancelled, do nothing
5. if no matching files exist, warn and stop
6. normalize resources as needed
7. launch Pi

Command Palette must **not**:

- auto-use the active editor file
- show a generic all-files workspace picker
- ask the user to paste a file path for these resource actions

#### FR-SRC-4  Command Palette -- Prompt

The Prompt command uses a native File Open dialog instead of a Quick Pick.

Behavior:

1. show a File Open dialog (single file, no folder selection)
2. if the dialog is cancelled, do nothing
3. validate the selected file with `isEligibleFile`
4. if ineligible, warn and stop
5. launch Pi

### 5.4 Eligibility semantics

#### FR-ELIG-1  Explorer selection rule

For Explorer, a command is eligible only if the selection is non-empty and **every selected file** satisfies that command's criteria.

Examples:

- selected `SKILL.md` -> Skill eligible
- selected `review.md` -> Template eligible
- selected `helper.ts` -> Extension eligible
- selected `SKILL.md` + `review.md` -> all resource commands ineligible
- selected `review.md` + `helper.ts` -> all resource commands ineligible
- selected folder + `review.md` -> all resource commands ineligible

#### FR-ELIG-2  Editor rule

For Editor / Current File, a command is eligible only if the current file satisfies that command's criteria.

#### FR-ELIG-3  Command Palette rule

For Command Palette, eligibility is enforced by discovery and filtering:

- Skill picker shows only `SKILL.md`
- Template picker shows only `.md` files excluding `SKILL.md`
- Extension picker shows only `.ts` files

#### FR-ELIG-4  Handler validation is authoritative

VS Code menu `when` clauses may not be able to fully encode the all-selected-files rule for multi-selection.

Therefore:

- menu visibility should approximate eligibility where possible
- command handlers must revalidate eligibility at runtime
- handlers must never partially process an ineligible selection

### 5.5 Resource normalization and argument assembly

#### FR-ARGS-1  Skill normalization

Selected Skill files are converted from `...\SKILL.md` to their parent directories before launch.

Example:

```text
C:\repo\.pi\skills\review\SKILL.md
->
--skill C:\repo\.pi\skills\review
```

#### FR-ARGS-2  Template pass-through

Selected Template files are passed directly as repeated `--prompt-template <file>` flags.

#### FR-ARGS-3  Extension pass-through

Selected Extension files are passed directly as repeated `--extension <file>` flags.

#### FR-ARGS-5  Prompt pass-through

The selected file is passed as `@<file>` (no flag prefix, no deduplication needed -- only one file).

If `piDock.promptExtraContext` is non-empty after trimming, its trimmed value is appended as an additional argument after the `@<file>` argument.

#### FR-ARGS-4  Ordering and deduplication

Argument order must be deterministic:

1. `defaultArgs`
2. repeated mode-specific resource flags in first-seen order

Duplicate normalized resource values must be removed while preserving first-seen order.

### 5.6 Terminal management

#### FR-TERM-1  Named terminal

Pi terminals use the fixed name `Pi Dock`.

#### FR-TERM-2  Fresh terminal per invocation

Each command invocation creates a new terminal.

#### FR-TERM-3  Direct Pi launch

Pi is launched as the terminal process via `shellPath` / `shellArgs`, not by opening a shell and calling `sendText`.

#### FR-TERM-4  Terminal placement and visibility

The terminal is shown beside the editor and shown without stealing focus.

#### FR-TERM-5  Python activation guard

When enabled, Pi Dock temporarily disables Python terminal environment activation during Pi terminal creation so venv activation commands are not injected into Pi.

#### FR-TERM-6  Editor environment

Pi terminals export `EDITOR` / `VISUAL` so Pi's external-editor flow works in the host editor when possible.

### 5.7 Settings

All settings live under the `piDock` namespace.

| Key | Type | Default | Meaning |
|---|---|---:|---|
| `piDock.defaultArgs` | string | `""` | Extra CLI args prepended to every Pi launch |
| `piDock.editorCommand` | string | `""` | Explicit `EDITOR` / `VISUAL` override; empty means auto-detect |
| `piDock.promptExtraContext` | string | `""` | Extra context argument appended after the `@<file>` reference in Prompt invocations; omitted when empty |
| `piDock.virtualEnvironmentOverride` | boolean | `true` | Temporarily suppress Python terminal activation during Pi launch |
| `piDock.virtualEnvironmentDrainMs` | number | `150` | Delay before restoring Python activation setting |
| `piDock.restoreSessionsOnStartup` | boolean | `true` | Reopen previous Pi sessions when VS Code starts |

### 5.8 Activation and deactivation

- activation event: `onStartupFinished`
- status-bar launcher appears after activation
- disposables are owned by `context.subscriptions`
- `deactivate()` remains a no-op
- on startup: if `restoreSessionsOnStartup` is true, reopen each persisted session via `pi --continue --session-dir <stored-dir>`

### 5.9 Session persistence

Each Pi terminal is launched with `--session-dir <unique-dir>` injected into its `shellArgs`. This scopes the session to an isolated directory the extension controls.

- The session dir path and piArgs are stored in `workspaceState` under key `piDock.sessions` as a `PersistedSession[]`.
- When a Pi terminal is closed, its record is removed from `workspaceState`.
- When VS Code restarts and `restoreSessionsOnStartup` is true, each stored session dir is reopened with `pi --continue --session-dir <dir>`, resuming the previous conversation.
- Session dirs live at `~/.pi/agent/sessions/vscode/<uuid>/`, separate from pi's own default session directories.

## 6. Eligible and Ineligible User Scenarios

These examples are normative.

### 6.1 Explorer View scenarios

| Selection | Skill | Template | Extension | Prompt |
|---|---:|---:|---:|---:|
| `SKILL.md` | eligible | ineligible | ineligible | eligible |
| `review.md` | ineligible | eligible | ineligible | eligible |
| `helper.ts` | ineligible | ineligible | eligible | eligible |
| `notes.txt` | ineligible | ineligible | ineligible | eligible |
| `image.png` | ineligible | ineligible | ineligible | ineligible |
| `SKILL.md` + `another SKILL.md` | eligible | ineligible | ineligible | eligible |
| `review.md` + `other.md` | ineligible | eligible | ineligible | eligible |
| `helper.ts` + `other.ts` | ineligible | ineligible | eligible | eligible |
| `SKILL.md` + `review.md` | ineligible | ineligible | ineligible | eligible |
| `review.md` + `helper.ts` | ineligible | ineligible | ineligible | eligible |
| `review.md` + `image.png` | ineligible | ineligible | ineligible | ineligible |
| `folder` | ineligible | ineligible | ineligible | ineligible |
| `review.md` + `folder` | ineligible | ineligible | ineligible | ineligible |

### 6.2 Editor / Current File scenarios

| Current file | Skill | Template | Extension | Prompt |
|---|---:|---:|---:|---:|
| `SKILL.md` | eligible | ineligible | ineligible | eligible |
| `review.md` | ineligible | eligible | ineligible | eligible |
| `helper.ts` | ineligible | ineligible | eligible | eligible |
| `notes.txt` | ineligible | ineligible | ineligible | eligible |
| `image.png` | ineligible | ineligible | ineligible | ineligible |
| untitled / non-file-backed document | ineligible | ineligible | ineligible | ineligible |

### 6.3 Command Palette scenarios

| Invoked command | UI shown |
|---|---|
| `Run Pi with Skill...` | Quick Pick of workspace `SKILL.md` files |
| `Run Pi with Template...` | Quick Pick of workspace `.md` files excluding `SKILL.md` |
| `Run Pi with Extension...` | Quick Pick of workspace `.ts` files |
| `Run Pi with Prompt...` | File Open dialog (single file) |

If no matching workspace files exist for the Skill / Template / Extension modes, the command must warn and stop.

## 7. Architecture

### 7.1 Module responsibilities

```text
src/config.ts          -- read and sanitize piDock settings
src/extension.ts       -- register commands and route by invocation source
src/fileSelection.ts   -- pure resource-file matching / eligibility helpers
src/resourcePicker.ts  -- Command Palette resource discovery and Quick Pick logic
src/piResourceArgs.ts  -- deterministic Pi arg assembly for resource actions
src/sessionStore.ts    -- workspaceState CRUD for persisted session dirs
src/terminal.ts        -- create Pi terminals, inject --session-dir, restore sessions
src/piResolver.ts      -- resolve the best shellPath / prefixArgs for launching Pi
src/terminalEnv.ts     -- assemble EDITOR / VISUAL environment variables
src/pythonActivationGuard.ts -- suppress Python activation during terminal creation
```

### 7.2 Responsibility boundaries

- `extension.ts` owns source-specific UX flow
- `fileSelection.ts` owns pure file classification and selection eligibility logic
- `resourcePicker.ts` owns only Command Palette discovery/picking
- `terminal.ts` owns terminal creation and Pi launch
- resource actions should not reintroduce a separate target-file layer unless a future spec explicitly adds one

## 8. Non-functional Requirements

### NFR-1  No npm runtime dependencies

The extension should continue shipping with no runtime npm dependencies.

### NFR-2  Strict TypeScript

The source must compile cleanly under the repository's strict TypeScript configuration.

### NFR-3  CommonJS output

The compiled output targets VS Code's CommonJS extension host.

### NFR-4  Deterministic behavior

For the same invocation source, mode, and selected resources, the extension must build the same Pi argument list every time.

## 9. Out of Scope

The following are intentionally out of scope:

- installing or updating Pi
- validating Pi's behavior after launch
- parsing Pi output
- embedding Pi output into custom VS Code UI (WebviewPanel / RPC mode)
- a target-file-plus-resource model for these resource actions
- generic all-files picking for these resource actions
- partially processing mixed Explorer selections
