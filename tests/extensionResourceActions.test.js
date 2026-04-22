const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');

const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request === 'vscode') {
    return require.resolve('./__fixtures__/vscode-stub.js');
  }
  return originalResolve.call(this, request, ...rest);
};

const { createResourceActionHandler } = require('../out/extension.js');

function createDeps(overrides = {}) {
  const calls = [];
  const warnings = [];
  let chooserCalls = 0;
  const deps = {
    getConfig: () => ({
      defaultArgs: '--thinking low',
      editorCommand: 'cursor --wait',
      virtualEnvironmentOverride: true,
      virtualEnvironmentDrainMs: 150,
    }),
    terminalManager: {
      runWithResources: async (...args) => {
        calls.push(args);
      },
    },
    resolveExplorerEntries: async (_resource, resources) =>
      (resources ?? []).map((entry) => ({ ...entry })),
    getActiveEditorUri: () => ({ scheme: 'file', fsPath: 'C:\\repo\\active.ts' }),
    chooseWorkspaceFile: async () => {
      chooserCalls += 1;
      return 'C:\\repo\\picked.ts';
    },
    pickResources: async (mode) => {
      if (mode === 'skill') {
        return ['C:\\repo\\.pi\\skills\\review'];
      }
      if (mode === 'template') {
        return ['C:\\repo\\.pi\\prompts\\review.md'];
      }
      return ['C:\\repo\\.pi\\extensions\\helper.ts'];
    },
    warn: (message) => {
      warnings.push(message);
    },
    ...overrides,
  };

  return { deps, calls, warnings, getChooserCalls: () => chooserCalls };
}

test('Run Pi with Skill resolves target files and launches the Skill picker flow', async () => {
  const { deps, calls } = createDeps();
  const run = createResourceActionHandler(deps);

  await run('skill', undefined, [
    { scheme: 'file', fsPath: 'C:\\repo\\a.ts', isDirectory: false },
  ]);

  assert.deepEqual(calls, [[
    'cursor --wait',
    '--thinking low',
    ['C:\\repo\\a.ts'],
    'skill',
    ['C:\\repo\\.pi\\skills\\review'],
  ]]);
});

test('Run Pi with Template resolves target files and maps to prompt-template args', async () => {
  const { deps, calls } = createDeps();
  const run = createResourceActionHandler(deps);

  await run('template', undefined, [
    { scheme: 'file', fsPath: 'C:\\repo\\a.ts', isDirectory: false },
  ]);

  assert.deepEqual(calls, [[
    'cursor --wait',
    '--thinking low',
    ['C:\\repo\\a.ts'],
    'prompt-template',
    ['C:\\repo\\.pi\\prompts\\review.md'],
  ]]);
});

test('Run Pi with Extension resolves target files and launches the Extension picker flow', async () => {
  const { deps, calls } = createDeps();
  const run = createResourceActionHandler(deps);

  await run('extension', undefined, [
    { scheme: 'file', fsPath: 'C:\\repo\\a.ts', isDirectory: false },
  ]);

  assert.deepEqual(calls, [[
    'cursor --wait',
    '--thinking low',
    ['C:\\repo\\a.ts'],
    'extension',
    ['C:\\repo\\.pi\\extensions\\helper.ts'],
  ]]);
});

test('Explorer invocations ignore folders before launching', async () => {
  const { deps, calls, warnings } = createDeps();
  const run = createResourceActionHandler(deps);

  await run('skill', undefined, [
    { scheme: 'file', fsPath: 'C:\\repo\\folder', isDirectory: true },
    { scheme: 'file', fsPath: 'C:\\repo\\a.ts', isDirectory: false },
    { scheme: 'file', fsPath: 'C:\\repo\\b.ts', isDirectory: false },
  ]);

  assert.deepEqual(calls[0][2], ['C:\\repo\\a.ts', 'C:\\repo\\b.ts']);
  assert.deepEqual(warnings, []);
});

test('direct command invocation uses the active editor file when available', async () => {
  const { deps, calls, getChooserCalls } = createDeps();
  const run = createResourceActionHandler(deps);

  await run('skill');

  assert.equal(getChooserCalls(), 0);
  assert.deepEqual(calls[0][2], ['C:\\repo\\active.ts']);
});

test('direct command invocation falls back to workspace file Quick Pick when there is no active editor file', async () => {
  const { deps, calls, getChooserCalls } = createDeps({
    getActiveEditorUri: () => undefined,
  });
  const run = createResourceActionHandler(deps);

  await run('skill');

  assert.equal(getChooserCalls(), 1);
  assert.deepEqual(calls[0][2], ['C:\\repo\\picked.ts']);
});

test('cancelling target-file or resource selection does not launch the terminal', async () => {
  const first = createDeps({
    getActiveEditorUri: () => undefined,
    chooseWorkspaceFile: async () => undefined,
  });
  const runFirst = createResourceActionHandler(first.deps);
  await runFirst('skill');
  assert.equal(first.calls.length, 0);

  const second = createDeps({
    pickResources: async () => undefined,
  });
  const runSecond = createResourceActionHandler(second.deps);
  await runSecond('skill');
  assert.equal(second.calls.length, 0);
});
