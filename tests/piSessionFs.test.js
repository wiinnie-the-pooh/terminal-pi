const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');

const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request === 'vscode') return require.resolve('./__fixtures__/vscode-webview-stub.js');
  return originalResolve.call(this, request, ...rest);
};

const vscodeStub = require('./__fixtures__/vscode-webview-stub.js');
const { PiSessionFs } = require('../out/piSessionFs.js');

test('PiSessionFs exposes a read-only empty session file', () => {
  const provider = new PiSessionFs();

  assert.equal(typeof provider.onDidChangeFile, 'function');
  assert.deepEqual(provider.stat(), {
    type: vscodeStub.FileType.File,
    ctime: 0,
    mtime: 0,
    size: 0,
  });
  assert.deepEqual(provider.readDirectory(), []);
  assert.deepEqual(provider.readFile(), new Uint8Array());
});

test('PiSessionFs write operations and watcher are disposable no-ops', () => {
  const provider = new PiSessionFs();
  const watcher = provider.watch();

  assert.doesNotThrow(() => watcher.dispose());
  assert.doesNotThrow(() => provider.createDirectory());
  assert.doesNotThrow(() => provider.writeFile());
  assert.doesNotThrow(() => provider.delete());
  assert.doesNotThrow(() => provider.rename());
});
