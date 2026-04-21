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

test('uses configured editor command for Pi terminals when provided', () => {
  assert.deepEqual(buildPiTerminalEnv({}, 'cursor --wait'), {
    EDITOR: 'cursor --wait',
    VISUAL: 'cursor --wait',
  });

  assert.deepEqual(
    buildPiTerminalEnv({ EDITOR: 'nvim', VISUAL: 'vim -f' }, 'code-insiders --wait'),
    {
      EDITOR: 'code-insiders --wait',
      VISUAL: 'code-insiders --wait',
    }
  );
});

test('falls back to existing editor configuration when the setting is empty', () => {
  assert.deepEqual(buildPiTerminalEnv({ EDITOR: 'nvim' }, ''), {
    EDITOR: 'nvim',
    VISUAL: 'nvim',
  });

  assert.deepEqual(buildPiTerminalEnv({ VISUAL: 'vim -f' }, '   '), {
    EDITOR: 'vim -f',
    VISUAL: 'vim -f',
  });
});
