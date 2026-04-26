const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  mapFilePath,
  readMapFile,
  writeMapFile,
  collectSessionFiles,
  extractSessionId,
  findNewSessionId,
  hasSessionMap,
  buildLaunchArgs,
  parsePiScriptPath,
  parseLauncherArgs,
} = require('../out/piLauncher.js');

const TEST_GUID = '019db074-5cf3-7351-ae95-ad317c30d27d';
const PI_SESSION_ID = 'abcd1234-ef56-7890-abcd-ef1234567890';

// ---------------------------------------------------------------------------
// mapFilePath
// ---------------------------------------------------------------------------

test('mapFilePath returns .piagent subpath with .map extension', () => {
  const base = '/home/user/.pi/agent/sessions';
  assert.equal(mapFilePath(base, TEST_GUID), path.join(base, '.piagent', TEST_GUID + '.map'));
});

// ---------------------------------------------------------------------------
// readMapFile
// ---------------------------------------------------------------------------

test('readMapFile returns session ID from existing file', () => {
  const f = path.join(os.tmpdir(), 'piagent-read-' + Date.now() + '.map');
  fs.writeFileSync(f, PI_SESSION_ID + '\n');
  try {
    assert.equal(readMapFile(f), PI_SESSION_ID);
  } finally {
    fs.rmSync(f, { force: true });
  }
});

test('readMapFile returns undefined for missing file', () => {
  assert.equal(readMapFile(path.join(os.tmpdir(), 'no-such-' + Date.now() + '.map')), undefined);
});

test('readMapFile returns undefined for empty file', () => {
  const f = path.join(os.tmpdir(), 'piagent-empty-' + Date.now() + '.map');
  fs.writeFileSync(f, '');
  try {
    assert.equal(readMapFile(f), undefined);
  } finally {
    fs.rmSync(f, { force: true });
  }
});

// ---------------------------------------------------------------------------
// writeMapFile
// ---------------------------------------------------------------------------

test('writeMapFile creates parent directory and writes session ID', () => {
  const base = path.join(os.tmpdir(), 'piagent-write-' + Date.now());
  const f = path.join(base, '.piagent', TEST_GUID + '.map');
  try {
    writeMapFile(f, PI_SESSION_ID);
    assert.equal(fs.readFileSync(f, 'utf8'), PI_SESSION_ID);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// collectSessionFiles
// ---------------------------------------------------------------------------

test('collectSessionFiles returns full paths of all .jsonl files in subdirectories', () => {
  const base = path.join(os.tmpdir(), 'pi-collect-' + Date.now());
  const sub = path.join(base, '--workspace--');
  fs.mkdirSync(sub, { recursive: true });
  const f1 = path.join(sub, '2026-01-01T00-00-00-000Z_' + PI_SESSION_ID + '.jsonl');
  const f2 = path.join(sub, '2026-01-02T00-00-00-000Z_other-id.jsonl');
  fs.writeFileSync(f1, '');
  fs.writeFileSync(f2, '');
  try {
    const result = collectSessionFiles(base);
    assert.ok(result.has(f1));
    assert.ok(result.has(f2));
    assert.equal(result.size, 2);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('collectSessionFiles ignores files at the base level (not in subdirectories)', () => {
  const base = path.join(os.tmpdir(), 'pi-collect-top-' + Date.now());
  fs.mkdirSync(base, { recursive: true });
  fs.writeFileSync(path.join(base, 'stray.jsonl'), '');
  try {
    assert.equal(collectSessionFiles(base).size, 0);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('collectSessionFiles returns empty set for missing base directory', () => {
  const result = collectSessionFiles(path.join(os.tmpdir(), 'no-such-' + Date.now()));
  assert.ok(result instanceof Set);
  assert.equal(result.size, 0);
});

// ---------------------------------------------------------------------------
// extractSessionId
// ---------------------------------------------------------------------------

test('extractSessionId returns UUID from standard Pi session filename', () => {
  assert.equal(
    extractSessionId('2026-04-23T10-00-00-000Z_' + PI_SESSION_ID + '.jsonl'),
    PI_SESSION_ID,
  );
});

test('extractSessionId returns undefined for filename without underscore separator', () => {
  assert.equal(extractSessionId('noseparator.jsonl'), undefined);
});

test('extractSessionId returns undefined for non-.jsonl file', () => {
  assert.equal(extractSessionId('2026-04-23T10-00-00-000Z_' + PI_SESSION_ID + '.json'), undefined);
});

// ---------------------------------------------------------------------------
// findNewSessionId
// ---------------------------------------------------------------------------

test('findNewSessionId returns session ID of newly created file', () => {
  const base = path.join(os.tmpdir(), 'pi-find-new-' + Date.now());
  const sub = path.join(base, '--workspace--');
  fs.mkdirSync(sub, { recursive: true });
  const before = collectSessionFiles(base);
  const f = path.join(sub, '2026-04-23T10-00-00-000Z_' + PI_SESSION_ID + '.jsonl');
  fs.writeFileSync(f, '');
  try {
    assert.equal(findNewSessionId(base, before), PI_SESSION_ID);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('findNewSessionId returns session ID of the newest file when multiple appear', () => {
  const base = path.join(os.tmpdir(), 'pi-find-multi-' + Date.now());
  const sub = path.join(base, '--workspace--');
  fs.mkdirSync(sub, { recursive: true });
  const before = collectSessionFiles(base);
  const older = path.join(sub, '2026-04-23T10-00-00-000Z_older-id-1111-1111-1111.jsonl');
  const newer = path.join(sub, '2026-04-23T10-00-01-000Z_' + PI_SESSION_ID + '.jsonl');
  fs.writeFileSync(older, '');
  // small delay so mtimes differ on filesystems with 1s resolution
  fs.utimesSync(older, new Date(Date.now() - 2000), new Date(Date.now() - 2000));
  fs.writeFileSync(newer, '');
  try {
    assert.equal(findNewSessionId(base, before), PI_SESSION_ID);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('findNewSessionId returns the file with the newer mtime when multiple appear (first file newer)', () => {
  const base = path.join(os.tmpdir(), 'pi-find-first-newer-' + Date.now());
  const sub = path.join(base, '--workspace--');
  fs.mkdirSync(sub, { recursive: true });
  const before = collectSessionFiles(base);
  // alpha-first file gets the newer mtime; alpha-second gets the older mtime
  const first = path.join(sub, '2026-04-23T10-00-00-000Z_' + PI_SESSION_ID + '.jsonl');
  const second = path.join(sub, '2026-04-23T10-00-01-000Z_second-id-2222-2222-2222.jsonl');
  fs.writeFileSync(first, '');
  fs.writeFileSync(second, '');
  fs.utimesSync(second, new Date(Date.now() - 2000), new Date(Date.now() - 2000));
  try {
    assert.equal(findNewSessionId(base, before), PI_SESSION_ID);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('findNewSessionId returns undefined when no new files', () => {
  const base = path.join(os.tmpdir(), 'pi-find-none-' + Date.now());
  const sub = path.join(base, '--workspace--');
  fs.mkdirSync(sub, { recursive: true });
  const f = path.join(sub, '2026-04-23T00-00-00-000Z_existing.jsonl');
  fs.writeFileSync(f, '');
  const before = collectSessionFiles(base);
  try {
    assert.equal(findNewSessionId(base, before), undefined);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// hasSessionMap
// ---------------------------------------------------------------------------

test('hasSessionMap returns false when map file does not exist', () => {
  const base = path.join(os.tmpdir(), 'pi-map-false-' + Date.now());
  fs.mkdirSync(base, { recursive: true });
  try {
    assert.equal(hasSessionMap(base, TEST_GUID), false);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('hasSessionMap returns true when map file exists', () => {
  const base = path.join(os.tmpdir(), 'pi-map-true-' + Date.now());
  const mPath = mapFilePath(base, TEST_GUID);
  fs.mkdirSync(path.dirname(mPath), { recursive: true });
  fs.writeFileSync(mPath, PI_SESSION_ID);
  try {
    assert.equal(hasSessionMap(base, TEST_GUID), true);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('hasSessionMap returns false for nonexistent base directory', () => {
  assert.equal(hasSessionMap(path.join(os.tmpdir(), 'no-such-base-' + Date.now()), TEST_GUID), false);
});

// ---------------------------------------------------------------------------
// buildLaunchArgs
// ---------------------------------------------------------------------------

test('buildLaunchArgs returns args unchanged on fresh start', () => {
  const args = ['--thinking', 'low'];
  assert.deepEqual(buildLaunchArgs(args), args);
});

test('buildLaunchArgs prepends --continue --session <piSessionId> on restore', () => {
  const args = ['--thinking', 'low', '--skill', '/s'];
  assert.deepEqual(
    buildLaunchArgs(args, PI_SESSION_ID),
    ['--continue', '--session', PI_SESSION_ID, '--thinking', 'low', '--skill', '/s'],
  );
});

test('buildLaunchArgs preserves --extension flag on restore', () => {
  const args = ['--extension', '/path/to/ext.js'];
  assert.deepEqual(
    buildLaunchArgs(args, PI_SESSION_ID),
    ['--continue', '--session', PI_SESSION_ID, '--extension', '/path/to/ext.js'],
  );
});

test('buildLaunchArgs handles empty args on fresh start', () => {
  assert.deepEqual(buildLaunchArgs([]), []);
});

test('buildLaunchArgs handles empty args on restore', () => {
  assert.deepEqual(buildLaunchArgs([], PI_SESSION_ID), ['--continue', '--session', PI_SESSION_ID]);
});

// ---------------------------------------------------------------------------
// parsePiScriptPath
// ---------------------------------------------------------------------------

const SAMPLE_CMD_PATH = 'C:\\Users\\alice\\AppData\\Roaming\\npm\\pi.cmd';
const SAMPLE_CMD_DIR = path.win32.dirname(SAMPLE_CMD_PATH);

const NPM_WRAPPER = `@ECHO off
GOTO start
:find_dp0
SET dp0=%~dp0
EXIT /b
:start
SETLOCAL
CALL :find_dp0

IF EXIST "%dp0%\\node.exe" (
  SET "_prog=%dp0%\\node.exe"
) ELSE (
  SET "_prog=node"
  SET PATHEXT=%PATHEXT:;.JS;=;%
)

endLocal & goto #_undefined_# 2>NUL || title %COMSPEC% & "%_prog%"  "%dp0%\\node_modules\\@mariozechner\\pi-coding-agent\\dist\\cli.js" %*
`;

const LEGACY_WRAPPER = `@IF EXIST "%~dp0\\node.exe" (
  "%~dp0\\node.exe"  "%~dp0\\node_modules\\@mariozechner\\pi-coding-agent\\bin\\pi.js" %*
) ELSE (
  @SETLOCAL
  @SET PATHEXT=%PATHEXT:;.JS;=;%
  node  "%~dp0\\node_modules\\@mariozechner\\pi-coding-agent\\bin\\pi.js" %*
)
`;

test('parsePiScriptPath extracts script from modern npm .cmd wrapper', () => {
  const result = parsePiScriptPath(NPM_WRAPPER, SAMPLE_CMD_PATH);
  assert.equal(
    result,
    path.win32.join(SAMPLE_CMD_DIR, 'node_modules', '@mariozechner', 'pi-coding-agent', 'dist', 'cli.js'),
  );
});

test('parsePiScriptPath extracts script from legacy %~dp0 .cmd wrapper', () => {
  const result = parsePiScriptPath(LEGACY_WRAPPER, SAMPLE_CMD_PATH);
  assert.equal(
    result,
    path.win32.join(SAMPLE_CMD_DIR, 'node_modules', '@mariozechner', 'pi-coding-agent', 'bin', 'pi.js'),
  );
});

test('parsePiScriptPath returns undefined when no script reference present', () => {
  assert.equal(parsePiScriptPath('@echo off\r\necho hello\r\n', SAMPLE_CMD_PATH), undefined);
});

// ---------------------------------------------------------------------------
// parseLauncherArgs
// ---------------------------------------------------------------------------

const DEFAULT_BASE = '/home/user/.pi/agent/sessions';
const SAMPLE_GUID = '019db074-5cf3-7351-ae95-ad317c30d27d';
const SAMPLE_DIR = '/custom/session/dir';

test('parseLauncherArgs returns default baseDir and undefined guid for empty argv', () => {
  const result = parseLauncherArgs([], DEFAULT_BASE);
  assert.equal(result.guid, undefined);
  assert.equal(result.baseDir, DEFAULT_BASE);
  assert.deepEqual(result.argsForPi, []);
});

test('parseLauncherArgs extracts --session guid and removes it from argsForPi', () => {
  const result = parseLauncherArgs(['--session', SAMPLE_GUID, '--thinking', 'low'], DEFAULT_BASE);
  assert.equal(result.guid, SAMPLE_GUID);
  assert.equal(result.baseDir, DEFAULT_BASE);
  assert.deepEqual(result.argsForPi, ['--thinking', 'low']);
});

test('parseLauncherArgs extracts --session-dir as baseDir and keeps it in argsForPi', () => {
  const result = parseLauncherArgs(['--session-dir', SAMPLE_DIR, '--thinking', 'low'], DEFAULT_BASE);
  assert.equal(result.guid, undefined);
  assert.equal(result.baseDir, SAMPLE_DIR);
  assert.deepEqual(result.argsForPi, ['--session-dir', SAMPLE_DIR, '--thinking', 'low']);
});

test('parseLauncherArgs handles --session and --session-dir together (session first)', () => {
  const result = parseLauncherArgs(['--session', SAMPLE_GUID, '--session-dir', SAMPLE_DIR], DEFAULT_BASE);
  assert.equal(result.guid, SAMPLE_GUID);
  assert.equal(result.baseDir, SAMPLE_DIR);
  assert.deepEqual(result.argsForPi, ['--session-dir', SAMPLE_DIR]);
});

test('parseLauncherArgs handles --session-dir and --session together (dir first)', () => {
  const result = parseLauncherArgs(['--session-dir', SAMPLE_DIR, '--session', SAMPLE_GUID], DEFAULT_BASE);
  assert.equal(result.guid, SAMPLE_GUID);
  assert.equal(result.baseDir, SAMPLE_DIR);
  assert.deepEqual(result.argsForPi, ['--session-dir', SAMPLE_DIR]);
});

test('parseLauncherArgs falls back to default when --session-dir is the last arg with no value', () => {
  const result = parseLauncherArgs(['--thinking', 'low', '--session-dir'], DEFAULT_BASE);
  assert.equal(result.baseDir, DEFAULT_BASE);
  assert.deepEqual(result.argsForPi, ['--thinking', 'low']);
});

test('parseLauncherArgs falls back to default when --session has no value', () => {
  const result = parseLauncherArgs(['--session'], DEFAULT_BASE);
  assert.equal(result.guid, undefined);
  assert.equal(result.baseDir, DEFAULT_BASE);
  assert.deepEqual(result.argsForPi, []);
});

test('parseLauncherArgs ignores subsequent --session occurrences (keeps first)', () => {
  const secondGuid = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  const result = parseLauncherArgs(['--session', SAMPLE_GUID, '--session', secondGuid], DEFAULT_BASE);
  assert.equal(result.guid, SAMPLE_GUID);
  // second --session is not consumed as a flag (guid already set), so both tokens appear in argsForPi
  assert.ok(result.argsForPi.includes('--session'));
  assert.ok(result.argsForPi.includes(secondGuid));
});

test('parseLauncherArgs ignores subsequent --session-dir occurrences (keeps first)', () => {
  const secondDir = '/other/dir';
  const result = parseLauncherArgs(['--session-dir', SAMPLE_DIR, '--session-dir', secondDir], DEFAULT_BASE);
  assert.equal(result.baseDir, SAMPLE_DIR);
  assert.ok(result.argsForPi.includes(secondDir));
});

test('parseLauncherArgs preserves unrelated args unchanged', () => {
  const argv = ['--extension', '/path/to/ext.js', '--thinking', 'high', '--no-tools'];
  const result = parseLauncherArgs(argv, DEFAULT_BASE);
  assert.equal(result.guid, undefined);
  assert.equal(result.baseDir, DEFAULT_BASE);
  assert.deepEqual(result.argsForPi, argv);
});

test('parseLauncherArgs treats a flag-like value after --session-dir as missing (no value)', () => {
  // --session-dir followed immediately by another flag -- value is skipped, fallback used
  const result = parseLauncherArgs(['--session-dir', '--thinking', 'low'], DEFAULT_BASE);
  assert.equal(result.baseDir, DEFAULT_BASE);
  // --thinking and low should still be present in argsForPi
  assert.ok(result.argsForPi.includes('--thinking'));
  assert.ok(result.argsForPi.includes('low'));
});
