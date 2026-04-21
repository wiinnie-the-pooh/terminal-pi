const test = require('node:test');
const assert = require('node:assert/strict');
const { PI_TERMINAL_NAME, isPiTerminalName } = require('../out/piTerminal.js');

test('recognizes the Pi terminal name', () => {
  assert.equal(isPiTerminalName(PI_TERMINAL_NAME), true);
});

test('rejects non-Pi terminal names', () => {
  assert.equal(isPiTerminalName('Terminal'), false);
  assert.equal(isPiTerminalName(undefined), false);
});
