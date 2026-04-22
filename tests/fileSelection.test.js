const test = require('node:test');
const assert = require('node:assert/strict');
const {
  filterExplorerFileTargets,
  getActiveEditorFilePath,
  resolveCommandTargetFile,
} = require('../out/fileSelection.js');

test('filterExplorerFileTargets ignores directories and deduplicates file paths', () => {
  assert.deepEqual(
    filterExplorerFileTargets([
      { scheme: 'file', fsPath: 'C:\\repo\\a.ts', isDirectory: false },
      { scheme: 'file', fsPath: 'C:\\repo\\folder', isDirectory: true },
      { scheme: 'file', fsPath: 'C:\\repo\\a.ts', isDirectory: false },
      { scheme: 'untitled', fsPath: 'C:\\repo\\scratch.ts', isDirectory: false },
      { scheme: 'file', fsPath: 'C:\\repo\\b.ts', isDirectory: false },
    ]),
    ['C:\\repo\\a.ts', 'C:\\repo\\b.ts']
  );
});

test('getActiveEditorFilePath returns the file-backed active document path', () => {
  assert.equal(
    getActiveEditorFilePath({ scheme: 'file', fsPath: 'C:\\repo\\active.ts' }),
    'C:\\repo\\active.ts'
  );
});

test('getActiveEditorFilePath rejects non-file-backed active documents', () => {
  assert.equal(
    getActiveEditorFilePath({ scheme: 'untitled', fsPath: 'C:\\repo\\scratch.ts' }),
    undefined
  );
  assert.equal(getActiveEditorFilePath(undefined), undefined);
});

test('resolveCommandTargetFile prefers the active editor file when available', async () => {
  let chooserCalls = 0;

  const result = await resolveCommandTargetFile({
    activeEditorUri: { scheme: 'file', fsPath: 'C:\\repo\\active.ts' },
    chooseWorkspaceFile: async () => {
      chooserCalls += 1;
      return 'C:\\repo\\picked.ts';
    },
  });

  assert.equal(result, 'C:\\repo\\active.ts');
  assert.equal(chooserCalls, 0);
});

test('resolveCommandTargetFile falls back to the workspace picker when no active file exists', async () => {
  let chooserCalls = 0;

  const result = await resolveCommandTargetFile({
    activeEditorUri: undefined,
    chooseWorkspaceFile: async () => {
      chooserCalls += 1;
      return 'C:\\repo\\picked.ts';
    },
  });

  assert.equal(result, 'C:\\repo\\picked.ts');
  assert.equal(chooserCalls, 1);
});

test('resolveCommandTargetFile returns undefined when the workspace picker is cancelled', async () => {
  const result = await resolveCommandTargetFile({
    activeEditorUri: { scheme: 'untitled', fsPath: 'C:\\repo\\scratch.ts' },
    chooseWorkspaceFile: async () => undefined,
  });

  assert.equal(result, undefined);
});
