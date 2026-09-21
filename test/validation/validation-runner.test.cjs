const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { LANES, ROOT, loadCatalog, validateCatalog } = require('../../scripts/validation/catalog.cjs');
const { loadProfiles, planValidation } = require('../../scripts/validation/planner.cjs');
const { executePlan } = require('../../scripts/validation/executor.cjs');
const { main } = require('../../scripts/validation/cli.cjs');

test('validation plans deterministically preserve lane profile and ownership requirements', () => {
  const catalog = loadCatalog();
  const profiles = loadProfiles();
  for (const lane of LANES) {
    const plan = planValidation({ lane });
    assert.deepEqual(plan, planValidation({ lane }));
    assert.deepEqual(plan.tests.map(t => t.testPath), catalog.tests.filter(t => lane === 'full-regression' || t.proposedValidationLane === lane).map(t => t.testPath));
    for (const entry of plan.tests) {
      const record = catalog.tests.find(t => t.testPath === entry.testPath);
      assert.deepEqual(entry.ownership, record.behaviorCoverage);
      assert.deepEqual(entry.duration, record.duration);
      assert.equal(entry.platformRequirement, record.execution.platform);
      assert.equal(entry.requiresBuild, record.execution.requiresBuild);
      assert.ok(entry.reason);
    }
  }
  for (const profile of Object.keys(profiles.profiles)) {
    const plan = planValidation({ profile });
    assert.deepEqual(plan, main(['preview', '--profile', profile]));
    assert.deepEqual(plan.tests.map(t => t.testPath), catalog.tests.filter(t => profiles.profiles[profile].lanes.includes(t.proposedValidationLane) && (!t.execution.profileRestriction || t.execution.profileRestriction.includes(profile))).map(t => t.testPath));
  }
  const desktop = planValidation({ lane: 'desktop-platform', platform: 'linux' });
  assert.ok(desktop.tests.some(t => !t.platformSupported));
});

test('validation planning rejects invalid selection catalog and ownership instead of omitting proof', () => {
  for (const args of [{}, { lane: '' }, { profile: '' }, { lane: 'unknown' }, { profile: 'unknown' }, { lane: 'fast', profile: 'work-item' }, { testPaths: ['test/missing.test.cjs'] }]) {
    assert.throws(() => planValidation(args));
  }
  assert.throws(() => main(['preview', '--lane', 'fast', '--ignore-errors']));
  const original = loadCatalog();
  for (const mutate of [
    m => { m.schemaVersion = 99; },
    m => { m.tests.pop(); },
    m => { m.tests[0].proposedValidationLane = 'typo'; },
    m => { m.tests[0].execution.requiresBuild = 'false'; },
    m => { m.tests[0].execution.platform = 'unknown'; },
    m => { m.tests[0].duration.milliseconds = -1; },
    m => { m.tests[0].behaviorCoverage[0].capabilityId = 'missing'; },
    m => { m.tests[0].behaviorCoverage[0].proofRole = 'supporting'; },
    m => { m.capabilities[0].dependsOn.push('unknown'); },
    m => { m.tests[0].testPath = 'test/../outside.test.cjs'; },
  ]) {
    const invalid = structuredClone(original); mutate(invalid);
    assert.throws(() => validateCatalog(invalid, ROOT));
  }
});

test('serial validation execution reports real pass failure timeout and bounded output', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'champcity-validation-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'test'));
  fs.mkdirSync(path.join(root, 'validation'));
  const files = {
    'test/a.test.cjs': "require('node:test')('pass', () => require('node:assert/strict').equal(2+2,4));",
    'test/b.test.cjs': "require('node:test')('fail', () => {console.log('x'.repeat(10000));require('node:assert/strict').equal(1,2)});",
    'test/c.test.cjs': "require('node:test')('timeout', async () => new Promise(resolve => setTimeout(resolve, 5000)));",
  };
  const template = loadCatalog().tests.find(t => t.testPath === 'test/validation/capability-map.test.cjs');
  const tests = Object.keys(files).map((testPath, index) => ({ ...structuredClone(template), testPath,
    proposedValidationLane: 'fast', behaviorCoverage: [{ capabilityId: 'fixture', behaviorId: `case-${index}`, proofRole: 'primary', proofLocator: `case ${index}` }] }));
  const catalog = { schemaVersion: 3, capabilities: [{ capabilityId: 'fixture', description: 'fixture', sourcePatterns: ['test/**'], dependsOn: [], behaviors: tests.map((_, i) => ({ behaviorId: `case-${i}`, description: 'fixture case' })) }], tests };
  for (const [file, source] of Object.entries(files)) fs.writeFileSync(path.join(root, file), source);
  fs.writeFileSync(path.join(root, 'validation/capability-map.json'), JSON.stringify(catalog));
  fs.copyFileSync(path.join(ROOT, 'validation/profiles.json'), path.join(root, 'validation/profiles.json'));
  const plan = planValidation({ root, testPaths: Object.keys(files).slice(0, 2) });
  const receipt = await executePlan(plan, { root, outputLimit: 2048 });
  assert.equal(receipt.status, 'failed');
  assert.deepEqual(receipt.results.map(r => r.status), ['passed', 'failed']);
  assert.equal(receipt.results[0].counts.pass, 1);
  assert.ok(receipt.results.every(r => r.output.length <= 2048 && r.durationMs >= 0));
  const timeout = await executePlan(planValidation({ root, testPaths: ['test/c.test.cjs'] }), { root, timeoutMs: 300 });
  assert.equal(timeout.results[0].status, 'execution-failed');
  assert.equal(timeout.results[0].timedOut, true);
  const tampered = structuredClone(plan); tampered.tests[0].testPath = 'test/unknown.test.cjs';
  await assert.rejects(executePlan(tampered, { root }));
  tests[0].execution.requiresBuild = true;
  fs.writeFileSync(path.join(root, 'validation/capability-map.json'), JSON.stringify(catalog));
  const rejected = await executePlan(planValidation({ root, testPaths: ['test/a.test.cjs'] }), { root, ensureBuild: async () => { throw Error('fixture build failed'); } });
  assert.equal(rejected.status, 'failed');
  assert.equal(rejected.results[0].status, 'blocked');
});


test('one run owns the build consumed by multiple lanes and stale output cannot bypass a failed build', async t => {
  const { validationFixture } = require('../support/validation-fixture.cjs');
  const source = "require('node:test')('fresh generation',()=>{const fs=require('node:fs');require('node:assert/strict').equal(require('../dist/generation.json'),1);fs.appendFileSync('executed.txt','x');});";
  const {root} = validationFixture(t, {'test/a.test.cjs':{source,requiresBuild:true,lane:'fast'},'test/b.test.cjs':{source,requiresBuild:true,lane:'integration'}});
  fs.mkdirSync(path.join(root,'dist')); fs.writeFileSync(path.join(root,'dist/generation.json'),'0');
  fs.writeFileSync(path.join(root,'build.cjs'),"const fs=require('node:fs');const count=fs.existsSync('build-count.txt')?Number(fs.readFileSync('build-count.txt'))+1:1;fs.writeFileSync('build-count.txt',String(count));fs.writeFileSync('dist/generation.json',String(count));");
  fs.writeFileSync(path.join(root,'package.json'),JSON.stringify({private:true,scripts:{build:'node build.cjs',typecheck:'node -e "process.exit(77)"'}}));
  const plan=planValidation({root,testPaths:['test/a.test.cjs','test/b.test.cjs']});
  assert.deepEqual(plan.staticSteps,['production-build']);
  const receipt=await executePlan(plan,{root}); assert.equal(receipt.status,'passed',JSON.stringify(receipt));
  assert.equal(receipt.steps.length,1); assert.equal(fs.readFileSync(path.join(root,'build-count.txt'),'utf8'),'1');
  assert.ok(receipt.results.every(result=>result.buildRunId===receipt.runId));
  assert.equal(receipt.steps[0].runId,receipt.runId); assert.equal(fs.readFileSync(path.join(root,'executed.txt'),'utf8'),'xx');
  fs.writeFileSync(path.join(root,'build.cjs'),'process.exit(9);');
  const stale=structuredClone(plan);stale.requiresBuild=false;stale.staticSteps=[];
  await assert.rejects(executePlan(stale,{root}),/ownership differs/);
  const failed=await executePlan(plan,{root}); assert.equal(failed.status,'failed');assert.equal(failed.steps[0].exitCode,9);
  assert.ok(failed.results.every(r=>r.status==='blocked'));assert.equal(fs.readFileSync(path.join(root,'executed.txt'),'utf8'),'xx');
});


test('bounded scheduler overlaps safe files isolates exclusive cohorts and cleans failed process descendants', async t => {
  const {validationFixture}=require('../support/validation-fixture.cjs');
  const source=name=>"const fs=require('node:fs');require('node:test')('scheduled',async()=>{fs.appendFileSync('events.jsonl',JSON.stringify({name:'"+name+"',stage:'start',at:Date.now()})+'\\n');await new Promise(r=>setTimeout(r,180));fs.appendFileSync('events.jsonl',JSON.stringify({name:'"+name+"',stage:'end',at:Date.now()})+'\\n');});";
  const f=validationFixture(t,Object.fromEntries(['a','b','c','d'].map(name=>['test/'+name+'.test.cjs',{source:source(name)}])));
  f.catalog.tests[2].execution.scheduling='exclusive-process';f.catalog.tests[3].execution.scheduling='exclusive-desktop';f.save();
  for(let repeat=0;repeat<2;repeat++){
    fs.writeFileSync(path.join(f.root,'events.jsonl'),'');
    const receipt=await executePlan(planValidation({root:f.root,testPaths:f.catalog.tests.map(r=>r.testPath),concurrency:2}),{root:f.root});
    assert.equal(receipt.status,'passed',JSON.stringify(receipt));
    assert.deepEqual(receipt.results.map(r=>r.testPath),f.catalog.tests.map(r=>r.testPath));
    const events=fs.readFileSync(path.join(f.root,'events.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
    const at=(name,stage)=>events.find(e=>e.name===name&&e.stage===stage).at;
    assert.ok(Math.max(at('a','start'),at('b','start'))<Math.min(at('a','end'),at('b','end')),'safe files overlap');
    assert.ok(at('c','start')>=Math.max(at('a','end'),at('b','end')));assert.ok(at('d','start')>=at('c','end'));
  }
  const bad=structuredClone(f.catalog);delete bad.tests[0].execution.scheduling;assert.throws(()=>validateCatalog(bad,f.root),/field vocabulary|scheduling/);
  assert.throws(()=>planValidation({root:f.root,lane:'fast',concurrency:20}),/Concurrency/);
  const descendant="const cp=require('node:child_process'),fs=require('node:fs');require('node:test')('fails with child',()=>{const child=cp.spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore',windowsHide:true});child.unref();fs.writeFileSync('pid.txt',String(child.pid));const temp=require('node:os').tmpdir();fs.writeFileSync('temporary-root.txt',temp);fs.writeFileSync(require('node:path').join(temp,'orphan.txt'),'fixture');throw Error('fixture failure');});";
  fs.writeFileSync(path.join(f.root,'test/c.test.cjs'),descendant);
  const failed=await executePlan(planValidation({root:f.root,testPaths:['test/c.test.cjs']}),{root:f.root,timeoutMs:5000});
  assert.equal(failed.status,'failed');assert.equal(fs.existsSync(fs.readFileSync(path.join(f.root,'temporary-root.txt'),'utf8')),false);const pid=Number(fs.readFileSync(path.join(f.root,'pid.txt'),'utf8'));assert.throws(()=>process.kill(pid,0),/ESRCH/);
  fs.writeFileSync(path.join(f.root,'test/c.test.cjs'),descendant.replace("throw Error('fixture failure');","setInterval(()=>{},1000);"));
  const timed=await executePlan(planValidation({root:f.root,testPaths:['test/c.test.cjs']}),{root:f.root,timeoutMs:700});
  assert.equal(timed.results[0].timedOut,true);const timedPid=Number(fs.readFileSync(path.join(f.root,'pid.txt'),'utf8'));assert.throws(()=>process.kill(timedPid,0),/ESRCH/);
});


test('affected proof selection is deterministic complete within profile scope and rejects unknown paths and cycles', () => {
  const fixtures=require('../fixtures/validation/affected-changes.json');
  const {matchesPattern}=require('../../scripts/validation/affected.cjs');
  assert.equal(matchesPattern('aXts','a.ts'),false);assert.equal(matchesPattern('test/x.test.cjs','test/**/*.test.cjs'),true);assert.equal(matchesPattern('test/a/x.test.cjs','test/**/*.test.cjs'),true);
  const plans={};for(const [name,changedPaths] of Object.entries(fixtures)){if(name==='unknown'){assert.throws(()=>planValidation({profile:'integration-gate',changedPaths}),/Unclassified.*src\/unowned/);continue;}
    const plan=planValidation({profile:'integration-gate',changedPaths});plans[name]=plan;assert.deepEqual(plan,planValidation({profile:'integration-gate',changedPaths:[...changedPaths].reverse()}));
    assert.equal(new Set(plan.tests.map(t=>t.testPath)).size,plan.tests.length);assert.ok(plan.tests.every(t=>t.reason.startsWith('affected:')));
    assert.ok(!plan.tests.some(t=>['desktop-platform','packaging','performance-soak'].includes(t.lane)));
  }
  assert.ok(plans.renderer.tests.some(t=>t.testPath.startsWith('test/renderer/')));
  assert.ok(plans.mcp.tests.some(t=>t.testPath==='test/agent-harness/mcp-session-lifecycle.test.cjs'));
  assert.ok(!plans.mcp.tests.some(t=>t.testPath.includes('project-planning')));
  assert.ok(plans.shared.selection.capabilities.some(c=>c.capabilityId==='release-and-git-operations'));
  assert.ok(plans.shared.selection.capabilities.some(c=>c.capabilityId==='agent-harness-repository-operations'));
  assert.equal(plans.documentation.requiresBuild,false);assert.ok(plans.documentation.tests.length&&plans.documentation.tests.every(t=>t.lane==='static'));
  const wider=planValidation({profile:'integration-gate',changedPaths:fixtures.single,capabilityIds:['issue-resolution-workflow']});
  assert.ok(plans.single.tests.every(t=>wider.tests.some(w=>w.testPath===t.testPath)));assert.ok(wider.selection.capabilities.some(c=>c.capabilityId==='issue-resolution-workflow'));
  assert.throws(()=>planValidation({profile:'integration-gate',changedPaths:fixtures.single,capabilityIds:['unknown']}),/Unknown explicit/);
  const cyclic=loadCatalog();cyclic.capabilities.find(c=>c.capabilityId==='workspace-registry').dependsOn=['agent-harness-mcp-runtime'];assert.throws(()=>validateCatalog(cyclic,ROOT),/cycle/);
  assert.deepEqual(main(['preview','--profile','integration-gate','--changes','test/fixtures/validation/renderer-change.json']),plans.renderer);
});


test('public validation commands dispatch composed profiles and reject accidental broad affected runs', async t => {
  const scripts = require('../../package.json').scripts;
  const commands = Object.entries(scripts).filter(([name])=>name === 'test' || name.startsWith('test:') || ['validate:static','validate:plan'].includes(name));
  for (const [name,command] of commands) {
    assert.ok(command.startsWith('node scripts/validation/cli.cjs '), name);
    const args=command.split(' ').slice(2);
    const preview=main([...args, ...(name==='validate:plan'?['--profile','work-item']:[]), '--preview']);
    assert.ok(Array.isArray(preview.tests), name);
    if(name==='test') assert.ok(preview.tests.every(file=>['static','fast'].includes(file.lane)));
  }
  assert.throws(()=>main(['run','--profile','integration-gate']), /requires an explicit changed-path set/);
  assert.throws(()=>main(['run','--profile','work-item']), /requires an explicit changed-path set/);
  assert.throws(()=>main(['run','--profile','full-supported-platform','--changes','scope.json']), /cannot narrow/);
  assert.throws(()=>main(['preview','--lane','fast','--concurrency','10']), /Concurrency/);
  const {validationFixture}=require('../support/validation-fixture.cjs');
  const source="require('node:test')('dispatch fixture',()=>{});";
  const fixture=validationFixture(t,{
    'test/fast.test.cjs':{source,lane:'fast'},
    'test/integration.test.cjs':{source,lane:'integration'},
    'test/performance.test.cjs':{source,lane:'performance-soak'},
    'test/platform.test.cjs':{source,lane:'desktop-platform'},
  });
  const profiles=loadProfiles(fixture.root);for(const profile of Object.values(profiles.profiles)){profile.requiresBuild=false;profile.requiredCapabilities=['fixture'];}
  fs.writeFileSync(path.join(fixture.root,'validation/profiles.json'),JSON.stringify(profiles));
  fs.writeFileSync(path.join(fixture.root,'scope.json'),JSON.stringify({changedPaths:['src/feature.ts']}));
  for(const lane of ['fast','performance-soak','desktop-platform']) {
    const receipt=await main(['run','--lane',lane],{root:fixture.root});
    assert.equal(receipt.status,'passed',JSON.stringify(receipt));assert.equal(receipt.results.length,1);assert.equal(receipt.results[0].lane,lane);
    t.diagnostic(lane+' dispatch: '+receipt.durationMs+'ms');
  }
  for(const profile of ['work-item','repair','integration-gate']) {
    const receipt=await main(['run','--profile',profile,'--changes','scope.json'],{root:fixture.root});
    assert.equal(receipt.status,'passed',JSON.stringify(receipt));assert.equal(receipt.results.length,2);
    t.diagnostic(profile+' dispatch: '+receipt.durationMs+'ms');
  }
});


test('changed source runs one build through scheduled proof into stable bounded budgeted receipts', async t => {
  const {validationFixture}=require('../support/validation-fixture.cjs');
  const {sourceContext,evaluateBudget,completeReceipt}=require('../../scripts/validation/telemetry.cjs');
  const cp=require('node:child_process');
  const source="require('node:test')('built value',()=>require('node:assert/strict').equal(require('../dist/value.cjs'),42));";
  const f=validationFixture(t,{
    'test/a.test.cjs':{source,lane:'affected-capability',requiresBuild:true},
    'test/b.test.cjs':{source,lane:'integration',requiresBuild:true},
    'test/platform.test.cjs':{source,lane:'desktop-platform'},
    'test/packaging.test.cjs':{source,lane:'packaging'},
    'test/performance.test.cjs':{source,lane:'performance-soak'},
  });
  const profiles=loadProfiles(f.root);for(const profile of Object.values(profiles.profiles))profile.requiredCapabilities=['fixture'];
  fs.writeFileSync(path.join(f.root,'validation/profiles.json'),JSON.stringify(profiles));
  fs.mkdirSync(path.join(f.root,'src'));fs.writeFileSync(path.join(f.root,'src/value.cjs'),'module.exports=42;');
  fs.writeFileSync(path.join(f.root,'build.cjs'),"const fs=require('node:fs');fs.mkdirSync('dist',{recursive:true});fs.copyFileSync('src/value.cjs','dist/value.cjs');fs.appendFileSync('build-count.txt','x');");
  fs.writeFileSync(path.join(f.root,'package.json'),JSON.stringify({private:true,scripts:{build:'node build.cjs'}}));
  fs.writeFileSync(path.join(f.root,'.gitignore'),'/dist/\n/build-count.txt\n');
  const git=(...args)=>cp.execFileSync('git',args,{cwd:f.root,encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']}).trim();
  git('init','-b','fixture');git('config','user.name','Fixture');git('config','user.email','fixture@example.invalid');git('config','core.autocrlf','false');git('add','.');git('commit','-m','stable source');
  const plan=planValidation({root:f.root,profile:'integration-gate',changedPaths:['src/value.cjs']});
  assert.deepEqual(plan.tests.map(t=>t.lane),['affected-capability','integration']);
  const receipt=await executePlan(plan,{root:f.root});
  assert.equal(receipt.status,'passed',JSON.stringify(receipt));assert.equal(receipt.sourceStable,true);assert.equal(receipt.sourceContext.revision,git('rev-parse','HEAD'));assert.equal(receipt.sourceContext.dirty,false);
  assert.equal(receipt.steps.length,1);assert.equal(fs.readFileSync(path.join(f.root,'build-count.txt'),'utf8'),'x');
  assert.ok(receipt.results.every(r=>r.buildRunId===receipt.runId));assert.equal(receipt.telemetry.counts.pass,2);assert.equal(receipt.telemetry.counts.skipped,0);
  assert.equal(receipt.telemetry.budget.status,'within-target');assert.deepEqual(receipt.telemetry.selectedLanes,['affected-capability','integration']);assert.equal(receipt.telemetry.concurrency,2);assert.ok(receipt.selection.every(s=>s.reason.startsWith('affected:')));assert.equal(receipt.telemetry.slowestFiles.length,2);
  assert.deepEqual(evaluateBudget({lane:'static'},29999),{targetMs:30000,reviewThresholdMs:30000,status:'within-target'});
  assert.equal(evaluateBudget({lane:'fast'},30000).status,'target-missed');assert.equal(evaluateBudget({lane:'fast'},60000).status,'review-required');
  assert.equal(evaluateBudget({profile:'work-item'},60000).status,'review-required');assert.equal(evaluateBudget({profile:'integration-gate'},180000).status,'target-missed');assert.equal(evaluateBudget({profile:'integration-gate'},300000).status,'review-required');
  const over=completeReceipt(plan,{...receipt,durationMs:300000},receipt.sourceContext,receipt.sourceContext);assert.equal(over.results.length,2);assert.equal(over.telemetry.budget.status,'review-required');assert.equal(over.telemetry.slowestFiles.length,2);
  const before=sourceContext(f.root);fs.writeFileSync(path.join(f.root,'src/value.cjs'),'module.exports=43;');const after=sourceContext(f.root);assert.notEqual(before.contentSha256,after.contentSha256);
  assert.equal(completeReceipt(plan,{...receipt},before,after).status,'failed');
  const skipped=structuredClone(receipt);skipped.results[0].counts.skipped=1;assert.equal(completeReceipt(plan,skipped,before,before).status,'incomplete');
  t.diagnostic(JSON.stringify({totalMs:receipt.durationMs,buildMs:receipt.telemetry.buildDurationMs,tests:receipt.telemetry.counts.tests,budget:receipt.telemetry.budget.status}));
});
