const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('fs');

const source = readFileSync('run-diff-coverage.js', 'utf-8');

test('run-diff-coverage.js references DIFF_COVER_FAIL_UNDER environment variable', () => {
  assert.match(source, /DIFF_COVER_FAIL_UNDER/);
});

test('run-diff-coverage.js passes --fail-under to diff-cover', () => {
  assert.match(source, /--fail-under/);
});

test('run-diff-coverage.js defaults threshold to 80', () => {
  assert.match(source, /['"]80['"]/);
});
