const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');

const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request === 'vscode') return require.resolve('./__fixtures__/vscode-stub.js');
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
