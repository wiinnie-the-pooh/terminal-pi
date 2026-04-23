const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

const {
  resolveEditorCommand,
  detectEditorCommand,
  commandExistsOnPath,
} = require('../out/editorCommandResolver.js');

function availableCommands(...commands) {
  const set = new Set(commands);
  return (command) => set.has(command);
}

test('uses the explicit editor command when configured', () => {
  const result = resolveEditorCommand(
    {
      configuredEditorCommand: 'cursor --wait',
      appHost: 'desktop',
      uriScheme: 'vscode',
      appName: 'VS Code',
    },
    availableCommands('code')
  );

  assert.equal(result, 'cursor --wait');
});

test('detects stable VS Code from uriScheme', () => {
  const result = resolveEditorCommand(
    {
      configuredEditorCommand: '',
      appHost: 'desktop',
      uriScheme: 'vscode',
      appName: 'VS Code',
    },
    availableCommands('code')
  );

  assert.equal(result, 'code --wait');
});

test('detects VS Code Insiders from uriScheme', () => {
  const result = resolveEditorCommand(
    {
      configuredEditorCommand: '',
      appHost: 'desktop',
      uriScheme: 'vscode-insiders',
      appName: 'Visual Studio Code - Insiders',
    },
    availableCommands('code-insiders')
  );

  assert.equal(result, 'code-insiders --wait');
});

test('detects Cursor from uriScheme', () => {
  const result = resolveEditorCommand(
    {
      configuredEditorCommand: '',
      appHost: 'desktop',
      uriScheme: 'cursor',
      appName: 'Cursor',
    },
    availableCommands('cursor')
  );

  assert.equal(result, 'cursor --wait');
});

test('returns undefined when a known product CLI is unavailable', () => {
  const result = resolveEditorCommand(
    {
      configuredEditorCommand: '',
      appHost: 'desktop',
      uriScheme: 'cursor',
      appName: 'Cursor',
    },
    availableCommands('code')
  );

  assert.equal(result, undefined);
});

test('returns undefined for web hosts', () => {
  const result = resolveEditorCommand(
    {
      configuredEditorCommand: '',
      appHost: 'github.dev',
      uriScheme: 'vscode',
      appName: 'VS Code',
    },
    availableCommands('code')
  );

  assert.equal(result, undefined);
});

test('returns undefined for unknown products', () => {
  const result = resolveEditorCommand(
    {
      configuredEditorCommand: '',
      appHost: 'desktop',
      uriScheme: 'windsurf',
      appName: 'Windsurf',
    },
    availableCommands('windsurf')
  );

  assert.equal(result, undefined);
});

for (const { appName, expected } of [
  { appName: 'Cursor', expected: 'cursor' },
  { appName: 'Cursor IDE', expected: 'cursor' },
  { appName: 'Visual Studio Code - Insiders', expected: 'code-insiders' },
  { appName: 'VS Code', expected: 'code' },
  { appName: 'Visual Studio Code', expected: 'code' },
  { appName: 'Windsurf', expected: undefined },
  { appName: undefined, expected: undefined },
]) {
  test(`detectEditorCommand detects '${appName}' as ${expected}`, () => {
    const result = detectEditorCommand({
      configuredEditorCommand: '',
      appHost: 'desktop',
      uriScheme: 'windsurf',
      appName,
    });
    assert.equal(result, expected);
  });
}

for (const { platform, expectedLocator } of [
  { platform: 'win32', expectedLocator: 'where' },
  { platform: 'linux', expectedLocator: 'which' },
]) {
  test(`commandExistsOnPath uses ${expectedLocator} on ${platform}`, (t) => {
    const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
    const calls = [];

    const originalSpawnSync = spawnSync;
    const mockSpawnSync = (...args) => {
      calls.push(args);
      return { status: 0 };
    };

    // Patch spawnSync via the module cache so commandExistsOnPath sees it.
    const childProcess = require('node:child_process');
    childProcess.spawnSync = mockSpawnSync;

    t.after(() => {
      childProcess.spawnSync = originalSpawnSync;
      if (originalPlatform) {
        Object.defineProperty(process, 'platform', originalPlatform);
      } else {
        delete process.platform;
      }
    });

    Object.defineProperty(process, 'platform', { value: platform, configurable: true });
    commandExistsOnPath('code');
    assert.equal(calls.length, 1);
    assert.equal(calls[0][0], expectedLocator);
    assert.deepEqual(calls[0][1], ['code']);
  });
}
