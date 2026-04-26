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
  const calls = [];
  return {
    attachView(id, send) {
      calls.push({ type: 'attach', id, send });
      return {
        setVisible(value) { calls.push({ type: 'visible', value }); },
        setSize(cols, rows) { calls.push({ type: 'size', cols, rows }); },
        dispose() { calls.push({ type: 'dispose' }); },
      };
    },
    write(data) { calls.push({ type: 'write', data }); },
    resize(cols, rows) { calls.push({ type: 'legacy-resize', cols, rows }); },
    __calls: calls,
  };
}

function makePanel() {
  let disposeHandler = null;
  let messageHandler = null;
  let viewStateHandler = null;
  const posted = [];
  const panel = {
    visible: true,
    webview: {
      html: '',
      cspSource: 'test-csp',
      options: {},
      asWebviewUri(uri) { return { toString: () => `webview:${uri.path}` }; },
      onDidReceiveMessage(h) { messageHandler = h; return { dispose: () => {} }; },
      postMessage(m) { posted.push(m); },
    },
    reveal() { panel.__revealed = true; panel.visible = true; },
    __revealed: false,
    __posted: posted,
    onDidDispose(h) { disposeHandler = h; return { dispose: () => {} }; },
    onDidChangeViewState(h) { viewStateHandler = h; return { dispose: () => {} }; },
    __triggerDispose() { disposeHandler?.(); },
    __triggerMessage(msg) { messageHandler?.(msg); },
    __setVisible(value) {
      panel.visible = value;
      viewStateHandler?.({ webviewPanel: panel });
    },
  };
  return panel;
}

const FAKE_URI = { path: '/fake/ext' };

// After each test, dispose all tracked panels so the set is cleared for the next test.
afterEach(() => {
  for (const panel of vscodeStub.window.__allPanels) {
    panel.__triggerDispose();
  }
  vscodeStub.window.__lastPanel = null;
  vscodeStub.window.__allPanels = [];
});

test('PiPanel.createOrReveal creates a new WebviewPanel', () => {
  PiPanel.createOrReveal(() => makeSession(), FAKE_URI);
  assert.ok(vscodeStub.window.__lastPanel, 'expected a panel to be created');
});

test('PiPanel.createOrReveal sets html on the panel webview', () => {
  PiPanel.createOrReveal(() => makeSession(), FAKE_URI);
  assert.ok(vscodeStub.window.__lastPanel.webview.html.includes('<!DOCTYPE html>'));
});

test('PiPanel attaches as a second view through PiSession.attachView', () => {
  const session = makeSession();
  PiPanel.createOrReveal(() => session, FAKE_URI);
  assert.equal(session.__calls[0].type, 'attach');
  assert.ok(session.__calls[0].id.startsWith('editor-panel-'));
});

test('PiPanel sends PiSession messages to the webview', () => {
  const session = makeSession();
  PiPanel.createOrReveal(() => session, FAKE_URI);
  session.__calls[0].send({ type: 'data', data: 'hello' });
  assert.deepEqual(vscodeStub.window.__lastPanel.__posted, [{ type: 'data', data: 'hello' }]);
});

test('PiPanel marks the editor viewport visible when created', () => {
  const session = makeSession();
  PiPanel.createOrReveal(() => session, FAKE_URI);
  assert.deepEqual(session.__calls.find((call) => call.type === 'visible'), { type: 'visible', value: true });
});

test('PiPanel reports panel visibility changes to the attachment', () => {
  const session = makeSession();
  PiPanel.createOrReveal(() => session, FAKE_URI);
  vscodeStub.window.__lastPanel.__setVisible(false);
  vscodeStub.window.__lastPanel.__setVisible(true);
  assert.deepEqual(
    session.__calls.filter((call) => call.type === 'visible'),
    [
      { type: 'visible', value: true },
      { type: 'visible', value: false },
      { type: 'visible', value: true },
    ],
  );
});

test('PiPanel.createOrReveal reveals the existing panel on second call instead of creating another', () => {
  const session = makeSession();
  PiPanel.createOrReveal(() => session, FAKE_URI);
  const firstPanel = vscodeStub.window.__lastPanel;
  PiPanel.createOrReveal(() => session, FAKE_URI);
  assert.equal(vscodeStub.window.__lastPanel, firstPanel, 'should reuse the same panel');
  assert.equal(firstPanel.__revealed, true);
});

test('PiPanel marks the editor viewport visible when revealing an existing panel', () => {
  const session = makeSession();
  PiPanel.createOrReveal(() => session, FAKE_URI);
  vscodeStub.window.__lastPanel.__setVisible(false);
  PiPanel.createOrReveal(() => session, FAKE_URI);
  assert.deepEqual(session.__calls.at(-1), { type: 'visible', value: true });
});

test('PiPanel forwards input messages to session.write', () => {
  const session = makeSession();
  PiPanel.createOrReveal(() => session, FAKE_URI);
  vscodeStub.window.__lastPanel.__triggerMessage({ type: 'input', data: 'hi' });
  assert.deepEqual(session.__calls.filter((call) => call.type === 'write'), [{ type: 'write', data: 'hi' }]);
});

test('PiPanel forwards resize messages to attachment.setSize', () => {
  const session = makeSession();
  PiPanel.createOrReveal(() => session, FAKE_URI);
  vscodeStub.window.__lastPanel.__triggerMessage({ type: 'resize', cols: 80, rows: 24 });
  assert.deepEqual(session.__calls.filter((call) => call.type === 'size'), [{ type: 'size', cols: 80, rows: 24 }]);
  assert.equal(session.__calls.some((call) => call.type === 'legacy-resize'), false);
});

test('PiPanel detaches from PiSession on dispose', () => {
  const session = makeSession();
  PiPanel.createOrReveal(() => session, FAKE_URI);
  vscodeStub.window.__lastPanel.__triggerDispose();
  vscodeStub.window.__lastPanel = null;
  assert.deepEqual(session.__calls.at(-1), { type: 'dispose' });
});

test('PiPanel.createOrReveal creates a new panel after previous panel was disposed', () => {
  const session = makeSession();
  PiPanel.createOrReveal(() => session, FAKE_URI);
  vscodeStub.window.__lastPanel.__triggerDispose();
  vscodeStub.window.__lastPanel = null;
  PiPanel.createOrReveal(() => session, FAKE_URI);
  assert.ok(vscodeStub.window.__lastPanel, 'expected a new panel after dispose');
});

// --- restore path ---

test('PiPanel.restore populates an existing panel webview with HTML', () => {
  const panel = makePanel();
  PiPanel.restore(panel, () => makeSession(), FAKE_URI);
  assert.ok(panel.webview.html.includes('<!DOCTYPE html>'));
  panel.__triggerDispose();
});

test('PiPanel.restore attaches to PiSession with an editor-panel-* view ID', () => {
  const session = makeSession();
  const panel = makePanel();
  PiPanel.restore(panel, () => session, FAKE_URI);
  assert.equal(session.__calls[0].type, 'attach');
  assert.ok(session.__calls[0].id.startsWith('editor-panel-'));
  panel.__triggerDispose();
});

test('PiPanel.restore sends session messages to the restored panel', () => {
  const session = makeSession();
  const panel = makePanel();
  PiPanel.restore(panel, () => session, FAKE_URI);
  session.__calls[0].send({ type: 'data', data: 'restored' });
  assert.deepEqual(panel.__posted, [{ type: 'data', data: 'restored' }]);
  panel.__triggerDispose();
});

test('PiPanel.createOrReveal reveals a restored panel instead of creating a new one', () => {
  const session = makeSession();
  const panel = makePanel();
  PiPanel.restore(panel, () => session, FAKE_URI);
  PiPanel.createOrReveal(() => session, FAKE_URI);
  assert.equal(vscodeStub.window.__lastPanel, null, 'createOrReveal should not have called createWebviewPanel');
  assert.equal(panel.__revealed, true);
  panel.__triggerDispose();
});

test('PiPanel.restore clears the panel from the set on dispose', () => {
  const session = makeSession();
  const panel = makePanel();
  PiPanel.restore(panel, () => session, FAKE_URI);
  panel.__triggerDispose();
  PiPanel.createOrReveal(() => session, FAKE_URI);
  assert.ok(vscodeStub.window.__lastPanel, 'expected a new panel after restored panel was disposed');
});

test('Multiple PiPanel.restore calls create independent panels sharing the same session', () => {
  const session = makeSession();
  const panel1 = makePanel();
  const panel2 = makePanel();
  PiPanel.restore(panel1, () => session, FAKE_URI);
  PiPanel.restore(panel2, () => session, FAKE_URI);
  const attachCalls = session.__calls.filter((c) => c.type === 'attach');
  assert.equal(attachCalls.length, 2);
  assert.notEqual(attachCalls[0].id, attachCalls[1].id, 'each panel should have a distinct attachment ID');
  panel1.__triggerDispose();
  panel2.__triggerDispose();
});

test('Multiple restored panels each receive session messages independently', () => {
  const session = makeSession();
  const panel1 = makePanel();
  const panel2 = makePanel();
  PiPanel.restore(panel1, () => session, FAKE_URI);
  PiPanel.restore(panel2, () => session, FAKE_URI);
  const attachCalls = session.__calls.filter((c) => c.type === 'attach');
  attachCalls[0].send({ type: 'data', data: 'to-panel-1' });
  attachCalls[1].send({ type: 'data', data: 'to-panel-2' });
  assert.deepEqual(panel1.__posted.at(-1), { type: 'data', data: 'to-panel-1' });
  assert.deepEqual(panel2.__posted.at(-1), { type: 'data', data: 'to-panel-2' });
  panel1.__triggerDispose();
  panel2.__triggerDispose();
});

// --- split path ---

test('PiPanel.split creates a new WebviewPanel at ViewColumn.Beside', () => {
  const session = makeSession();
  PiPanel.createOrReveal(() => session, FAKE_URI);
  const firstPanel = vscodeStub.window.__lastPanel;
  PiPanel.split(() => session, FAKE_URI);
  const splitPanel = vscodeStub.window.__lastPanel;
  assert.notEqual(splitPanel, firstPanel, 'split should create a new panel');
  assert.equal(splitPanel.__viewColumn, vscodeStub.ViewColumn.Beside);
});

test('PiPanel.split attaches to the same session with a distinct ID', () => {
  const session = makeSession();
  PiPanel.createOrReveal(() => session, FAKE_URI);
  PiPanel.split(() => session, FAKE_URI);
  const attachCalls = session.__calls.filter((c) => c.type === 'attach');
  assert.equal(attachCalls.length, 2);
  assert.notEqual(attachCalls[0].id, attachCalls[1].id);
});

test('PiPanel.split is a no-op when no panels exist', () => {
  PiPanel.split(() => makeSession(), FAKE_URI);
  assert.equal(vscodeStub.window.__lastPanel, null, 'split should not create a panel when none exist');
});

test('PiPanel.split panel delivers session messages to its webview', () => {
  const session = makeSession();
  PiPanel.createOrReveal(() => session, FAKE_URI);
  PiPanel.split(() => session, FAKE_URI);
  const splitAttach = session.__calls.filter((c) => c.type === 'attach').at(-1);
  splitAttach.send({ type: 'scrollback', data: 'prior output' });
  assert.deepEqual(vscodeStub.window.__lastPanel.__posted.at(-1), { type: 'scrollback', data: 'prior output' });
});

test('PiPanel.split panel disposes independently leaving the original intact', () => {
  const session = makeSession();
  PiPanel.createOrReveal(() => session, FAKE_URI);
  const originalPanel = vscodeStub.window.__lastPanel;
  PiPanel.split(() => session, FAKE_URI);
  const splitPanel = vscodeStub.window.__lastPanel;
  splitPanel.__triggerDispose();
  PiPanel.createOrReveal(() => session, FAKE_URI);
  assert.equal(originalPanel.__revealed, true, 'createOrReveal should reveal the original panel after split is closed');
  assert.equal(vscodeStub.window.__allPanels.length, 2, 'no new panel should have been created');
});

// --- backfill on view-column change (split-editor interception) ---

test('Moving a Pi panel to a different column backfills the original column with a new panel', () => {
  const session = makeSession();
  PiPanel.createOrReveal(() => session, FAKE_URI);
  const originalPanel = vscodeStub.window.__lastPanel;
  assert.equal(originalPanel.viewColumn, vscodeStub.ViewColumn.One);

  originalPanel.__setViewColumn(2);

  const backfilledPanel = vscodeStub.window.__lastPanel;
  assert.notEqual(backfilledPanel, originalPanel, 'a new panel should have been created');
  assert.equal(backfilledPanel.viewColumn, vscodeStub.ViewColumn.One, 'backfilled panel should be at the original column');
});

test('Backfilled panel attaches to the same session with a distinct ID', () => {
  const session = makeSession();
  PiPanel.createOrReveal(() => session, FAKE_URI);
  vscodeStub.window.__lastPanel.__setViewColumn(2);

  const attachCalls = session.__calls.filter((c) => c.type === 'attach');
  assert.equal(attachCalls.length, 2);
  assert.notEqual(attachCalls[0].id, attachCalls[1].id);
});

test('No backfill when viewColumn stays the same', () => {
  const session = makeSession();
  PiPanel.createOrReveal(() => session, FAKE_URI);
  const panel = vscodeStub.window.__lastPanel;

  panel.__setVisible(false);
  panel.__setVisible(true);

  assert.equal(vscodeStub.window.__allPanels.length, 1, 'no extra panel should be created for visibility changes');
});
