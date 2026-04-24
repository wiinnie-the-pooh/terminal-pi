const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

async function loadHotkeysModule() {
  const modulePath = pathToFileURL(
    path.join(process.cwd(), 'extensions', 'pi-agent-hotkeys', 'hotkeys.js')
  ).href;
  return import(modulePath);
}

async function loadPackageManifest() {
  return require(path.join(process.cwd(), 'extensions', 'pi-agent-hotkeys', 'package.json'));
}

test('hotkeys package manifest points Pi at the flattened top-level entry file', async () => {
  const pkg = await loadPackageManifest();
  assert.deepEqual(pkg.pi?.extensions, ['./vs-code-hotkeys.js']);
});

test('hotkeys helper exports the supported profile constants', async () => {
  const hotkeys = await loadHotkeysModule();
  assert.equal(hotkeys.PROFILE_PIAGENT, 'piagent');
  assert.equal(hotkeys.PROFILE_ORIGINAL, 'original');
});

test('hotkey definitions expose a stable, unique Pi Coding Agent shortcut set', async () => {
  const { HOTKEY_DEFINITIONS } = await loadHotkeysModule();
  assert.ok(HOTKEY_DEFINITIONS.length > 0);

  const keys = HOTKEY_DEFINITIONS.map((entry) => entry.shortcut);
  assert.equal(new Set(keys).size, keys.length);

  assert.ok(!HOTKEY_DEFINITIONS.some((entry) => entry.id === 'app.model.select'));
  assert.ok(HOTKEY_DEFINITIONS.some((entry) => entry.id === 'app.model.cycleForward' && entry.shortcut === 'alt+p'));
  assert.ok(HOTKEY_DEFINITIONS.some((entry) => entry.id === 'app.tools.expand' && entry.shortcut === 'alt+o'));

  const ids = HOTKEY_DEFINITIONS.map((entry) => entry.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(HOTKEY_DEFINITIONS.every((entry) => typeof entry.label === 'string' && entry.label.length > 0));
});

test('restorePersistedProfile prefers the newest custom profile entry and falls back to piagent', async () => {
  const { CUSTOM_ENTRY_TYPE, PROFILE_ORIGINAL, PROFILE_PIAGENT, restorePersistedProfile } = await loadHotkeysModule();

  assert.equal(restorePersistedProfile([]), PROFILE_PIAGENT);
  assert.equal(
    restorePersistedProfile([
      { type: 'custom', customType: CUSTOM_ENTRY_TYPE, data: { profile: PROFILE_PIAGENT } },
      { type: 'custom', customType: CUSTOM_ENTRY_TYPE, data: { profile: PROFILE_ORIGINAL } },
    ]),
    PROFILE_ORIGINAL,
  );

  assert.equal(
    restorePersistedProfile([
      { type: 'custom', customType: 'other-extension', data: { profile: PROFILE_ORIGINAL } },
    ]),
    PROFILE_PIAGENT,
  );
});

test('buildProfileCommandMessage explains how to switch back and lists shortcuts', async () => {
  const {
    PROFILE_PIAGENT,
    PROFILE_ORIGINAL,
    buildProfileCommandMessage,
  } = await loadHotkeysModule();

  const piagentMessage = buildProfileCommandMessage(PROFILE_PIAGENT);
  assert.match(piagentMessage, /VS Code-friendly hotkeys enabled/i);
  assert.match(piagentMessage, /\/hotkeys-original/);
  assert.match(piagentMessage, /Alt\+P/);
  assert.doesNotMatch(piagentMessage, /Alt\+L/);

  const originalMessage = buildProfileCommandMessage(PROFILE_ORIGINAL);
  assert.match(originalMessage, /Original Pi hotkeys enabled/i);
  assert.match(originalMessage, /\/hotkeys-vs-code/);
});
