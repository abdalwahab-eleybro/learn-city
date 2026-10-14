#!/usr/bin/env node
/* Runs every tests/unit/*.test.js in its own process and prints a summary.  node tests/run.js [filter] */
const fs = require('fs'), path = require('path'), cp = require('child_process');
const dir = path.join(__dirname, 'unit'), filter = process.argv[2] || '';
let failed = 0, total = 0;
for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.test.js') && x.includes(filter)).sort()) {
  console.log('\n' + f);
  const r = cp.spawnSync(process.execPath, [path.join(dir, f)], { encoding: 'utf8' });
  process.stdout.write(r.stdout); if (r.stderr) process.stdout.write(r.stderr);
  total++; if (r.status !== 0) failed++;
}
console.log(`\n${total - failed}/${total} test files passed`);
process.exit(failed ? 1 : 0);
