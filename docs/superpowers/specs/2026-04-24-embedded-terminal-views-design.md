# Embedded Terminal Views Design

**Date:** 2026-04-24
**Status:** Approved

## Goal

Add two new surfaces to Pi Bay that embed a live Pi terminal session using xterm.js and node-pty:

1. **Sidebar view** -- Activity Bar icon opens a panel in the VS Code sidebar
2. **Editor panel** -- a singleton `WebviewPanel` that opens in the editor area

Both surfaces share a single underlying Pi process (singleton session). The existing integrated-terminal commands (`runWithSkill`, `runWithTemplate`, etc.) are unchanged.

---

## Architecture

Three new components, one shared session:

```
PiSession          -- owns the node-pty process; singleton at extension level
PiSidebarProvider  -- WebviewViewProvider; renders sidebar panel
PiPanel            -- singleton WebviewPanel; renders editor-area tab
```

Data flow:

```
keypress in webview  ->  postMessage  ->  extension  ->  PiSession.write()  ->  PTY stdin
PTY stdout  ->  PiSession  ->  broadcast postMessage  ->  all connected webviews  ->  xterm.js render
```

---

## Component: PiSession

File: `src/piSession.ts`

Wraps `node-pty` and acts as the broadcast hub for all connected views.

**Responsibilities:**
- Spawns Pi via `node-pty` using args produced by the existing `buildArgs()` logic (extracted from `PiTerminalManager`)
- Maintains a scrollback buffer (capped at 500 KB of raw PTY output) so views that open or re-open receive a replay of past output; stored as a single concatenated string, trimmed from the front when the cap is exceeded
- Holds a `Set` of active message senders (one per connected webview); views register/deregister as they appear and disappear
- On PTY data: appends to buffer, broadcasts to all senders via `{type: 'data', data: string}`
- On PTY exit: broadcasts `{type: 'exit', code: number}` to all senders
- Exposes `write(data: string)` for input forwarded from any view
- Exposes `resize(cols: number, rows: number)` -- PTY resize; last caller wins
- Lives for the lifetime of the extension (created on first view connect, not destroyed when views close)
- Implements `vscode.Disposable`; kills the PTY on extension deactivation

**Singleton management:**
`PiSession` is instantiated once in `extension.ts` during `activate()` and passed to both `PiSidebarProvider` and `PiPanel`. No static singleton pattern inside the class itself -- the extension owns the lifecycle.

---

## Component: PiSidebarProvider

File: `src/piSidebarProvider.ts`

Implements `vscode.WebviewViewProvider`.

**Registration (package.json):**
```json
"viewsContainers": {
  "activitybar": [{
    "id": "piBay",
    "title": "Pi Bay",
    "icon": "resources/icons/pi-light.svg"
  }]
},
"views": {
  "piBay": [{
    "type": "webview",
    "id": "piBay.session",
    "name": "Pi Bay"
  }]
}
```

**`resolveWebviewView(webviewView)`:**
1. Enables scripts; sets local resource roots to `resources/webview/`
2. Sets `webviewView.webview.html` to the shared terminal HTML template
3. Registers a message handler:
   - `{type: 'input', data}` -> `piSession.write(data)`
   - `{type: 'resize', cols, rows}` -> `piSession.resize(cols, rows)`
4. Registers as a sender with `PiSession`; replays scrollback immediately via `{type: 'scrollback', data}`
5. Deregisters from `PiSession` in `webviewView.onDidDispose`

VS Code enforces exactly one sidebar view instance -- no extra singleton logic needed.

`PiSidebarProvider` is registered with `{webviewOptions: {retainContextWhenHidden: true}}` so the webview survives Activity Bar tab switches without destroying and recreating the xterm.js instance.

---

## Component: PiPanel

File: `src/piPanel.ts`

A class with a static `instance` field enforcing the singleton.

```typescript
class PiPanel {
  private static instance: PiPanel | undefined;

  static createOrReveal(piSession: PiSession, context: vscode.ExtensionContext): void {
    if (PiPanel.instance) {
      PiPanel.instance.panel.reveal();
      return;
    }
    PiPanel.instance = new PiPanel(piSession, context);
  }

  private constructor(piSession: PiSession, context: vscode.ExtensionContext) { ... }
}
```

**Constructor:**
1. Creates `vscode.window.createWebviewPanel(...)` with `retainContextWhenHidden: true`
2. Sets same HTML template as sidebar
3. Registers message handler (same as sidebar: input -> write, resize -> resize)
4. Registers as a sender with `PiSession`; replays scrollback
5. On `panel.onDidDispose`: deregisters from `PiSession`, sets `PiPanel.instance = undefined`

**New command:** `piBay.openPanel` -> `PiPanel.createOrReveal(piSession, context)`

A "pop out" icon button is added to the sidebar view's title bar via `menus["view/title"]` in `package.json`, wired to `piBay.openPanel`.

---

## Webview HTML Template

Generated in TypeScript (not a separate file) so webview-safe URIs can be injected at render time.

**Assets bundled in `resources/webview/`** (copied from node_modules at build time):
- `xterm.js`
- `xterm.css`
- `xterm-addon-fit.js`

**Template responsibilities:**
- Creates `xterm.Terminal` with `{convertEol: true}`, attaches `FitAddon`, opens in a full-height `div`
- `window.addEventListener('message', e => ...)`:
  - `{type: 'data', data}` -> `term.write(data)`
  - `{type: 'scrollback', data}` -> `term.write(data)` (replay on connect)
  - `{type: 'exit', code}` -> writes a styled exit message to the terminal
- `term.onData(data => vscode.postMessage({type: 'input', data}))`
- `ResizeObserver` on container -> `fitAddon.fit()` -> `vscode.postMessage({type: 'resize', cols: term.cols, rows: term.rows})`

**CSP:**
```
script-src 'nonce-{nonce}' ${webview.cspSource};
style-src 'unsafe-inline' ${webview.cspSource};
```

---

## Asset Copy Script

A short npm script copies xterm.js dist files into `resources/webview/` at build time:

```json
"copy-webview-assets": "node scripts/copy-webview-assets.js"
```

`scripts/copy-webview-assets.js` copies from:
- `node_modules/xterm/lib/xterm.js` -> `resources/webview/xterm.js`
- `node_modules/xterm/css/xterm.css` -> `resources/webview/xterm.css`
- `node_modules/@xterm/addon-fit/lib/addon-fit.js` -> `resources/webview/xterm-addon-fit.js`

`vscode:prepublish` and `compile` scripts are updated to run `copy-webview-assets` first.

---

## New Dependencies

```json
"dependencies": {
  "node-pty": "^1.0.0"
},
"devDependencies": {
  "@xterm/xterm": "^5.5.0",
  "@xterm/addon-fit": "^0.10.0"
}
```

Note: the xterm.js package was renamed from `xterm` to `@xterm/xterm` at v5.4. Use the scoped name. The copy script paths update accordingly (`node_modules/@xterm/xterm/lib/xterm.js`, etc.).

`node-pty` prebuilt binaries are included in the VSIX via `.vscodeignore` exclusion rules (ensure `node_modules/node-pty/build/` is NOT ignored).

---

## Changes to Existing Files

| File | Change |
|------|--------|
| `src/extension.ts` | Instantiate `PiSession`; register `PiSidebarProvider`; register `piBay.openPanel` command |
| `src/terminal.ts` | Extract `buildArgs()` into a standalone function (or re-export) so `PiSession` can reuse it without depending on `PiTerminalManager` |
| `package.json` | Add `viewsContainers`, `views`, `piBay.openPanel` command, `view/title` menu entry, new deps |
| `tsconfig.json` | No changes expected |

`PiTerminalManager` and all existing commands are untouched.

---

## Out of Scope

- Passing per-invocation args (skill, template, prompt) into the embedded session -- the embedded session is a plain `pi` invocation; resource-specific commands continue to use integrated terminals
- Multiple simultaneous embedded sessions
- Session restart UI (process exit leaves the terminal in an exited state; user can run `piBay.openPanel` / reopen the sidebar to see status)
