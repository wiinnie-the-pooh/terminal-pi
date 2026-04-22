const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildPiTerminalEnv,
} = require('../out/terminalEnv.js');

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

test('uses the detected editor command when no explicit setting is configured', () => {
  assert.deepEqual(buildPiTerminalEnv({}, '', 'cursor --wait'), {
    EDITOR: 'cursor --wait',
    VISUAL: 'cursor --wait',
  });
});

test('falls back to inherited editor configuration when no explicit or detected command exists', () => {
  assert.deepEqual(buildPiTerminalEnv({ EDITOR: 'nvim' }, ''), {
    EDITOR: 'nvim',
    VISUAL: 'nvim',
  });

  assert.deepEqual(buildPiTerminalEnv({ VISUAL: 'vim -f' }, '   '), {
    EDITOR: 'vim -f',
    VISUAL: 'vim -f',
  });
});

test('returns no editor override when nothing is configured or inherited', () => {
  assert.deepEqual(buildPiTerminalEnv({}, ''), {});
});
