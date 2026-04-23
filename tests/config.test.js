const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');

const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request === 'vscode') {
    return require.resolve('./__fixtures__/vscode-config-stub.js');
  }
  return originalResolve.call(this, request, ...rest);
};

const vscodeStub = require('./__fixtures__/vscode-config-stub.js');
const { getConfig, sanitizeDrainMs } = require('../out/config.js');

test('editorCommand defaults to an empty string so the extension can auto-detect it', () => {
  vscodeStub.__setConfigValues({});

  const cfg = getConfig();

  assert.equal(cfg.editorCommand, '');
});

test('editorCommand preserves an explicit configured value', () => {
  vscodeStub.__setConfigValues({ editorCommand: 'cursor --wait' });

  const cfg = getConfig();

  assert.equal(cfg.editorCommand, 'cursor --wait');
});

test('virtualEnvironmentOverride defaults to true', () => {
  vscodeStub.__setConfigValues({});

  const cfg = getConfig();

  assert.equal(cfg.virtualEnvironmentOverride, true);
});

test('virtualEnvironmentOverride preserves an explicit false value', () => {
  vscodeStub.__setConfigValues({ virtualEnvironmentOverride: false });

  const cfg = getConfig();

  assert.equal(cfg.virtualEnvironmentOverride, false);
});

test('virtualEnvironmentDrainMs defaults to 150', () => {
  vscodeStub.__setConfigValues({});

  const cfg = getConfig();

  assert.equal(cfg.virtualEnvironmentDrainMs, 150);
});

test('virtualEnvironmentDrainMs preserves an explicit configured value', () => {
  vscodeStub.__setConfigValues({ virtualEnvironmentDrainMs: 500 });

  const cfg = getConfig();

  assert.equal(cfg.virtualEnvironmentDrainMs, 500);
});

for (const { input, expected, label } of [
  { input: NaN, expected: 150, label: 'NaN' },
  { input: Infinity, expected: 150, label: 'Infinity' },
  { input: -Infinity, expected: 150, label: '-Infinity' },
  { input: -1, expected: 150, label: 'negative' },
  { input: 0, expected: 0, label: 'zero' },
  { input: 150, expected: 150, label: 'valid value' },
  { input: 10_001, expected: 10_000, label: 'above max clamp' },
  { input: 10_000, expected: 10_000, label: 'at max boundary' },
]) {
  test(`sanitizeDrainMs handles ${label}`, () => {
    assert.equal(sanitizeDrainMs(input), expected);
  });
}
