const fs = require('node:fs');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');

const researchOutcome = {
  outcome: 'no-implementation-plan-required',
  prototypeDisposition: 'disposable',
  productionFollowUp: 'none',
  evidence: ['Bounded comparison complete'],
  decisionEnabled: 'Stop investigation',
  successFailureResult: 'Evidence threshold met',
  closureCondition: 'Comparison complete',
};

function researchBody() {
  const block = `\n\`\`\`champcity-research-outcome\n${JSON.stringify(researchOutcome)}\n\`\`\`\n`;
  const sections = {
    Evidence: researchOutcome.evidence[0],
    Decisions: researchOutcome.decisionEnabled,
    'Risks and Unresolved Questions': 'Prototype remains non-production.',
    'Question Hypothesis and Decision': 'Which bounded approach is viable?',
    Alternatives: 'Compare A and B.',
    'Bounded Prototype and Evidence': 'Disposable comparison only.',
    'Success Failure and Findings': researchOutcome.successFailureResult,
    'Output Classification': 'Disposable prototype evidence.',
    'Expiration and Closure': researchOutcome.closureCondition,
    'Research Outcome': block,
  };
  return '# Route Architect Assessment\n\n' + Object.entries(sections).map(([heading, value]) => `## ${heading}\n${value}`).join('\n\n');
}

function seedResearchIntegrationCompletion(t) {
  const { seedPreparedRoutedWorkIntake } = require('./work-intake-fixtures.cjs');
  const fixture = seedPreparedRoutedWorkIntake(t, 'research-prototype', {
    workRequest: 'Compare bounded approaches',
    desiredOutcome: 'Integrate accepted evidence only',
    knownConstraints: 'No implementation Plan',
  });
  const { root, intake, route } = fixture;
  const { writeCanonicalMarkdownDocument } = require('../../dist/main/documents/canonicalMarkdownDocumentWriter.js');
  const { sourceDigests, workPlanningArtifactPath } = require('../../dist/main/workPlanning/workPlanningKernel.js');
  const assessmentPath = workPlanningArtifactPath(intake.intakeId, route.selection.decisionId, 'assessment');
  const sourceRevisions = [
    { path: intake.relativePath, revision: intake.artifactRevision },
    { path: route.relativePath, revision: route.artifactRevision },
  ];
  const assessmentId = `assessment-${randomUUID()}`;
  writeCanonicalMarkdownDocument({
    workspaceRoot: root,
    relativePath: assessmentPath,
    metadata: {
      schemaVersion: 1,
      artifactType: 'work-planning-assessment',
      artifactRevision: 1,
      participationRole: 'gatingReview',
      identity: { intakeId: intake.intakeId, projectId: intake.projectId, routeDecisionId: route.selection.decisionId, routeId: 'research-prototype', assessmentId },
      sourceRevisions,
      workflowData: { sourceDigests: sourceDigests(root, sourceRevisions), researchOutcome },
      documentDisposition: { status: 'Approved', notes: 'Prepared accepted Research completion.', reviewedAt: '2026-01-01T00:00:00.000Z' },
    },
    bodyMarkdown: researchBody(),
  });
  return { ...fixture, assessmentId, assessmentPath };
}

function seedTerminalCandidateRecord(fixture, template, completion) {
  const { integrationPaths } = require('../../dist/main/agentHarness/repository/integrationGit.js');
  const { serializeCanonicalMarkdownDocument } = require('../../dist/shared/documents/canonicalMarkdown.js');
  const identity = [template.repositoryId, template.intakeId, completion.kind, completion.routeDecisionId, completion.completionId,
    completion.revision, completion.fingerprint, completion.sourcePath, template.baseCommit, template.incomingCommit, template.targetCommit,
    template.localTargetCommit, template.targetBranch, ...(template.validationPolicySha256 ? [template.validationPolicySha256] : [])];
  const candidateId = createHash('sha256').update(JSON.stringify(identity)).digest('hex');
  const paths = integrationPaths(fixture.root, candidateId);
  const recordedAt = '2099-01-01T00:00:00.000Z';
  const record = { ...structuredClone(template), candidateId, completion, candidateBranch: paths.branch, status: 'aborted',
    validation: [], conflictingPaths: [], message: 'Deterministic terminal history fixture.', receipts: [{ repositoryId: template.repositoryId,
      operation: 'integration-abort', startedAt: recordedAt, completedAt: recordedAt, before: null, after: null }] };
  fs.mkdirSync(paths.base, { recursive: true });
  fs.writeFileSync(paths.record, serializeCanonicalMarkdownDocument({ schemaVersion: 1, artifactType: 'integration-candidate', artifactRevision: 1,
    participationRole: 'contextOnly', identity: { candidateId, intakeId: record.intakeId, completionId: completion.completionId,
      completionKind: completion.kind, repositoryId: record.repositoryId }, sourceRevisions: [], workflowData: { record },
    documentDisposition: { status: 'Pending', notes: 'Deterministic semantic terminal history fixture.', reviewedAt: null } },
  `# Integration Candidate\n\nStatus: aborted\n\n${record.message}\n`));
  return record;
}

function advanceResearchCompletion(fixture, note) {
  const absolutePath = path.join(fixture.root, fixture.assessmentPath);
  const { parseCanonicalMarkdownDocument, serializeCanonicalMarkdownDocument } = require('../../dist/shared/documents/canonicalMarkdown.js');
  const current = parseCanonicalMarkdownDocument(fs.readFileSync(absolutePath, 'utf8'));
  fs.writeFileSync(absolutePath, serializeCanonicalMarkdownDocument(
    { ...current.metadata, artifactRevision: current.metadata.artifactRevision + 1 },
    `${current.bodyMarkdown.trimEnd()}\n\n${note}\n`,
  ));
  return parseCanonicalMarkdownDocument(fs.readFileSync(absolutePath, 'utf8'));
}

module.exports = { seedResearchIntegrationCompletion, advanceResearchCompletion, seedTerminalCandidateRecord };
