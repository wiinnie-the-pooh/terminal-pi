const test = require('node:test');
const assert = require('node:assert/strict');
const { existsSync, readFileSync } = require('fs');

test('.c8rc.json exists', () => {
  assert.ok(existsSync('.c8rc.json'), '.c8rc.json should exist');
});

test('.c8rc.json enables check-coverage', () => {
  const config = JSON.parse(readFileSync('.c8rc.json', 'utf-8'));
  assert.strictEqual(config['check-coverage'], true);
});

test('.c8rc.json sets minimum thresholds', () => {
  const config = JSON.parse(readFileSync('.c8rc.json', 'utf-8'));
  assert.ok(config.lines >= 60, `lines threshold should be >= 60, got ${config.lines}`);
  assert.ok(config.functions >= 55, `functions threshold should be >= 55, got ${config.functions}`);
  assert.ok(config.branches >= 90, `branches threshold should be >= 90, got ${config.branches}`);
  assert.ok(config.statements >= 60, `statements threshold should be >= 60, got ${config.statements}`);
});
