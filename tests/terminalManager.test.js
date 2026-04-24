const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');
const path = require('node:path');

const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request === 'vscode') {
    return require.resolve('./__fixtures__/vscode-stub.js');
  }
  return originalResolve.call(this, request, ...rest);
};

const { PiTerminalManager } = require('../out/terminal.js');

const FAKE_EXT_PATH = '/fake/ext';
const CMD = 'cursor --wait';
const PROMPT_FILE = '/home/user/prompt.md';

const expectedBundledHotkeysExtension = path.join(
  FAKE_EXT_PATH,
  'extensions',
  'vs-code-hotkeys',
  'vs-code-hotkeys.js',
);
const EXT_ARGS = ['--extension', expectedBundledHotkeysExtension];

function stubManager() {
  const manager = new PiTerminalManager({ subscriptions: [], extensionPath: FAKE_EXT_PATH });
  const calls = [];
  manager.createAndShowTerminal = async (...args) => { calls.push(args); };
  return { manager, calls };
}

for (const [desc, defaultArgs, cmd, expectedArgs] of [
  ['passes empty args for blank defaultArgs',          '',                                    CMD,          [...EXT_ARGS]],
  ['passes empty args for whitespace-only defaultArgs','   ',                                 'code --wait',[...EXT_ARGS]],
  ['splits defaultArgs into individual tokens',        '--thinking low --model openai/gpt-4o',CMD,          ['--thinking', 'low', '--model', 'openai/gpt-4o', ...EXT_ARGS]],
]) {
  test(`runInteractive ${desc}`, async () => {
    const { manager, calls } = stubManager();
    await manager.runInteractive(defaultArgs, cmd);
    assert.deepEqual(calls, [[cmd, expectedArgs]]);
  });
}

for (const [desc, defaultArgs, extra, expectedArgs] of [
  ['passes file as @-prefixed arg with no extra context', '',             '',               [...EXT_ARGS, `@${PROMPT_FILE}`]],
  ['appends extra context when provided',                 '',             'focus on errors',[...EXT_ARGS, `@${PROMPT_FILE}`, 'focus on errors']],
  ['ignores whitespace-only extra context',               '',             '   ',            [...EXT_ARGS, `@${PROMPT_FILE}`]],
  ['combines defaultArgs and file path',                  '--thinking low','',              ['--thinking', 'low', ...EXT_ARGS, `@${PROMPT_FILE}`]],
]) {
  test(`runWithPrompt ${desc}`, async () => {
    const { manager, calls } = stubManager();
    await manager.runWithPrompt(CMD, defaultArgs, PROMPT_FILE, extra);
    assert.deepEqual(calls, [[CMD, expectedArgs]]);
  });
}
