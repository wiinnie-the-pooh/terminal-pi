# Pi Coding Agent Hotkeys

A standalone Pi extension that adds a **Pi Coding Agent / VS Code-friendly shortcut layer** on top of Pi.

It does **not** rewrite Pi's built-in keybindings file and it does **not** use a separate `PI_CODING_AGENT_DIR`.
Instead, it registers alternate shortcuts through the Pi extension API and lets you switch that layer on or off per session.

## Slash commands

- `/hotkeys-piagent` - enable the Pi Coding Agent shortcut layer for the current session
- `/hotkeys-original` - disable the Pi Coding Agent shortcut layer and leave only Pi's built-in shortcuts active

The current mode is also shown in the footer as a status item.

## Pi Coding Agent shortcut layer

When `/hotkeys-piagent` is active, this extension adds these alternate shortcuts:

- `Alt+C` -> Clear editor
- `Alt+T` -> Cycle thinking level
- `Alt+P` -> Cycle to next model
- `Shift+Alt+P` -> Cycle to previous model
- `Alt+O` -> Toggle tool output
- `Ctrl+Shift+Enter` -> Queue follow-up message

These shortcuts are meant to be easier to use inside the VS Code integrated terminal than Pi's default terminal-first bindings.

## Important limitation

This extension uses **only** Pi's extension shortcut API.
That means it adds alternate shortcuts, but it does not remove Pi's built-in defaults.
When `/hotkeys-original` is active, the extension's alternate shortcuts become inert and Pi falls back to its normal built-in behavior.

Also note that Pi extension shortcuts are best suited to the main input editor. Picker-specific UIs and some built-in internals may still keep their normal Pi behavior.

In particular, Pi's native `Ctrl+L` does not work by submitting `/model` text. It opens an internal model-selector widget via Pi's built-in `app.model.select` action. Extensions can register their own shortcuts, but they do not have a public API to invoke that built-in widget directly, and sending `/model` from an extension does not route through Pi's built-in interactive command handler. Because of that, this extension intentionally does **not** remap the model selector anymore.

## Run it once

From this folder:

```sh
pi -e ./pi-agent-hotkeys.js
```

## Run it automatically with Pi

You have a few options.

### Option 1: Auto-discovery by folder placement

Copy this folder under Pi's global extensions directory:

- Windows: `C:\Users\<you>\.pi\agent\extensions\pi-agent-hotkeys`
- macOS/Linux: `~/.pi/agent/extensions/pi-agent-hotkeys`

Pi discovers extension folders that contain either an `index.js` / `index.ts` entrypoint or a `package.json` with a `pi.extensions` manifest.
This package uses the manifest approach:

```json
{
  "pi": {
    "extensions": ["./pi-agent-hotkeys.js"]
  }
}
```

After copying it there, start Pi normally.

### Option 2: Load it from Pi settings

Add the folder path to `~/.pi/agent/settings.json`:

```json
{
  "extensions": [
    "C:/path/to/pi-agent-hotkeys"
  ]
}
```

Then start Pi normally.

### Option 3: Let Pi Coding Agent launch it explicitly

Pi Coding Agent itself can also attach this extension only for docked sessions. If you want to do that manually, launch Pi with:

```sh
--extension <path-to-pi-agent-hotkeys>/pi-agent-hotkeys.js
```

That keeps standalone Pi untouched while giving Pi Coding Agent sessions the alternate shortcut layer.

## Extract into a separate repo

This folder is intentionally self-contained and flat:

- `package.json`
- `pi-agent-hotkeys.js`
- `hotkeys.js`
- `README.md`

You can copy it into a new repository and iterate there without depending on the rest of this repo.
