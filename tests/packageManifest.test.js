const test = require('node:test');
const assert = require('node:assert/strict');
const pkg = require('../package.json');

function getCommandTitles(commands) {
  return new Map(commands.map((command) => [command.command, command.title]));
}

function getMenuCommands(items) {
  return new Set((items ?? []).map((item) => item.command));
}

test('package.json contributes Pi resource action commands with Template labels', () => {
  const titles = getCommandTitles(pkg.contributes.commands);

  assert.equal(titles.get('piDock.runWithSkill'), 'Run Pi with Skill...');
  assert.equal(titles.get('piDock.runWithTemplate'), 'Run Pi with Template...');
  assert.equal(titles.get('piDock.runWithExtension'), 'Run Pi with Extension...');
  assert.equal(titles.has('piDock.runWithPromptTemplate'), false);
});

test('package.json contributes explorer context menu entries for all Pi resource actions', () => {
  const commands = getMenuCommands(pkg.contributes.menus['explorer/context']);

  assert.equal(commands.has('piDock.runWithSkill'), true);
  assert.equal(commands.has('piDock.runWithTemplate'), true);
  assert.equal(commands.has('piDock.runWithExtension'), true);
});

test('package.json contributes editor context menu entries for all Pi resource actions', () => {
  const commands = getMenuCommands(pkg.contributes.menus['editor/context']);

  assert.equal(commands.has('piDock.runWithSkill'), true);
  assert.equal(commands.has('piDock.runWithTemplate'), true);
  assert.equal(commands.has('piDock.runWithExtension'), true);
});
