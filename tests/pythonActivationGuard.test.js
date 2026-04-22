const test = require('node:test');
const assert = require('node:assert/strict');

// Stub the 'vscode' module *before* loading the compiled guard, since it
// touches `vscode.ConfigurationTarget` at module load time.
const Module = require('module');
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request === 'vscode') {
    return require.resolve('./__fixtures__/vscode-stub.js');
  }
  return originalResolve.call(this, request, ...rest);
};

const { decideRestoreState } = require('../out/pythonActivationGuard.js');
const { ConfigurationTarget } = require('./__fixtures__/vscode-stub.js');

test('uses Workspace scope with workspaceValue when a workspace is open', () => {
  const result = decideRestoreState(
    { workspaceValue: true, globalValue: false },
    true,
  );
  assert.equal(result.target, ConfigurationTarget.Workspace);
  assert.equal(result.previousValue, true);
});

test('uses Global scope with globalValue when no workspace is open', () => {
  const result = decideRestoreState(
    { workspaceValue: true, globalValue: false },
    false,
  );
  assert.equal(result.target, ConfigurationTarget.Global);
  assert.equal(result.previousValue, false);
});

test('preserves undefined (unset) previousValue for clean restore', () => {
  const workspaceResult = decideRestoreState({}, true);
  assert.equal(workspaceResult.target, ConfigurationTarget.Workspace);
  assert.equal(workspaceResult.previousValue, undefined);

  const globalResult = decideRestoreState(undefined, false);
  assert.equal(globalResult.target, ConfigurationTarget.Global);
  assert.equal(globalResult.previousValue, undefined);
});
