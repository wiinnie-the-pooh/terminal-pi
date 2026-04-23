const test = require('node:test');
const assert = require('node:assert/strict');
const pkg = require('../package.json');

test('npm test compiles TypeScript before running tests', () => {
  assert.match(pkg.scripts.test, /^npm run compile\s*&&\s*node /);
});

test('npm run coverage relies on .c8rc.json instead of inline reporter flags', () => {
  assert.doesNotMatch(pkg.scripts.coverage, /--reporter=text/);
  assert.doesNotMatch(pkg.scripts.coverage, /--reporter=lcov/);
  assert.match(pkg.scripts.coverage, /c8 node run-tests\.js/);
});
