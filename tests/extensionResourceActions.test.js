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
  let pickerCalls = 0;
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
    resolveExplorerEntries: async (resource, resources) => {
      const uris = resources && resources.length > 0
        ? resources
        : resource
          ? [resource]
          : [];
      return uris.map((entry) => ({ ...entry }));
    },
    pickResources: async (mode) => {
      pickerCalls += 1;
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

  return { deps, calls, warnings, getPickerCalls: () => pickerCalls };
}

test('explorer skill action uses selected SKILL.md files directly without opening a picker', async () => {
  const { deps, calls, getPickerCalls } = createDeps();
  const run = createResourceActionHandler(deps);

  await run('skill', undefined, [
    { scheme: 'file', fsPath: 'C:\\repo\\.pi\\skills\\review\\SKILL.md', isDirectory: false },
  ]);

  assert.equal(getPickerCalls(), 0);
  assert.deepEqual(calls, [[
    'cursor --wait',
    '--thinking low',
    'skill',
    ['C:\\repo\\.pi\\skills\\review'],
  ]]);
});

test('explorer template action rejects mixed selections instead of partially filtering them', async () => {
  const { deps, calls, warnings, getPickerCalls } = createDeps();
  const run = createResourceActionHandler(deps);

  await run('template', undefined, [
    { scheme: 'file', fsPath: 'C:\\repo\\.pi\\prompts\\review.md', isDirectory: false },
    { scheme: 'file', fsPath: 'C:\\repo\\.pi\\skills\\review\\SKILL.md', isDirectory: false },
  ]);

  assert.equal(getPickerCalls(), 0);
  assert.equal(calls.length, 0);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /selection/i);
});

test('explorer action rejects selections containing folders', async () => {
  const { deps, calls, warnings } = createDeps();
  const run = createResourceActionHandler(deps);

  await run('extension', undefined, [
    { scheme: 'file', fsPath: 'C:\\repo\\.pi\\extensions', isDirectory: true },
    { scheme: 'file', fsPath: 'C:\\repo\\.pi\\extensions\\helper.ts', isDirectory: false },
  ]);

  assert.equal(calls.length, 0);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /selection/i);
});

test('editor action uses the current resource file directly without opening a picker', async () => {
  const { deps, calls, getPickerCalls } = createDeps();
  const run = createResourceActionHandler(deps);

  await run('template', { scheme: 'file', fsPath: 'C:\\repo\\.pi\\prompts\\review.md' });

  assert.equal(getPickerCalls(), 0);
  assert.deepEqual(calls, [[
    'cursor --wait',
    '--thinking low',
    'prompt-template',
    ['C:\\repo\\.pi\\prompts\\review.md'],
  ]]);
});

test('editor action warns when the current file does not match the command mode', async () => {
  const { deps, calls, warnings } = createDeps();
  const run = createResourceActionHandler(deps);

  await run('extension', { scheme: 'file', fsPath: 'C:\\repo\\.pi\\prompts\\review.md' });

  assert.equal(calls.length, 0);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /current file|selection/i);
});

test('command palette uses the resource picker when there is no file context', async () => {
  let pickerCalls = 0;
  const { deps, calls } = createDeps({
    pickResources: async (mode) => {
      pickerCalls += 1;
      assert.equal(mode, 'skill');
      return ['C:\\repo\\.pi\\skills\\review', 'C:\\repo\\.pi\\skills\\refactor'];
    },
  });
  const run = createResourceActionHandler(deps);

  await run('skill');

  assert.equal(pickerCalls, 1);
  assert.deepEqual(calls, [[
    'cursor --wait',
    '--thinking low',
    'skill',
    [
      'C:\\repo\\.pi\\skills\\review',
      'C:\\repo\\.pi\\skills\\refactor',
    ],
  ]]);
});

test('command palette cancellation does not launch the terminal', async () => {
  const { deps, calls, warnings } = createDeps({
    pickResources: async () => undefined,
  });
  const run = createResourceActionHandler(deps);

  await run('template');

  assert.equal(calls.length, 0);
  assert.deepEqual(warnings, []);
});

test('command palette warns when no matching workspace resources are found', async () => {
  const { deps, calls, warnings } = createDeps({
    pickResources: async () => [],
  });
  const run = createResourceActionHandler(deps);

  await run('extension');

  assert.equal(calls.length, 0);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /extensions/i);
});
