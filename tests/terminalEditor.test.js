const test = require('node:test');
const assert = require('node:assert/strict');
const {
  DEFAULT_PI_EDITOR,
  buildPiTerminalEnv,
} = require('../out/terminalEnv.js');

test('defaults EDITOR and VISUAL to code --wait when neither is configured', () => {
  assert.equal(DEFAULT_PI_EDITOR, 'code --wait');
  assert.deepEqual(buildPiTerminalEnv({}), {
    EDITOR: 'code --wait',
    VISUAL: 'code --wait',
  });
});

test('preserves an existing editor configuration for Pi terminals', () => {
  assert.deepEqual(buildPiTerminalEnv({ EDITOR: 'nvim' }), {
    EDITOR: 'nvim',
    VISUAL: 'nvim',
  });

  assert.deepEqual(buildPiTerminalEnv({ VISUAL: 'vim -f' }), {
    EDITOR: 'vim -f',
    VISUAL: 'vim -f',
  });
});
