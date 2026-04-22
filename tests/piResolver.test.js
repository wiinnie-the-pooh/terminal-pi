const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { parsePiScriptPath } = require('../out/piResolver.js');

const SAMPLE_CMD_PATH = 'C:\\Users\\alice\\AppData\\Roaming\\npm\\pi.cmd';
// Use Windows path semantics for expected values — the code under test
// parses Windows .cmd wrappers and uses path.win32 internally.
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

test('extracts the script path from a modern npm .cmd wrapper', () => {
  const result = parsePiScriptPath(NPM_WRAPPER, SAMPLE_CMD_PATH);
  assert.equal(
    result,
    path.win32.join(SAMPLE_CMD_DIR, 'node_modules', '@mariozechner', 'pi-coding-agent', 'dist', 'cli.js'),
  );
});

test('extracts the script path from a legacy %~dp0 .cmd wrapper', () => {
  const result = parsePiScriptPath(LEGACY_WRAPPER, SAMPLE_CMD_PATH);
  assert.equal(
    result,
    path.win32.join(SAMPLE_CMD_DIR, 'node_modules', '@mariozechner', 'pi-coding-agent', 'bin', 'pi.js'),
  );
});

test('returns undefined when no script reference is present', () => {
  const result = parsePiScriptPath('@echo off\r\necho hello\r\n', SAMPLE_CMD_PATH);
  assert.equal(result, undefined);
});
