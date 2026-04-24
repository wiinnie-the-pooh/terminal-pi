const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const pkg = require('../package.json');

function readGitIgnore() {
  return fs.readFileSync(path.join(__dirname, '..', '.gitignore'), 'utf8');
}

test('package.json compile regenerates webview assets before compiling', () => {
  assert.equal(
    pkg.scripts.compile,
    'npm run copy-webview-assets && npm run compile-only',
  );
});

test('package.json vscode:prepublish regenerates webview assets before packaging', () => {
  assert.equal(
    pkg.scripts['vscode:prepublish'],
    'npm run copy-webview-assets && npm run compile-only',
  );
});

test('.gitignore ignores generated resources/webview assets', () => {
  assert.match(readGitIgnore(), /^resources\/webview\/\s*$/m);
});
