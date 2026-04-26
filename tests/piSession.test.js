const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');

const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request === 'vscode') return require.resolve('./__fixtures__/vscode-stub.js');
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

test('PiSession spawns PTY with the provided cwd', () => {
  const config = { ...CONFIG, cwd: '/workspace/project' };
  new PiSession(config, ptyStub.spawn);
  assert.equal(ptyStub.__calls.spawn[0].opts.cwd, '/workspace/project');
});

test('PiSession spawns PTY with undefined cwd when not provided', () => {
  new PiSession(CONFIG, ptyStub.spawn);
  assert.equal(ptyStub.__calls.spawn[0].opts.cwd, undefined);
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

// --- Visible attachment sizing ---

test('PiSession.attachView immediately delivers scrollback replay', () => {
  const s = new PiSession(CONFIG, ptyStub.spawn);
  ptyStub.__simulateData('prior output');
  const received = [];
  s.attachView('assistant', msg => received.push(msg));
  const scrollbackMsgs = received.filter(m => m.type === 'scrollback');
  assert.equal(scrollbackMsgs.length, 1);
  assert.equal(scrollbackMsgs[0].data, 'prior output');
});

test('PiSession.attachView receives data messages as PTY produces output', () => {
  const s = new PiSession(CONFIG, ptyStub.spawn);
  const received = [];
  s.attachView('assistant', msg => received.push(msg));
  ptyStub.__simulateData('foo');
  assert.deepEqual(received.filter(m => m.type === 'data'), [{ type: 'data', data: 'foo' }]);
});

test('PiSession.attachView dispose stops future data messages', () => {
  const s = new PiSession(CONFIG, ptyStub.spawn);
  const received = [];
  const view = s.attachView('assistant', msg => received.push(msg));
  view.dispose();
  ptyStub.__simulateData('after dispose');
  assert.equal(received.filter(m => m.type === 'data').length, 0);
});

test('PiSession ignores hidden attachments when computing PTY size', () => {
  const s = new PiSession(CONFIG, ptyStub.spawn);
  const a = s.attachView('sidebar', () => {});
  const b = s.attachView('panel', () => {});

  a.setVisible(true);
  a.setSize(81, 24);
  b.setVisible(false);
  b.setSize(120, 40);

  assert.deepEqual(ptyStub.__calls.resize.at(-1), { cols: 81, rows: 24 });
});

test('PiSession chooses the narrowest visible width across attached views', () => {
  const s = new PiSession(CONFIG, ptyStub.spawn);
  const a = s.attachView('assistant', () => {});
  const b = s.attachView('editor', () => {});

  a.setVisible(true);
  a.setSize(88, 30);
  b.setVisible(true);
  b.setSize(140, 50);

  assert.deepEqual(ptyStub.__calls.resize.at(-1), { cols: 88, rows: 30 });
});

test('PiSession updates PTY size when the narrowest visible view becomes hidden', () => {
  const s = new PiSession(CONFIG, ptyStub.spawn);
  const a = s.attachView('assistant', () => {});
  const b = s.attachView('editor', () => {});

  a.setVisible(true);
  a.setSize(80, 24);
  b.setVisible(true);
  b.setSize(120, 40);
  a.setVisible(false);

  assert.deepEqual(ptyStub.__calls.resize.at(-1), { cols: 120, rows: 40 });
});

test('PiSession chooses a later attached view when it is the narrowest visible view', () => {
  const s = new PiSession(CONFIG, ptyStub.spawn);
  const wide = s.attachView('editor', () => {});
  const narrow = s.attachView('assistant', () => {});

  wide.setVisible(true);
  wide.setSize(140, 50);
  narrow.setVisible(true);
  narrow.setSize(88, 30);

  assert.deepEqual(ptyStub.__calls.resize.at(-1), { cols: 88, rows: 30 });
});

test('PiSession chooses the shorter visible view when widths match', () => {
  const s = new PiSession(CONFIG, ptyStub.spawn);
  const taller = s.attachView('editor', () => {});
  const shorter = s.attachView('assistant', () => {});

  taller.setVisible(true);
  taller.setSize(100, 50);
  shorter.setVisible(true);
  shorter.setSize(100, 25);

  assert.deepEqual(ptyStub.__calls.resize.at(-1), { cols: 100, rows: 25 });
});

test('PiSession keeps the previous PTY size when no views are visible', () => {
  const s = new PiSession(CONFIG, ptyStub.spawn);
  const a = s.attachView('assistant', () => {});

  a.setVisible(true);
  a.setSize(90, 25);
  const before = ptyStub.__calls.resize.length;
  a.setVisible(false);

  assert.equal(ptyStub.__calls.resize.length, before);
});

test('PiSession avoids duplicate PTY resize calls when effective size is unchanged', () => {
  const s = new PiSession(CONFIG, ptyStub.spawn);
  const a = s.attachView('assistant', () => {});

  a.setVisible(true);
  a.setSize(90, 25);
  const before = ptyStub.__calls.resize.length;
  a.setSize(90, 25);

  assert.equal(ptyStub.__calls.resize.length, before);
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
