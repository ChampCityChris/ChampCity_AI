// Application-owned adapter entrypoint. This entire toolkit is read from the exact
// target commit into temporary private storage before it is executed.
const fs = require('node:fs');
const path = require('node:path');
const { loadCatalog, LANES } = require('./catalog.cjs');
const { authoritativeCatalog } = require('./authority.cjs');
const { planValidation, loadProfiles } = require('./planner.cjs');
const { executePlan } = require('./executor.cjs');
const { boundedText } = require('./process.cjs');
async function run(input) {
  loadProfiles(input.root); // Proposed future profiles must remain a complete supported configuration.
  const catalog = authoritativeCatalog(input.targetCatalog, loadCatalog(input.root), input.root, input.changedPaths);
  const full = ['full-supported-platform','release-qualification'].includes(input.profile);
  const plan = planValidation({ root: input.root, catalog, profiles: input.targetProfiles, profile: input.profile, ...(full ? {} : { changedPaths: input.changedPaths }), platform: input.context.platform });
  const scripts = JSON.parse(fs.readFileSync(path.join(input.root,'package.json'),'utf8')).scripts;
  const required = plan.staticSteps.map(kind=>kind==='production-build'?'build':'typecheck');
  for (const script of required) if (!input.targetScripts[script] || scripts?.[script] !== input.targetScripts[script]) throw Error('Candidate build differs from target-trusted script definition.');
  const receipt = await executePlan(plan, { root: input.root, catalog, context: { kind: 'integration-candidate', ...input.context } });
  return { status: receipt.status, runId: receipt.runId, durationMs: receipt.durationMs,
    telemetry: receipt.telemetry, selectedTests: plan.tests.map(t=>t.testPath), excludedLanes: LANES.filter(l=>!plan.tests.some(t=>t.lane===l)) };
}
if (require.main === module) {
  let body = ''; process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk=>{ body+=chunk; if(body.length>4_000_000)process.exit(2); });
  process.stdin.on('end', async()=>{ let input; try { input=JSON.parse(body); console.log(JSON.stringify(await run(input))); }
    catch(error){ console.log(JSON.stringify({status:'failed',message:boundedText(error.message,input?.root??'<PROJECT_REPO>',1200)})); process.exitCode=1; } });
}
module.exports = { run };
