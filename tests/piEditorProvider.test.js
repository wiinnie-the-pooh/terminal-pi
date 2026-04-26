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
const { PiEditorProvider } = require('../out/piEditorProvider.js');

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

afterEach(() => {
  vscodeStub.commands.__executed = [];
});

test('PiEditorProvider.openCustomDocument returns a disposable document for the URI', () => {
  const provider = new PiEditorProvider(() => makeSession(), FAKE_URI);
  const document = provider.openCustomDocument(PiEditorProvider.sessionUri);

  assert.equal(document.uri, PiEditorProvider.sessionUri);
  assert.doesNotThrow(() => document.dispose());
});

test('PiEditorProvider.resolveCustomEditor sets html on the panel webview', () => {
  const provider = new PiEditorProvider(() => makeSession(), FAKE_URI);
  const panel = makePanel();
  provider.resolveCustomEditor({ uri: PiEditorProvider.sessionUri }, panel, {});

  assert.ok(panel.webview.html.includes('<!DOCTYPE html>'));
});

test('PiEditorProvider.resolveCustomEditor attaches through PiSession.attachView', () => {
  const session = makeSession();
  const provider = new PiEditorProvider(() => session, FAKE_URI);
  provider.resolveCustomEditor({ uri: PiEditorProvider.sessionUri }, makePanel(), {});

  assert.equal(session.__calls[0].type, 'attach');
  assert.ok(session.__calls[0].id.startsWith('editor-panel-'));
});

test('PiEditorProvider forwards PiSession messages to the webview', () => {
  const session = makeSession();
  const provider = new PiEditorProvider(() => session, FAKE_URI);
  const panel = makePanel();
  provider.resolveCustomEditor({ uri: PiEditorProvider.sessionUri }, panel, {});

  session.__calls[0].send({ type: 'data', data: 'hello' });

  assert.deepEqual(panel.__posted, [{ type: 'data', data: 'hello' }]);
});

test('PiEditorProvider marks the editor viewport visible when resolved', () => {
  const session = makeSession();
  const provider = new PiEditorProvider(() => session, FAKE_URI);
  provider.resolveCustomEditor({ uri: PiEditorProvider.sessionUri }, makePanel(), {});

  assert.deepEqual(session.__calls.find((call) => call.type === 'visible'), { type: 'visible', value: true });
});

test('PiEditorProvider reports panel visibility changes to the attachment', () => {
  const session = makeSession();
  const provider = new PiEditorProvider(() => session, FAKE_URI);
  const panel = makePanel();
  provider.resolveCustomEditor({ uri: PiEditorProvider.sessionUri }, panel, {});

  panel.__setVisible(false);
  panel.__setVisible(true);

  assert.deepEqual(
    session.__calls.filter((call) => call.type === 'visible'),
    [
      { type: 'visible', value: true },
      { type: 'visible', value: false },
      { type: 'visible', value: true },
    ],
  );
});

test('PiEditorProvider forwards input messages to session.write', () => {
  const session = makeSession();
  const provider = new PiEditorProvider(() => session, FAKE_URI);
  const panel = makePanel();
  provider.resolveCustomEditor({ uri: PiEditorProvider.sessionUri }, panel, {});

  panel.__triggerMessage({ type: 'input', data: 'hi' });

  assert.deepEqual(session.__calls.filter((call) => call.type === 'write'), [{ type: 'write', data: 'hi' }]);
});

test('PiEditorProvider forwards resize messages to attachment.setSize', () => {
  const session = makeSession();
  const provider = new PiEditorProvider(() => session, FAKE_URI);
  const panel = makePanel();
  provider.resolveCustomEditor({ uri: PiEditorProvider.sessionUri }, panel, {});

  panel.__triggerMessage({ type: 'resize', cols: 80, rows: 24 });

  assert.deepEqual(session.__calls.filter((call) => call.type === 'size'), [{ type: 'size', cols: 80, rows: 24 }]);
  assert.equal(session.__calls.some((call) => call.type === 'legacy-resize'), false);
});

test('PiEditorProvider detaches from PiSession on dispose', () => {
  const session = makeSession();
  const provider = new PiEditorProvider(() => session, FAKE_URI);
  const panel = makePanel();
  provider.resolveCustomEditor({ uri: PiEditorProvider.sessionUri }, panel, {});

  panel.__triggerDispose();

  assert.deepEqual(session.__calls.at(-1), { type: 'dispose' });
});

test('PiEditorProvider.revealOrOpen reveals an existing panel instead of opening a new one', () => {
  const session = makeSession();
  const provider = new PiEditorProvider(() => session, FAKE_URI);
  const panel = makePanel();
  provider.resolveCustomEditor({ uri: PiEditorProvider.sessionUri }, panel, {});

  provider.revealOrOpen();

  assert.equal(panel.__revealed, true);
  assert.deepEqual(vscodeStub.commands.__executed, []);
});

test('PiEditorProvider.revealOrOpen opens the session URI with the custom editor when no panel exists', () => {
  const provider = new PiEditorProvider(() => makeSession(), FAKE_URI);

  provider.revealOrOpen();

  assert.deepEqual(vscodeStub.commands.__executed, [
    {
      command: 'vscode.openWith',
      args: [PiEditorProvider.sessionUri, PiEditorProvider.viewType],
    },
  ]);
});

test('Two PiEditorProvider.resolveCustomEditor calls attach independent panels to the same session', () => {
  const session = makeSession();
  const provider = new PiEditorProvider(() => session, FAKE_URI);
  const panel1 = makePanel();
  const panel2 = makePanel();

  provider.resolveCustomEditor({ uri: PiEditorProvider.sessionUri }, panel1, {});
  provider.resolveCustomEditor({ uri: PiEditorProvider.sessionUri }, panel2, {});

  const attachCalls = session.__calls.filter((call) => call.type === 'attach');
  assert.equal(attachCalls.length, 2);
  assert.notEqual(attachCalls[0].id, attachCalls[1].id);

  attachCalls[0].send({ type: 'data', data: 'to-panel-1' });
  attachCalls[1].send({ type: 'data', data: 'to-panel-2' });
  assert.deepEqual(panel1.__posted.at(-1), { type: 'data', data: 'to-panel-1' });
  assert.deepEqual(panel2.__posted.at(-1), { type: 'data', data: 'to-panel-2' });
});
