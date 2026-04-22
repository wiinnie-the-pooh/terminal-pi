const { readdirSync } = require('fs');
const { join } = require('path');
const { spawnSync } = require('child_process');

const files = readdirSync('tests')
  .filter((name) => name.endsWith('.test.js'))
  .map((name) => join('tests', name));

const result = spawnSync(process.execPath, ['--test', ...files], {
  stdio: 'inherit',
  shell: false,
});

process.exit(result.status ?? 0);
