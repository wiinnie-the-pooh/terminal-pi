const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');
const path = require('node:path');
const {
  buildPiResourceArgs,
} = require('../out/piResourceArgs.js');

test('places default args before repeated skill flags', () => {
  assert.deepEqual(
    buildPiResourceArgs({
      defaultArgs: '--thinking low',
      mode: 'skill',
      resources: ['C:\\repo\\.pi\\skills\\review'],
    }),
    [
      '--thinking',
      'low',
      '--skill',
      'C:\\repo\\.pi\\skills\\review',
    ]
  );
});

test('repeats prompt-template flags for selected template files', () => {
  assert.deepEqual(
    buildPiResourceArgs({
      defaultArgs: '',
      mode: 'prompt-template',
      resources: ['C:\\repo\\.pi\\prompts\\review.md', 'C:\\repo\\.pi\\prompts\\fix.md'],
    }),
    [
      '--prompt-template',
      'C:\\repo\\.pi\\prompts\\review.md',
      '--prompt-template',
      'C:\\repo\\.pi\\prompts\\fix.md',
    ]
  );
});

test('repeats extension flags for selected TypeScript files', () => {
  assert.deepEqual(
    buildPiResourceArgs({
      defaultArgs: '',
      mode: 'extension',
      resources: ['C:\\repo\\.pi\\extensions\\one.ts', 'C:\\repo\\.pi\\extensions\\two.ts'],
    }),
    [
      '--extension',
      'C:\\repo\\.pi\\extensions\\one.ts',
      '--extension',
      'C:\\repo\\.pi\\extensions\\two.ts',
    ]
  );
});

test('deduplicates repeated resource paths while preserving order', () => {
  assert.deepEqual(
    buildPiResourceArgs({
      defaultArgs: '--model openai/gpt-4o',
      mode: 'skill',
      resources: [
        'C:\\repo\\.pi\\skills\\review',
        'C:\\repo\\.pi\\skills\\review',
        'C:\\repo\\.pi\\skills\\refactor',
        'C:\\repo\\.pi\\skills\\review',
      ],
    }),
    [
      '--model',
      'openai/gpt-4o',
      '--skill',
      'C:\\repo\\.pi\\skills\\review',
      '--skill',
      'C:\\repo\\.pi\\skills\\refactor',
    ]
  );
});

test('runWithResources passes built args into terminal creation without @ resource targets', async () => {
  const originalResolve = Module._resolveFilename;
  Module._resolveFilename = function (request, ...rest) {
    if (request === 'vscode') {
      return require.resolve('./__fixtures__/vscode-stub.js');
    }
    return originalResolve.call(this, request, ...rest);
  };

  try {
    const { PiTerminalManager } = require('../out/terminal.js');
    const stubContext = {
      subscriptions: [],
      extensionPath: '/fake/ext',
      workspaceState: { get: () => undefined, update: async () => {} },
    };
    const manager = new PiTerminalManager(stubContext);
    let capturedEditorCommand;
    let capturedArgs;

    manager.createAndShowTerminal = async (editorCommand, piArgs) => {
      capturedEditorCommand = editorCommand;
      capturedArgs = piArgs;
    };

    await manager.runWithResources(
      'cursor --wait',
      '--thinking low',
      'prompt-template',
      ['C:\\repo\\.pi\\prompts\\review.md', 'C:\\repo\\.pi\\prompts\\review.md']
    );

    assert.equal(capturedEditorCommand, 'cursor --wait');
    assert.deepEqual(capturedArgs, [
      '--extension',
      path.join('/fake/ext', 'extensions', 'vs-code-hotkeys', 'vs-code-hotkeys.js'),
      '--thinking',
      'low',
      '--prompt-template',
      'C:\\repo\\.pi\\prompts\\review.md',
    ]);
  } finally {
    Module._resolveFilename = originalResolve;
  }
});
