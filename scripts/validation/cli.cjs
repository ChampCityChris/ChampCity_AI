#!/usr/bin/env node
const { planValidation, assertExecutionScope } = require('./planner.cjs');
const { executePlan } = require('./executor.cjs');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { ROOT, relativePath } = require('./catalog.cjs');
function main(args, { root = ROOT } = {}) {
  assert.ok(['preview', 'run'].includes(args[0]), 'Expected preview or run command');
  const options = {};
  for (let i = 1; i < args.length; i++) {
    const name = args[i];
    assert.ok(['--profile', '--lane', '--changes', '--preview'].includes(name) && !Object.hasOwn(options, name), 'Invalid or duplicate validation argument');
    if (name === '--preview') options[name] = true;
    else { assert.ok(typeof args[i + 1] === 'string' && !args[i + 1].startsWith('--'), 'Missing validation argument'); options[name] = args[++i]; }
  }
  const preview = args[0] === 'preview' || options['--preview'];
  assertExecutionScope(options['--profile'], Boolean(options['--changes']), preview);
  let changes = {};
  if (options['--changes']) {
    const file = relativePath(options['--changes']);
    const absolute = fs.realpathSync(path.join(root, file));
    const relative = path.relative(fs.realpathSync(root), absolute);
    assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative), 'Change set must stay inside repository');
    assert.ok(fs.statSync(absolute).size <= 1024 * 1024, 'Change set exceeds size limit');
    changes = JSON.parse(fs.readFileSync(absolute, 'utf8'));
    assert.ok(changes && typeof changes === 'object' && !Array.isArray(changes) && Object.keys(changes).every(key=>['changedPaths','capabilityIds'].includes(key)) && Array.isArray(changes.changedPaths), 'Invalid change-set fixture');
  }
  const plan = planValidation({ root, ...(options['--profile'] === undefined ? {} : { profile: options['--profile'] }), ...(options['--lane'] === undefined ? {} : { lane: options['--lane'] }), ...changes });
  return preview ? plan : executePlan(plan, { root });
}
if (require.main === module) {
  Promise.resolve().then(() => main(process.argv.slice(2))).then(result => {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    if (result.status && result.status !== 'passed') process.exitCode = 1;
  }).catch(error => { process.stderr.write('Validation failed: ' + error.message + '\n'); process.exitCode = 1; });
}
module.exports = { main };
