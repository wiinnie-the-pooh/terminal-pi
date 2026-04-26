const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('module');

const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request === 'vscode') return require.resolve('./__fixtures__/vscode-stub.js');
  return originalResolve.call(this, request, ...rest);
};

const { buildPiSessionArgs } = require('../out/extension.js');

const EXT_PATH = path.join('/fake', 'ext');

test('buildPiSessionArgs places piLauncher.js as the first argument', () => {
  const args = buildPiSessionArgs(EXT_PATH, '');
  assert.equal(args[0], path.join(EXT_PATH, 'out', 'piLauncher.js'));
});

test('buildPiSessionArgs places --session as the second argument', () => {
  const args = buildPiSessionArgs(EXT_PATH, '');
  assert.equal(args[1], '--session');
});

test('buildPiSessionArgs places a UUID as the third argument', () => {
  const args = buildPiSessionArgs(EXT_PATH, '');
  assert.match(args[2], /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
});

test('buildPiSessionArgs appends tokenized pi args after the session UUID', () => {
  const args = buildPiSessionArgs(EXT_PATH, '--thinking low');
  assert.deepEqual(args.slice(3), [
    '--thinking',
    'low',
    '--extension',
    path.join(EXT_PATH, 'extensions', 'vs-code-hotkeys', 'vs-code-hotkeys.js'),
  ]);
});

test('buildPiSessionArgs generates a unique UUID on each call', () => {
  const args1 = buildPiSessionArgs(EXT_PATH, '');
  const args2 = buildPiSessionArgs(EXT_PATH, '');
  assert.notEqual(args1[2], args2[2]);
});

test('buildPiSessionArgs uses provided sessionId instead of generating a new UUID', () => {
  const fixedId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  const args = buildPiSessionArgs(EXT_PATH, '', fixedId);
  assert.equal(args[2], fixedId);
});

test('buildPiSessionArgs with provided sessionId still generates UUID when called again without one', () => {
  const fixedId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  const args1 = buildPiSessionArgs(EXT_PATH, '', fixedId);
  const args2 = buildPiSessionArgs(EXT_PATH, '');
  assert.equal(args1[2], fixedId);
  assert.match(args2[2], /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  assert.notEqual(args2[2], fixedId);
});
