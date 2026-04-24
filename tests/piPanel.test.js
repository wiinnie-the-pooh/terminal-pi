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
