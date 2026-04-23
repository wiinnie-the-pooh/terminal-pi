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

function stubManager() {
  const manager = new PiTerminalManager({ subscriptions: [], extensionPath: '/fake/ext' });
  const calls = [];
  manager.createAndShowTerminal = async (...args) => { calls.push(args); };
  return { manager, calls };
}

test('runInteractive passes empty args for blank defaultArgs', async () => {
  const { manager, calls } = stubManager();
  await manager.runInteractive('', 'cursor --wait');
  assert.deepEqual(calls, [['cursor --wait', []]]);
});

test('runInteractive passes empty args for whitespace-only defaultArgs', async () => {
  const { manager, calls } = stubManager();
  await manager.runInteractive('   ', 'code --wait');
  assert.deepEqual(calls, [['code --wait', []]]);
});

test('runInteractive splits defaultArgs into individual tokens', async () => {
  const { manager, calls } = stubManager();
  await manager.runInteractive('--thinking low --model openai/gpt-4o', 'cursor --wait');
  assert.deepEqual(calls, [[
    'cursor --wait',
    ['--thinking', 'low', '--model', 'openai/gpt-4o'],
  ]]);
});

test('runWithPrompt passes file as @-prefixed arg with no extra context', async () => {
  const { manager, calls } = stubManager();
  await manager.runWithPrompt('cursor --wait', '', '/home/user/prompt.md', '');
  assert.deepEqual(calls, [['cursor --wait', ['@/home/user/prompt.md']]]);
});

test('runWithPrompt appends extra context when provided', async () => {
  const { manager, calls } = stubManager();
  await manager.runWithPrompt('cursor --wait', '', '/home/user/prompt.md', 'focus on errors');
  assert.deepEqual(calls, [['cursor --wait', ['@/home/user/prompt.md', 'focus on errors']]]);
});

test('runWithPrompt ignores whitespace-only extra context', async () => {
  const { manager, calls } = stubManager();
  await manager.runWithPrompt('cursor --wait', '', '/home/user/prompt.md', '   ');
  assert.deepEqual(calls, [['cursor --wait', ['@/home/user/prompt.md']]]);
});

test('runWithPrompt combines defaultArgs and file path', async () => {
  const { manager, calls } = stubManager();
  await manager.runWithPrompt('cursor --wait', '--thinking low', '/home/user/prompt.md', '');
  assert.deepEqual(calls, [['cursor --wait', ['--thinking', 'low', '@/home/user/prompt.md']]]);
});
