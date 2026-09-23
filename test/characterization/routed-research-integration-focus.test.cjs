const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

test('Research completion retains real candidate history and advances only the current accepted evidence', async (t) => {
  require('../support/execution-metrics.cjs').measureExecution(t, 'routed-research-integration-focus');
  const { installSemanticSourceFixture } = require('../support/integration-semantics.cjs');
  const { seedResearchIntegrationCompletion, advanceResearchCompletion, seedTerminalCandidateRecord } = require('../support/research-integration-scenarios.cjs');
  const { createRoutedIntegrationService } = require('../../dist/main/planExecution/routedIntegrationService.js');
  const policyProvider = require('../../dist/main/planExecution/integrationPolicyProvider.js');
  const fixture = seedResearchIntegrationCompletion(t);
  const { root, intake, route, git, assessmentId, assessmentPath } = fixture;
  const targetBefore = git('rev-parse', 'main');
  const incomingBefore = git('rev-parse', 'HEAD');
  installSemanticSourceFixture(t, { allowCheckpointChain: true });
  let validationPasses = false;
  t.mock.method(policyProvider, 'createIntegrationPolicyProvider', () => ({ checks: [{
    checkId: 'research-evidence',
    run: async () => ({ exitCode: validationPasses ? 0 : 1, summary: validationPasses ? 'Approved Research evidence retained' : 'Deterministic retained-candidate validation failure' }),
  }] }));
  const integration = createRoutedIntegrationService(root, intake.intakeId);

  const initial = await integration.query();
  assert.equal(initial.status, 'ready', initial.reasons.join('\n'));
  assert.equal(initial.completionKind, 'research');
  assert.match(initial.completionFingerprint, /^[a-f0-9]{64}$/);
  assert.deepEqual(initial.checkpointCommits, []);
  assert.equal(initial.candidate, undefined);
  assert.equal(git('rev-parse', 'HEAD'), incomingBefore, 'query is read-only before integration');
  assert.equal(git('rev-parse', 'main'), targetBefore, 'query does not advance the target');
  await assert.rejects(integration.integrate({ expectedFingerprint: '0'.repeat(64) }));
  assert.equal(git('rev-parse', 'HEAD'), incomingBefore, 'stale fingerprint creates no checkpoint or candidate');

  const firstFailed = await integration.integrate({ expectedFingerprint: initial.completionFingerprint });
  assert.equal(firstFailed.status, 'repair-required', JSON.stringify(firstFailed.candidate?.receipts?.slice(-4) ?? firstFailed.reasons));
  assert.equal(firstFailed.candidate.status, 'validation-failed');
  assert.equal(firstFailed.candidate.completion.completionId, assessmentId);
  assert.deepEqual(firstFailed.checkpointCommits, [firstFailed.candidate.incomingCommit], 'Research checkpoint precedes candidate construction');
  assert.equal(git('rev-parse', 'main'), targetBefore, 'deterministic validation failure leaves target unchanged');

  const exactAborted = await integration.abort({ expectedFingerprint: firstFailed.completionFingerprint, candidateId: firstFailed.candidate.candidateId });
  assert.equal(exactAborted.status, 'not-ready');
  assert.equal(exactAborted.candidate.status, 'aborted');
  assert.match(exactAborted.reasons[0], /exact integration candidate was aborted/i);

  const revisionTwo = advanceResearchCompletion(fixture, 'Additional accepted comparison evidence.');
  assert.equal(revisionTwo.metadata.artifactRevision, 2);
  const revisionTwoReady = await integration.query();
  assert.equal(revisionTwoReady.status, 'ready', revisionTwoReady.reasons.join('\n'));
  assert.equal(revisionTwoReady.candidate, undefined, 'stale aborted history does not block changed completion');
  const retained = await integration.integrate({ expectedFingerprint: revisionTwoReady.completionFingerprint });
  assert.equal(retained.status, 'repair-required', retained.reasons.join('\n'));
  const retainedCandidateId = retained.candidate.candidateId;

  const revisionThree = advanceResearchCompletion(fixture, 'Further accepted comparison evidence.');
  assert.equal(revisionThree.metadata.artifactRevision, 3);
  const { resolveResearchCompletion } = require('../../dist/main/planExecution/researchCompletionService.js');
  const revisionThreeCompletion = (await resolveResearchCompletion(root, intake.intakeId)).completion;
  const newerTerminal = seedTerminalCandidateRecord(fixture, retained.candidate, revisionThreeCompletion);
  assert.equal(newerTerminal.status, 'aborted');
  const legacyProjection = await integration.query();
  assert.equal(legacyProjection.candidate.candidateId, retainedCandidateId, 'active retained record takes precedence over newer terminal history');

  const revisionFour = advanceResearchCompletion(fixture, 'Final accepted comparison evidence.');
  assert.equal(revisionFour.metadata.artifactRevision, 4);
  const changed = await integration.query();
  assert.equal(changed.status, 'not-ready', changed.reasons.join('\n'));
  assert.equal(changed.candidate.candidateId, retainedCandidateId);
  assert.match(changed.reasons[0], /abort it before constructing a fresh candidate/i);
  await assert.rejects(integration.integrate({ expectedFingerprint: changed.completionFingerprint }), /abort it before constructing a fresh candidate/i);
  const recovered = await integration.abort({ expectedFingerprint: changed.completionFingerprint, candidateId: retainedCandidateId });
  assert.equal(recovered.status, 'ready', recovered.reasons.join('\n'));
  assert.equal(recovered.candidate, undefined);
  assert.deepEqual(recovered.checkpointCommits, []);
  assert.equal(git('rev-parse', 'main'), targetBefore, 'abort recovery preserves target');

  validationPasses = true;
  const integrated = await integration.integrate({ expectedFingerprint: recovered.completionFingerprint });
  assert.equal(integrated.status, 'integration-complete', integrated.reasons.join('\n'));
  assert.equal(integrated.completionKind, 'research');
  assert.equal(integrated.candidate.completion.completionId, assessmentId);
  assert.equal(integrated.candidate.completion.revision, 4);
  assert.equal(integrated.candidate.completion.fingerprint, recovered.completionFingerprint);
  assert.deepEqual(integrated.checkpointCommits, [integrated.candidate.incomingCommit]);
  assert.equal(git('rev-parse', 'main'), integrated.candidate.candidateCommit);
  assert.equal(git('branch', '--show-current'), intake.branchBinding.workBranch);
  assert.equal(git('status', '--porcelain'), '');

  advanceResearchCompletion(fixture, 'Post-integration accepted comparison evidence.');
  const changedAfterIntegration = await integration.query();
  assert.equal(changedAfterIntegration.status, 'ready', changedAfterIntegration.reasons.join('\n'));
  assert.equal(changedAfterIntegration.candidate, undefined);
  assert.doesNotMatch(changedAfterIntegration.reasons.join('\n'), /abort/i);

  const { workPlanningArtifactPath } = require('../../dist/main/workPlanning/workPlanningKernel.js');
  const { routedDevelopmentExecutionBindingPath } = require('../../dist/main/planExecution/routedDevelopmentExecutionBinding.js');
  assert.equal(fs.existsSync(path.join(root, workPlanningArtifactPath(intake.intakeId, route.selection.decisionId, 'plan'))), false);
  assert.equal(fs.existsSync(path.join(root, routedDevelopmentExecutionBindingPath(intake.intakeId))), false);
  assert.equal(fs.existsSync(path.join(root, 'planning/phases')), false);
  assert.equal(fs.existsSync(path.join(root, 'planning/work-intake/execution', intake.intakeId)), false);
  assert.equal(path.relative(root, path.join(root, assessmentPath)).replaceAll('\\', '/'), assessmentPath);
});
