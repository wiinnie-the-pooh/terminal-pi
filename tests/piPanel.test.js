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
  assert.equal(session.__calls[0].id, 'editor-panel');
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
