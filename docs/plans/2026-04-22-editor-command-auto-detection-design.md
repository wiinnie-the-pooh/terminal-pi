# Editor Command Auto-Detection Design

Date: 2026-04-22
Project: Pi Dock VS Code extension
Topic: Adapt `Ctrl+G` external-editor behavior to the current VS Code variant automatically

## Goal

Make the external-editor flow used by `Ctrl+G` choose a sensible default editor command automatically based on the host editor variant:

- VS Code Stable -> `code --wait`
- VS Code Insiders -> `code-insiders --wait`
- Cursor -> `cursor --wait`

This should be a **silent smarter default**. Users who explicitly configure `piDock.editorCommand` must keep full control.

## Current behavior

Today the extension effectively defaults to `code --wait`:

- `src/terminalEnv.ts` uses `DEFAULT_PI_EDITOR = 'code --wait'`
- `src/config.ts` defaults `piDock.editorCommand` to `code --wait`
- Pi terminals always export `EDITOR` and `VISUAL`

`Ctrl+G` itself only sends the bell/control sequence. The actual editor-opening behavior comes from the `EDITOR` / `VISUAL` values in the Pi terminal environment.

## Design decisions

### 1) Explicit setting always wins

If the user sets `piDock.editorCommand`, use that exact value.

This preserves backward compatibility for users who intentionally want a specific editor command such as:

- `code-insiders --wait`
- `cursor --wait`
- `nvim`
- `code --reuse-window --wait`

### 2) Silent smarter default when no explicit setting exists

When `piDock.editorCommand` is not explicitly set, auto-detect the editor product and choose the matching CLI command.

Target mappings:

- `vscode` -> `code --wait`
- `vscode-insiders` -> `code-insiders --wait`
- `cursor` -> `cursor --wait`

### 3) Prefer official VS Code API for identity

Use official product identity signals from the VS Code API as the primary source of truth:

- `vscode.env.uriScheme` (primary)
- `vscode.env.appName` (fallback / hint)
- `vscode.env.appHost` (desktop vs web guard)
- `vscode.env.remoteName` only as context, not as product identity

Rationale:

- `uriScheme` is the strongest product-level signal exposed by the API
- `appName` is useful as a fallback but may be more branding-oriented than command-oriented
- undocumented environment variables should not be the main design basis

### 4) Apply to desktop and remote scenarios

The feature should work for:

- local desktop
- desktop with SSH / WSL / dev container / remote extension hosts

Principle: choose defaults based on the **editor product the user is actually using**, while checking CLI availability in the environment where Pi is launched.

### 5) Verify CLI availability before injecting it

For known products, do not blindly inject the mapped command.

Instead:

1. detect the host product
2. map to the candidate CLI (`code`, `code-insiders`, `cursor`)
3. verify the binary is available on PATH
4. only then export `EDITOR` / `VISUAL`

This avoids cases where the host product is recognizable but its shell command is unavailable.

### 6) Graceful fallback strategy

If no explicit setting exists and either:

- the host product is unknown, or
- the mapped CLI is not on PATH,

then fallback in this order:

1. preserve inherited `VISUAL` / `EDITOR` if they exist
2. otherwise leave `EDITOR` / `VISUAL` unset
3. let `pi-coding-agent` handle its own fallback behavior

This intentionally avoids forcing `code --wait` for unknown variants.

## Proposed resolver model

Introduce a small resolver responsible for deciding what editor env override, if any, should be applied.

Possible outcomes:

- **explicit command**: from `piDock.editorCommand`
- **detected command**: from known host + PATH-verified CLI
- **no override**: preserve inherited env or inject nothing

This resolver should be kept separate from terminal creation so that behavior is easy to test and reason about.

## Proposed precedence

1. explicit `piDock.editorCommand`
2. auto-detected and PATH-verified host-specific CLI
3. inherited `VISUAL` / `EDITOR`
4. no override; rely on `pi-coding-agent`

## API / environment notes

### Official API signals confirmed available

The VS Code API exposes:

- `vscode.env.appName`
- `vscode.env.appHost`
- `vscode.env.uriScheme`
- `vscode.env.shell`

These support product detection, but there does **not** appear to be an official API that directly returns:

- the correct CLI binary for the current product
- a ready-made `--wait` editor command

Therefore, product detection can be official, but the final CLI mapping remains a maintained convention table in the extension.

### Environment variables

Undocumented environment variables may exist, but they should not be the primary mechanism. They may be useful for diagnostics only if required later.

## Edge cases

- **Unknown VS Code forks**: do not guess a CLI; preserve inherited env or inject nothing
- **Web environments**: likely no shell CLI expectation; decline to inject
- **Remote contexts**: detection may succeed while PATH validation fails; respect the PATH check
- **PATH differences**: the product binary may exist in the UI environment but not where the terminal launches

## Testing strategy

### Unit tests

Add tests for:

- explicit setting wins over everything else
- stable VS Code -> `code --wait`
- Insiders -> `code-insiders --wait`
- Cursor -> `cursor --wait`
- known product but CLI missing -> inherited env / no override
- unknown product + inherited env -> inherited env preserved
- unknown product + no inherited env -> no editor vars injected
- web / unsupported host -> no auto injection

### Manual validation

Verify in:

- VS Code stable
- VS Code Insiders
- Cursor
- at least one remote scenario (SSH / WSL / dev container)

Expected result: `Ctrl+G` opens in the matching editor variant when appropriate, without breaking custom or inherited setups.

## Recommended implementation shape

1. Add a resolver module for default editor command selection
2. Change config handling so the default is no longer a hardcoded `code --wait` string
3. Update terminal env assembly so it can intentionally return:
   - explicit override values
   - inherited values
   - or no editor vars at all
4. Keep documentation clear that explicit configuration still overrides auto-detection

## Summary

This feature appears feasible.

The recommended design is:

- use official VS Code API signals to identify the editor product
- map known products to their conventional CLI binaries
- verify the binary exists on PATH before using it
- preserve inherited `VISUAL` / `EDITOR` when detection is unknown or unusable
- otherwise leave editor vars unset and let `pi-coding-agent` fall back naturally

This yields a quiet, product-aware default without taking control away from users who configure the setting explicitly.
