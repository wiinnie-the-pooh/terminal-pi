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
