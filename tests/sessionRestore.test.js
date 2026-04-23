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

const { PiTerminalManager } = require('../out/terminal.js');

function makeContext(initial = []) {
  const map = new Map();
  if (initial.length > 0) {
    map.set('piDock.sessions', initial);
  }
  return {
    subscriptions: [],
    workspaceState: {
      get: (key) => map.get(key),
      update: async (key, value) => { map.set(key, value); },
    },
  };
}

function makeManager(context) {
  const manager = new PiTerminalManager(context);
  const calls = [];
  // Monkey-patch private method to capture calls without touching VS Code APIs.
  manager.createAndShowTerminal = async (editorCommand, piArgs, sessionDir) => {
    calls.push({ editorCommand, piArgs, sessionDir });
  };
  manager._calls = calls;
  return manager;
}

test('restoreSessions does nothing when store is empty', async () => {
  const ctx = makeContext([]);
  const manager = makeManager(ctx);

  await manager.restoreSessions('', 'code --wait');

  assert.deepEqual(manager._calls, []);
});

test('restoreSessions clears the store before reopening', async () => {
  const { appendSession, loadSessions } = require('../out/sessionStore.js');
  const ctx = makeContext();
  await appendSession(ctx, { sessionDir: '/tmp/nonexistent-xyz-123', createdAt: '2024-01-01T00:00:00.000Z', piArgs: [] });

  const manager = makeManager(ctx);
  await manager.restoreSessions('', 'code --wait');

  // Store is cleared (session dir does not exist so terminal was skipped, but store was cleared)
  assert.deepEqual(loadSessions(ctx), []);
});

test('restoreSessions skips session whose sessionDir does not exist', async () => {
  const ctx = makeContext([
    { sessionDir: '/tmp/definitely-does-not-exist-xyz-abc', createdAt: '2024-01-01T00:00:00.000Z', piArgs: [] },
  ]);
  const manager = makeManager(ctx);

  await manager.restoreSessions('', 'code --wait');

  assert.equal(manager._calls.length, 0);
});

test('restoreSessions opens terminal with --continue for existing sessionDir', async () => {
  const os = require('node:os');
  const path = require('node:path');
  const fs = require('node:fs');

  const dir = path.join(os.tmpdir(), 'pi-restore-test-' + Date.now());
  fs.mkdirSync(dir, { recursive: true });

  try {
    const ctx = makeContext([
      { sessionDir: dir, createdAt: '2024-01-01T00:00:00.000Z', piArgs: ['--skill', '/some/skill'] },
    ]);
    const manager = makeManager(ctx);

    await manager.restoreSessions('--thinking low', 'code --wait');

    assert.equal(manager._calls.length, 1);
    assert.equal(manager._calls[0].sessionDir, dir);
    assert.equal(manager._calls[0].editorCommand, 'code --wait');
    // --continue first, then current defaultArgs, then stored piArgs
    assert.deepEqual(manager._calls[0].piArgs, [
      '--continue',
      '--thinking',
      'low',
      '--skill',
      '/some/skill',
    ]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('restoreSessions restores multiple sessions in order', async () => {
  const os = require('node:os');
  const path = require('node:path');
  const fs = require('node:fs');

  const dir1 = path.join(os.tmpdir(), 'pi-restore-multi-1-' + Date.now());
  const dir2 = path.join(os.tmpdir(), 'pi-restore-multi-2-' + Date.now());
  fs.mkdirSync(dir1, { recursive: true });
  fs.mkdirSync(dir2, { recursive: true });

  try {
    const ctx = makeContext([
      { sessionDir: dir1, createdAt: '2024-01-01T00:00:00.000Z', piArgs: [] },
      { sessionDir: dir2, createdAt: '2024-01-02T00:00:00.000Z', piArgs: [] },
    ]);
    const manager = makeManager(ctx);

    await manager.restoreSessions('', 'code --wait');

    assert.equal(manager._calls.length, 2);
    assert.equal(manager._calls[0].sessionDir, dir1);
    assert.equal(manager._calls[1].sessionDir, dir2);
  } finally {
    fs.rmSync(dir1, { recursive: true, force: true });
    fs.rmSync(dir2, { recursive: true, force: true });
  }
});

test('runInteractive passes default args into terminal creation', async () => {
  const ctx = makeContext();
  const manager = makeManager(ctx);

  await manager.runInteractive('--thinking low', 'code --wait');

  assert.equal(manager._calls.length, 1);
  assert.equal(manager._calls[0].editorCommand, 'code --wait');
  assert.deepEqual(manager._calls[0].piArgs, ['--thinking', 'low']);
});

test('runInteractive handles empty default args', async () => {
  const ctx = makeContext();
  const manager = makeManager(ctx);

  await manager.runInteractive('', 'code --wait');

  assert.equal(manager._calls.length, 1);
  assert.deepEqual(manager._calls[0].piArgs, []);
});

test('runWithPrompt appends file path and extra context', async () => {
  const ctx = makeContext();
  const manager = makeManager(ctx);

  await manager.runWithPrompt('code --wait', '--thinking low', 'C:\\repo\\prompt.md', 'extra context');

  assert.equal(manager._calls.length, 1);
  assert.deepEqual(manager._calls[0].piArgs, [
    '--thinking',
    'low',
    '@C:\\repo\\prompt.md',
    'extra context',
  ]);
});

test('runWithPrompt omits extra context when empty or whitespace-only', async () => {
  const ctx = makeContext();
  const manager = makeManager(ctx);

  await manager.runWithPrompt('code --wait', '', 'C:\\repo\\prompt.md', '   ');

  assert.equal(manager._calls.length, 1);
  assert.deepEqual(manager._calls[0].piArgs, ['@C:\\repo\\prompt.md']);
});

test('removeSession removes only the matching session -- close handler behavior', async () => {
  // The onDidCloseTerminal handler calls removeSession(ctx, createdAt).
  // This test verifies that removeSession removes the right entry,
  // leaving other sessions intact (mirrors the close handler's effect).
  const { loadSessions, appendSession, removeSession } = require('../out/sessionStore.js');
  const ctx = makeContext();

  await appendSession(ctx, { sessionDir: '/tmp/a', createdAt: '2024-06-01T00:00:00.000Z', piArgs: [] });
  await appendSession(ctx, { sessionDir: '/tmp/b', createdAt: '2024-06-02T00:00:00.000Z', piArgs: [] });

  await removeSession(ctx, '2024-06-01T00:00:00.000Z');

  const remaining = loadSessions(ctx);
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].createdAt, '2024-06-02T00:00:00.000Z');
});
