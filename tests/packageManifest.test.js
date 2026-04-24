const test = require('node:test');
const assert = require('node:assert/strict');
const pkg = require('../package.json');

function getCommandTitles(commands) {
  return new Map(commands.map((command) => [command.command, command.title]));
}

function getMenuCommands(items) {
  return new Set((items ?? []).map((item) => item.command));
}

function getMenuItem(items, command) {
  return (items ?? []).find((item) => item.command === command);
}

test('package.json contributes Pi resource action commands with Template labels', () => {
  const titles = getCommandTitles(pkg.contributes.commands);

  assert.equal(titles.get('piAgent.runWithSkill'), 'Run Pi with Skill...');
  assert.equal(titles.get('piAgent.runWithTemplate'), 'Run Pi with Template...');
  assert.equal(titles.get('piAgent.runWithExtension'), 'Run Pi with Extension...');
  assert.equal(titles.has('piAgent.runWithPromptTemplate'), false);
});

test('package.json contributes piAgent.runWithPrompt command with correct title', () => {
  const titles = getCommandTitles(pkg.contributes.commands);

  assert.equal(titles.get('piAgent.runWithPrompt'), 'Run Pi with Prompt...');
});

test('package.json contributes explorer context menu entries for all Pi resource actions', () => {
  const commands = getMenuCommands(pkg.contributes.menus['explorer/context']);

  assert.equal(commands.has('piAgent.runWithSkill'), true);
  assert.equal(commands.has('piAgent.runWithTemplate'), true);
  assert.equal(commands.has('piAgent.runWithExtension'), true);
  assert.equal(commands.has('piAgent.runWithPrompt'), true);
});

test('explorer context menu scopes actions to the matching resource file types', () => {
  const explorerItems = pkg.contributes.menus['explorer/context'];

  assert.equal(
    getMenuItem(explorerItems, 'piAgent.runWithSkill')?.when,
    'resourceScheme == file && resourceFilename == SKILL.md'
  );
  assert.equal(
    getMenuItem(explorerItems, 'piAgent.runWithTemplate')?.when,
    'resourceScheme == file && resourceExtname == .md && resourceFilename != SKILL.md'
  );
  assert.equal(
    getMenuItem(explorerItems, 'piAgent.runWithExtension')?.when,
    'resourceScheme == file && resourceExtname == .ts'
  );
});

test('package.json contributes editor context menu entries for all Pi resource actions', () => {
  const commands = getMenuCommands(pkg.contributes.menus['editor/context']);

  assert.equal(commands.has('piAgent.runWithSkill'), true);
  assert.equal(commands.has('piAgent.runWithTemplate'), true);
  assert.equal(commands.has('piAgent.runWithExtension'), true);
  assert.equal(commands.has('piAgent.runWithPrompt'), true);
});

test('editor context menu scopes actions to the matching resource file types', () => {
  const editorItems = pkg.contributes.menus['editor/context'];

  assert.equal(
    getMenuItem(editorItems, 'piAgent.runWithSkill')?.when,
    'resourceScheme == file && resourceFilename == SKILL.md'
  );
  assert.equal(
    getMenuItem(editorItems, 'piAgent.runWithTemplate')?.when,
    'resourceScheme == file && resourceExtname == .md && resourceFilename != SKILL.md'
  );
  assert.equal(
    getMenuItem(editorItems, 'piAgent.runWithExtension')?.when,
    'resourceScheme == file && resourceExtname == .ts'
  );
});

test('explorer context menu shows piAgent.runWithPrompt for all file-scheme resources', () => {
  const explorerItems = pkg.contributes.menus['explorer/context'];

  assert.equal(
    getMenuItem(explorerItems, 'piAgent.runWithPrompt')?.when,
    'resourceScheme == file'
  );
});

test('editor context menu shows piAgent.runWithPrompt for all file-scheme resources', () => {
  const editorItems = pkg.contributes.menus['editor/context'];

  assert.equal(
    getMenuItem(editorItems, 'piAgent.runWithPrompt')?.when,
    'resourceScheme == file'
  );
});

function getKeybindings(keybindings) {
  return new Map(keybindings.map((kb) => [kb.key, kb]));
}

function assertSendSequenceKeybinding(key, expectedText) {
  const kbs = getKeybindings(pkg.contributes.keybindings);
  const kb = kbs.get(key);
  assert.ok(kb, `${key} keybinding should exist`);
  assert.equal(kb.command, 'workbench.action.terminal.sendSequence');
  assert.equal(kb.when, 'terminalFocus && piAgent.activeTerminal');
  assert.equal(kb.args?.text, expectedText);
}

test('package.json contributes ctrl+g sendSequence keybinding for Pi terminals', () => {
  assertSendSequenceKeybinding('ctrl+g', '\u0007');
});

test('package.json contributes alt+up sendSequence keybinding for Pi terminals', () => {
  assertSendSequenceKeybinding('alt+up', '\u001b[1;3A');
});
