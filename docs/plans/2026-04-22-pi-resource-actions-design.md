# Pi Resource Actions Design

Date: 2026-04-22
Project: Pi Dock VS Code extension
Topic: Add Pi resource launchers for skills, prompt templates, and extensions

## Goal

Let users launch Pi against selected workspace file targets with one of three resource-specific flows:

- `Pi Dock: Run Pi with Skill...`
- `Pi Dock: Run Pi with Prompt Template...`
- `Pi Dock: Run Pi with Extension...`

The same behavior must be available from:

- Explorer View context actions
- Editor / Current File context actions
- real extension commands exposed in the Command Palette

## Product decisions

### 1) Three separate actions, not a combined wizard

The UI surface should expose three distinct entry points instead of a combined "resource" flow.

Each action handles exactly one Pi flag family:

- Skill action -> `--skill`
- Prompt Template action -> `--prompt-template`
- Extension action -> `--extension`

Although the Pi CLI supports combining these flag families, this extension feature intentionally does not compose mixed resource types in one launch.

### 2) Popup-style interaction only

The workflow should use popup interactions such as Quick Pick.

No manual path typing, no free-form input box for resource paths, and no multi-step wizard that mixes resource types.

### 3) File targets come from Explorer, editor, or direct command fallback

Target files are the files Pi should work on via `@<absolute-path>` arguments.

Resolution rules:

- **Explorer action**: use selected Explorer items, ignore folders, keep only files
- **Editor action**: use the active file from the current editor
- **Direct command invocation**: use the active editor file if available; otherwise prompt the user with a workspace file Quick Pick

If no target file remains after resolution, the launch is cancelled with a warning.

### 4) Same-type multi-select is supported

Within each resource picker, users may select multiple resources of the same type.

That maps to repeated Pi flags:

- `--skill <dir1> --skill <dir2>`
- `--prompt-template <file1> --prompt-template <file2>`
- `--extension <file1> --extension <file2>`

Duplicate normalized resource paths should be removed before launch.

## Resource semantics

The picker UX must match Pi's actual CLI path contracts.

### Skill flow

The picker should show **`SKILL.md` files** directly because that is intuitive for users.

At launch time, each selected `SKILL.md` path is converted to its **parent directory**, and Pi is invoked with:

- `--skill <directory-containing-SKILL.md>`

The extension must never pass the `SKILL.md` file path itself to `--skill`.

### Prompt template flow

The picker should show **specific `.md` files** representing prompt templates.

Each selected file is passed directly as:

- `--prompt-template <absolute-markdown-file>`

### Extension flow

The picker should show **single TypeScript source files**.

Each selected file is passed directly as:

- `--extension <absolute-typescript-file>`

For this feature, extensions are treated as single `.ts` files.

## Argument mapping

Pi invocation should be deterministic and preserve existing Pi Dock behavior.

Recommended argument order:

1. configured `piDock.defaultArgs`
2. target file references as `@<absolute-path>`
3. repeated resource flags for the chosen action

Examples:

```text
pi <defaultArgs...> @C:\repo\a.ts @C:\repo\b.ts --skill C:\repo\.pi\skills\review-skill
pi <defaultArgs...> @C:\repo\a.ts --prompt-template C:\repo\.pi\prompts\review.md
pi <defaultArgs...> @C:\repo\a.ts --extension C:\repo\.pi\extensions\my-tool.ts
```

The extension should continue launching Pi in a fresh `Pi Dock` terminal beside the editor, preserving the existing shell resolution, editor environment handling, and Python activation guard.

## UX flow

### Explorer View actions

Add these actions to Explorer context menus:

- `Run Pi with Skill...`
- `Run Pi with Prompt Template...`
- `Run Pi with Extension...`

Behavior:

1. collect selected Explorer URIs
2. ignore folders
3. if no files remain, warn and stop
4. open a multi-select Quick Pick for the chosen resource type
5. normalize selections into Pi arguments
6. launch a new Pi terminal

### Editor / Current File actions

Add the same three actions to the editor context/menu surface.

Behavior:

1. resolve the active editor file
2. if unavailable or not file-backed, warn and stop
3. open the same resource-type Quick Pick
4. normalize selections into Pi arguments
5. launch a new Pi terminal

### Command Palette commands

Expose three real commands with the same labels and behavior:

- `Pi Dock: Run Pi with Skill...`
- `Pi Dock: Run Pi with Prompt Template...`
- `Pi Dock: Run Pi with Extension...`

Direct command invocation should behave like this:

1. if an active editor file exists, use it
2. otherwise show a workspace file Quick Pick so the user can choose one target file
3. then continue with the same resource picker and launch flow used by Explorer and Editor actions

This makes commands and context actions behaviorally identical apart from how target files are sourced.

## Discovery model

Discovery should stay local, popup-driven, and workspace-oriented.

### Target file discovery for direct command fallback

When a direct command has no active editor file, show a Quick Pick of files from the current workspace and let the user choose the target file.

### Resource discovery

The extension should discover resource candidates from the current workspace in shapes appropriate to each flow:

- skill picker: `SKILL.md` files
- prompt template picker: `.md` template files
- extension picker: `.ts` extension files

Quick Pick items should show a readable label plus workspace-relative path detail so users can distinguish similarly named files.

## Error handling

- cancelling any picker should do nothing
- empty Explorer selection after folder filtering should warn and stop
- missing active editor file should warn and stop unless direct command fallback is available
- no resources found for the chosen type should warn and stop
- invalid normalized selections should warn and stop
- unexpected terminal launch failures should surface as VS Code errors rather than silently failing

## Recommended implementation shape

### `src/extension.ts`

- register the three new commands
- wire the commands into Explorer and editor menus
- route each entry point into shared handlers
- resolve target files from Explorer, editor, or direct command fallback

### New helper modules

Suggested additions:

- `src/fileSelection.ts`
  - normalize Explorer/editor/direct-command file targets
  - ignore folders for Explorer selections
  - prompt for a workspace file when needed
- `src/resourcePicker.ts`
  - discover candidate resources
  - present multi-select Quick Picks per resource type
  - map `SKILL.md` selections to parent directories
- optionally `src/piArgs.ts`
  - centralize deterministic argument assembly and deduplication

### `src/terminal.ts`

Add a method that accepts:

- target file paths
- resource mode (`skill` | `prompt-template` | `extension`)
- normalized resource path list
- existing config values

This method should build the final Pi args and launch the terminal using the existing terminal creation path.

## Testing strategy

### Unit tests

Add tests for:

- filtering Explorer selections to files only
- active editor file resolution
- direct command fallback to workspace file picker when no active file exists
- mapping selected `SKILL.md` files to parent directories
- repeated same-type flag generation
- argument order: default args first, file targets next, resource flags last
- deduplication of repeated normalized resource selections
- empty-input rejection paths

### Manual validation

Extend the manual checklist to cover:

- Explorer: Run Pi with Skill...
- Explorer: Run Pi with Prompt Template...
- Explorer: Run Pi with Extension...
- Editor: Run Pi with Skill...
- Editor: Run Pi with Prompt Template...
- Editor: Run Pi with Extension...
- Explorer mixed file/folder selection ignoring folders correctly
- direct command invocation with active editor file
- direct command invocation without active editor file, falling back to workspace file Quick Pick
- multi-select resource pickers producing repeated same-type flags

## Summary

The feature should add three resource-specific Pi launchers that behave consistently across Explorer, editor, and direct command entry points.

The key design choices are:

- separate actions instead of a combined resource wizard
- popup-style Quick Pick interactions only
- file targets sourced from Explorer selection, active editor, or direct command fallback
- same-type multi-select for skills, prompt templates, and extensions
- `SKILL.md` selected in the UI but parent directory passed to `--skill`
- prompt templates and extensions passed as selected files
- unchanged Pi terminal behavior apart from the new argument assembly
