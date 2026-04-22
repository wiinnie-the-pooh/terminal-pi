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

const {
  loadSessions,
  appendSession,
  removeSession,
  clearSessions,
} = require('../out/sessionStore.js');

function makeStore(initial = []) {
  const map = new Map();
  if (initial.length > 0) {
    map.set('piDock.sessions', initial);
  }
  return {
    workspaceState: {
      get: (key) => map.get(key),
      update: async (key, value) => { map.set(key, value); },
    },
  };
}

test('loadSessions returns empty array when nothing stored', () => {
  const store = makeStore();
  assert.deepEqual(loadSessions(store), []);
});

test('appendSession persists a session and loadSessions reads it back', async () => {
  const store = makeStore();
  const s = { sessionDir: '/tmp/a', createdAt: '2024-01-01T00:00:00.000Z', piArgs: ['--thinking', 'low'] };

  await appendSession(store, s);

  assert.deepEqual(loadSessions(store), [s]);
});

test('appendSession accumulates multiple sessions in insertion order', async () => {
  const store = makeStore();
  const s1 = { sessionDir: '/tmp/a', createdAt: '2024-01-01T00:00:00.000Z', piArgs: [] };
  const s2 = { sessionDir: '/tmp/b', createdAt: '2024-01-02T00:00:00.000Z', piArgs: ['--skill', '/some/path'] };

  await appendSession(store, s1);
  await appendSession(store, s2);

  assert.deepEqual(loadSessions(store), [s1, s2]);
});

test('removeSession removes only the matching createdAt entry', async () => {
  const s1 = { sessionDir: '/tmp/a', createdAt: '2024-01-01T00:00:00.000Z', piArgs: [] };
  const s2 = { sessionDir: '/tmp/b', createdAt: '2024-01-02T00:00:00.000Z', piArgs: [] };
  const store = makeStore([s1, s2]);

  await removeSession(store, s1.createdAt);

  assert.deepEqual(loadSessions(store), [s2]);
});

test('removeSession with unknown createdAt leaves list unchanged', async () => {
  const s1 = { sessionDir: '/tmp/a', createdAt: '2024-01-01T00:00:00.000Z', piArgs: [] };
  const store = makeStore([s1]);

  await removeSession(store, 'not-a-real-timestamp');

  assert.deepEqual(loadSessions(store), [s1]);
});

test('clearSessions empties the store', async () => {
  const s1 = { sessionDir: '/tmp/a', createdAt: '2024-01-01T00:00:00.000Z', piArgs: [] };
  const store = makeStore([s1]);

  await clearSessions(store);

  assert.deepEqual(loadSessions(store), []);
});

test('loadSessions returns empty array when stored value is corrupt', () => {
  const store = {
    workspaceState: {
      get: () => { throw new Error('corrupt'); },
      update: async () => {},
    },
  };

  assert.deepEqual(loadSessions(store), []);
});
