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

  assert.equal(titles.get('piBay.runWithSkill'), 'Run Pi with Skill...');
  assert.equal(titles.get('piBay.runWithTemplate'), 'Run Pi with Template...');
  assert.equal(titles.get('piBay.runWithExtension'), 'Run Pi with Extension...');
  assert.equal(titles.has('piBay.runWithPromptTemplate'), false);
});

test('package.json contributes piBay.runWithPrompt command with correct title', () => {
  const titles = getCommandTitles(pkg.contributes.commands);

  assert.equal(titles.get('piBay.runWithPrompt'), 'Run Pi with Prompt...');
});

test('package.json contributes piBay.openPanel command with correct title', () => {
  const titles = getCommandTitles(pkg.contributes.commands);

  assert.equal(titles.get('piBay.openPanel'), 'Open Pi Bay Panel');
});

test('package.json contributes the Pi Bay activity bar container and session view', () => {
  assert.deepEqual(pkg.contributes.viewsContainers?.activitybar, [
    {
      id: 'piBay',
      title: 'Pi Bay',
      icon: 'resources/icons/pi-light.svg',
    },
  ]);

  assert.deepEqual(pkg.contributes.views?.piBay, [
    {
      type: 'webview',
      id: 'piBay.session',
      name: 'Pi Bay',
    },
  ]);
});

function getViewTitleMenuItem(command) {
  return getMenuItem(pkg.contributes.menus['view/title'], command);
}

test('package.json contributes a view/title menu entry for piBay.openPanel', () => {
  const item = getViewTitleMenuItem('piBay.openPanel');

  assert.equal(item?.when, 'view == piBay.session');
  assert.equal(item?.group, 'navigation');
});

test('package.json contributes explorer context menu entries for all Pi resource actions', () => {
  const commands = getMenuCommands(pkg.contributes.menus['explorer/context']);

  assert.equal(commands.has('piBay.runWithSkill'), true);
  assert.equal(commands.has('piBay.runWithTemplate'), true);
  assert.equal(commands.has('piBay.runWithExtension'), true);
  assert.equal(commands.has('piBay.runWithPrompt'), true);
});

test('explorer context menu scopes actions to the matching resource file types', () => {
  const explorerItems = pkg.contributes.menus['explorer/context'];

  assert.equal(
    getMenuItem(explorerItems, 'piBay.runWithSkill')?.when,
    'resourceScheme == file && resourceFilename == SKILL.md'
  );
  assert.equal(
    getMenuItem(explorerItems, 'piBay.runWithTemplate')?.when,
    'resourceScheme == file && resourceExtname == .md && resourceFilename != SKILL.md'
  );
  assert.equal(
    getMenuItem(explorerItems, 'piBay.runWithExtension')?.when,
    'resourceScheme == file && resourceExtname == .ts'
  );
});

test('package.json contributes editor context menu entries for all Pi resource actions', () => {
  const commands = getMenuCommands(pkg.contributes.menus['editor/context']);

  assert.equal(commands.has('piBay.runWithSkill'), true);
  assert.equal(commands.has('piBay.runWithTemplate'), true);
  assert.equal(commands.has('piBay.runWithExtension'), true);
  assert.equal(commands.has('piBay.runWithPrompt'), true);
});

test('editor context menu scopes actions to the matching resource file types', () => {
  const editorItems = pkg.contributes.menus['editor/context'];

  assert.equal(
    getMenuItem(editorItems, 'piBay.runWithSkill')?.when,
    'resourceScheme == file && resourceFilename == SKILL.md'
  );
  assert.equal(
    getMenuItem(editorItems, 'piBay.runWithTemplate')?.when,
    'resourceScheme == file && resourceExtname == .md && resourceFilename != SKILL.md'
  );
  assert.equal(
    getMenuItem(editorItems, 'piBay.runWithExtension')?.when,
    'resourceScheme == file && resourceExtname == .ts'
  );
});

test('explorer context menu shows piBay.runWithPrompt for all file-scheme resources', () => {
  const explorerItems = pkg.contributes.menus['explorer/context'];

  assert.equal(
    getMenuItem(explorerItems, 'piBay.runWithPrompt')?.when,
    'resourceScheme == file'
  );
});

test('editor context menu shows piBay.runWithPrompt for all file-scheme resources', () => {
  const editorItems = pkg.contributes.menus['editor/context'];

  assert.equal(
    getMenuItem(editorItems, 'piBay.runWithPrompt')?.when,
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
  assert.equal(kb.when, 'terminalFocus && piBay.activeTerminal');
  assert.equal(kb.args?.text, expectedText);
}

test('package.json contributes ctrl+g sendSequence keybinding for Pi terminals', () => {
  assertSendSequenceKeybinding('ctrl+g', '\u0007');
});

test('package.json contributes alt+up sendSequence keybinding for Pi terminals', () => {
  assertSendSequenceKeybinding('alt+up', '\u001b[1;3A');
});
