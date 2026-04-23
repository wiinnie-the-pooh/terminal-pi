const { readFileSync, writeFileSync, existsSync } = require('fs');
const { join } = require('path');
const { spawnSync } = require('child_process');

const COVERAGE_SUMMARY = 'coverage/coverage-summary.json';
const C8RC = '.c8rc.json';



function generateSummary() {
  console.log('Generating coverage summary...');
  const c8Path = join('node_modules', 'c8', 'bin', 'c8.js');
  const result = spawnSync(process.execPath, [c8Path, 'report', '--reporter=json-summary'], {
    stdio: 'inherit',
    shell: false,
  });
  if (result.status !== 0) {
    console.error('Failed to generate coverage summary. Run "npm run coverage" first.');
    process.exit(1);
  }
}

function main() {
  generateSummary();

  if (!existsSync(COVERAGE_SUMMARY)) {
    console.error(`${COVERAGE_SUMMARY} was not generated.`);
    process.exit(1);
  }

  const summary = JSON.parse(readFileSync(COVERAGE_SUMMARY, 'utf-8'));
  const total = summary.total;

  if (!total) {
    console.error('coverage-summary.json is missing "total" entry.');
    process.exit(1);
  }

  const thresholds = {
    lines: total.lines.pct,
    statements: total.statements.pct,
    functions: total.functions.pct,
    branches: total.branches.pct,
  };

  if (!existsSync(C8RC)) {
    console.error(`${C8RC} not found.`);
    process.exit(1);
  }

  const config = JSON.parse(readFileSync(C8RC, 'utf-8'));

  config.lines = thresholds.lines;
  config.statements = thresholds.statements;
  config.functions = thresholds.functions;
  config.branches = thresholds.branches;

  writeFileSync(C8RC, JSON.stringify(config, null, 2) + '\n');

  console.log('Updated .c8rc.json thresholds:');
  console.log(`  lines      : ${thresholds.lines}%`);
  console.log(`  statements : ${thresholds.statements}%`);
  console.log(`  functions  : ${thresholds.functions}%`);
  console.log(`  branches   : ${thresholds.branches}%`);
}

main();
