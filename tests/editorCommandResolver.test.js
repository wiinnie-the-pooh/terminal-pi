const test = require('node:test');
const assert = require('node:assert/strict');

const {
  resolveEditorCommand,
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
