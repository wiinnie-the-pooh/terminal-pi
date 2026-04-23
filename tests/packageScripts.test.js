const test = require('node:test');
const assert = require('node:assert/strict');
const pkg = require('../package.json');

test('npm test compiles TypeScript before running tests', () => {
  assert.match(pkg.scripts.test, /^npm run compile\s*&&\s*node /);
});
