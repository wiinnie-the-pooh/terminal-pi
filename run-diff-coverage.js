const { spawnSync } = require('child_process');
const { existsSync } = require('fs');

const COMPARE_BRANCH = process.env.DIFF_COVER_BASE || 'origin/main';

function getFailUnder() {
  const cliArg = process.argv.find((arg) => arg.startsWith('--fail-under='));
  if (cliArg) {
    return cliArg.split('=')[1];
  }
  return process.env.DIFF_COVER_FAIL_UNDER || '80';
}

const FAIL_UNDER = getFailUnder();

function hasCommand(cmd) {
  const result = spawnSync(
    process.platform === 'win32' ? 'where' : 'which',
    [cmd],
    { stdio: 'ignore' }
  );
  return result.status === 0;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (!existsSync('coverage/lcov.info')) {
  console.log('No coverage/lcov.info found. Running npm run coverage first...');
  run('npm', ['run', 'coverage']);
}

if (!hasCommand('diff-cover')) {
  console.error(
    'diff-cover is not installed. It is a Python tool required for diff coverage.\n' +
    'Install it with:\n' +
    '  pip install diff-cover\n' +
    'Or on some systems:\n' +
    '  pip3 install diff-cover'
  );
  process.exit(1);
}

const diffCoverArgs = [
  'coverage/lcov.info',
  `--compare-branch=${COMPARE_BRANCH}`,
  '--show-uncovered',
  `--fail-under=${FAIL_UNDER}`,
];

console.log(`Running diff-cover against ${COMPARE_BRANCH} with fail-under=${FAIL_UNDER}...\n`);
run('diff-cover', diffCoverArgs);
