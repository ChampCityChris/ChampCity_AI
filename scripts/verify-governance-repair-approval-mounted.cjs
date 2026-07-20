const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { app, BrowserWindow } = require("electron");

const {
  buildArtifactRegistry,
  buildArtifactRegistryEntry,
  buildCanonicalArtifact,
  buildMarkdownArtifactEnvelope,
  canonicalPrettyStringify,
  canonicalStringify,
  renderArtifactMarkdown,
  renderArtifactRegistryContentMarkdown,
  validateArtifactRegistry,
  verifyArtifactPair,
} = require("../dist/shared/artifacts");
const { ArtifactPairService } = require("../dist/main/artifacts");

const repositoryRoot = path.resolve(__dirname, "..");
const fixtureRoot = path.join(repositoryRoot, "tmp", "governance-repair-approval-mounted-project");
const mountedRuntimeRoot = path.join(repositoryRoot, "tmp", "mounted-electron-runtime", "governance-repair-approval");
process.env.CHAMPCITY_ELECTRON_RUNTIME_ROOT = mountedRuntimeRoot;
process.env.CHAMPCITY_ALLOW_REPOSITORY_TMP_PROJECTS = "1";

const userDataRoot = path.join(mountedRuntimeRoot, "user-data");
const workspacePath = path.join(userDataRoot, "project-workspaces.json");
const projectId = "champcity-ai";
const phaseId = "phase-04";
const fixedTime = "2026-07-19T01:00:00.000Z";
const historicalSharedWorkCardA = `${projectId}/phase-01/work_card/WC01_legacy_a`;
const historicalSharedWorkCardB = `${projectId}/phase-01/work_card/WC01_legacy_b`;
const historicalPhaseTargetA = `${projectId}/phase-01/phase_planning/Legacy_Phase_Planning_A`;
const historicalPhaseTargetB = `${projectId}/phase-01/work_card_plan/Legacy_Work_Card_Plan_B`;
const registeredNoncanonicalId = `${projectId}/phase-02/diagnostic_report/REGISTERED_NONCANONICAL`;
const prepare = process.argv.includes("--prepare");
const restart = process.argv.includes("--restart");
const cleanup = process.argv.includes("--cleanup");
const seededRegistryArtifacts = [];
let blockedRepairArtifact = null;
let unknownRepairArtifact = null;
let semanticRepairArtifact = null;
let mountedTransaction = 0;

if (prepare) prepareFixture();

require("../dist/main/main.js");

app.whenReady().then(async () => {
  try {
    const window = await waitForWindow();
    await window.webContents.executeJavaScript(visibleButtonsExpression(), true);
    await waitFor(
      window,
      `document.body.innerText.includes("governance-repair-approval-mounted-project") && document.body.innerText.includes("Refresh project state")`,
      "selected governance fixture workspace",
    );

    if (restart) {
      await waitFor(
        window,
        `window.champCity.getCurrentGovernanceMaintenance().then((result) => result.ok && result.currentRequiredAction?.currentAction?.id === "implementer_execution_required" && result.maintenance.repair.candidates.length === 0 && result.maintenance.approval.items.every((item) => item.approvalStatus === "exact"))`,
        "restarted governance maintenance remains cleared after approval decisions",
      );
      console.log(JSON.stringify({
        governanceRepairApprovalMounted: "passed",
        mode: "restart-approved-boundary",
        duplicateCleanupExecuted: true,
        currentAction: "implementer_execution_required",
      }));
      await shutdown(cleanup);
      return;
    }

    await waitFor(
      window,
      `window.champCity.getCurrentGovernanceMaintenance().then((result) => result.ok && result.currentRequiredAction?.currentAction?.id === "governance_integrity_repair_required" && result.currentRequiredAction?.currentAction?.routedAction?.screenId === "governance-repair")`,
      "startup governance repair route",
    );
    await waitFor(
      window,
      `document.body.innerText.includes("Governance Integrity Repair")`,
      "governance repair workspace opens",
    );

    const firstSnapshot = await getMaintenanceSnapshot(window);
    const repairBefore = firstSnapshot.maintenance.repair;
    assert.ok(repairBefore.candidates.length >= 3, "fixture should expose multiple repair candidates");
    const routedRepairId = firstSnapshot.currentRequiredAction.currentAction.routedAction.targetArtifactId;
    const firstRepair = repairBefore.candidates.find((item) => item.artifactId === routedRepairId);
    const keepFixedRepair = repairBefore.candidates.find((item) =>
      item.operationLabel === "Duplicate Artifact Cleanup" && item.artifactId !== routedRepairId
    );
    assert.ok(firstRepair, "fixture should expose numbered duplicate cleanup for numbered survivor path");
    assert.ok(keepFixedRepair, "fixture should expose numbered duplicate cleanup for fixed survivor path");
    const registeredNoncanonical = repairBefore.candidates.find(
      (item) => item.artifactId === registeredNoncanonicalId,
    );
    assert.equal(registeredNoncanonical?.registryStatus, "registered");
    assert.equal(registeredNoncanonical?.issueClassification, "noncanonical_serialization");
    assert.equal(
      firstSnapshot.currentRequiredAction.currentAction.id,
      "governance_integrity_repair_required",
      "registered noncanonical repair candidates must block approval routing",
    );
    assert.equal(firstSnapshot.currentRequiredAction.currentAction.routedAction.targetArtifactId, firstRepair.artifactId);
    assert.equal(firstSnapshot.currentRequiredAction.currentAction.routedAction.expectedOutput.artifactId, firstRepair.artifactId);
    assert.equal(firstSnapshot.currentRequiredAction.currentAction.routedAction.expectedOutput.artifactType, firstRepair.artifactType);
    assert.equal(firstSnapshot.currentRequiredAction.currentAction.routedAction.expectedOutput.relationship, "in_place_mutation_target");
    await assertProjectHeaderCompact(window, firstRepair.artifactId);
    let repairText = await bodyText(window);
    assert.ok(repairText.includes(firstRepair.artifactId), "first unresolved integrity item is selected.");
    assert.ok(repairText.includes("Current workspace: Governance Repair"), "already-routed repair screen is not a dead Continue button.");
    assert.equal(repairText.includes("Continue current action: Governance Repair"), false);
    assert.ok(repairText.includes("WHY THIS RECORD IS HERE"), "detail panel leads with why this record is routed.");
    assert.ok(repairText.includes("WHAT THIS OPERATION WILL CHANGE"), "detail panel explains mutation scope.");
    assert.ok(repairText.includes("WHAT IT WILL NOT CHANGE"), "detail panel explains non-effects.");
    assert.ok(repairText.includes("REQUIRED OPERATOR DECISION"), "detail panel identifies the Operator decision.");
    assert.ok(repairText.includes(firstRepair.issueClassification.replaceAll("_", " ")), "detail panel shows issue.");
    assert.equal(firstRepair.repairKind, "semantic_identity_repair");
    assert.equal(firstRepair.operationLabel, "Duplicate Artifact Cleanup");
    assert.equal(firstRepair.semanticProposal.proposedPhaseId, "phase-02");
    assert.equal(firstRepair.semanticProposal.requiredDisposition, "numbered_legacy_path");
    assert.equal(firstRepair.safelyRepairable, false);
    assert.ok(repairText.includes("Application mode: Governance Maintenance"), "maintenance mode banner is visible.");
    assert.ok(repairText.includes("Current maintenance action: Duplicate Artifact Cleanup"), "maintenance action is visible.");
    assert.ok(repairText.includes("Normal workflow status: Paused until governance maintenance is complete"), "normal workflow pause is visible.");
    assert.equal(/Current\s+Work Card Loop|Repair if needed:\s+current|Work Card Loop:\s+current/i.test(repairText), false);
    await clickButton(window, "Supporting tools");
    repairText = await bodyText(window);
    assert.ok(repairText.includes("Governance Repair"), "Governance Repair remains available.");
    assert.ok(repairText.includes("Governance Approval"), "Governance Approval remains available.");
    assert.ok(repairText.includes("A numbered duplicate was created instead of a new revision of the fixed canonical record."), "primary defect explains duplicate creation.");
    assert.ok(repairText.includes("Canonical and synchronized"), "serialization is shown as status, not primary defect.");
    assert.ok(repairText.includes("Review duplicate records"), "initial duplicate action is a non-mutating review.");

    const beforeReviewJson = fs.readFileSync(path.join(fixtureRoot, ...firstRepair.jsonPath.split("/")), "utf8");
    const beforeReviewMarkdown = fs.readFileSync(path.join(fixtureRoot, ...firstRepair.markdownPath.split("/")), "utf8");

    await clickButton(window, "Review duplicate records");
    repairText = await bodyText(window);
    assert.ok(repairText.includes("Duplicate Artifact Cleanup"), "duplicate cleanup form opens in app.");
    assert.ok(repairText.includes("WHY THIS DUPLICATE EXISTS"), "proposal explains duplicate origin.");
    assert.ok(repairText.includes(firstRepair.semanticProposal.currentArtifactId), "proposal shows current artifact ID.");
    assert.ok(repairText.includes(firstRepair.semanticProposal.proposedArtifactId), "proposal shows proposed artifact ID.");
    assert.ok(repairText.includes("Neither complete record should be selected"), "field-level merge guidance is visible.");
    assert.ok(repairText.includes("Field-level merging is not available in this pass"), "field-level merge remains noninteractive guidance.");
    assert.equal(repairText.includes("Create constrained merge repair request"), false, "merge repair is not a selectable duplicate disposition.");
    const duplicateOptions = await window.webContents.executeJavaScript(`
      Array.from(document.querySelectorAll("select option"))
        .map((option) => option.value)
        .filter((value) => value.includes("record") || value.includes("duplicate") || value.includes("merge"))
    `);
    assert.deepEqual(duplicateOptions.sort(), [
      "keep_fixed_record_and_delete_duplicate",
      "use_numbered_record_as_next_canonical_revision",
    ].sort());
    assert.equal(fs.readFileSync(path.join(fixtureRoot, ...firstRepair.jsonPath.split("/")), "utf8"), beforeReviewJson);
    assert.equal(fs.readFileSync(path.join(fixtureRoot, ...firstRepair.markdownPath.split("/")), "utf8"), beforeReviewMarkdown);
    assert.equal(fs.existsSync(path.join(fixtureRoot, ...firstRepair.jsonPath.split("/"))), true, "review click does not delete JSON.");
    assert.equal(fs.existsSync(path.join(fixtureRoot, ...firstRepair.markdownPath.split("/"))), true, "review click does not delete Markdown.");

    await chooseSelectOption(window, "use_numbered_record_as_next_canonical_revision");
    repairText = await bodyText(window);
    assert.ok(repairText.includes("Use numbered validation as next revision"), "numbered-survivor destructive action appears after selection.");
    assert.equal(fs.existsSync(path.join(fixtureRoot, ...firstRepair.jsonPath.split("/"))), true, "selection still does not delete JSON.");
    assert.equal(fs.existsSync(path.join(fixtureRoot, ...firstRepair.markdownPath.split("/"))), true, "selection still does not delete Markdown.");
    await clickButton(window, "Use numbered validation as next revision");
    await waitFor(
      window,
      `window.champCity.getCurrentGovernanceMaintenance().then((result) => result.maintenance.repair.candidates.every((item) => item.artifactId !== ${JSON.stringify(firstRepair.artifactId)}))`,
      "semantic repair applied and resolver advanced",
    );
    const numberedJsonPath = path.join(fixtureRoot, ...firstRepair.jsonPath.split("/"));
    assert.equal(fs.existsSync(numberedJsonPath), false, "numbered duplicate JSON is deleted after cleanup.");

    const repairAfterNumbered = (await getMaintenanceSnapshot(window)).maintenance.repair;
    const refreshedKeepFixedRepair = repairAfterNumbered.candidates.find((item) =>
      item.operationLabel === "Duplicate Artifact Cleanup"
    );
    assert.ok(refreshedKeepFixedRepair, "fixture should still expose fixed-survivor duplicate cleanup");
    const fixedSurvivorResult = await window.webContents.executeJavaScript(
      `window.champCity.repairGovernanceRecord(${JSON.stringify({
        artifactId: refreshedKeepFixedRepair.artifactId,
        jsonPath: refreshedKeepFixedRepair.jsonPath,
        markdownPath: refreshedKeepFixedRepair.markdownPath,
        repairKind: refreshedKeepFixedRepair.repairKind,
        expectedRevision: refreshedKeepFixedRepair.revision,
        semanticProposal: refreshedKeepFixedRepair.semanticProposal,
        duplicateDisposition: "keep_fixed_record_and_delete_duplicate",
      })})`,
      true,
    );
    assert.ok(
      fixedSurvivorResult.repairedArtifactIds?.includes(refreshedKeepFixedRepair.artifactId),
      `fixed-survivor duplicate cleanup applies through repair contract: ${fixedSurvivorResult.errorMessages?.join("; ")}`,
    );
    const keepFixedJsonPath = path.join(fixtureRoot, ...refreshedKeepFixedRepair.jsonPath.split("/"));
    assert.equal(fs.existsSync(keepFixedJsonPath), false, "fixed-survivor numbered duplicate JSON is deleted after cleanup.");

    const repairable = repairBefore.candidates.find((item) => item.safelyRepairable);
    assert.ok(repairable, "fixture should contain a repairable item");
    await clickButton(window, repairable.artifactId);
    await clickButton(window, repairable.operationLabel);
    await waitFor(
      window,
      `window.champCity.getCurrentGovernanceMaintenance().then((result) => result.maintenance.repair.candidates.every((item) => item.artifactId !== ${JSON.stringify(repairable.artifactId)}))`,
      "selected repairable item repaired individually",
    );
    await waitFor(
      window,
      `window.champCity.getCurrentGovernanceMaintenance().then((result) => result.currentRequiredAction?.currentAction?.id === "governance_integrity_repair_required")`,
      "resolver advances to next integrity item",
    );

    const blockedText = await bodyText(window);
    assert.ok(blockedText.includes(`${projectId}/phase-02/diagnostic_report/BLOCKED`), "blocked semantic item remains visible.");
    assert.equal(/force|bypass|ignore|trust filename|register anyway|approve anyway/i.test(blockedText), false);

    fixBlockedRepairCandidate();
    fixUnknownRepairCandidate();
    await clickButton(window, "Refresh project state");
    await waitFor(
      window,
      `window.champCity.getCurrentGovernanceMaintenance().then((result) => result.maintenance.repair.candidates.some((item) => item.artifactId === "${projectId}/phase-02/diagnostic_report/UNKNOWN" && item.safelyRepairable))`,
      "completed unknown candidate becomes safely repairable",
    );
    await repairAllRemainingIndividually(window);
    await waitFor(
      window,
      `window.champCity.getCurrentGovernanceMaintenance().then((result) => result.maintenance.repair.candidates.length === 0)`,
      "governance repair preview clean after item repairs",
    );

    await waitFor(
      window,
      `window.champCity.getCurrentGovernanceMaintenance().then((result) => result.ok && result.currentRequiredAction?.currentAction?.id === "operator_governance_approval_required" && result.currentRequiredAction?.currentAction?.routedAction?.screenId === "governance-approval")`,
      "resolver advances to governance approval",
    );
    await waitFor(
      window,
      `document.body.innerText.includes("Governance Approval") && document.body.innerText.includes("Open ")`,
      "approval workspace opens",
    );
    const approvalSnapshot = await getMaintenanceSnapshot(window);
    const approvalBefore = approvalSnapshot.maintenance.approval;
    const pendingApprovals = approvalBefore.items.filter((item) => item.approvalStatus !== "exact");
    assert.ok(pendingApprovals.length > 6, `expected more than six approval targets, got ${pendingApprovals.length}`);
    for (const artifactId of [
      historicalSharedWorkCardA,
      historicalSharedWorkCardB,
      historicalPhaseTargetA,
      historicalPhaseTargetB,
    ]) {
      assert.ok(
        pendingApprovals.some((item) => item.targetArtifactId === artifactId),
        `${artifactId} must remain visible in approval queue`,
      );
    }

    const routedApproval = pendingApprovals[0];
    const firstApproval =
      pendingApprovals.find((item) => item.decisionWorkspaceScreenId !== "historical-operator-review") ??
      routedApproval;
    assert.notEqual(firstApproval.decisionWorkspaceScreenId, "historical-operator-review", "fixture should expose a stage-owned exact approval target");
    assert.equal(firstApproval.targetArtifactId, `${projectId}/${phaseId}/work_card/WC01`);
    assert.equal(approvalSnapshot.currentRequiredAction.currentAction.routedAction.targetArtifactId, routedApproval.targetArtifactId);
    assert.equal(approvalSnapshot.currentRequiredAction.currentAction.routedAction.expectedOutput.artifactId, routedApproval.approvalArtifactId);
    assert.equal(approvalSnapshot.currentRequiredAction.currentAction.routedAction.expectedOutput.relationship, "artifact_creation_output");
    assert.equal(approvalSnapshot.currentRequiredAction.currentAction.routedAction.expectedOutput.artifactId.includes("/system/governance_approval"), false);
    await clickButton(window, firstApproval.targetArtifactId);
    const approvalText = await bodyText(window);
    assert.ok(approvalText.includes(firstApproval.targetArtifactId), "first unresolved approval item is selected.");
    assert.ok(approvalText.includes(firstApproval.payloadHash), "approval detail shows payload hash.");
    assert.ok(approvalText.includes(firstApproval.authorizationBoundary), "approval detail shows authorization boundary.");
    assert.ok(approvalText.includes(firstApproval.approvalArtifactId), "approval detail shows exact deterministic approval artifact ID.");
    assert.ok(approvalText.includes(firstApproval.contentMarkdown.trim()), "approval detail shows full Markdown content.");
    await clickButton(window, `Open ${firstApproval.decisionWorkspaceLabel}`);
    await waitFor(
      window,
      `document.body.innerText.includes(${JSON.stringify(firstApproval.decisionWorkspaceLabel)}) && document.body.innerText.includes(${JSON.stringify(firstApproval.targetArtifactId)})`,
      "queue item opens stage-owned approval workspace",
    );
    await decideCurrentApprovalWorkspaceThroughUi(
      window,
      firstApproval,
      "Request revision",
      "Mounted request revision reason.",
      "revision_requested",
      1,
    );
    await expectApprovalDecisionRejectedThroughPreload(
      window,
      firstApproval,
      "approved",
      "This exact target set already has a durable Operator decision.",
    );
    await waitFor(
      window,
      `window.champCity.getCurrentGovernanceMaintenance().then((result) => result.maintenance.approval.items.some((item) => item.targetArtifactId === ${JSON.stringify(firstApproval.targetArtifactId)} && item.approvalStatus === "exact"))`,
      "selected exact approval recorded",
    );

    await approveAllRemaining(window);
    await waitForNormalRouteAction(window, "work_card_authoring_required", "normal route returns to Work Card authoring after revision request");

    const secondRevision = await createMountedWorkCardRevision(firstApproval, "Revision 2.");
    await clickButton(window, "Refresh project state");
    await waitFor(
      window,
      `window.champCity.getCurrentGovernanceMaintenance().then((result) => result.ok && result.maintenance.approval.items.some((item) => item.targetArtifactId === ${JSON.stringify(firstApproval.targetArtifactId)} && item.revision === 2 && item.approvalStatus === "stale"))`,
      "revision 2 appears awaiting Operator decision",
    );
    const secondApproval = (await getMaintenanceSnapshot(window)).maintenance.approval.items.find(
      (item) => item.targetArtifactId === firstApproval.targetArtifactId,
    );
    assert.equal(secondApproval.revision, secondRevision.revision);
    assert.equal(secondApproval.decisionTimeline.length, 1);
    assert.equal(secondApproval.decisionTimeline[0].outcome.decision, "revision_requested");
    await decideApprovalItemThroughUi(
      window,
      secondApproval,
      "Reject exact target",
      "Mounted rejection reason.",
      "rejected",
    );
    await expectApprovalDecisionRejectedThroughPreload(
      window,
      secondApproval,
      "approved",
      "This exact target set already has a durable Operator decision.",
    );
    await waitForNormalRouteAction(window, "candidate_disposition_required", "normal route follows Work Card approval failure after rejection");

    const thirdRevision = await createMountedWorkCardRevision(secondApproval, "Revision 3.");
    await clickButton(window, "Refresh project state");
    await waitFor(
      window,
      `window.champCity.getCurrentGovernanceMaintenance().then((result) => result.ok && result.maintenance.approval.items.some((item) => item.targetArtifactId === ${JSON.stringify(firstApproval.targetArtifactId)} && item.revision === 3 && item.approvalStatus === "stale"))`,
      "revision 3 appears awaiting Operator decision",
    );
    const thirdApproval = (await getMaintenanceSnapshot(window)).maintenance.approval.items.find(
      (item) => item.targetArtifactId === firstApproval.targetArtifactId,
    );
    assert.equal(thirdApproval.revision, thirdRevision.revision);
    await decideApprovalItemThroughUi(
      window,
      thirdApproval,
      "Approve exact target",
      "",
      "approved",
    );
    await verifyApprovalCanonicalAndRegistered();
    await waitForNormalRoute(window, "normal route resumes after governance maintenance");
    const approvalAfter = (await getMaintenanceSnapshot(window)).maintenance.approval;
    await verifyAllRequiredApprovalsExact(approvalAfter);
    await verifyHistoricalApprovalsNonRouting(approvalAfter);
    const finalWorkCardApproval = approvalAfter.items.find(
      (item) => item.targetArtifactId === firstApproval.targetArtifactId,
    );
    assert.deepEqual(
      finalWorkCardApproval.decisionTimeline.map((event) => `${event.targets[0].revision}:${event.outcome.decision}`),
      ["1:revision_requested", "2:rejected", "3:approved"],
    );

    const current = await getMaintenanceSnapshot(window);
    assert.equal(current.currentRequiredAction.currentAction.routedAction.bindingSource.kind, "relationship_resolver");
    console.log(JSON.stringify({
      governanceRepairApprovalMounted: "passed",
      mode: "initial",
      repairWorkspace: true,
      approvalWorkspace: true,
      approvalTargets: pendingApprovals.length,
      requestRevisionRoute: "work_card_authoring_required",
      rejectionRoute: "candidate_disposition_required",
      approvalRoute: current.currentRequiredAction.currentAction.id,
      currentAction: current.currentRequiredAction.currentAction.id,
    }));
    await shutdown(false);
  } catch (error) {
    try {
      const [window] = BrowserWindow.getAllWindows();
      if (window) console.error((await bodyText(window)).slice(0, 5000));
    } catch {}
    console.error(error);
    await shutdown(false, 1);
  }
});

function prepareFixture() {
  fs.rmSync(fixtureRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  fs.rmSync(mountedRuntimeRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  fs.mkdirSync(path.join(fixtureRoot, "planning"), { recursive: true });
  fs.mkdirSync(path.join(fixtureRoot, ".git"), { recursive: true });
  fs.writeFileSync(
    path.join(fixtureRoot, ".git", "HEAD"),
    "ref: refs/heads/feature/governance-mounted\n",
    "utf8",
  );
  fs.writeFileSync(
    path.join(fixtureRoot, "package.json"),
    JSON.stringify({ name: "governance-repair-approval-mounted-project" }),
    "utf8",
  );

  const activation = writeArtifact({
    artifactId: `${projectId}/${phaseId}/phase_activation/${phaseId}`,
    artifactType: "phase_activation",
    phaseId,
    stem: `planning/phases/${phaseId}/Phase_Activation`,
    data: { phaseId, status: "active" },
  });
  const phasePlanning = writeArtifact({
    artifactId: `${projectId}/${phaseId}/phase_planning/Phase_Planning`,
    artifactType: "phase_planning",
    phaseId,
    stem: `planning/phases/${phaseId}/Phase_Planning`,
    sources: [activation.artifactId],
    data: { phaseId, status: "active" },
  });
  const plan = writeArtifact({
    artifactId: `${projectId}/${phaseId}/work_card_plan/Work_Card_Plan`,
    artifactType: "work_card_plan",
    phaseId,
    parentArtifactId: phasePlanning.artifactId,
    stem: `planning/phases/${phaseId}/Work_Card_Plan`,
    sources: [phasePlanning.artifactId],
    expectedOutputs: [
      `${projectId}/${phaseId}/operator_approval/Operator_Phase_Approval`,
      `${projectId}/${phaseId}/work_card/WC01`,
    ],
    data: {
      phaseId,
      candidates: [{ id: "WC01", title: "Mounted governance approval target", order: 1 }],
    },
  });
  writeArtifact({
    artifactId: `${projectId}/${phaseId}/operator_approval/Operator_Phase_Approval`,
    artifactType: "operator_approval",
    phaseId,
    stem: `planning/phases/${phaseId}/Operator_Phase_Approval`,
    parentArtifactId: plan.artifactId,
    sources: [phasePlanning.artifactId, plan.artifactId],
    expectedOutputs: [`${projectId}/${phaseId}/work_card/WC01`],
    data: operatorDecisionRecord("phase_planning", [phasePlanning, plan], {
      kind: "stage_decision",
      decision: "approved",
    }),
  });
  writeArtifact({
    artifactId: `${projectId}/${phaseId}/work_card/WC01`,
    artifactType: "work_card",
    phaseId,
    workCardId: "WC01",
    parentArtifactId: plan.artifactId,
    stem: `planning/phases/${phaseId}/Work_Cards/WC01_active_work_card`,
    sources: [plan.artifactId, `${projectId}/${phaseId}/operator_approval/Operator_Phase_Approval`],
    expectedOutputs: [
      `${projectId}/${phaseId}/implementer_report/WC01`,
      `${projectId}/${phaseId}/candidate_disposition/WC01`,
    ],
    data: {
      workCardId: "WC01",
      status: "ready_for_implementer",
      requiresImplementer: true,
      codeChangesAuthorized: true,
      expectedImplementerReportArtifactId: `${projectId}/${phaseId}/implementer_report/WC01`,
    },
  });

  for (const suffix of ["legacy_a", "legacy_b"]) {
    writeArtifact({
      artifactId: `${projectId}/phase-01/work_card/WC01_${suffix}`,
      artifactType: "work_card",
      status: "historical",
      phaseId: "phase-01",
      workCardId: "WC01",
      stem: `planning/phases/phase-01/Work_Cards/WC01_${suffix}`,
      data: { workCardId: "WC01", historical: suffix },
    });
  }

  writeArtifact({
    artifactId: historicalPhaseTargetA,
    artifactType: "phase_planning",
    status: "historical",
    phaseId: "phase-01",
    stem: "planning/phases/phase-01/Historical_Phase_Planning/Legacy_Phase_Planning_A",
    data: { phaseId: "phase-01", historical: "phase-planning-a" },
  });
  writeArtifact({
    artifactId: historicalPhaseTargetB,
    artifactType: "work_card_plan",
    status: "historical",
    phaseId: "phase-01",
    stem: "planning/phases/phase-01/Historical_Work_Card_Plans/Legacy_Work_Card_Plan_B",
    data: { phaseId: "phase-01", historical: "work-card-plan-b" },
  });

  for (let index = 2; index <= 7; index += 1) {
    const workCardId = `WC0${index}`;
    writeArtifact({
      artifactId: `${projectId}/phase-01/work_card/${workCardId}`,
      artifactType: "work_card",
      status: "historical",
      phaseId: "phase-01",
      workCardId,
      stem: `planning/phases/phase-01/Work_Cards/${workCardId}_historical_accessible`,
      data: { workCardId, historical: true },
    });
  }

  writeMalformedSerializationArtifact({
    artifactId: `${projectId}/phase-01/work_card/WC99`,
    artifactType: "work_card",
    status: "historical",
    phaseId: "phase-01",
    workCardId: "WC99",
    stem: "planning/phases/phase-01/Work_Cards/WC99_historical_repair_candidate",
    data: { workCardId: "WC99", historicalRepairCandidate: true },
    register: false,
  });
  writeMalformedSerializationArtifact({
    artifactId: `${projectId}/phase-02/diagnostic_report/REPAIRABLE`,
    artifactType: "diagnostic_report",
    status: "historical",
    phaseId: "phase-02",
    stem: "planning/phases/phase-02/Diagnostic_Reports/DIAGNOSTIC_REPORT_REPAIRABLE",
    data: { diagnosticId: "REPAIRABLE" },
    register: true,
  });
  writeValidationTarget({
    id: "SEMANTIC_WC02",
    kind: "fix",
    phase: "phase-02",
    title: "Semantic WC02",
    status: "builder_report_received",
    sourceJsonFile: "VALIDATION_TARGET_SEMANTIC_WC02.json",
    expectedImplementerReportFile: "BUILDER_REPORT_SEMANTIC_WC02.md",
  });
  writeArtifact({
    artifactId: `${projectId}/operator_validation/VALIDATION_REPORT_SEMANTIC_WC02_semantic_wc02`,
    artifactType: "operator_validation",
    status: "blocked",
    workCardId: "SEMANTIC_WC02",
    stem: "planning/phases/phase-02/Validation_Reports/VALIDATION_REPORT_SEMANTIC_WC02_semantic_wc02",
    title: "SEMANTIC_WC02 Validation Report",
    contentMarkdown: "# Human Operator Validation\n\n## Validation Result\n\nPartial\n\n## Additional Operator Observations\n\nFixed-path content.\n",
    data: { validationResult: "Partial", semanticRepairFixture: "fixed" },
    register: true,
  });
  semanticRepairArtifact = writeArtifact({
    artifactId: `${projectId}/operator_validation/VALIDATION_REPORT_SEMANTIC_WC02_semantic_wc02_2`,
    artifactType: "operator_validation",
    status: "blocked",
    workCardId: "SEMANTIC_WC02",
    stem: "planning/phases/phase-02/Validation_Reports/VALIDATION_REPORT_SEMANTIC_WC02_semantic_wc02_2",
    title: "SEMANTIC_WC02 Validation Report",
    contentMarkdown: "# Human Operator Validation\n\n## Validation Result\n\nBlocked\n\n## Additional Operator Observations\n\nNumbered content.\n",
    data: { validationResult: "Blocked", semanticRepairFixture: "numbered" },
    register: true,
  });
  writeValidationTarget({
    id: "SEMANTIC_KEEP_FIXED",
    kind: "fix",
    phase: "phase-02",
    title: "Semantic Keep Fixed",
    status: "builder_report_received",
    sourceJsonFile: "VALIDATION_TARGET_SEMANTIC_KEEP_FIXED.json",
    expectedImplementerReportFile: "BUILDER_REPORT_SEMANTIC_KEEP_FIXED.md",
  });
  writeArtifact({
    artifactId: `${projectId}/operator_validation/VALIDATION_REPORT_SEMANTIC_KEEP_FIXED_semantic_keep_fixed`,
    artifactType: "operator_validation",
    status: "active",
    workCardId: "SEMANTIC_KEEP_FIXED",
    stem: "planning/phases/phase-02/Validation_Reports/VALIDATION_REPORT_SEMANTIC_KEEP_FIXED_semantic_keep_fixed",
    title: "SEMANTIC_KEEP_FIXED Validation Report",
    contentMarkdown: "# Human Operator Validation\n\n## Validation Result\n\nPass\n\n## Additional Operator Observations\n\nKeep fixed content.\n",
    data: { validationResult: "Pass", semanticRepairFixture: "keep-fixed" },
    register: true,
  });
  writeArtifact({
    artifactId: `${projectId}/operator_validation/VALIDATION_REPORT_SEMANTIC_KEEP_FIXED_semantic_keep_fixed_2`,
    artifactType: "operator_validation",
    status: "active",
    workCardId: "SEMANTIC_KEEP_FIXED",
    stem: "planning/phases/phase-02/Validation_Reports/VALIDATION_REPORT_SEMANTIC_KEEP_FIXED_semantic_keep_fixed_2",
    title: "SEMANTIC_KEEP_FIXED Validation Report",
    contentMarkdown: "# Human Operator Validation\n\n## Validation Result\n\nFail\n\n## Additional Operator Observations\n\nNumbered content that should be deleted.\n",
    data: { validationResult: "Fail", semanticRepairFixture: "numbered-delete" },
    register: true,
  });
  const registeredNoncanonicalArtifact = writeArtifact({
    artifactId: registeredNoncanonicalId,
    artifactType: "diagnostic_report",
    status: "historical",
    phaseId: "phase-02",
    stem: "planning/phases/phase-02/Diagnostic_Reports/DIAGNOSTIC_REPORT_REGISTERED_NONCANONICAL",
    data: { diagnosticId: "REGISTERED_NONCANONICAL" },
  });
  fs.writeFileSync(
    path.join(fixtureRoot, ...registeredNoncanonicalArtifact.jsonPath.split("/")),
    JSON.stringify(registeredNoncanonicalArtifact),
    "utf8",
  );
  blockedRepairArtifact = writeArtifact({
    artifactId: `${projectId}/phase-02/diagnostic_report/BLOCKED`,
    artifactType: "diagnostic_report",
    status: "historical",
    phaseId: "phase-02",
    stem: "planning/phases/phase-02/Diagnostic_Reports/DIAGNOSTIC_REPORT_BLOCKED",
    data: { diagnosticId: "BLOCKED" },
  });
  writePair(
    blockedRepairArtifact,
    `${canonicalPrettyStringify(blockedRepairArtifact)}\n`,
    renderArtifactMarkdown(blockedRepairArtifact).replace(
      "# diagnostic_report",
      "# blocked diagnostic mismatch",
    ),
  );
  unknownRepairArtifact = writeJsonOnlyArtifact({
    artifactId: `${projectId}/phase-02/diagnostic_report/UNKNOWN`,
    artifactType: "diagnostic_report",
    status: "historical",
    phaseId: "phase-02",
    stem: "planning/phases/phase-02/Diagnostic_Reports/DIAGNOSTIC_REPORT_UNKNOWN",
    data: { diagnosticId: "UNKNOWN" },
  });
  writeRegistry();
  writeWorkspace();
}

function writeValidationTarget(record) {
  const repoPath = `planning/phases/${record.phase}/Validation_Targets/${record.sourceJsonFile}`;
  const absolute = path.join(fixtureRoot, ...repoPath.split("/"));
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, `${JSON.stringify(record, null, 2)}\n`, "utf8");
}

function writeArtifact(input) {
  const artifact = buildCanonicalArtifact({
    artifactId: input.artifactId,
    artifactType: input.artifactType,
    revision: input.revision ?? 1,
    status: input.status ?? "active",
    projectId,
    ...(input.phaseId ? { phaseId: input.phaseId } : {}),
    ...(input.workCardId ? { workCardId: input.workCardId } : {}),
    ...(input.parentArtifactId ? { parentArtifactId: input.parentArtifactId } : {}),
    createdAt: fixedTime,
    updatedAt: fixedTime,
    jsonPath: `${input.stem}.json`,
    markdownPath: `${input.stem}.md`,
    relationships: {
      sources: input.sources ?? [],
      expectedOutputs: input.expectedOutputs ?? [],
      supersedes: [],
      children: [],
    },
    payload: {
      kind: input.artifactType,
      title: input.title ?? input.artifactType,
      contentMarkdown: input.contentMarkdown ?? `# ${input.title ?? input.artifactType}\n\nMounted governance evidence.\n`,
      data: input.data ?? {},
    },
  });
  writePair(artifact, `${canonicalPrettyStringify(artifact)}\n`, renderArtifactMarkdown(artifact));
  if (input.register !== false) seededRegistryArtifacts.push(artifact);
  return artifact;
}

function operatorDecisionRecord(stage, artifacts, outcome) {
  const targets = artifacts.map((artifact) => ({
    artifactId: artifact.artifactId,
    artifactType: artifact.artifactType,
    revision: artifact.revision,
    payloadHash: artifact.payloadHash,
  })).sort((left, right) => left.artifactId.localeCompare(right.artifactId));
  const targetSetHash = createHash("sha256")
    .update(JSON.stringify({ stage, targets }), "utf8")
    .digest("hex");
  const event = {
    schemaVersion: "operator-decision-event.v1",
    stage,
    targets,
    targetSetHash,
    outcome,
    decidedAt: fixedTime,
  };
  return {
    schemaVersion: "operator-decision-record.v1",
    stage,
    targets,
    targetSetHash,
    outcome,
    decidedAt: fixedTime,
    decisionTimeline: [event],
  };
}

function writeMalformedSerializationArtifact(input) {
  const artifact = writeArtifact({ ...input, register: false });
  const markdown = `<!-- champcity-artifact-envelope\n${canonicalStringify(buildMarkdownArtifactEnvelope(artifact))}\n-->\n\n${artifact.payload.contentMarkdown}`;
  writePair(artifact, `${canonicalPrettyStringify(artifact)}\n`, markdown);
  if (input.register) seededRegistryArtifacts.push(artifact);
  return artifact;
}

function writeJsonOnlyArtifact(input) {
  const artifact = buildCanonicalArtifact({
    artifactId: input.artifactId,
    artifactType: input.artifactType,
    revision: input.revision ?? 1,
    status: input.status ?? "active",
    projectId,
    ...(input.phaseId ? { phaseId: input.phaseId } : {}),
    ...(input.workCardId ? { workCardId: input.workCardId } : {}),
    createdAt: fixedTime,
    updatedAt: fixedTime,
    jsonPath: `${input.stem}.json`,
    markdownPath: `${input.stem}.md`,
    relationships: {
      sources: input.sources ?? [],
      expectedOutputs: input.expectedOutputs ?? [],
      supersedes: [],
      children: [],
    },
    payload: {
      kind: input.artifactType,
      title: input.title ?? input.artifactType,
      contentMarkdown: `# ${input.title ?? input.artifactType}\n\nMounted governance evidence.\n`,
      data: input.data ?? {},
    },
  });
  const jsonPath = path.join(fixtureRoot, ...artifact.jsonPath.split("/"));
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, `${canonicalPrettyStringify(artifact)}\n`, "utf8");
  return artifact;
}

function writePair(artifact, jsonContent, markdownContent) {
  const jsonPath = path.join(fixtureRoot, ...artifact.jsonPath.split("/"));
  const markdownPath = path.join(fixtureRoot, ...artifact.markdownPath.split("/"));
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.mkdirSync(path.dirname(markdownPath), { recursive: true });
  fs.writeFileSync(jsonPath, jsonContent, "utf8");
  fs.writeFileSync(markdownPath, markdownContent, "utf8");
}

function writeRegistry() {
  const registry = buildArtifactRegistry({
    updatedAt: fixedTime,
    entries: seededRegistryArtifacts.map((artifact) => buildArtifactRegistryEntry(artifact)),
  });
  const registryArtifact = buildCanonicalArtifact({
    artifactId: `${projectId}/system/artifact_registry`,
    artifactType: "artifact_registry",
    revision: 1,
    status: "active",
    projectId,
    createdAt: fixedTime,
    updatedAt: fixedTime,
    markdownPath: "planning/system/Artifact_Registry/ARTIFACT_REGISTRY.md",
    jsonPath: "planning/system/Artifact_Registry/ARTIFACT_REGISTRY.json",
    relationships: {
      sources: registry.entries.map((entry) => entry.artifactId),
      expectedOutputs: [],
      supersedes: [],
      children: [],
    },
    payload: {
      kind: "artifact_registry",
      title: "Canonical Artifact Registry",
      contentMarkdown: renderArtifactRegistryContentMarkdown(registry),
      data: registry,
    },
  });
  writePair(registryArtifact, `${canonicalPrettyStringify(registryArtifact)}\n`, renderArtifactMarkdown(registryArtifact));
}

function writeWorkspace() {
  fs.mkdirSync(userDataRoot, { recursive: true });
  fs.writeFileSync(
    workspacePath,
    `${JSON.stringify({
      schemaVersion: "champcity.project-workspaces.v1",
      selectedProjectId: projectId,
      projects: [{
        projectId,
        displayName: path.basename(fixtureRoot),
        repositoryRoot: fixtureRoot,
        planningRoot: path.join(fixtureRoot, "planning"),
        branchBehavior: { mode: "observe-current" },
        enabled: true,
        createdAt: fixedTime,
        updatedAt: fixedTime,
        lastOpenedAt: null,
        lastScanAt: null,
        lastScanResult: null,
        observerStatus: "stopped",
      }],
    }, null, 2)}\n`,
    "utf8",
  );
}

function fixBlockedRepairCandidate() {
  const json = JSON.parse(
    fs.readFileSync(path.join(fixtureRoot, ...blockedRepairArtifact.jsonPath.split("/")), "utf8"),
  );
  writePair(json, `${canonicalPrettyStringify(json)}\n`, renderArtifactMarkdown(json));
}

function fixUnknownRepairCandidate() {
  const json = JSON.parse(
    fs.readFileSync(path.join(fixtureRoot, ...unknownRepairArtifact.jsonPath.split("/")), "utf8"),
  );
  writePair(json, `${canonicalPrettyStringify(json)}\n`, renderArtifactMarkdown(json));
}

async function verifyApprovalCanonicalAndRegistered() {
  const approvalJsonPath = "planning/phases/phase-04/Operator_Approvals/OPERATOR_APPROVAL_WC01_active_work_card.json";
  const approvalMarkdownPath = approvalJsonPath.replace(/\.json$/, ".md");
  const json = fs.readFileSync(path.join(fixtureRoot, ...approvalJsonPath.split("/")), "utf8");
  const markdown = fs.readFileSync(path.join(fixtureRoot, ...approvalMarkdownPath.split("/")), "utf8");
  const verification = verifyArtifactPair({
    jsonArtifact: json,
    markdown,
    jsonPath: approvalJsonPath,
    markdownPath: approvalMarkdownPath,
  });
  assert.equal(verification.valid, true);
  assert.equal(verification.synchronized, true);
  assert.equal(verification.artifact.artifactType, "operator_approval");
  assert.equal(verification.artifact.payload.data.schemaVersion, "operator-decision-record.v1");
  assert.equal(verification.artifact.payload.data.targetSetHash.length > 0, true);
  assert.equal("implementationAuthorized" in verification.artifact.payload.data, false);
  const registryJson = JSON.parse(
    fs.readFileSync(
      path.join(fixtureRoot, "planning", "system", "Artifact_Registry", "ARTIFACT_REGISTRY.json"),
      "utf8",
    ),
  );
  const registry = registryJson.payload.data;
  assert.equal(validateArtifactRegistry(registry).valid, true);
  const entry = registry.entries.find((candidate) => candidate.artifactId === verification.artifact.artifactId);
  assert.ok(entry, "approval must be registered");
  assert.equal(entry.payloadHash, verification.artifact.payloadHash);
}

async function verifyHistoricalApprovalsNonRouting(queue) {
  const registryJson = JSON.parse(
    fs.readFileSync(
      path.join(fixtureRoot, "planning", "system", "Artifact_Registry", "ARTIFACT_REGISTRY.json"),
      "utf8",
    ),
  );
  const registry = registryJson.payload.data;
  for (const targetArtifactId of [
    historicalSharedWorkCardA,
    historicalSharedWorkCardB,
    historicalPhaseTargetA,
    historicalPhaseTargetB,
  ]) {
    const item = queue.items.find((candidate) => candidate.targetArtifactId === targetArtifactId);
    assert.equal(item?.approvalStatus, "exact", `${targetArtifactId} should be exact`);
    assert.match(item.existingApprovalArtifactId, /\/operator_approval\//);
    const entry = registry.entries.find((candidate) => candidate.artifactId === item.existingApprovalArtifactId);
    assert.ok(entry, `${item.existingApprovalArtifactId} must be registered`);
    const json = fs.readFileSync(path.join(fixtureRoot, ...entry.jsonPath.split("/")), "utf8");
    const markdown = fs.readFileSync(path.join(fixtureRoot, ...entry.markdownPath.split("/")), "utf8");
    const verification = verifyArtifactPair({
      jsonArtifact: json,
      markdown,
      jsonPath: entry.jsonPath,
      markdownPath: entry.markdownPath,
    });
    assert.equal(verification.valid, true);
    assert.equal(verification.synchronized, true);
    assert.equal(verification.artifact.parentArtifactId, targetArtifactId);
    assert.equal(verification.artifact.payload.data.schemaVersion, "operator-decision-record.v1");
    assert.equal(verification.artifact.payload.data.targets.some((target) => target.artifactId === targetArtifactId), true);
    assert.equal("implementationAuthorized" in verification.artifact.payload.data, false);
    assert.equal("phaseProgressionAuthorized" in verification.artifact.payload.data, false);
    assert.equal("routeSelectionAuthorized" in verification.artifact.payload.data, false);
    assert.deepEqual(verification.artifact.relationships.expectedOutputs, []);
  }
}

async function assertProjectHeaderCompact(window, forbiddenArtifactId) {
  const headerText = await window.webContents.executeJavaScript(
    `(() => {
      let node = document.querySelector('select[aria-label="Active project"]');
      while (node) {
        const text = node.innerText || "";
        if (text.includes("Repairs:") && text.includes("Refresh project state")) return text;
        node = node.parentElement;
      }
      return "";
    })()`,
    true,
  );
  assert.ok(headerText.includes("Repairs:"), "project header should show compact repair count");
  assert.ok(headerText.includes("Approvals:"), "project header should show compact approval count");
  assert.equal(
    headerText.includes(forbiddenArtifactId),
    false,
    "full governance records must not render in the project header",
  );
}

async function repairAllRemainingIndividually(window) {
  for (let index = 0; index < 20; index += 1) {
    const snapshot = await getMaintenanceSnapshot(window);
    const item = snapshot.maintenance.repair.candidates.find((candidate) => candidate.safelyRepairable);
    if (!item) return;
    const result = await window.webContents.executeJavaScript(
      `window.champCity.repairGovernanceRecord(${JSON.stringify({
        artifactId: item.artifactId,
        jsonPath: item.jsonPath,
        markdownPath: item.markdownPath,
        repairKind: item.repairKind,
        expectedRevision: item.revision,
      })})`,
      true,
    );
    assert.equal(result.ok, true, `selected repair failed for ${item.artifactId}`);
    assert.ok(result.maintenance, `selected repair should return fresh maintenance snapshot for ${item.artifactId}`);
    assert.ok(result.currentRequiredAction, `selected repair should return fresh current action for ${item.artifactId}`);
    assertProjectionRevisionAgreement(result, `repair mutation result for ${item.artifactId}`);
    assert.ok(
      result.repairedArtifactIds.includes(item.artifactId),
      `selected repair result should include ${item.artifactId}`,
    );
  }
  throw new Error("Repair queue did not drain after 20 selected repairs.");
}

async function approveAllRemaining(window) {
  for (let index = 0; index < 40; index += 1) {
    const snapshot = await getMaintenanceSnapshot(window);
    const item = snapshot.maintenance.approval.items.find((candidate) => candidate.approvalStatus !== "exact");
    if (!item) return;
    assert.equal(snapshot.currentRequiredAction.currentAction.routedAction.targetArtifactId, item.targetArtifactId);
    assert.equal(snapshot.currentRequiredAction.currentAction.routedAction.expectedOutput.artifactId, item.approvalArtifactId);
    const decision =
      item.decisionWorkspaceScreenId === "historical-operator-review"
        ? "accepted_as_historical_evidence"
        : "approved";
    const result = await window.webContents.executeJavaScript(
      `window.champCity.decideGovernanceApproval(${JSON.stringify(approvalIntent(item, decision, "Mounted approval coverage."))})`,
      true,
    );
    assert.equal(
      result.ok,
      true,
      `selected approval failed for ${item.targetArtifactId}: ${result.errorMessages?.join("; ")}`,
    );
    assert.ok(result.maintenance, `selected approval should return fresh maintenance snapshot for ${item.targetArtifactId}`);
    assert.ok(result.currentRequiredAction, `selected approval should return fresh current action for ${item.targetArtifactId}`);
    assertProjectionRevisionAgreement(result, `approval mutation result for ${item.targetArtifactId}`);
  }
  throw new Error("Approval queue did not drain after 40 selected approvals.");
}

async function decideApprovalItemThroughUi(window, item, buttonLabel, reason, expectedDecision) {
  await openGovernanceApprovalQueue(window);
  await clickButton(window, item.targetArtifactId);
  await clickButton(window, `Open ${item.decisionWorkspaceLabel}`);
  await waitFor(
    window,
    `document.body.innerText.includes(${JSON.stringify(item.decisionWorkspaceLabel)}) && document.body.innerText.includes(${JSON.stringify(item.targetArtifactId)}) && document.body.innerText.includes(${JSON.stringify(item.contentMarkdown.trim())})`,
    `stage-owned workspace for ${item.targetArtifactId}`,
  );
  if (reason) await setOperatorReason(window, reason);
  await clickButton(window, buttonLabel);
  await waitFor(
    window,
    `window.champCity.getCurrentGovernanceMaintenance().then((result) => {
      const item = result.maintenance.approval.items.find((candidate) => candidate.targetArtifactId === ${JSON.stringify(item.targetArtifactId)});
      return Boolean(item && item.approvalStatus === "exact" && item.decisionTimeline.some((event) => ((event.outcome && event.outcome.kind === "stage_decision") ? event.outcome.decision : event.outcome?.disposition) === ${JSON.stringify(expectedDecision)}${
        reason
          ? ` && event.operatorReason === ${JSON.stringify(reason)}`
          : ` && !event.operatorReason`
      }));
    })`,
    `${buttonLabel} writes and refreshes the decision timeline`,
  );
  await waitFor(
    window,
    `document.body.innerText.includes(${JSON.stringify(formatMountedDecisionLabel(expectedDecision))})${reason ? ` && document.body.innerText.includes(${JSON.stringify(reason)})` : ""}`,
    `${buttonLabel} timeline rendered after refresh`,
  );
}

async function decideCurrentApprovalWorkspaceThroughUi(window, item, buttonLabel, reason, expectedDecision, expectedTimelineLength) {
  await waitFor(
    window,
    `document.body.innerText.includes(${JSON.stringify(item.decisionWorkspaceLabel)}) && document.body.innerText.includes(${JSON.stringify(item.targetArtifactId)}) && document.body.innerText.includes(${JSON.stringify(item.contentMarkdown.trim())})`,
    `stage-owned workspace for ${item.targetArtifactId}`,
  );
  await setOperatorReason(window, reason);
  await clickButton(window, buttonLabel);
  await waitFor(
    window,
    `window.champCity.getCurrentGovernanceMaintenance().then((result) => {
      const item = result.maintenance.approval.items.find((candidate) => candidate.targetArtifactId === ${JSON.stringify(item.targetArtifactId)});
      return Boolean(item && item.approvalStatus === "exact" && item.decisionTimeline.length === ${expectedTimelineLength} && item.decisionTimeline.some((event) => ((event.outcome && event.outcome.kind === "stage_decision") ? event.outcome.decision : event.outcome?.disposition) === ${JSON.stringify(expectedDecision)}${
        reason
          ? ` && event.operatorReason === ${JSON.stringify(reason)}`
          : ` && !event.operatorReason`
      }));
    })`,
    `${buttonLabel} writes decision ${expectedDecision}`,
  );
  await waitFor(
    window,
    `document.body.innerText.includes(${JSON.stringify(formatMountedDecisionLabel(expectedDecision))})${reason ? ` && document.body.innerText.includes(${JSON.stringify(reason)})` : ""}`,
    `${buttonLabel} timeline rendered after refresh`,
  );
}

async function decideApprovalItemThroughPreload(window, item, reason, decision, expectedTimelineLength) {
  const result = await window.webContents.executeJavaScript(
    `window.champCity.decideGovernanceApproval(${JSON.stringify(approvalIntent(item, decision, reason))})`,
    true,
  );
  assert.equal(result.ok, true, `mounted preload decision failed: ${result.errorMessages?.join("; ")}`);
  const updated = result.maintenance.approval.items.find(
    (candidate) => candidate.targetArtifactId === item.targetArtifactId,
  );
  assert.ok(updated, `mounted preload decision returned ${item.targetArtifactId}`);
  assert.equal(updated.decisionTimeline.length, expectedTimelineLength);
  assert.ok(
    updated.decisionTimeline.some(
      (event) => mountedEventDecision(event) === decision && (reason ? event.operatorReason === reason : !event.operatorReason),
    ),
    `mounted preload timeline includes ${decision}`,
  );
}

async function expectApprovalDecisionRejectedThroughPreload(window, item, decision, expectedMessage) {
  const result = await window.webContents.executeJavaScript(
    `window.champCity.decideGovernanceApproval(${JSON.stringify(approvalIntent(item, decision, "Contradictory mounted decision."))})`,
    true,
  );
  assert.equal(result.ok, false, "contradictory exact decision must be rejected");
  assert.match(result.errorMessages?.join("; ") ?? "", new RegExp(expectedMessage.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}

async function createMountedWorkCardRevision(item, revisionBody) {
  const service = new ArtifactPairService({
    projectRoot: fixtureRoot,
    clock: () => new Date(Date.parse(fixedTime) + mountedTransaction * 1000).toISOString(),
    transactionIdFactory: () => `mounted-approval-${++mountedTransaction}`,
  });
  const current = (await service.readArtifactByPaths(item.jsonPath, item.markdownPath)).artifact;
  const location = locationFromArtifactPaths(current);
  const commit = await service.commitArtifact({
    artifactId: current.artifactId,
    artifactType: current.artifactType,
    status: current.status,
    projectId: current.projectId,
    phaseId: current.phaseId,
    workCardId: current.workCardId,
    parentArtifactId: current.parentArtifactId,
    relationships: current.relationships,
    payload: {
      ...current.payload,
      contentMarkdown: `# Mounted governance approval target\n\n${revisionBody}\n`,
      data: {
        ...current.payload.data,
        mountedRevisionBody: revisionBody,
      },
    },
    location,
    expectedRevision: current.revision,
  });
  return commit.artifact;
}

function locationFromArtifactPaths(artifact) {
  const directoryPath = path.posix.dirname(artifact.jsonPath);
  const fileStem = path.posix.basename(artifact.jsonPath).replace(/\.json$/i, "");
  return { directoryPath, fileStem };
}

async function openGovernanceApprovalQueue(window) {
  const alreadyOpen = await window.webContents.executeJavaScript(
    `document.body.innerText.includes("Governance Approval") && document.body.innerText.includes("Open ")`,
    true,
  );
  if (alreadyOpen) return;
  await clickButton(window, "Supporting tools");
  await clickButton(window, "Governance Approval");
  await waitFor(
    window,
    `document.body.innerText.includes("Governance Approval") && document.body.innerText.includes("Open ")`,
    "governance approval queue reopens",
  );
}

async function openApprovalTargetFromQueue(window, item) {
  await openGovernanceApprovalQueue(window);
  await clickButton(window, item.targetArtifactId);
  await clickButton(window, `Open ${item.decisionWorkspaceLabel}`);
  await waitFor(
    window,
    `document.body.innerText.includes(${JSON.stringify(item.decisionWorkspaceLabel)}) && document.body.innerText.includes(${JSON.stringify(item.targetArtifactId)})`,
    `stage-owned workspace for ${item.targetArtifactId} reopens from queue`,
  );
}

async function setOperatorReason(window, reason) {
  const changed = await window.webContents.executeJavaScript(
    `(() => {
      const textarea = document.querySelector("textarea");
      if (!textarea) return false;
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
      setter.call(textarea, ${JSON.stringify(reason)});
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    })()`,
    true,
  );
  assert.equal(changed, true, "Operator reason textarea not found");
}

function formatMountedDecisionLabel(decision) {
  if (decision === "revision_requested") return "Request revision";
  if (decision === "rejected") return "Reject exact target";
  if (decision === "approved") return "Approve exact target";
  if (decision === "accepted_as_historical_evidence") return "Accept as historical evidence";
  if (decision === "revision_required") return "Revision required";
  if (decision === "invalid") return "Invalid";
  return decision;
}

function approvalIntent(item, decision, operatorReason) {
  return {
    stage: item.decisionStage,
    targets: item.targetBindings,
    outcome: mountedOutcomeForDecision(decision),
    ...(operatorReason ? { operatorReason } : {}),
  };
}

function mountedOutcomeForDecision(decision) {
  if (decision === "approved" || decision === "revision_requested" || decision === "rejected") {
    return { kind: "stage_decision", decision };
  }
  return { kind: "record_disposition", disposition: decision };
}

function mountedEventDecision(event) {
  if (event?.outcome?.kind === "stage_decision") return event.outcome.decision;
  return event?.outcome?.disposition;
}

async function waitForNormalRoute(window, description) {
  await waitForNormalRouteAction(window, "implementer_execution_required", description);
}

async function waitForNormalRouteAction(window, actionId, description) {
  await waitFor(
    window,
    `window.champCity.getCurrentGovernanceMaintenance().then((result) => result.ok && result.currentRequiredAction?.currentAction?.id === ${JSON.stringify(actionId)} && result.currentRequiredAction?.currentAction?.workCardId === "WC01" && result.currentRequiredAction?.currentAction?.routedAction?.bindingSource?.kind === "relationship_resolver")`,
    description,
  );
}

async function getMaintenanceSnapshot(window) {
  const snapshot = await window.webContents.executeJavaScript(
    `window.champCity.getCurrentGovernanceMaintenance()`,
    true,
  );
  assert.equal(snapshot.ok, true, snapshot.errorMessages?.join(" "));
  assert.ok(snapshot.currentRequiredAction?.currentAction, "maintenance snapshot must include current action projection");
  assertProjectionRevisionAgreement(snapshot, "maintenance snapshot");
  return snapshot;
}

function assertProjectionRevisionAgreement(result, label) {
  const projectionRevision = result.projectionRevision ?? result.scanResult?.projectionRevision;
  assert.equal(
    Number.isInteger(projectionRevision),
    true,
    `${label} should expose an integer projection revision`,
  );
  assert.equal(
    result.scanResult?.projectionRevision,
    projectionRevision,
    `${label} scan result revision should match projection revision`,
  );
  if (result.currentAction) {
    assert.equal(
      result.currentAction.stateRevision,
      projectionRevision,
      `${label} current action revision should match projection revision`,
    );
  }
  const routedAction = result.currentRequiredAction?.currentAction?.routedAction;
  if (routedAction) {
    assert.equal(
      routedAction.stateRevision,
      projectionRevision,
      `${label} routed current-required-action revision should match projection revision`,
    );
  }
}

async function verifyAllRequiredApprovalsExact(queue) {
  for (const artifactId of [
    `${projectId}/${phaseId}/work_card/WC01`,
    historicalSharedWorkCardA,
    historicalSharedWorkCardB,
    historicalPhaseTargetA,
    historicalPhaseTargetB,
  ]) {
    assert.equal(
      queue.items.find((item) => item.targetArtifactId === artifactId)?.approvalStatus,
      "exact",
      `${artifactId} should be exact after governance approval`,
    );
  }
}

async function clickApproveFor(window, artifactId) {
  await waitFor(
    window,
    `visibleButtons().some((button) => button.textContent.includes("Approve exact revision") && !button.disabled)`,
    `enabled approval button for ${artifactId}`,
  );
  const clicked = await window.webContents.executeJavaScript(
    `(() => {
      const target = ${JSON.stringify(artifactId)};
      const buttons = visibleButtons().filter((button) => button.textContent.includes("Approve exact revision") && !button.disabled);
      const button = buttons.find((candidate) => {
        const row = candidate.parentElement?.parentElement;
        return Boolean(row && (row.innerText || "").includes(target));
      });
      button?.click();
      return Boolean(button);
    })()`,
    true,
  );
  assert.equal(clicked, true, `Approve button not found for ${artifactId}`);
}

async function clickButton(window, label) {
  await waitFor(
    window,
    `visibleButtons().some((button) => button.textContent.includes(${JSON.stringify(label)}) && !button.disabled)`,
    `enabled button ${label}`,
  );
  const clicked = await window.webContents.executeJavaScript(
    `(() => {
      const button = visibleButtons().find((candidate) => candidate.textContent.includes(${JSON.stringify(label)}) && !candidate.disabled);
      button?.click();
      return Boolean(button);
    })()`,
    true,
  );
  assert.equal(clicked, true, `Button not found: ${label}`);
}

async function chooseSelectOption(window, value) {
  const changed = await window.webContents.executeJavaScript(
    `(() => {
      const select = [...document.querySelectorAll("select")].find((candidate) =>
        [...candidate.options].some((option) => option.value === ${JSON.stringify(value)})
      );
      if (!select) return false;
      select.value = ${JSON.stringify(value)};
      select.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    })()`,
    true,
  );
  if (!changed) {
    const options = await window.webContents.executeJavaScript(
      `[...document.querySelectorAll("select option")].map((option) => option.value)`,
      true,
    );
    assert.equal(changed, true, `Select option not found: ${value}; visible options: ${options.join(", ")}`);
  }
}

async function chooseSelectOptionIfPresent(window, value) {
  await window.webContents.executeJavaScript(
    `(() => {
      const select = [...document.querySelectorAll("select")].find((candidate) =>
        [...candidate.options].some((option) => option.value === ${JSON.stringify(value)})
      );
      if (!select) return false;
      select.value = ${JSON.stringify(value)};
      select.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    })()`,
    true,
  );
}

async function bodyText(window) {
  return window.webContents.executeJavaScript(`document.body?.innerText ?? ""`, true);
}

function visibleButtonsExpression() {
  return `window.visibleButtons = () => [...document.querySelectorAll("button")].filter((button) => button.getClientRects().length > 0); true`;
}

async function waitForWindow(timeoutMs = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const window = BrowserWindow.getAllWindows()[0];
    if (window && !window.webContents.isLoading()) return window;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("Timed out waiting for the real application window.");
}

async function waitFor(window, expression, description, timeoutMs = 25000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await window.webContents.executeJavaScript(expression, true)) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${description}. Renderer text: ${(await bodyText(window)).slice(0, 2000)}`);
}

async function shutdown(shouldCleanup, exitCode = 0) {
  try {
    await require("../dist/main/canonicalRuntime.js").shutdownCanonicalRuntime();
  } catch {}
  for (const candidate of BrowserWindow.getAllWindows()) candidate.destroy();
  if (shouldCleanup) {
    cleanupPath(fixtureRoot);
    cleanupPath(workspacePath);
  }
  app.exit(exitCode);
}

function cleanupPath(targetPath) {
  try {
    fs.rmSync(targetPath, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  } catch (error) {
    console.warn(`Deferred cleanup for ${path.basename(targetPath)}: ${error.code || error.message}`);
  }
}
