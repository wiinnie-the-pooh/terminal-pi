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
    __calls: calls,
  };
}

function makeWebviewView() {
  let messageHandler = null;
  let disposeHandler = null;
  let visibilityHandler = null;
  const posted = [];
  const view = {
    visible: true,
    webview: {
      options: {},
      html: '',
      cspSource: 'test-csp',
      asWebviewUri(uri) { return { toString: () => `webview:${uri.path}` }; },
      onDidReceiveMessage(h) { messageHandler = h; return { dispose: () => {} }; },
      postMessage(m) { posted.push(m); },
    },
    onDidDispose(h) { disposeHandler = h; return { dispose: () => {} }; },
    onDidChangeVisibility(h) { visibilityHandler = h; return { dispose: () => {} }; },
    __triggerMessage(msg) { messageHandler?.(msg); },
    __triggerDispose() { disposeHandler?.(); },
    __setVisible(value) {
      view.visible = value;
      visibilityHandler?.();
    },
    __posted: posted,
  };
  return view;
}

const FAKE_URI = { path: '/fake/ext' };

test('PiSidebarProvider.resolveWebviewView enables scripts on the webview', () => {
  const provider = new PiSidebarProvider(() => makeSession(), FAKE_URI);
  const view = makeWebviewView();
  provider.resolveWebviewView(view);
  assert.equal(view.webview.options.enableScripts, true);
});

test('PiSidebarProvider.resolveWebviewView sets html on the webview', () => {
  const provider = new PiSidebarProvider(() => makeSession(), FAKE_URI);
  const view = makeWebviewView();
  provider.resolveWebviewView(view);
  assert.ok(view.webview.html.includes('<!DOCTYPE html>'));
});

test('PiSidebarProvider attaches the webview to PiSession with a stable view id', () => {
  const session = makeSession();
  const provider = new PiSidebarProvider(() => session, FAKE_URI);
  const view = makeWebviewView();
  provider.resolveWebviewView(view);
  assert.equal(session.__calls[0].type, 'attach');
  assert.equal(session.__calls[0].id, 'assistant-sidebar');
});

test('PiSidebarProvider sends PiSession messages to the webview', () => {
  const session = makeSession();
  const provider = new PiSidebarProvider(() => session, FAKE_URI);
  const view = makeWebviewView();
  provider.resolveWebviewView(view);
  session.__calls[0].send({ type: 'data', data: 'hello' });
  assert.deepEqual(view.__posted, [{ type: 'data', data: 'hello' }]);
});

test('PiSidebarProvider marks the webview visible when resolved', () => {
  const session = makeSession();
  const provider = new PiSidebarProvider(() => session, FAKE_URI);
  const view = makeWebviewView();
  provider.resolveWebviewView(view);
  assert.deepEqual(session.__calls.find((call) => call.type === 'visible'), { type: 'visible', value: true });
});

test('PiSidebarProvider reports visibility changes to the attachment', () => {
  const session = makeSession();
  const provider = new PiSidebarProvider(() => session, FAKE_URI);
  const view = makeWebviewView();
  provider.resolveWebviewView(view);
  view.__setVisible(false);
  view.__setVisible(true);
  assert.deepEqual(
    session.__calls.filter((call) => call.type === 'visible'),
    [
      { type: 'visible', value: true },
      { type: 'visible', value: false },
      { type: 'visible', value: true },
    ],
  );
});

test('PiSidebarProvider forwards input messages to session.write', () => {
  const session = makeSession();
  const provider = new PiSidebarProvider(() => session, FAKE_URI);
  const view = makeWebviewView();
  provider.resolveWebviewView(view);
  view.__triggerMessage({ type: 'input', data: 'hello' });
  assert.deepEqual(session.__calls.filter((call) => call.type === 'write'), [{ type: 'write', data: 'hello' }]);
});

test('PiSidebarProvider forwards resize messages to attachment.setSize', () => {
  const session = makeSession();
  const provider = new PiSidebarProvider(() => session, FAKE_URI);
  const view = makeWebviewView();
  provider.resolveWebviewView(view);
  view.__triggerMessage({ type: 'resize', cols: 100, rows: 30 });
  assert.deepEqual(session.__calls.filter((call) => call.type === 'size'), [{ type: 'size', cols: 100, rows: 30 }]);
});

test('PiSidebarProvider detaches from PiSession on dispose', () => {
  const session = makeSession();
  const provider = new PiSidebarProvider(() => session, FAKE_URI);
  const view = makeWebviewView();
  provider.resolveWebviewView(view);
  view.__triggerDispose();
  assert.deepEqual(session.__calls.at(-1), { type: 'dispose' });
});
