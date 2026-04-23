const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { hasSessionContent, buildLaunchArgs, parsePiScriptPath } = require('../out/piLauncher.js');

test('hasSessionContent returns false for empty directory', () => {
  const dir = path.join(os.tmpdir(), 'pi-launcher-empty-' + Date.now());
  fs.mkdirSync(dir, { recursive: true });
  try {
    assert.equal(hasSessionContent(dir), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('hasSessionContent returns true when directory contains files', () => {
  const dir = path.join(os.tmpdir(), 'pi-launcher-content-' + Date.now());
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'session.json'), '{}');
  try {
    assert.equal(hasSessionContent(dir), true);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('hasSessionContent returns false for nonexistent directory', () => {
  assert.equal(hasSessionContent('/tmp/does-not-exist-xyz-' + Date.now()), false);
});

test('buildLaunchArgs passes all args through on fresh session', () => {
  const args = ['--session-dir', '/tmp/sess', '--thinking', 'low'];
  assert.deepEqual(buildLaunchArgs(args, false), args);
});

test('buildLaunchArgs returns --continue with --session-dir on restore', () => {
  const args = ['--session-dir', '/tmp/sess', '--thinking', 'low', '--skill', '/s'];
  assert.deepEqual(
    buildLaunchArgs(args, true),
    ['--continue', '--session-dir', '/tmp/sess'],
  );
});

test('buildLaunchArgs passes all args through when no --session-dir present', () => {
  const args = ['--thinking', 'low'];
  assert.deepEqual(buildLaunchArgs(args, true), args);
  assert.deepEqual(buildLaunchArgs(args, false), args);
});

test('buildLaunchArgs handles --session-dir at end without value', () => {
  const args = ['--thinking', 'low', '--session-dir'];
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
