# Pi Bay Hotkeys

A standalone Pi extension that adds a **VS Code-friendly hotkeys layer** on top of Pi.

It does **not** rewrite Pi's built-in keybindings file and it does **not** use a separate `PI_CODING_AGENT_DIR`.
Instead, it registers alternate shortcuts through the Pi extension API and lets you switch that layer on or off per session.

## Slash commands

- `/hotkeys-vs-code` - enable the VS Code-compatible shortcut layer for the current session
- `/hotkeys-original` - disable the VS Code-compatible shortcut layer and leave only Pi's built-in shortcuts active

The current mode is also shown in the footer as a status item.

## VS Code-compatible shortcut layer

When `/hotkeys-vs-code` is active, this extension adds these alternate shortcuts:

- `Alt+C` -> Clear editor
- `Alt+T` -> Cycle thinking level
- `Alt+P` -> Cycle to next model
- `Shift+Alt+P` -> Cycle to previous model
- `Alt+O` -> Toggle tool output
- `Ctrl+Shift+Enter` -> Queue follow-up message

These shortcuts are meant to be easier to use inside the VS Code integrated terminal than Pi's default terminal-first bindings.

## Important limitation

This extension can only **add** shortcuts via Pi's extension API -- it cannot remove or override Pi's built-in defaults. When `/hotkeys-original` is active, the alternate shortcuts are disabled and Pi behaves normally.

Some shortcuts cannot be replicated at all. `Ctrl+L` opens Pi's built-in model-selector widget via `app.model.select`, which extensions cannot invoke directly. Sending `/model` as text doesn't work either -- it bypasses the widget. This extension therefore does **not** remap `Ctrl+L`.

## Run it once

From this folder:

```sh
pi -e ./vs-code-hotkeys.js
```

## Run it automatically with Pi

### Auto-discovery (recommended)

Copy this folder under Pi's global extensions directory:

- Windows: `C:\Users\<you>\.pi\agent\extensions\vs-code-hotkeys`
- macOS/Linux: `~/.pi/agent/extensions/vs-code-hotkeys`

Pi discovers extension folders that contain either an `index.js` / `index.ts` entrypoint or a `package.json` with a `pi.extensions` manifest.
This package uses the manifest approach:

```json
{
  "pi": {
    "extensions": ["./vs-code-hotkeys.js"]
  }
}
```

After copying it there, start Pi normally.

### Via Pi settings

Add the folder path to `~/.pi/agent/settings.json`:

```json
{
  "extensions": [
    "C:/path/to/vs-code-hotkeys"
  ]
}
```

Then start Pi normally.
