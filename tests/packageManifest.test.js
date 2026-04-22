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

  assert.equal(titles.get('piDock.runWithSkill'), 'Run Pi with Skill...');
  assert.equal(titles.get('piDock.runWithTemplate'), 'Run Pi with Template...');
  assert.equal(titles.get('piDock.runWithExtension'), 'Run Pi with Extension...');
  assert.equal(titles.has('piDock.runWithPromptTemplate'), false);
});

test('package.json contributes piDock.runWithPrompt command with correct title', () => {
  const titles = getCommandTitles(pkg.contributes.commands);

  assert.equal(titles.get('piDock.runWithPrompt'), 'Run Pi with Prompt...');
});

test('package.json contributes explorer context menu entries for all Pi resource actions', () => {
  const commands = getMenuCommands(pkg.contributes.menus['explorer/context']);

  assert.equal(commands.has('piDock.runWithSkill'), true);
  assert.equal(commands.has('piDock.runWithTemplate'), true);
  assert.equal(commands.has('piDock.runWithExtension'), true);
  assert.equal(commands.has('piDock.runWithPrompt'), true);
});

test('explorer context menu scopes actions to the matching resource file types', () => {
  const explorerItems = pkg.contributes.menus['explorer/context'];

  assert.equal(
    getMenuItem(explorerItems, 'piDock.runWithSkill')?.when,
    'resourceScheme == file && resourceFilename == SKILL.md'
  );
  assert.equal(
    getMenuItem(explorerItems, 'piDock.runWithTemplate')?.when,
    'resourceScheme == file && resourceExtname == .md && resourceFilename != SKILL.md'
  );
  assert.equal(
    getMenuItem(explorerItems, 'piDock.runWithExtension')?.when,
    'resourceScheme == file && resourceExtname == .ts'
  );
});

test('package.json contributes editor context menu entries for all Pi resource actions', () => {
  const commands = getMenuCommands(pkg.contributes.menus['editor/context']);

  assert.equal(commands.has('piDock.runWithSkill'), true);
  assert.equal(commands.has('piDock.runWithTemplate'), true);
  assert.equal(commands.has('piDock.runWithExtension'), true);
  assert.equal(commands.has('piDock.runWithPrompt'), true);
});

test('editor context menu scopes actions to the matching resource file types', () => {
  const editorItems = pkg.contributes.menus['editor/context'];

  assert.equal(
    getMenuItem(editorItems, 'piDock.runWithSkill')?.when,
    'resourceScheme == file && resourceFilename == SKILL.md'
  );
  assert.equal(
    getMenuItem(editorItems, 'piDock.runWithTemplate')?.when,
    'resourceScheme == file && resourceExtname == .md && resourceFilename != SKILL.md'
  );
  assert.equal(
    getMenuItem(editorItems, 'piDock.runWithExtension')?.when,
    'resourceScheme == file && resourceExtname == .ts'
  );
});

test('explorer context menu shows piDock.runWithPrompt for all file-scheme resources', () => {
  const explorerItems = pkg.contributes.menus['explorer/context'];

  assert.equal(
    getMenuItem(explorerItems, 'piDock.runWithPrompt')?.when,
    'resourceScheme == file'
  );
});

test('editor context menu shows piDock.runWithPrompt for all file-scheme resources', () => {
  const editorItems = pkg.contributes.menus['editor/context'];

  assert.equal(
    getMenuItem(editorItems, 'piDock.runWithPrompt')?.when,
    'resourceScheme == file'
  );
});
