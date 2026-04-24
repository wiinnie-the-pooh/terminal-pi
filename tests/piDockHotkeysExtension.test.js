const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

async function loadHotkeysModule() {
  const modulePath = pathToFileURL(
    path.join(process.cwd(), 'extensions', 'vs-code-hotkeys', 'hotkeys.js')
  ).href;
  return import(modulePath);
}

async function loadPackageManifest() {
  return require(path.join(process.cwd(), 'extensions', 'vs-code-hotkeys', 'package.json'));
}

test('hotkeys package manifest points Pi at the flattened top-level entry file', async () => {
  const pkg = await loadPackageManifest();
  assert.deepEqual(pkg.pi?.extensions, ['./vs-code-hotkeys.js']);
});

test('hotkeys helper exports the supported profile constants', async () => {
  const hotkeys = await loadHotkeysModule();
  assert.equal(hotkeys.PROFILE_PIBAY, 'pibay');
  assert.equal(hotkeys.PROFILE_ORIGINAL, 'original');
});

test('hotkey definitions expose a stable, unique Pi Bay shortcut set', async () => {
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

test('restorePersistedProfile prefers the newest custom profile entry and falls back to pibay', async () => {
  const { CUSTOM_ENTRY_TYPE, PROFILE_ORIGINAL, PROFILE_PIBAY, restorePersistedProfile } = await loadHotkeysModule();

  assert.equal(restorePersistedProfile([]), PROFILE_PIBAY);
  assert.equal(
    restorePersistedProfile([
      { type: 'custom', customType: CUSTOM_ENTRY_TYPE, data: { profile: PROFILE_PIBAY } },
      { type: 'custom', customType: CUSTOM_ENTRY_TYPE, data: { profile: PROFILE_ORIGINAL } },
    ]),
    PROFILE_ORIGINAL,
  );

  assert.equal(
    restorePersistedProfile([
      { type: 'custom', customType: 'other-extension', data: { profile: PROFILE_ORIGINAL } },
    ]),
    PROFILE_PIBAY,
  );
});

test('buildProfileCommandMessage explains how to switch back and lists shortcuts', async () => {
  const {
    PROFILE_PIBAY,
    PROFILE_ORIGINAL,
    buildProfileCommandMessage,
  } = await loadHotkeysModule();

  const pibayMessage = buildProfileCommandMessage(PROFILE_PIBAY);
  assert.match(pibayMessage, /VS Code-friendly hotkeys enabled/i);
  assert.match(pibayMessage, /\/hotkeys-original/);
  assert.match(pibayMessage, /Alt\+P/);
  assert.doesNotMatch(pibayMessage, /Alt\+L/);

  const originalMessage = buildProfileCommandMessage(PROFILE_ORIGINAL);
  assert.match(originalMessage, /Original Pi hotkeys enabled/i);
  assert.match(originalMessage, /\/hotkeys-vs-code/);
});
