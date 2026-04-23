const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { hasExistingSession, buildLaunchArgs, parsePiScriptPath } = require('../out/piLauncher.js');

const TEST_GUID = '019db074-5cf3-7351-ae95-ad317c30d27d';

test('hasExistingSession returns false when no matching GUID file exists', () => {
  const base = path.join(os.tmpdir(), 'pi-sessions-empty-' + Date.now());
  const sub = path.join(base, '--workspace--');
  fs.mkdirSync(sub, { recursive: true });
  try {
    assert.equal(hasExistingSession(base, TEST_GUID), false);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('hasExistingSession returns true when matching GUID file exists in a subdirectory', () => {
  const base = path.join(os.tmpdir(), 'pi-sessions-match-' + Date.now());
  const sub = path.join(base, '--workspace--');
  fs.mkdirSync(sub, { recursive: true });
  fs.writeFileSync(path.join(sub, `2026-01-01T00-00-00-000Z_${TEST_GUID}.jsonl`), '');
  try {
    assert.equal(hasExistingSession(base, TEST_GUID), true);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('hasExistingSession returns false for nonexistent base directory', () => {
  assert.equal(hasExistingSession(path.join(os.tmpdir(), 'no-such-base-' + Date.now()), TEST_GUID), false);
});

test('hasExistingSession skips non-directory entries at the base level', () => {
  const base = path.join(os.tmpdir(), 'pi-sessions-file-' + Date.now());
  fs.mkdirSync(base, { recursive: true });
  fs.writeFileSync(path.join(base, `stray-file.txt`), '');
  try {
    assert.equal(hasExistingSession(base, TEST_GUID), false);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('buildLaunchArgs passes all args through on fresh session', () => {
  const args = ['--session', TEST_GUID, '--thinking', 'low'];
  assert.deepEqual(buildLaunchArgs(args, false), args);
});

test('buildLaunchArgs returns --continue with --session on restore', () => {
  const args = ['--session', TEST_GUID, '--thinking', 'low', '--skill', '/s'];
  assert.deepEqual(
    buildLaunchArgs(args, true),
    ['--continue', '--session', TEST_GUID],
  );
});

test('buildLaunchArgs passes all args through when no --session present', () => {
  const args = ['--thinking', 'low'];
  assert.deepEqual(buildLaunchArgs(args, true), args);
  assert.deepEqual(buildLaunchArgs(args, false), args);
});

test('buildLaunchArgs handles --session at end without value', () => {
  const args = ['--thinking', 'low', '--session'];
  assert.deepEqual(buildLaunchArgs(args, true), args);
});

test('buildLaunchArgs handles empty args', () => {
  assert.deepEqual(buildLaunchArgs([], false), []);
  assert.deepEqual(buildLaunchArgs([], true), []);
});

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
