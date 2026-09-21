const assert = require('node:assert/strict');
const MODES = ['parallel-safe', 'exclusive-process', 'exclusive-desktop', 'exclusive-performance', 'exclusive-packaging'];
const DEFAULT_CONCURRENCY = 2;
function scheduleTests(tests, concurrency = DEFAULT_CONCURRENCY) {
  assert.ok(Number.isInteger(concurrency) && concurrency >= 1 && concurrency <= 4, 'Concurrency must be an integer from 1 to 4');
  for (const file of tests) assert.ok(MODES.includes(file.executionMode), 'Missing execution safety');
  return MODES.map(mode => ({ mode, concurrency: mode === 'parallel-safe' ? concurrency : 1,
    files: tests.filter(t => t.executionMode === mode).map(t => t.testPath) })).filter(c => c.files.length);
}
async function runCohorts(cohorts, run) {
  const results = new Map();
  for (const cohort of cohorts) {
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(cohort.concurrency, cohort.files.length) }, async () => {
      while (next < cohort.files.length) { const file = cohort.files[next++]; try { results.set(file, await run(file)); } catch { results.set(file, { testPath: file, status: 'execution-failed', reason: 'runner-error', durationMs: 0 }); } }
    }));
  }
  return results;
}
module.exports = { MODES, DEFAULT_CONCURRENCY, scheduleTests, runCohorts };
