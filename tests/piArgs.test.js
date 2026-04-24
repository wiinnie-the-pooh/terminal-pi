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
