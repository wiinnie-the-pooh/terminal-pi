const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildPiResourceArgs,
} = require('../out/piResourceArgs.js');

test('places default args before target files and repeated skill flags', () => {
  assert.deepEqual(
    buildPiResourceArgs({
      defaultArgs: '--thinking low',
      targetFiles: ['C:\\repo\\a.ts', 'C:\\repo\\b.ts'],
      mode: 'skill',
      resources: ['C:\\repo\\.pi\\skills\\review'],
    }),
    [
      '--thinking',
      'low',
      '@C:\\repo\\a.ts',
      '@C:\\repo\\b.ts',
      '--skill',
      'C:\\repo\\.pi\\skills\\review',
    ]
  );
});

test('repeats prompt-template flags for selected template files', () => {
  assert.deepEqual(
    buildPiResourceArgs({
      defaultArgs: '',
      targetFiles: ['C:\\repo\\a.ts'],
      mode: 'prompt-template',
      resources: ['C:\\repo\\.pi\\prompts\\review.md', 'C:\\repo\\.pi\\prompts\\fix.md'],
    }),
    [
      '@C:\\repo\\a.ts',
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
      targetFiles: ['C:\\repo\\a.ts'],
      mode: 'extension',
      resources: ['C:\\repo\\.pi\\extensions\\one.ts', 'C:\\repo\\.pi\\extensions\\two.ts'],
    }),
    [
      '@C:\\repo\\a.ts',
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
      targetFiles: ['C:\\repo\\a.ts'],
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
      '@C:\\repo\\a.ts',
      '--skill',
      'C:\\repo\\.pi\\skills\\review',
      '--skill',
      'C:\\repo\\.pi\\skills\\refactor',
    ]
  );
});
