#!/usr/bin/env node
/* Regenerates js/20b-easy-predict.js (answers for the predict-the-output questions) by running every model solution. Needs python3. */
const fs = require('fs'), path = require('path'), cp = require('child_process');
const T = require('../tests/lib');
const ctx = T.load(['18-easy-coding', '20-easy-data']);
const D = ctx.CF.EasyData, cache = path.join(T.ROOT, 'tests', '.cache'); fs.mkdirSync(cache, { recursive: true });
const probs = ctx.CF.EasyCoding.PROBLEMS.map(p => ({ num: p.num, title: p.title, input: p.input, code: (D.META[p.num] && D.META[p.num].code) || p.solution }));
fs.writeFileSync(path.join(cache, 'problems.json'), JSON.stringify(probs));
const pr = T.load(['27-pyrun']); fs.writeFileSync(path.join(cache, 'harness.py'), pr.CF.PyRun.HARNESS);
const r = cp.spawnSync('python3', [path.join(__dirname, 'make-predict.py'), path.join(cache, 'problems.json'), path.join(cache, 'harness.py'), path.join(T.ROOT, 'js', '20b-easy-predict.js')], { stdio: 'inherit' });
process.exit(r.status || 0);
