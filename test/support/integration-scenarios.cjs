const assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path"),test=require("node:test"),{execFileSync}=require("node:child_process");
const {writeDoc}=require("./canonical-markdown-fixtures.cjs");
const repositoryRoot=path.resolve(__dirname,"../..");
function registerIntegrationScenarios(title, scenarios, options = {}) {
  test(title, async (t) => {
  require("../support/execution-metrics.cjs").measureExecution(t,title);
  const { createIntegrationCandidateService } = require("../../dist/main/planExecution/integrationCandidateService.js");
  const { workIntakeBranchName } = require("../../dist/main/workIntake/workIntakeBranchService.js");
  const { integrationPaths } = require("../../dist/main/agentHarness/repository/integrationGit.js");
  const { execFileSync } = require("node:child_process");
  const { createIntegrationPolicyProvider, loadIntegrationPolicyAtCommit } = require("../../dist/main/planExecution/integrationPolicyProvider.js");
  const { createIntegrationRepairPolicyProvider } = require("../../dist/main/planExecution/integrationRepairPolicyProvider.js");
  for (const scenario of scenarios) await t.test(scenario, async (t) => {
    const semanticPolicy = scenario.startsWith("policy");
    const semanticRepair = ["operator-decision", "worker-git", "validation-failed"].includes(scenario);
    if (semanticPolicy || semanticRepair || options.sourceFixture) require("../support/integration-semantics.cjs").installSemanticSourceFixture(t);
    const root = createBoundWorkspace(`champcity-integration-${scenario}-`, true);
    t.after(() => fs.rmSync(path.dirname(root), { recursive: true, force: true }));
    git(root, ["branch", "-m", "product-target"]);
    fs.writeFileSync(path.join(root, ".gitignore"), "/planning/\n");
    fs.writeFileSync(path.join(root, "shared.txt"), "base\n");
    const policyScenario = scenario.startsWith("policy");
    if (!policyScenario) {
      git(root, ["config", "core.autocrlf", "true"]);
      fs.writeFileSync(path.join(root, "architecture.md"), "# Accepted architecture\n\nKeep both public contracts.\n");
      fs.writeFileSync(path.join(root, ".champcity/integration-policy.json"), JSON.stringify({ schemaVersion: 1,
        checks: [{ checkId: "source", lane: "integration", runner: { kind: "npm-script", script: "verify", timeoutMs: 10000 } }], requiredIntegrationChecks: ["source"],
        repair: { allowedEditableRoots: scenario === "repair-empty" ? ["no-incoming-source"] : ["shared.txt", "incoming.txt", "src"], protectedPaths: ["src/protected"], sources: [{ role: "architecture", path: "architecture.md" }] } }));
    }
    if (policyScenario) {
      fs.appendFileSync(path.join(root, ".gitignore"), "/.policy-proof.json\n/.policy-processes.json\n");
      fs.mkdirSync(path.join(root, ".champcity"), { recursive: true });
      const policy = scenario === "policy" ? {schemaVersion:1,checks:["typecheck","build","test:unit:built"].map((script,index)=>({checkId:"legacy-"+index,lane:"integration",runner:{kind:"npm-script",script,timeoutMs:15000}})),requiredIntegrationChecks:["legacy-0","legacy-1","legacy-2"]}
        : { schemaVersion: 1, checks: [{ checkId: "candidate-source", lane: "integration", runner: { kind: "npm-script", script: "verify", timeoutMs: scenario === "policy-timeout" ? 2500 : 15000 } }], requiredIntegrationChecks: ["candidate-source"] };
      fs.writeFileSync(path.join(root, ".champcity/integration-policy.json"), JSON.stringify(policy));
      const scripts = Object.fromEntries(policy.checks.map((check) => [check.runner.script, "node policy-check.cjs"]));
      if (scenario === "policy") {
        assert.deepEqual(Object.keys(scripts), ["typecheck", "build", "test:unit:built"]);
        scripts.pretypecheck = "node -e \"process.exit(79)\"";
      }
      fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ private: true, scripts }));
      fs.writeFileSync(path.join(root, ".npmrc"), "if-present=true\nworkspaces=true\nscript-shell=unavailable-fixture-interpreter\n");
      fs.writeFileSync(path.join(root, "policy-check.cjs"), `
const fs = require('node:fs');
const assert = require('node:assert/strict');
assert.match(process.cwd().replaceAll('\\\\', '/'), /\\.git\\/champcity-integration\\/[a-f0-9]{64}\\/checkout$/);
assert.match(fs.readFileSync('incoming.txt', 'utf8'), /accepted/);
const proof = fs.existsSync('.policy-proof.json') ? JSON.parse(fs.readFileSync('.policy-proof.json', 'utf8')) : [];
proof.push(process.env.npm_lifecycle_event); fs.writeFileSync('.policy-proof.json', JSON.stringify(proof));
${scenario === "policy-failure" ? "console.error('not ok 1 - candidate preserves accepted source'); console.error('AssertionError: expected accepted marker'); console.error(process.cwd()); console.error(require('node:os').homedir()); console.error(require('node:os').tmpdir()); console.error('ACCESS_TOKEN=fixture-secret-token-value'); process.exit(9);" : ""}
${scenario === "policy-mutates" ? "fs.appendFileSync('.champcity/integration-policy.json', '\\n');" : ""}
${scenario === "policy-output" ? "process.stdout.write('x'.repeat(2 * 1024 * 1024)); setInterval(() => {}, 1000);" : ""}
${scenario === "policy-timeout" ? "const child = require('node:child_process').spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore', windowsHide: true }); fs.writeFileSync('.policy-processes.json', JSON.stringify([process.pid, child.pid])); setInterval(() => {}, 1000);" : ""}
`);
    }
    if (options.prepareProfile) options.prepareProfile(root, scenario);
    commitAllFixtureState(root, "base");
    const base = git(root, ["rev-parse", "HEAD"]);
    const targetBranch = git(root, ["branch", "--show-current"]);
    const incomingBranch = workIntakeBranchName(`intake-${scenario}`);
    git(root, ["switch", "-c", incomingBranch]);
    const textualConflict = ["conflict", "operator-decision", "worker-git"].includes(scenario);
    fs.writeFileSync(path.join(root, textualConflict ? "shared.txt" : "incoming.txt"), "incoming accepted behavior\n");
    if (scenario === "repair-many") {
      fs.mkdirSync(path.join(root, "src"));
      for (let index = 0; index < 33; index++) fs.writeFileSync(path.join(root, "src", `source-${index}.txt`), "accepted\n");
    }
    if (policyScenario) {
      const policyPath = path.join(root, ".champcity/integration-policy.json");
      const manifestPath = path.join(root, "package.json");
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      if (scenario === "policy-weakened-incoming") {
        fs.writeFileSync(policyPath, JSON.stringify({ schemaVersion: 1, checks: [{ checkId: "weak", lane: "integration", runner: { kind: "npm-script", script: "weak", timeoutMs: 15000 } }], requiredIntegrationChecks: ["weak"] }));
        manifest.scripts.weak = "node -e \"process.exit(0)\"";
      } else if (scenario === "policy-valid-future") {
        fs.writeFileSync(policyPath, JSON.stringify({ schemaVersion: 1, checks: [{ checkId: "future", lane: "fast", runner: { kind: "npm-script", script: "future", timeoutMs: 15000 } }], requiredIntegrationChecks: ["future"] }));
        manifest.scripts.future = "node -e \"process.exit(0)\"";
      } else if (scenario === "policy-invalid-future") {
        fs.writeFileSync(policyPath, "{");
      } else if (scenario === "policy-changed-script") {
        manifest.scripts.verify = "node -e \"process.exit(0)\"";
      } else if (scenario === "policy-missing-script") {
        delete manifest.scripts.verify;
      }
      fs.writeFileSync(manifestPath, JSON.stringify(manifest));
    }
    commitAllFixtureState(root, "accepted incoming source");
    const incoming = git(root, ["rev-parse", "HEAD"]);
    git(root, ["switch", targetBranch]);
    if (scenario !== "unchanged") {
      fs.writeFileSync(path.join(root, textualConflict ? "shared.txt" : "target.txt"), "target accepted behavior\n");
      commitAllFixtureState(root, "independently accepted target");
    }
    const target = git(root, ["rev-parse", "HEAD"]);
    let remote;
    if (scenario === "remote-target" || scenario === "validation-failed") {
      remote = path.join(path.dirname(root), "upstream.git");
      fs.mkdirSync(remote); git(remote, ["init", "--bare"]);
      git(root, ["remote", "add", "origin", remote]); git(root, ["push", "origin", targetBranch]);
      if (scenario === "remote-target") {
        const peer = path.join(path.dirname(root), "peer"); git(path.dirname(root), ["clone", remote, peer]);
        git(peer, ["switch", targetBranch]); git(peer, ["config", "user.name", "Fixture"]); git(peer, ["config", "user.email", "fixture@example.invalid"]);
        fs.writeFileSync(path.join(peer, "remote.txt"), "remote accepted behavior\n"); commitAllFixtureState(peer, "remote advances"); git(peer, ["push", "origin", targetBranch]);
      }
    }
    git(root, ["switch", incomingBranch]);
    const binding = { repositoryId: "integration-fixture", intakeId: `intake-${scenario}`, baseBranch: targetBranch, baseCommit: base, workBranch: incomingBranch, currentHead: incoming, ...(remote ? { remote: { name: "origin", syncState: "synced" } } : {}) };
    const proof = { planRevision: 1, fresh: true, blockers: [], evidencePaths: ["accepted.md"], criteria: [{ criterion: "Behavior accepted", status: "passed", evidencePaths: ["accepted.md"] }] };
    const plan = { planId: "PLAN01", planRevision: 1, approved: true, fresh: true, blockers: [], structure: { topology: "direct", topologyRationale: "One accepted item", acceptanceCriteria: ["Behavior accepted"], workItems: [{ workItemId: "WI01", title: "Accepted work", purpose: "Bounded change", dependsOn: [], acceptanceCriteria: ["Behavior accepted"] }] }, workItems: [{ ...proof, workItemId: "WI01", stage: "complete" }], phases: [], planEvidence: proof };
    writeDoc(root, "planning/intake.md", "work-intake", "Pending", { identity: { intakeId: binding.intakeId }, bodyMarkdown: "# Work Intake\n\nPreserve incoming and target behavior." });
    writeDoc(root, "planning/plan.md", "work-planning-plan", "Approved", { identity: { intakeId: binding.intakeId, planId: plan.planId }, bodyMarkdown: "# Work Plan\n\nBoth accepted capabilities must remain." });
    fs.writeFileSync(path.join(root, "planning/architecture.md"), "# Accepted architecture\n\nKeep both public contracts.\n");
    let validationCalls = 0;
    const directChecks = [{ checkId: "preserved-source", run: async (candidateRoot, context) => {
      validationCalls++;
      assert.equal(Object.isFrozen(context), true);
      assert.equal(context.repositoryId, binding.repositoryId); assert.equal(context.targetCommit, target); assert.equal(context.incomingCommit, incoming);
      assert.equal(context.candidateCommit, git(candidateRoot, ["rev-parse", "HEAD"])); assert.equal(context.targetBranch, targetBranch); assert.match(context.candidateId, /^[a-f0-9]{64}$/);
      assert.notEqual(candidateRoot, root);
      assert.equal(git(root, ["rev-parse", targetBranch]), target, "Target remains untouched during validation");
      assert.equal(git(root, ["branch", "--show-current"]), incomingBranch);
      const script = textualConflict ? "const fs=require('node:fs');const value=fs.readFileSync('shared.txt','utf8');if(!value.includes('incoming accepted')||!value.includes('target accepted'))process.exit(2);" : "const fs=require('node:fs');if(!fs.readFileSync('incoming.txt','utf8').includes('accepted'))process.exit(2);";
      execFileSync(process.execPath, ["-e", script], { cwd: candidateRoot, windowsHide: true, stdio: "pipe" });
      if (scenario === "validation-mutates") fs.writeFileSync(path.join(candidateRoot, "incoming.txt"), "changed during validation\n");
      return { exitCode: scenario.startsWith("repair-") || scenario === "validation-failed" && !fs.readFileSync(path.join(candidateRoot, "incoming.txt"), "utf8").includes("verified resolution") ? 1 : 0, summary: "Source preservation check" };
    } }];
    const semanticRunner = async (candidateRoot, check, trusted) => {
      const manifest = JSON.parse(fs.readFileSync(path.join(candidateRoot, "package.json"), "utf8"));
      if (manifest.scripts?.[check.runner.script] !== trusted) return {exitCode:null,summary:"Required npm script differs from target-trusted definition."};
      const proofPath=path.join(candidateRoot,".policy-proof.json");
      const proof=fs.existsSync(proofPath)?JSON.parse(fs.readFileSync(proofPath,"utf8")):[];
      proof.push(check.runner.script);fs.writeFileSync(proofPath,JSON.stringify(proof));
      return {exitCode:0,summary:"Deterministic semantic check passed."};
    };
    const serviceHooks = { repositoryRoot: root, repositoryId: binding.repositoryId, load: async () => ({ binding, plan }),
      ...(semanticRepair ? {repairPolicy:async()=>({sources:[{role:"intake",path:"planning/intake.md"},{role:"plan",path:"planning/plan.md"},{role:"architecture",path:"architecture.md"}],editablePaths:[textualConflict?"shared.txt":"incoming.txt"],policySha256:"f".repeat(64)})} : createIntegrationRepairPolicyProvider({repositoryRoot:root,repositoryId:binding.repositoryId,load:async()=>({binding,plan,intakePath:"planning/intake.md",planPath:"planning/plan.md"})})),
      ...(policyScenario ? createIntegrationPolicyProvider(root, semanticRunner) : { checks: directChecks }) };
    if (options.prepareProfile) {
      const provider = createIntegrationPolicyProvider(root);
      delete serviceHooks.checks;
      serviceHooks.validationPolicy = { resolve: async commit => {
        const policy = await provider.validationPolicy.resolve(commit);
        return { ...policy, checks: policy.checks.map(check => ({ ...check, run: async (...args) => { validationCalls++; return check.run(...args); } })) };
      } };
    }
    const service = createIntegrationCandidateService(serviceHooks);
    plan.fresh = false; await assert.rejects(service.create(), /Plan completion/); plan.fresh = true;
    const candidate = await service.create();
    assert.equal(git(root, ["rev-parse", targetBranch]), target);
    assert.equal(candidate.baseCommit, base); assert.equal(candidate.incomingCommit, incoming); assert.equal(candidate.localTargetCommit, target);
    assert.equal(candidate.mergeBase, base);
    assert.deepEqual(service.read(candidate.candidateId), candidate);
    if (options.assertProfile) options.assertProfile(candidate, scenario);
    const checkout = integrationPaths(root, candidate.candidateId).checkout;
    if (scenario.startsWith("repair-")) {
      assert.equal(candidate.status, "validation-failed");
      await assert.rejects(service.prepareRepair(candidate.candidateId), /Operator\/replanning.*1–32 paths/);
      assert.equal(git(root, ["rev-parse", targetBranch]), target);
      await service.abort(candidate.candidateId);
      return;
    }
    if (policyScenario) {
      assert.equal(candidate.validationPolicySha256, (await loadIntegrationPolicyAtCommit(root, target)).sha256, "Receipt binds the immutable target policy");
      assert.equal(fs.existsSync(path.join(root, ".policy-proof.json")), false, "Checks never run in the source checkout");
      if (scenario === "policy-invalid-future") {
        assert.equal(candidate.status, "failed", "An invalid proposed replacement policy cannot advance");
        assert.deepEqual(candidate.validation, []);
        await assert.rejects(service.advance(candidate.candidateId), /all current required checks passing/);
      } else if (["policy-changed-script", "policy-missing-script", "policy-failure", "policy-timeout", "policy-output", "policy-mutates"].includes(scenario)) {
        assert.equal(candidate.status, "validation-failed");
        const messages = { "policy-changed-script": /target-trusted definition/, "policy-missing-script": /target-trusted definition/, "policy-failure": /candidate preserves accepted source|AssertionError/, "policy-timeout": /duration limit/, "policy-output": /output limit/, "policy-mutates": /script passed/ };
        assert.match(candidate.validation[0].summary, messages[scenario]);
        assert.equal(candidate.validation[0].exitCode, scenario === "policy-failure" ? 9 : scenario === "policy-mutates" ? 0 : null);
        const durable = JSON.stringify(candidate.validation);
        assert.equal(durable.length < 2000, true, "Failure evidence remains bounded");
        for (const unsafe of [root, os.homedir(), os.tmpdir(), "fixture-secret-token-value"]) assert.equal(durable.toLowerCase().includes(unsafe.toLowerCase()), false, `Durable evidence omits ${unsafe}`);
        await assert.rejects(service.advance(candidate.candidateId), /all current required checks passing/);
        if (scenario === "policy-timeout") {
          const pids = JSON.parse(fs.readFileSync(path.join(checkout, ".policy-processes.json"), "utf8"));
          for (const pid of pids) assert.throws(() => process.kill(pid, 0), /ESRCH/, "Timed out script and descendant exited");
        }
      } else {
        assert.equal(candidate.status, "validated", JSON.stringify(candidate.validation));
        assert.deepEqual(JSON.parse(fs.readFileSync(path.join(checkout, ".policy-proof.json"), "utf8")), scenario === "policy" ? ["typecheck", "build", "test:unit:built"] : ["verify"]);
        if (["policy-weakened-incoming", "policy-valid-future"].includes(scenario)) {
          assert.deepEqual(candidate.requiredChecks, ["candidate-source"], "Incoming replacement policy does not govern its own candidate");
        }
        if (scenario === "policy") {
          assert.equal((await service.advance(candidate.candidateId)).status, "integrated");
        } else if (scenario === "policy-recreated") {
          const correctProvider = createIntegrationPolicyProvider(root, semanticRunner);
          const wrongProvider = { validationPolicy: { resolve: async (commit) => ({ ...(await correctProvider.validationPolicy.resolve(commit)), sha256: "0".repeat(64) }) } };
          await assert.rejects(createIntegrationCandidateService({ ...serviceHooks, ...wrongProvider }).advance(candidate.candidateId), /policy changed/);
          const withoutProvider = createIntegrationCandidateService({ ...serviceHooks, validationPolicy: undefined, checks: directChecks });
          await assert.rejects(withoutProvider.advance(candidate.candidateId), /policy changed/);
          assert.equal((await createIntegrationCandidateService({ ...serviceHooks, ...correctProvider }).advance(candidate.candidateId)).status, "integrated");
        } else if (scenario === "policy-stale-target") {
          git(root, ["switch", targetBranch]);
          fs.appendFileSync(path.join(root, ".champcity/integration-policy.json"), "\n");
          commitAllFixtureState(root, "target policy changes after candidate validation");
          git(root, ["switch", incomingBranch]);
          const later = git(root, ["rev-parse", targetBranch]);
          const blocked = await service.advance(candidate.candidateId);
          assert.equal(blocked.status, "failed"); assert.match(blocked.message, /refs changed/); assert.equal(git(root, ["rev-parse", targetBranch]), later);
        } else {
          assert.equal(git(root, ["rev-parse", targetBranch]), target);
        }
      }
      const retained = git(root, ["rev-parse", targetBranch]);
      await service.abort(candidate.candidateId);
      assert.equal(fs.existsSync(checkout), false);
      assert.equal(git(root, ["rev-parse", targetBranch]), retained);
      assert.equal(git(root, ["status", "--porcelain"]), "");
      return;
    }
    if (textualConflict) {
      assert.equal(candidate.status, "conflicted", candidate.message); assert.deepEqual(candidate.conflictingPaths, ["shared.txt"]); assert.equal(validationCalls, 0);
      assert.match(fs.readFileSync(path.join(checkout, "shared.txt"), "utf8"), /<<<<<<< HEAD/);
      await assert.rejects(service.advance(candidate.candidateId, true), /all current required checks passing/);
    } else if (scenario.startsWith("validation-")) {
      assert.equal(candidate.status, "validation-failed", candidate.message); assert.equal(validationCalls, 1);
      await assert.rejects(service.advance(candidate.candidateId, true), /all current required checks passing/);
      if (remote) assert.equal(git(remote, ["rev-parse", targetBranch]), target, "Failed candidate was never pushed");
    } else {
      assert.equal(candidate.status, "validated", candidate.message); assert.equal(validationCalls, 1);
      if (scenario !== "unchanged") assert.match(fs.readFileSync(path.join(checkout, "target.txt"), "utf8"), /accepted/);
      plan.fresh = false; await assert.rejects(service.advance(candidate.candidateId), /Plan completion/); plan.fresh = true;
      if (scenario === "stale-target") {
        git(root, ["switch", targetBranch]); fs.writeFileSync(path.join(root, "later.txt"), "later target\n"); commitAllFixtureState(root, "target changes after proof"); git(root, ["switch", incomingBranch]);
        const later = git(root, ["rev-parse", targetBranch]);
        const blocked = await service.advance(candidate.candidateId); assert.equal(blocked.status, "failed"); assert.match(blocked.message, /refs changed/); assert.equal(git(root, ["rev-parse", targetBranch]), later);
      } else {
        const integrated = await service.advance(candidate.candidateId, Boolean(remote));
        assert.equal(integrated.status, "integrated", integrated.message); assert.equal(git(root, ["rev-parse", targetBranch]), candidate.candidateCommit);
        assert.equal(git(root, ["rev-parse", incomingBranch]), incoming);
        if (remote) { assert.equal(integrated.remoteSync, "synced"); assert.equal(git(remote, ["rev-parse", targetBranch]), candidate.candidateCommit); }
      }
    }
    if (textualConflict || scenario === "validation-failed") {
      if (scenario === "conflict") {
        const provider = serviceHooks.repairPolicy;
        for (const conflict of ["out-of-policy.txt", "src/protected/source.txt", "architecture.md", "planning/intake.md", ".champcity/integration-policy.json", "src/dist/output.js"]) {
          await assert.rejects(provider({ ...candidate, conflictingPaths: [conflict] }), /outside.*boundary/);
        }
        const governing = path.join(checkout, "architecture.md"); const original = fs.readFileSync(governing);
        fs.writeFileSync(governing, "changed architecture"); await assert.rejects(provider(candidate), /evidence changed/);
        fs.unlinkSync(governing); await assert.rejects(provider(candidate), /missing/); fs.writeFileSync(governing, original);
        const config = path.join(checkout, ".champcity/integration-policy.json"); const policyBytes = fs.readFileSync(config);
        fs.appendFileSync(config, "\n"); await assert.rejects(provider(candidate), /policy changed/); fs.writeFileSync(config, policyBytes);
      }
      const attempt = await service.prepareRepair(candidate.candidateId);
      assert.deepEqual(attempt.policy.editablePaths, [textualConflict ? "shared.txt" : "incoming.txt"]);
      assert.equal(attempt.policy.sources.filter((entry) => entry.role === "intake").length, 1);
      assert.equal(attempt.policy.sources.filter((entry) => entry.role === "plan").length, 1);
      assert.ok(attempt.policy.policySha256);
      if (scenario === "conflict") {
        const config = path.join(checkout, ".champcity/integration-policy.json"); const original = fs.readFileSync(config);
        fs.appendFileSync(config, "\n");
        await assert.rejects(service.applyRepairPatch(candidate.candidateId, attempt.repairId, [{ path: "shared.txt", beforeSha256: attempt.snapshot.editable["shared.txt"], content: "untrusted expansion" }]), /policy changed/);
        fs.writeFileSync(config, original);
      }
      assert.equal(attempt.repairId, "REPAIR01");
      assert.equal((await service.prepareRepair(candidate.candidateId)).repairId, attempt.repairId);
      assert.match(attempt.prompt, /Do not run Git merge, add, commit, checkout-ours\/theirs, merge-continue, push/);
      assert.match(attempt.prompt, /Operator decision/); assert.match(attempt.prompt, /Keep both public contracts/);
      assert.match(attempt.prompt, /incoming accepted behavior/); assert.match(attempt.prompt, /target accepted behavior/);
      assert.match(attempt.prompt, new RegExp(base)); assert.match(attempt.prompt, new RegExp(incoming)); assert.match(attempt.prompt, new RegExp(target));
      if (scenario === "operator-decision") {
        const stopped = await service.requestOperatorDecision(candidate.candidateId, attempt.repairId, "Accepted interfaces require incompatible semantics; Operator must revise scope before resolution.");
        assert.equal(stopped.candidate.status, "operator-decision"); assert.equal(stopped.attempt.status, "operator-decision");
        await assert.rejects(service.completeRepair(candidate.candidateId, attempt.repairId), /active attempt/);
        await assert.rejects(service.advance(candidate.candidateId, true), /all current required checks passing/);
      } else {
        const sourcePath = textualConflict ? "shared.txt" : "incoming.txt";
        await assert.rejects(service.applyRepairPatch(candidate.candidateId, attempt.repairId, [{ path: "unrelated.txt", beforeSha256: "deleted", content: "outside scope" }]), /source scope/);
        if (textualConflict) {
          const markers = await service.completeRepair(candidate.candidateId, attempt.repairId); assert.match(markers.attempt.message, /conflict markers/);
          assert.equal(git(checkout, ["rev-parse", "HEAD"]), target);
        } else assert.match(attempt.prompt, /No textual conflicts/);
        const currentPlanBytes = fs.readFileSync(path.join(root, "planning/plan.md"), "utf8");
        fs.appendFileSync(path.join(root, "planning/plan.md"), "\nChanged intent\n");
        await assert.rejects(service.completeRepair(candidate.candidateId, attempt.repairId), /governing intent changed/);
        fs.writeFileSync(path.join(root, "planning/plan.md"), currentPlanBytes);
        await service.applyRepairPatch(candidate.candidateId, attempt.repairId, [{ path: sourcePath, beforeSha256: attempt.snapshot.editable[sourcePath], content: textualConflict ? "incoming accepted behavior\ntarget accepted behavior\n" : "incoming accepted behavior; first repair attempt\n" }]);
        if (scenario === "worker-git") {
          git(checkout, ["add", "--", sourcePath]);
          const rejected = await service.completeRepair(candidate.candidateId, attempt.repairId); assert.match(rejected.attempt.message, /worker changed Git state/);
          assert.equal(git(root, ["rev-parse", targetBranch]), target);
        } else {
          fs.writeFileSync(path.join(checkout, "out-of-scope.txt"), "unrelated edit\n");
          const outside = await service.completeRepair(candidate.candidateId, attempt.repairId); assert.match(outside.attempt.message, /outside its bounded scope/);
          fs.unlinkSync(path.join(checkout, "out-of-scope.txt"));
          let completed = await service.completeRepair(candidate.candidateId, attempt.repairId);
          assert.equal(git(root, ["rev-parse", targetBranch]), target, "Repair commit never advances target");
          assert.equal(git(root, ["rev-parse", incomingBranch]), incoming, "Repair never rewrites accepted incoming history");
          if (scenario === "validation-failed") {
            assert.equal(completed.attempt.status, "validation-failed", completed.attempt.message);
            const firstCommit = completed.attempt.commit;
            const second = await service.prepareRepair(candidate.candidateId); assert.equal(second.repairId, "REPAIR02");
            assert.equal(service.readRepair(candidate.candidateId, "REPAIR01").commit, firstCommit);
            await service.applyRepairPatch(candidate.candidateId, second.repairId, [{ path: sourcePath, beforeSha256: second.snapshot.editable[sourcePath], content: "incoming accepted behavior; verified resolution\n" }]);
            completed = await service.completeRepair(candidate.candidateId, second.repairId);
            assert.equal(git(checkout, ["rev-parse", `${completed.attempt.commit}^`]), firstCommit, "Retry preserves repair history");
          }
          assert.equal(completed.attempt.status, "validated", completed.attempt.message); assert.equal(completed.candidate.status, "validated");
          const integrated = await service.advance(candidate.candidateId, Boolean(remote)); assert.equal(integrated.status, "integrated");
          assert.equal(git(root, ["rev-parse", targetBranch]), completed.attempt.commit);
        }
      }
    }
    const beforeCleanupTarget = git(root, ["rev-parse", targetBranch]);
    await service.abort(candidate.candidateId); await service.abort(candidate.candidateId);
    assert.equal(fs.existsSync(checkout), false);
    assert.equal(git(root, ["rev-parse", targetBranch]), beforeCleanupTarget); assert.equal(git(root, ["rev-parse", incomingBranch]), incoming);
    assert.equal(git(root, ["status", "--porcelain"]), "");
    assert.doesNotMatch(git(root, ["branch", "--list"]), /champcity-integration\//);
    assert.equal(fs.existsSync(integrationPaths(root, candidate.candidateId).record), true, "Canonical failure/success receipt survives cleanup");
  });
});
}

function createBoundWorkspace(prefix, gitBacked) {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  const root = path.join(container, "Alpha");
  fs.mkdirSync(path.join(root, ".champcity"), { recursive: true });
  fs.writeFileSync(path.join(root, ".champcity", "mcp-workspace-binding.json"), JSON.stringify({
    mcpWorkspaceId: "alpha",
    label: "Alpha Test Workspace",
    repositoryName: "Test/Alpha",
    gitBacked,
  }, null, 2), "utf8");
  if (gitBacked) {
    execFileSync("git", ["init", "-b", "dev"], { cwd: root, stdio: "ignore" });
    configureGitIdentity(root);
  }
  fs.writeFileSync(path.join(root, "README.md"), "temporary repository\n", "utf8");
  return root;
}

function configureGitIdentity(root) {
  execFileSync("git", ["config", "user.name", "ChampCity Test"], { cwd: root, stdio: "ignore" });
  execFileSync("git", ["config", "user.email", "champcity-test@example.invalid"], { cwd: root, stdio: "ignore" });
}

function commitAllFixtureState(root, message) {
  execFileSync("git", ["add", "--all", "--", "."], { cwd: root, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", message], { cwd: root, stdio: "ignore" });
}

function git(root, args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}
module.exports={registerIntegrationScenarios};
