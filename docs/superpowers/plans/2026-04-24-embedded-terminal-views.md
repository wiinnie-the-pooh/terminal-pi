# Embedded Terminal Views Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an xterm.js sidebar view and singleton editor-area panel to Pi Bay, both rendering a shared node-pty Pi session.

**Architecture:** `PiSession` owns a single node-pty process and broadcasts PTY output to all connected webviews; `PiSidebarProvider` (WebviewViewProvider) and `PiPanel` (singleton WebviewPanel) each connect to that shared session and render the same xterm.js HTML template. Existing integrated-terminal commands are untouched.

**Tech Stack:** node-pty 1.x, @xterm/xterm 5.x, @xterm/addon-fit 0.10.x, VS Code WebviewViewProvider / WebviewPanel APIs, Node.js built-in test runner.

**Spec:** `docs/superpowers/specs/2026-04-24-embedded-terminal-views-design.md`

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/piSession.ts` | node-pty wrapper: scrollback, broadcast, write/resize/dispose |
| Create | `src/webviewTemplate.ts` | Pure function returning xterm.js HTML string |
| Create | `src/piSidebarProvider.ts` | WebviewViewProvider for Activity Bar sidebar |
| Create | `src/piPanel.ts` | Singleton WebviewPanel for editor area |
| Create | `scripts/copy-webview-assets.js` | Copies xterm dist files into resources/webview/ at build time |
| Create | `tests/piSession.test.js` | Unit tests for PiSession |
| Create | `tests/webviewTemplate.test.js` | Unit tests for webviewTemplate |
| Create | `tests/piSidebarProvider.test.js` | Unit tests for PiSidebarProvider |
| Create | `tests/piPanel.test.js` | Unit tests for PiPanel |
| Create | `tests/__fixtures__/node-pty-stub.js` | Fake node-pty for tests |
| Create | `tests/__fixtures__/vscode-webview-stub.js` | Fake vscode for webview tests |
| Modify | `src/terminal.ts` | Export `buildPiArgs` as standalone function |
| Modify | `src/extension.ts` | Instantiate PiSession; register sidebar provider + openPanel command |
| Modify | `package.json` | viewsContainers, views, new command, menu entry, deps, copy script |
| Modify | `.vscodeignore` | Include node-pty binaries and resources/webview/ |

---

## Task 1: Install dependencies and copy-webview-assets script

**Files:**
- Modify: `package.json`
- Create: `scripts/copy-webview-assets.js`
- Create: `resources/webview/` (populated by script)

- [ ] **Step 1: Install runtime and dev dependencies**

```bash
npm install node-pty
npm install --save-dev @xterm/xterm @xterm/addon-fit
```

Expected: `node_modules/node-pty/`, `node_modules/@xterm/xterm/`, `node_modules/@xterm/addon-fit/` present.

- [ ] **Step 2: Create the asset copy script**

Create `scripts/copy-webview-assets.js`:

```javascript
const fs = require('fs');
const path = require('path');

const dest = path.join(__dirname, '..', 'resources', 'webview');
fs.mkdirSync(dest, { recursive: true });

const copies = [
  ['@xterm/xterm/lib/xterm.js',       'xterm.js'],
  ['@xterm/xterm/css/xterm.css',      'xterm.css'],
  ['@xterm/addon-fit/lib/addon-fit.js', 'xterm-addon-fit.js'],
];

for (const [src, dst] of copies) {
  fs.copyFileSync(
    path.join(__dirname, '..', 'node_modules', src),
    path.join(dest, dst),
  );
}
console.log('Webview assets copied to resources/webview/.');
```

- [ ] **Step 3: Update package.json scripts to copy assets before compile**

In `package.json`, replace the `scripts` block with:

```json
"scripts": {
  "copy-webview-assets": "node scripts/copy-webview-assets.js",
  "vscode:prepublish": "npm run copy-webview-assets && npm run compile-only",
  "compile": "npm run copy-webview-assets && npm run compile-only",
  "compile-only": "tsc -p ./",
  "test": "npm run compile && node run-tests.js",
  "coverage": "npm run compile && c8 node run-tests.js",
  "diff-coverage": "node run-diff-coverage.js",
  "update-coverage-thresholds": "node scripts/update-coverage-thresholds.js",
  "watch": "tsc -watch -p ./",
  "package": "vsce package",
  "lint": "eslint src --ext ts"
}
```

- [ ] **Step 4: Run the copy script and verify output**

```bash
node scripts/copy-webview-assets.js
```

Expected output: `Webview assets copied to resources/webview/.`
Expected files: `resources/webview/xterm.js`, `resources/webview/xterm.css`, `resources/webview/xterm-addon-fit.js`

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json scripts/copy-webview-assets.js resources/webview/
git commit -m "feat: install xterm/node-pty deps and add webview asset copy script"
```

---

## Task 2: Extract `buildPiArgs` as a standalone exported function

**Files:**
- Modify: `src/terminal.ts`
- Create: `tests/piArgs.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/piArgs.test.js`:

```javascript
const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');
const path = require('node:path');

const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request === 'vscode') return require.resolve('./__fixtures__/vscode-stub.js');
  return originalResolve.call(this, request, ...rest);
};

const { buildPiArgs } = require('../out/terminal.js');

const EXT_PATH = '/fake/ext';
const HOTKEYS = path.join(EXT_PATH, 'extensions', 'vs-code-hotkeys', 'vs-code-hotkeys.js');

test('buildPiArgs returns only the extension flag when defaultArgs is empty', () => {
  assert.deepEqual(buildPiArgs('', EXT_PATH), ['--extension', HOTKEYS]);
});

test('buildPiArgs returns only the extension flag for whitespace-only defaultArgs', () => {
  assert.deepEqual(buildPiArgs('   ', EXT_PATH), ['--extension', HOTKEYS]);
});

test('buildPiArgs splits defaultArgs tokens before the extension flag', () => {
  assert.deepEqual(
    buildPiArgs('--thinking low', EXT_PATH),
    ['--thinking', 'low', '--extension', HOTKEYS],
  );
});
```

- [ ] **Step 2: Compile and run to confirm it fails**

```bash
npm run compile-only && node --test tests/piArgs.test.js
```

Expected: test fails with `TypeError: buildPiArgs is not a function` (it's not exported yet).

- [ ] **Step 3: Extract `buildPiArgs` in `src/terminal.ts`**

In `src/terminal.ts`, add the standalone export immediately before the `PiTerminalManager` class definition. Replace the existing `private buildArgs` method with a thin wrapper:

```typescript
// Add this export above the class:
export function buildPiArgs(defaultArgs: string, extensionPath: string): string[] {
  const args = defaultArgs.trim()
    ? defaultArgs.trim().split(/\s+/)
    : [];
  args.push(
    '--extension',
    path.join(extensionPath, 'extensions', 'vs-code-hotkeys', 'vs-code-hotkeys.js'),
  );
  return args;
}
```

Then replace the private `buildArgs` method inside `PiTerminalManager`:

```typescript
  private buildArgs(defaultArgs: string): string[] {
    return buildPiArgs(defaultArgs, this.context.extensionPath);
  }
```

- [ ] **Step 4: Compile and run all tests to confirm they pass**

```bash
npm run compile-only && npm test
```

Expected: all tests pass, including the new `piArgs.test.js`.

- [ ] **Step 5: Commit**

```bash
git add src/terminal.ts tests/piArgs.test.js
git commit -m "refactor: export buildPiArgs as standalone function for reuse"
```

---

## Task 3: `webviewTemplate.ts` and tests

**Files:**
- Create: `src/webviewTemplate.ts`
- Create: `tests/webviewTemplate.test.js`

- [ ] **Step 1: Write the failing tests**

Create `tests/webviewTemplate.test.js`:

```javascript
const test = require('node:test');
const assert = require('node:assert/strict');

// webviewTemplate has no vscode dependency -- no stub needed
const { getWebviewTemplate, generateNonce } = require('../out/webviewTemplate.js');

const OPTS = {
  cspSource: 'https://vscode-cdn.example.net',
  nonce: 'testNonce123',
  xtermJsUri:       'https://vscode-cdn.example.net/xterm.js',
  xtermCssUri:      'https://vscode-cdn.example.net/xterm.css',
  xtermAddonFitUri: 'https://vscode-cdn.example.net/xterm-addon-fit.js',
};

test('getWebviewTemplate includes the nonce on every script tag', () => {
  const html = getWebviewTemplate(OPTS);
  const scriptTags = [...html.matchAll(/<script[^>]*>/g)].map(m => m[0]);
  assert.ok(scriptTags.length > 0);
  assert.ok(scriptTags.every(tag => tag.includes('nonce="testNonce123"')));
});

test('getWebviewTemplate includes the xterm.js URI', () => {
  assert.ok(getWebviewTemplate(OPTS).includes(OPTS.xtermJsUri));
});

test('getWebviewTemplate includes the xterm.css URI', () => {
  assert.ok(getWebviewTemplate(OPTS).includes(OPTS.xtermCssUri));
});

test('getWebviewTemplate includes the addon-fit URI', () => {
  assert.ok(getWebviewTemplate(OPTS).includes(OPTS.xtermAddonFitUri));
});

test('getWebviewTemplate includes the CSP source in the meta tag', () => {
  assert.ok(getWebviewTemplate(OPTS).includes(OPTS.cspSource));
});

test('generateNonce returns a 32-character alphanumeric string', () => {
  const nonce = generateNonce();
  assert.match(nonce, /^[A-Za-z0-9]{32}$/);
});

test('generateNonce returns a different value on each call', () => {
  assert.notEqual(generateNonce(), generateNonce());
});
```

- [ ] **Step 2: Compile and run to confirm they fail**

```bash
npm run compile-only && node --test tests/webviewTemplate.test.js
```

Expected: module-not-found or export errors.

- [ ] **Step 3: Implement `src/webviewTemplate.ts`**

Create `src/webviewTemplate.ts`:

```typescript
export interface WebviewTemplateOptions {
  cspSource: string;
  nonce: string;
  xtermJsUri: string;
  xtermCssUri: string;
  xtermAddonFitUri: string;
}

export function generateNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function getWebviewTemplate(opts: WebviewTemplateOptions): string {
  const { cspSource, nonce, xtermJsUri, xtermCssUri, xtermAddonFitUri } = opts;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="
    default-src 'none';
    script-src 'nonce-${nonce}' ${cspSource};
    style-src 'unsafe-inline' ${cspSource};
  ">
  <link rel="stylesheet" href="${xtermCssUri}">
  <style>
    body, html { margin: 0; padding: 0; height: 100%; overflow: hidden; background: transparent; }
    #terminal { height: 100%; }
  </style>
</head>
<body>
  <div id="terminal"></div>
  <script nonce="${nonce}" src="${xtermJsUri}"></script>
  <script nonce="${nonce}" src="${xtermAddonFitUri}"></script>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const term = new Terminal({ convertEol: true });
    const fitAddon = new FitAddon.FitAddon();
    term.loadAddon(fitAddon);
    term.open(document.getElementById('terminal'));
    fitAddon.fit();

    term.onData(data => vscode.postMessage({ type: 'input', data }));

    window.addEventListener('message', e => {
      const msg = e.data;
      if (msg.type === 'data' || msg.type === 'scrollback') {
        term.write(msg.data);
      } else if (msg.type === 'exit') {
        term.write('\\r\\n[Process exited with code ' + msg.code + ']\\r\\n');
      }
    });

    const container = document.getElementById('terminal');
    new ResizeObserver(() => {
      fitAddon.fit();
      vscode.postMessage({ type: 'resize', cols: term.cols, rows: term.rows });
    }).observe(container);
  </script>
</body>
</html>`;
}
```

- [ ] **Step 4: Compile and run the tests**

```bash
npm run compile-only && node --test tests/webviewTemplate.test.js
```

Expected: all 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/webviewTemplate.ts tests/webviewTemplate.test.js
git commit -m "feat: add webviewTemplate with shared xterm.js HTML generator"
```

---

## Task 4: `PiSession` -- PTY spawn, scrollback, and sender broadcast

**Files:**
- Create: `tests/__fixtures__/node-pty-stub.js`
- Create: `src/piSession.ts`
- Create: `tests/piSession.test.js`

- [ ] **Step 1: Create the node-pty stub**

Create `tests/__fixtures__/node-pty-stub.js`:

```javascript
let onDataHandler = () => {};
let onExitHandler = () => {};

const calls = { spawn: [], write: [], resize: [], kill: [] };

const stub = {
  spawn(file, args, opts) {
    calls.spawn.push({ file, args, opts });
    return {
      onData(handler)  { onDataHandler = handler; return { dispose: () => {} }; },
      onExit(handler)  { onExitHandler = handler; return { dispose: () => {} }; },
      write(data)      { calls.write.push(data); },
      resize(cols, rows) { calls.resize.push({ cols, rows }); },
      kill()           { calls.kill.push(true); },
    };
  },
  __simulateData(data)      { onDataHandler(data); },
  __simulateExit(exitCode)  { onExitHandler({ exitCode }); },
  __calls: calls,
  __reset() {
    onDataHandler = () => {};
    onExitHandler = () => {};
    calls.spawn   = [];
    calls.write   = [];
    calls.resize  = [];
    calls.kill    = [];
  },
};

module.exports = stub;
```

- [ ] **Step 2: Write the failing tests**

Create `tests/piSession.test.js`:

```javascript
const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');

const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request === 'vscode')    return require.resolve('./__fixtures__/vscode-stub.js');
  if (request === 'node-pty') return require.resolve('./__fixtures__/node-pty-stub.js');
  return originalResolve.call(this, request, ...rest);
};

const ptyStub = require('./__fixtures__/node-pty-stub.js');
const { PiSession } = require('../out/piSession.js');

const CONFIG = {
  file: '/usr/bin/node',
  args: ['/fake/ext/out/piLauncher.js', '--session', 'test-id'],
  env: { PATH: '/usr/bin', EDITOR: 'code --wait' },
};

test.beforeEach(() => ptyStub.__reset());

// --- Spawn ---

test('PiSession spawns PTY with the provided file', () => {
  new PiSession(CONFIG, ptyStub.spawn);
  assert.equal(ptyStub.__calls.spawn[0].file, CONFIG.file);
});

test('PiSession spawns PTY with the provided args', () => {
  new PiSession(CONFIG, ptyStub.spawn);
  assert.deepEqual(ptyStub.__calls.spawn[0].args, CONFIG.args);
});

test('PiSession spawns PTY with xterm-256color terminal name', () => {
  new PiSession(CONFIG, ptyStub.spawn);
  assert.equal(ptyStub.__calls.spawn[0].opts.name, 'xterm-256color');
});

test('PiSession spawns PTY with the provided env', () => {
  new PiSession(CONFIG, ptyStub.spawn);
  assert.deepEqual(ptyStub.__calls.spawn[0].opts.env, CONFIG.env);
});

// --- write / resize / dispose ---

test('PiSession.write forwards data to the PTY', () => {
  const s = new PiSession(CONFIG, ptyStub.spawn);
  s.write('hello');
  assert.deepEqual(ptyStub.__calls.write, ['hello']);
});

test('PiSession.resize forwards dimensions to the PTY', () => {
  const s = new PiSession(CONFIG, ptyStub.spawn);
  s.resize(120, 30);
  assert.deepEqual(ptyStub.__calls.resize, [{ cols: 120, rows: 30 }]);
});

test('PiSession.dispose kills the PTY', () => {
  const s = new PiSession(CONFIG, ptyStub.spawn);
  s.dispose();
  assert.equal(ptyStub.__calls.kill.length, 1);
});

// --- Scrollback ---

test('PiSession.getScrollback is empty before any PTY output', () => {
  const s = new PiSession(CONFIG, ptyStub.spawn);
  assert.equal(s.getScrollback(), '');
});

test('PiSession.getScrollback accumulates PTY data chunks', () => {
  const s = new PiSession(CONFIG, ptyStub.spawn);
  ptyStub.__simulateData('hello ');
  ptyStub.__simulateData('world');
  assert.equal(s.getScrollback(), 'hello world');
});

test('PiSession scrollback trims from the front when 500 KB cap is exceeded', () => {
  const s = new PiSession(CONFIG, ptyStub.spawn);
  const chunk = 'x'.repeat(300 * 1024);
  ptyStub.__simulateData(chunk); // 300 KB
  ptyStub.__simulateData(chunk); // 600 KB total -- cap triggers
  const sb = s.getScrollback();
  assert.ok(sb.length <= 500 * 1024, `scrollback ${sb.length} exceeds 500 KB`);
  assert.ok(sb.endsWith('x'), 'scrollback should end with data from the last chunk');
});

// --- Sender broadcast ---

test('PiSession.addSender immediately delivers scrollback replay', () => {
  const s = new PiSession(CONFIG, ptyStub.spawn);
  ptyStub.__simulateData('prior output');
  const received = [];
  s.addSender(msg => received.push(msg));
  const scrollbackMsgs = received.filter(m => m.type === 'scrollback');
  assert.equal(scrollbackMsgs.length, 1);
  assert.equal(scrollbackMsgs[0].data, 'prior output');
});

test('PiSession.addSender receives data messages as PTY produces output', () => {
  const s = new PiSession(CONFIG, ptyStub.spawn);
  const received = [];
  s.addSender(msg => received.push(msg));
  ptyStub.__simulateData('foo');
  assert.deepEqual(received.filter(m => m.type === 'data'), [{ type: 'data', data: 'foo' }]);
});

test('PiSession broadcasts to multiple senders simultaneously', () => {
  const s = new PiSession(CONFIG, ptyStub.spawn);
  const a = [], b = [];
  s.addSender(msg => a.push(msg));
  s.addSender(msg => b.push(msg));
  ptyStub.__simulateData('bar');
  assert.equal(a.filter(m => m.type === 'data').length, 1);
  assert.equal(b.filter(m => m.type === 'data').length, 1);
});

test('PiSession unsubscribe stops future data messages', () => {
  const s = new PiSession(CONFIG, ptyStub.spawn);
  const received = [];
  const unsub = s.addSender(msg => received.push(msg));
  unsub();
  ptyStub.__simulateData('after unsub');
  assert.equal(received.filter(m => m.type === 'data').length, 0);
});

test('PiSession broadcasts exit message with exit code', () => {
  const s = new PiSession(CONFIG, ptyStub.spawn);
  const received = [];
  s.addSender(msg => received.push(msg));
  ptyStub.__simulateExit(42);
  assert.deepEqual(received.filter(m => m.type === 'exit'), [{ type: 'exit', code: 42 }]);
});
```

- [ ] **Step 3: Compile and run to confirm tests fail**

```bash
npm run compile-only && node --test tests/piSession.test.js
```

Expected: module-not-found error (piSession.js does not exist yet).

- [ ] **Step 4: Implement `src/piSession.ts`**

Create `src/piSession.ts`:

```typescript
import * as nodePty from 'node-pty';
import type { IPty } from 'node-pty';

export interface PiSpawnConfig {
  file: string;
  args: string[];
  env: NodeJS.ProcessEnv;
}

type PtySpawnFn = typeof nodePty.spawn;

const SCROLLBACK_CAP = 500 * 1024;

export class PiSession {
  private readonly pty: IPty;
  private scrollback = '';
  private readonly senders = new Set<(msg: unknown) => void>();

  constructor(config: PiSpawnConfig, ptySpawn: PtySpawnFn = nodePty.spawn) {
    this.pty = ptySpawn(config.file, config.args, {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      env: config.env,
    });

    this.pty.onData((data) => {
      this.scrollback += data;
      if (this.scrollback.length > SCROLLBACK_CAP) {
        this.scrollback = this.scrollback.slice(this.scrollback.length - SCROLLBACK_CAP);
      }
      for (const sender of this.senders) {
        sender({ type: 'data', data });
      }
    });

    this.pty.onExit(({ exitCode }) => {
      for (const sender of this.senders) {
        sender({ type: 'exit', code: exitCode });
      }
    });
  }

  addSender(fn: (msg: unknown) => void): () => void {
    this.senders.add(fn);
    fn({ type: 'scrollback', data: this.scrollback });
    return () => this.senders.delete(fn);
  }

  getScrollback(): string {
    return this.scrollback;
  }

  write(data: string): void {
    this.pty.write(data);
  }

  resize(cols: number, rows: number): void {
    this.pty.resize(cols, rows);
  }

  dispose(): void {
    this.pty.kill();
    this.senders.clear();
  }
}
```

- [ ] **Step 5: Compile and run all tests**

```bash
npm run compile-only && npm test
```

Expected: all tests pass including the 16 new `piSession.test.js` tests.

- [ ] **Step 6: Commit**

```bash
git add src/piSession.ts tests/piSession.test.js tests/__fixtures__/node-pty-stub.js
git commit -m "feat: add PiSession -- node-pty wrapper with scrollback and sender broadcast"
```

---

## Task 5: `PiSidebarProvider` and tests

**Files:**
- Create: `tests/__fixtures__/vscode-webview-stub.js`
- Create: `src/piSidebarProvider.ts`
- Create: `tests/piSidebarProvider.test.js`

- [ ] **Step 1: Create the vscode webview stub**

Create `tests/__fixtures__/vscode-webview-stub.js`:

```javascript
module.exports = {
  ConfigurationTarget: { Global: 1, Workspace: 2, WorkspaceFolder: 3 },
  Uri: {
    joinPath(base, ...parts) {
      const p = typeof base === 'string' ? base : (base.path ?? '');
      return { path: [p, ...parts].join('/') };
    },
  },
  ViewColumn: { One: 1 },
  window: {
    createWebviewPanel(viewType, title, column, options) {
      let disposeHandler = null;
      let messageHandler = null;
      const posted = [];
      const panel = {
        webview: {
          html: '',
          cspSource: 'test-csp',
          options: {},
          asWebviewUri(uri) { return { toString: () => `webview:${uri.path}` }; },
          onDidReceiveMessage(h) { messageHandler = h; return { dispose: () => {} }; },
          postMessage(m) { posted.push(m); },
        },
        reveal() { panel.__revealed = true; },
        __revealed: false,
        __posted: posted,
        onDidDispose(h) { disposeHandler = h; return { dispose: () => {} }; },
        __triggerDispose() { disposeHandler?.(); },
        __triggerMessage(msg) { messageHandler?.(msg); },
      };
      module.exports.window.__lastPanel = panel;
      return panel;
    },
    __lastPanel: null,
    onDidCloseTerminal: () => ({ dispose: () => {} }),
    showErrorMessage: async () => undefined,
    registerWebviewViewProvider: () => ({ dispose: () => {} }),
  },
};
```

- [ ] **Step 2: Write the failing tests**

Create `tests/piSidebarProvider.test.js`:

```javascript
const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');

const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request === 'vscode') return require.resolve('./__fixtures__/vscode-webview-stub.js');
  return originalResolve.call(this, request, ...rest);
};

const { PiSidebarProvider } = require('../out/piSidebarProvider.js');

function makeSession() {
  const senders = new Set();
  return {
    addSender(fn) {
      senders.add(fn);
      fn({ type: 'scrollback', data: '' });
      return () => senders.delete(fn);
    },
    write() {},
    resize() {},
    __senders: senders,
  };
}

function makeWebviewView() {
  let messageHandler = null;
  let disposeHandler = null;
  const posted = [];
  return {
    webview: {
      options: {},
      html: '',
      cspSource: 'test-csp',
      asWebviewUri(uri) { return { toString: () => `webview:${uri.path}` }; },
      onDidReceiveMessage(h) { messageHandler = h; return { dispose: () => {} }; },
      postMessage(m) { posted.push(m); },
    },
    onDidDispose(h) { disposeHandler = h; return { dispose: () => {} }; },
    __triggerMessage(msg) { messageHandler?.(msg); },
    __triggerDispose() { disposeHandler?.(); },
    __posted: posted,
  };
}

const FAKE_URI = { path: '/fake/ext' };

test('PiSidebarProvider.resolveWebviewView enables scripts on the webview', () => {
  const provider = new PiSidebarProvider(makeSession(), FAKE_URI);
  const view = makeWebviewView();
  provider.resolveWebviewView(view);
  assert.equal(view.webview.options.enableScripts, true);
});

test('PiSidebarProvider.resolveWebviewView sets html on the webview', () => {
  const provider = new PiSidebarProvider(makeSession(), FAKE_URI);
  const view = makeWebviewView();
  provider.resolveWebviewView(view);
  assert.ok(view.webview.html.includes('<!DOCTYPE html>'));
});

test('PiSidebarProvider registers with PiSession on resolveWebviewView', () => {
  const session = makeSession();
  const provider = new PiSidebarProvider(session, FAKE_URI);
  const view = makeWebviewView();
  provider.resolveWebviewView(view);
  assert.equal(session.__senders.size, 1);
});

test('PiSidebarProvider forwards input messages to session.write', () => {
  const writes = [];
  const session = { ...makeSession(), write: (d) => writes.push(d) };
  const provider = new PiSidebarProvider(session, FAKE_URI);
  const view = makeWebviewView();
  provider.resolveWebviewView(view);
  view.__triggerMessage({ type: 'input', data: 'hello' });
  assert.deepEqual(writes, ['hello']);
});

test('PiSidebarProvider forwards resize messages to session.resize', () => {
  const resizes = [];
  const session = { ...makeSession(), resize: (c, r) => resizes.push({ cols: c, rows: r }) };
  const provider = new PiSidebarProvider(session, FAKE_URI);
  const view = makeWebviewView();
  provider.resolveWebviewView(view);
  view.__triggerMessage({ type: 'resize', cols: 100, rows: 30 });
  assert.deepEqual(resizes, [{ cols: 100, rows: 30 }]);
});

test('PiSidebarProvider unregisters from PiSession on dispose', () => {
  const session = makeSession();
  const provider = new PiSidebarProvider(session, FAKE_URI);
  const view = makeWebviewView();
  provider.resolveWebviewView(view);
  assert.equal(session.__senders.size, 1);
  view.__triggerDispose();
  assert.equal(session.__senders.size, 0);
});
```

- [ ] **Step 3: Compile and run to confirm they fail**

```bash
npm run compile-only && node --test tests/piSidebarProvider.test.js
```

Expected: module-not-found error.

- [ ] **Step 4: Implement `src/piSidebarProvider.ts`**

Create `src/piSidebarProvider.ts`:

```typescript
import * as vscode from 'vscode';
import type { PiSession } from './piSession';
import { generateNonce, getWebviewTemplate } from './webviewTemplate';

export class PiSidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewId = 'piBay.session';

  constructor(
    private readonly piSession: PiSession,
    private readonly extensionUri: vscode.Uri,
  ) {}

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    const webview = webviewView.webview;

    webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.extensionUri, 'resources', 'webview'),
      ],
    };

    webview.html = getWebviewTemplate({
      cspSource: webview.cspSource,
      nonce: generateNonce(),
      xtermJsUri: webview.asWebviewUri(
        vscode.Uri.joinPath(this.extensionUri, 'resources', 'webview', 'xterm.js'),
      ).toString(),
      xtermCssUri: webview.asWebviewUri(
        vscode.Uri.joinPath(this.extensionUri, 'resources', 'webview', 'xterm.css'),
      ).toString(),
      xtermAddonFitUri: webview.asWebviewUri(
        vscode.Uri.joinPath(this.extensionUri, 'resources', 'webview', 'xterm-addon-fit.js'),
      ).toString(),
    });

    const unsubscribe = this.piSession.addSender(
      (msg) => void webview.postMessage(msg),
    );

    webview.onDidReceiveMessage((msg: { type: string; data?: string; cols?: number; rows?: number }) => {
      if (msg.type === 'input' && msg.data !== undefined) {
        this.piSession.write(msg.data);
      } else if (msg.type === 'resize' && msg.cols !== undefined && msg.rows !== undefined) {
        this.piSession.resize(msg.cols, msg.rows);
      }
    });

    webviewView.onDidDispose(() => unsubscribe());
  }
}
```

- [ ] **Step 5: Compile and run all tests**

```bash
npm run compile-only && npm test
```

Expected: all tests pass including the 6 new `piSidebarProvider.test.js` tests.

- [ ] **Step 6: Commit**

```bash
git add src/piSidebarProvider.ts tests/piSidebarProvider.test.js tests/__fixtures__/vscode-webview-stub.js
git commit -m "feat: add PiSidebarProvider -- xterm.js webview view for Activity Bar sidebar"
```

---

## Task 6: `PiPanel` singleton and tests

**Files:**
- Create: `src/piPanel.ts`
- Create: `tests/piPanel.test.js`

- [ ] **Step 1: Write the failing tests**

Create `tests/piPanel.test.js`:

```javascript
const test = require('node:test');
const assert = require('node:assert/strict');
const { afterEach } = require('node:test');
const Module = require('module');

const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request === 'vscode') return require.resolve('./__fixtures__/vscode-webview-stub.js');
  return originalResolve.call(this, request, ...rest);
};

const vscodeStub = require('./__fixtures__/vscode-webview-stub.js');
const { PiPanel } = require('../out/piPanel.js');

function makeSession() {
  const senders = new Set();
  return {
    addSender(fn) {
      senders.add(fn);
      fn({ type: 'scrollback', data: '' });
      return () => senders.delete(fn);
    },
    write() {},
    resize() {},
    __senders: senders,
  };
}

const FAKE_URI = { path: '/fake/ext' };

// After each test, dispose the panel so the singleton is cleared for the next test.
afterEach(() => {
  const panel = vscodeStub.window.__lastPanel;
  if (panel) {
    panel.__triggerDispose();
    vscodeStub.window.__lastPanel = null;
  }
});

test('PiPanel.createOrReveal creates a new WebviewPanel', () => {
  PiPanel.createOrReveal(makeSession(), FAKE_URI);
  assert.ok(vscodeStub.window.__lastPanel, 'expected a panel to be created');
});

test('PiPanel.createOrReveal sets html on the panel webview', () => {
  PiPanel.createOrReveal(makeSession(), FAKE_URI);
  assert.ok(vscodeStub.window.__lastPanel.webview.html.includes('<!DOCTYPE html>'));
});

test('PiPanel.createOrReveal registers with PiSession', () => {
  const session = makeSession();
  PiPanel.createOrReveal(session, FAKE_URI);
  assert.equal(session.__senders.size, 1);
});

test('PiPanel.createOrReveal reveals the existing panel on second call instead of creating another', () => {
  const session = makeSession();
  PiPanel.createOrReveal(session, FAKE_URI);
  const firstPanel = vscodeStub.window.__lastPanel;
  PiPanel.createOrReveal(session, FAKE_URI);
  assert.equal(vscodeStub.window.__lastPanel, firstPanel, 'should reuse the same panel');
  assert.equal(firstPanel.__revealed, true);
});

test('PiPanel forwards input messages to session.write', () => {
  const writes = [];
  const session = { ...makeSession(), write: (d) => writes.push(d) };
  PiPanel.createOrReveal(session, FAKE_URI);
  vscodeStub.window.__lastPanel.__triggerMessage({ type: 'input', data: 'hi' });
  assert.deepEqual(writes, ['hi']);
});

test('PiPanel forwards resize messages to session.resize', () => {
  const resizes = [];
  const session = { ...makeSession(), resize: (c, r) => resizes.push({ cols: c, rows: r }) };
  PiPanel.createOrReveal(session, FAKE_URI);
  vscodeStub.window.__lastPanel.__triggerMessage({ type: 'resize', cols: 80, rows: 24 });
  assert.deepEqual(resizes, [{ cols: 80, rows: 24 }]);
});

test('PiPanel unregisters from PiSession on dispose', () => {
  const session = makeSession();
  PiPanel.createOrReveal(session, FAKE_URI);
  assert.equal(session.__senders.size, 1);
  vscodeStub.window.__lastPanel.__triggerDispose();
  vscodeStub.window.__lastPanel = null;
  assert.equal(session.__senders.size, 0);
});

test('PiPanel.createOrReveal creates a new panel after previous panel was disposed', () => {
  const session = makeSession();
  PiPanel.createOrReveal(session, FAKE_URI);
  vscodeStub.window.__lastPanel.__triggerDispose();
  vscodeStub.window.__lastPanel = null;
  PiPanel.createOrReveal(session, FAKE_URI);
  assert.ok(vscodeStub.window.__lastPanel, 'expected a new panel after dispose');
});
```

- [ ] **Step 2: Compile and run to confirm they fail**

```bash
npm run compile-only && node --test tests/piPanel.test.js
```

Expected: module-not-found error.

- [ ] **Step 3: Implement `src/piPanel.ts`**

Create `src/piPanel.ts`:

```typescript
import * as vscode from 'vscode';
import type { PiSession } from './piSession';
import { generateNonce, getWebviewTemplate } from './webviewTemplate';

export class PiPanel {
  private static instance: PiPanel | undefined;

  private readonly panel: vscode.WebviewPanel;

  static createOrReveal(piSession: PiSession, extensionUri: vscode.Uri): void {
    if (PiPanel.instance) {
      PiPanel.instance.panel.reveal();
      return;
    }
    PiPanel.instance = new PiPanel(piSession, extensionUri);
  }

  private constructor(piSession: PiSession, extensionUri: vscode.Uri) {
    this.panel = vscode.window.createWebviewPanel(
      'piBay.panel',
      'Pi Bay',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'resources', 'webview'),
        ],
      },
    );

    const webview = this.panel.webview;

    webview.html = getWebviewTemplate({
      cspSource: webview.cspSource,
      nonce: generateNonce(),
      xtermJsUri: webview.asWebviewUri(
        vscode.Uri.joinPath(extensionUri, 'resources', 'webview', 'xterm.js'),
      ).toString(),
      xtermCssUri: webview.asWebviewUri(
        vscode.Uri.joinPath(extensionUri, 'resources', 'webview', 'xterm.css'),
      ).toString(),
      xtermAddonFitUri: webview.asWebviewUri(
        vscode.Uri.joinPath(extensionUri, 'resources', 'webview', 'xterm-addon-fit.js'),
      ).toString(),
    });

    const unsubscribe = piSession.addSender(
      (msg) => void webview.postMessage(msg),
    );

    webview.onDidReceiveMessage((msg: { type: string; data?: string; cols?: number; rows?: number }) => {
      if (msg.type === 'input' && msg.data !== undefined) {
        piSession.write(msg.data);
      } else if (msg.type === 'resize' && msg.cols !== undefined && msg.rows !== undefined) {
        piSession.resize(msg.cols, msg.rows);
      }
    });

    this.panel.onDidDispose(() => {
      unsubscribe();
      PiPanel.instance = undefined;
    });
  }
}
```

- [ ] **Step 4: Compile and run all tests**

```bash
npm run compile-only && npm test
```

Expected: all tests pass including the 8 new `piPanel.test.js` tests.

- [ ] **Step 5: Commit**

```bash
git add src/piPanel.ts tests/piPanel.test.js
git commit -m "feat: add PiPanel -- singleton editor-area webview panel for Pi session"
```

---

## Task 7: Wire up `extension.ts` and update `package.json` manifest

**Files:**
- Modify: `src/extension.ts`
- Modify: `package.json`

- [ ] **Step 1: Update imports in `src/extension.ts`**

Add these imports at the top of `src/extension.ts` (after the existing imports):

```typescript
import * as crypto from 'node:crypto';
import { PiSession } from './piSession';
import { PiSidebarProvider } from './piSidebarProvider';
import { PiPanel } from './piPanel';
import { buildPiArgs } from './terminal';
import { resolveNodePath } from './piResolver';
import { resolveEditorCommand } from './editorCommandResolver';
import { getPiTerminalEnv } from './terminalEnv';
import * as path from 'node:path';
```

Also add a module-level variable alongside `statusBarItem` and `terminalManager`:

```typescript
let piSession: PiSession;
```

- [ ] **Step 2: Add PiSession creation and sidebar/panel registration to `activate()`**

Inside the `/* c8 ignore start */` block in `activate()`, immediately after `context.subscriptions.push(terminalManager)`, add:

```typescript
  const cfg = getConfig();
  const nodePath = resolveNodePath();
  const launcherPath = path.join(context.extensionPath, 'out', 'piLauncher.js');
  const sessionId = crypto.randomUUID();
  const piArgs = buildPiArgs(cfg.defaultArgs, context.extensionPath);
  const resolvedEditorCommand = resolveEditorCommand({
    configuredEditorCommand: cfg.editorCommand,
    appHost: vscode.env.appHost,
    uriScheme: vscode.env.uriScheme,
    appName: vscode.env.appName,
  });
  const editorEnv = getPiTerminalEnv(cfg.editorCommand, resolvedEditorCommand);

  piSession = new PiSession({
    file: nodePath,
    args: [launcherPath, '--session', sessionId, ...piArgs],
    env: { ...process.env, ...editorEnv } as NodeJS.ProcessEnv,
  });
  context.subscriptions.push({ dispose: () => piSession.dispose() });

  const sidebarProvider = new PiSidebarProvider(piSession, context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      PiSidebarProvider.viewId,
      sidebarProvider,
      { webviewOptions: { retainContextWhenHidden: true } },
    ),
  );
```

Then, inside the existing `context.subscriptions.push(...)` block that registers commands, add after the existing command registrations (before the closing parenthesis):

```typescript
    vscode.commands.registerCommand('piBay.openPanel', () => {
      PiPanel.createOrReveal(piSession, context.extensionUri);
    }),
```

- [ ] **Step 3: Add `viewsContainers`, `views`, and new command to `package.json`**

In the `contributes` section of `package.json`, add after the closing `]` of `"commands"`:

```json
    "viewsContainers": {
      "activitybar": [
        {
          "id": "piBay",
          "title": "Pi Bay",
          "icon": "resources/icons/pi-light.svg"
        }
      ]
    },
    "views": {
      "piBay": [
        {
          "type": "webview",
          "id": "piBay.session",
          "name": "Pi Bay"
        }
      ]
    },
```

Add `piBay.openPanel` to the `"commands"` array:

```json
      {
        "command": "piBay.openPanel",
        "title": "Open Pi Bay Panel",
        "category": "Pi Bay",
        "icon": "$(open-preview)"
      }
```

Add a `"view/title"` entry to the `"menus"` object so the sidebar has a "pop out" button:

```json
      "view/title": [
        {
          "command": "piBay.openPanel",
          "when": "view == piBay.session",
          "group": "navigation"
        }
      ]
```

- [ ] **Step 4: Compile and run all tests**

```bash
npm run compile-only && npm test
```

Expected: all existing tests pass (the new `activate()` code is inside `/* c8 ignore start/stop */`).

- [ ] **Step 5: Commit**

```bash
git add src/extension.ts package.json
git commit -m "feat: wire PiSession, PiSidebarProvider, and PiPanel into extension activate"
```

---

## Task 8: `.vscodeignore` updates, full build, and smoke check

**Files:**
- Modify: `.vscodeignore`

- [ ] **Step 1: Update `.vscodeignore` to include node-pty binaries**

In `.vscodeignore`, the current `node_modules/**` rule excludes everything. Add an exception for node-pty immediately after it:

```
node_modules/**
!node_modules/node-pty/**
```

The `resources/webview/` directory is not excluded (only `out/**/*.js.map` is excluded from `out/`), so the xterm.js assets copied by the copy script are already included.

- [ ] **Step 2: Run the full build and all tests**

```bash
npm run compile && npm test
```

Expected: copy-webview-assets runs, TypeScript compiles, all tests pass.

- [ ] **Step 3: Verify the VSIX would include the required files**

```bash
npx vsce ls 2>/dev/null | grep -E "(node-pty|webview)" | head -20
```

Expected: lines containing `node_modules/node-pty/build/` and `resources/webview/xterm.js`, `resources/webview/xterm.css`, `resources/webview/xterm-addon-fit.js`.

If `vsce ls` shows node-pty is missing, double-check the `!node_modules/node-pty/**` exception is on its own line in `.vscodeignore`.

- [ ] **Step 4: Commit**

```bash
git add .vscodeignore
git commit -m "chore: include node-pty binaries and webview assets in VSIX"
```

---

## Self-Review Checklist

| Spec requirement | Task that covers it |
|-----------------|-------------------|
| node-pty + xterm.js (Option A) | Task 1 (deps), Task 4 (PiSession), Task 3 (template) |
| Shared singleton PiSession | Task 4 |
| Scrollback buffer capped at 500 KB | Task 4 (step 4, `SCROLLBACK_CAP`) |
| Multi-sender broadcast | Task 4 |
| Sidebar WebviewViewProvider with `retainContextWhenHidden` | Task 5 (impl), Task 7 (registration) |
| PiPanel singleton `createOrReveal` | Task 6 |
| `piBay.openPanel` command | Task 7 |
| "Pop out" button in sidebar title bar | Task 7 (view/title menu) |
| xterm.js assets copied from node_modules | Task 1 |
| CSP with nonce | Task 3 |
| node-pty binaries in VSIX | Task 8 |
| Existing commands unchanged | All tasks -- terminal.ts PiTerminalManager untouched |
