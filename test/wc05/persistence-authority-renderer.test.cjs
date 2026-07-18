const assert = require("node:assert/strict");
const { mkdtemp, readFile, rm } = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  ExecutionRunAuthorityService,
  ExecutionRunPersistenceService,
} = require("../../dist/main/executionRuns");
const { ArtifactPairService } = require("../../dist/main/artifacts");
const {
  PHASE_ID,
  WC04_ARCHITECT_REVIEW_ARTIFACT_ID,
  WC04_ARCHITECT_REVIEW_JSON_PATH,
  WC04_WORK_CARD_ARTIFACT_ID,
  WORK_CARD_ID,
  commitAuthorityArtifacts,
  commitResult,
  escapeRegExp,
  executionAcceptanceContract,
  executionPassPlan,
  registerWc04ReviewThroughRegistryBoundary,
  sourceFiles,
  writeUnregisteredWc04ReviewPair,
} = require("./execution-fixtures.cjs");

test("trusted main authority persists canonical pairs and advances only with exact canonical verification", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "champcity-execution-authority-"));
  try {
    let tick = 0;
    const pairs = new ArtifactPairService({
      projectRoot: root,
      clock: () =>
        new Date(Date.parse("2026-07-18T22:00:00.000Z") + tick++ * 1000).toISOString(),
      transactionIdFactory: () => `wc05-${tick}`,
    });
    await commitAuthorityArtifacts(pairs);
    const registration = await registerWc04ReviewThroughRegistryBoundary(root, pairs);
    assert.equal(registration.artifact.artifactId, WC04_ARCHITECT_REVIEW_ARTIFACT_ID);
    assert.ok(
      registration.registry.entries.some(
        (entry) =>
          entry.artifactId === WC04_ARCHITECT_REVIEW_ARTIFACT_ID &&
          entry.jsonPath === WC04_ARCHITECT_REVIEW_JSON_PATH,
      ),
    );

    const persistence = new ExecutionRunPersistenceService(
      pairs,
      "champcity-ai",
      () => "2026-07-18T22:00:00.000Z",
    );
    const authority = new ExecutionRunAuthorityService(
      persistence,
      "champcity-ai",
      () => new Date(Date.parse("2026-07-18T22:10:00.000Z") + tick++ * 1000).toISOString(),
    );
    const initialized = await authority.initializeFromTrustedAuthority({
      projectId: "champcity-ai",
      phaseId: PHASE_ID,
      workCardId: WORK_CARD_ID,
      contract: executionAcceptanceContract,
      plan: executionPassPlan,
    });
    assert.equal(initialized.ok, true, initialized.errorMessages?.join("\n"));
    assert.equal(initialized.run.currentPassId, "P01");

    const preview = await authority.previewNextPacket({ phaseId: PHASE_ID, workCardId: WORK_CARD_ID });
    assert.equal(preview.ok, true, preview.errorMessages?.join("\n"));
    assert.equal(preview.job.passId, "P01");

    const implementerResultId = "champcity-ai/phase-06/implementer_result/WC05/P01/1";
    await commitResult(pairs, implementerResultId, "execution_pass_result", {
      changedFiles: ["src/shared/executionRuns/executionRun.ts"],
      checksRun: ["node --test test/wc05/domain-packets.test.cjs"],
    });
    const afterImplementer = await authority.recordImplementerResult({
      phaseId: PHASE_ID,
      workCardId: WORK_CARD_ID,
      passId: "P01",
      packetId: preview.job.jobId,
      packetFingerprint: preview.job.packetFingerprint,
      implementerResultArtifactId: implementerResultId,
    });
    assert.equal(afterImplementer.ok, true, afterImplementer.errorMessages?.join("\n"));
    assert.equal(afterImplementer.run.currentPassId, "P01");
    assert.equal(afterImplementer.run.passes[0].status, "implementer_complete");

    const verifierPreview = await authority.previewNextPacket({ phaseId: PHASE_ID, workCardId: WORK_CARD_ID });
    assert.equal(verifierPreview.job.role, "independent_verifier");
    assert.deepEqual(verifierPreview.job.includedSourceIds, [implementerResultId]);

    const wrongTarget = await authority.recordVerificationResult({
      phaseId: PHASE_ID,
      workCardId: WORK_CARD_ID,
      passId: "P01",
      implementerResultArtifactId: "wrong-result",
      verificationResultArtifactId: "missing-verification",
      verificationDecision: "verified_for_next_pass",
      findings: [],
    });
    assert.equal(wrongTarget.ok, false);
    assert.match(wrongTarget.errorMessages.join(" "), /exact recorded Implementer result/);

    const verificationResultId = "champcity-ai/phase-06/verification_result/WC05/P01/1";
    await commitResult(pairs, verificationResultId, "independent_verification_result", {
      verificationDecision: "changes_required_in_current_pass",
      findings: ["Need same-pass correction."],
    });
    const afterVerification = await authority.recordVerificationResult({
      phaseId: PHASE_ID,
      workCardId: WORK_CARD_ID,
      passId: "P01",
      implementerResultArtifactId: implementerResultId,
      verificationResultArtifactId: verificationResultId,
      verificationDecision: "changes_required_in_current_pass",
      findings: ["Need same-pass correction."],
    });
    assert.equal(afterVerification.ok, true, afterVerification.errorMessages?.join("\n"));
    assert.equal(afterVerification.run.status, "changes_required");
    assert.equal(afterVerification.run.currentPassId, "P01");

    const runPair = await pairs.readArtifactByPaths(
      initialized.paths.runJsonPath,
      initialized.paths.runMarkdownPath,
    );
    assert.ok(runPair.artifact.revision >= 3);
    assert.equal(runPair.verification.synchronized, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("trusted initialization rejects Operator Approval content contradictions", async () => {
  const cases = [
    {
      name: "wrong Work Card",
      approvalOverrides: {
        data: { authorizedWorkCardArtifactId: WC04_WORK_CARD_ARTIFACT_ID },
      },
      pattern: /authorizes a different Work Card/,
    },
    {
      name: "wrong revision",
      approvalOverrides: { data: { authorizedRevision: 2 } },
      pattern: /different Work Card revision/,
    },
    {
      name: "authorization false",
      approvalOverrides: { data: { authorizationGranted: false } },
      pattern: /does not explicitly grant authorization/,
    },
    {
      name: "source-code authority false",
      approvalOverrides: { data: { sourceCodeChangesAuthorized: false } },
      pattern: /does not explicitly authorize source-code changes/,
    },
    {
      name: "conflicting parent binding",
      approvalOverrides: { parentArtifactId: WC04_WORK_CARD_ARTIFACT_ID },
      pattern: /parent does not bind/,
    },
    {
      name: "missing source binding",
      approvalOverrides: {
        relationships: {
          sources: [WC04_WORK_CARD_ARTIFACT_ID],
          expectedOutputs: [],
          supersedes: [],
          children: [],
        },
      },
      pattern: /source relationship does not bind/,
    },
    {
      name: "unsatisfied execution condition",
      skipWc04ReviewRegistration: true,
      approvalOverrides: {},
      pattern: /does not resolve exactly one artifact/,
    },
  ];

  for (const item of cases) {
    const root = await mkdtemp(path.join(os.tmpdir(), "champcity-execution-approval-"));
    try {
      const pairs = new ArtifactPairService({ projectRoot: root });
      await commitAuthorityArtifacts(pairs, { approvalOverrides: item.approvalOverrides });
      if (!item.skipWc04ReviewRegistration) {
        await registerWc04ReviewThroughRegistryBoundary(root, pairs);
      }
      const authority = new ExecutionRunAuthorityService(
        new ExecutionRunPersistenceService(pairs, "champcity-ai"),
        "champcity-ai",
      );
      const initialized = await authority.initializeFromTrustedAuthority({
        projectId: "champcity-ai",
        phaseId: PHASE_ID,
        workCardId: WORK_CARD_ID,
        contract: executionAcceptanceContract,
        plan: executionPassPlan,
      });
      assert.equal(initialized.ok, false, `${item.name} should block`);
      assert.match(initialized.errorMessages.join(" "), item.pattern, item.name);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

test("trusted initialization blocks when accepted WC04 review pair does not resolve through the Registry", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "champcity-execution-wc04-registry-"));
  try {
    const pairs = new ArtifactPairService({ projectRoot: root });
    await commitAuthorityArtifacts(pairs);
    await writeUnregisteredWc04ReviewPair(root);
    const registry = await pairs.loadRegistry();
    assert.equal(
      registry.entries.some((entry) => entry.artifactId === WC04_ARCHITECT_REVIEW_ARTIFACT_ID),
      false,
    );
    const authority = new ExecutionRunAuthorityService(
      new ExecutionRunPersistenceService(pairs, "champcity-ai"),
      "champcity-ai",
    );
    const initialized = await authority.initializeFromTrustedAuthority({
      projectId: "champcity-ai",
      phaseId: PHASE_ID,
      workCardId: WORK_CARD_ID,
      contract: executionAcceptanceContract,
      plan: executionPassPlan,
    });
    assert.equal(initialized.ok, false);
    assert.match(
      initialized.errorMessages.join(" "),
      /Canonical authority does not resolve exactly one artifact champcity-ai\/phase-06\/architect_review\/WC04/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("trusted initialization rejects unsupported or non-accepting execution-condition authority", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "champcity-execution-condition-"));
  try {
    const pairs = new ArtifactPairService({ projectRoot: root });
    await commitAuthorityArtifacts(pairs);
    await registerWc04ReviewThroughRegistryBoundary(root, pairs, {
      decision: "changes_required_in_current_pass",
      acceptanceResult: "changes_required",
    });
    const authority = new ExecutionRunAuthorityService(
      new ExecutionRunPersistenceService(pairs, "champcity-ai"),
      "champcity-ai",
    );
    const initialized = await authority.initializeFromTrustedAuthority({
      projectId: "champcity-ai",
      phaseId: PHASE_ID,
      workCardId: WORK_CARD_ID,
      contract: executionAcceptanceContract,
      plan: executionPassPlan,
    });
    assert.equal(initialized.ok, false);
    assert.match(initialized.errorMessages.join(" "), /has not accepted WC04/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("production renderer and IPC surfaces are read-only for Execution Runs", async () => {
  const files = [
    "src/preload/index.ts",
    "src/renderer/global.d.ts",
    "src/renderer/app/WorkflowRouterShell.tsx",
    "src/main/main.ts",
  ];
  const joined = (
    await Promise.all(files.map((file) => readFile(path.join(process.cwd(), file), "utf8")))
  ).join("\n");
  for (const forbidden of [
    "initializeExecutionRun",
    "recordExecutionRunEvent",
    "queueNextExecutionJob",
    "completeExecutionDispatch",
    "executionRuns:initialize",
    "executionRuns:recordEvent",
    "executionController:",
    "Queue next job",
  ]) {
    assert.doesNotMatch(joined, new RegExp(escapeRegExp(forbidden)));
  }
  assert.match(joined, /previewNextExecutionJob/);
  assert.match(joined, /loadExecutionRun/);
});

test("production source contains no Codex transport or runner process code", async () => {
  const files = await sourceFiles(path.join(process.cwd(), "src"));
  const joined = (await Promise.all(files.map((file) => readFile(file, "utf8")))).join("\n");
  for (const forbidden of [
    "CodexCliAgentDispatchAdapter",
    "node:child_process",
    "spawn(",
    "codexExecArgs",
    "parseVerifierDecisionFromCodexOutput",
    "stdoutLogPath",
    "stderrLogPath",
    "AgentDispatchRecord",
    "runner records",
  ]) {
    assert.doesNotMatch(joined, new RegExp(escapeRegExp(forbidden)));
  }
});

test("changed source and WC05 test files contain no mojibake markers or UTF-8 BOM", async () => {
  const files = [
    "src/main/artifacts/artifactPairService.ts",
    "src/main/executionRuns/executionRunAuthority.ts",
    "src/renderer/app/WorkflowRouterShell.tsx",
    "test/wc05/execution-fixtures.cjs",
    "test/wc05/domain-packets.test.cjs",
    "test/wc05/persistence-authority-renderer.test.cjs",
    "test/wc09/context-packets.test.cjs",
  ];
  for (const file of files) {
    const absolute = path.join(process.cwd(), file);
    const buffer = await readFile(absolute);
    assert.notDeepEqual([...buffer.subarray(0, 3)], [0xef, 0xbb, 0xbf], `${file} has a BOM`);
    const text = buffer.toString("utf8");
    assert.doesNotMatch(text, /\u00c2|\u00e2\u20ac\u00a6/, `${file} contains mojibake markers`);
  }
});
