const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { app, BrowserWindow } = require("electron");

const {
  buildCanonicalArtifact,
  buildArtifactRegistry,
  buildArtifactRegistryEntry,
  canonicalPrettyStringify,
  renderArtifactMarkdown,
} = require("../dist/shared/artifacts");

const repositoryRoot = path.resolve(__dirname, "..");
const fixtureRoot = path.join(repositoryRoot, "tmp", "wc01-repair01-electron-project");
const fixtureRootOther = path.join(repositoryRoot, "tmp", "wc01-repair01-electron-other-project");
const userDataRoot = path.join(repositoryRoot, "tmp", "electron-runtime", "user-data");
const workspacePath = path.join(userDataRoot, "project-workspaces.json");
const projectId = "mounted-project";
const phaseId = "phase-04";
const workCardId = "WC01";
const repairId = "WC01-REPAIR01";
const otherProjectId = "mounted-other-project";
const fixedTime = "2026-07-15T21:30:00.000Z";
const prepare = process.argv.includes("--prepare");
const restart = process.argv.includes("--restart");
const cleanup = process.argv.includes("--cleanup");
const seededArtifacts = [];

if (prepare) prepareFixture();

require("../dist/main/main.js");

app.whenReady().then(async () => {
  try {
    const window = await waitForWindow();
    await waitFor(
      window,
      `document.body.innerText.includes("Mounted Evidence Project") && document.body.innerText.includes("Refresh project state") && document.body.innerText.includes("Add local project") && !document.body.innerText.includes("Repository directory")`,
      "selected project workspace bar",
    );
    await waitFor(
      window,
      restart
        ? `window.champCity.getCurrentRequiredAction().then((result) => result.currentAction?.id === "implementer_execution_required" && result.currentAction?.workCardId === "WC02")`
        : `window.champCity.getCurrentRequiredAction().then((result) => result.currentAction?.id === "implementer_execution_required" && result.currentAction?.workCardId === "${repairId}")`,
      restart ? "restart next-candidate projection" : "repair Implementer Execution projection",
    );

    const initial = await window.webContents.executeJavaScript(
      `window.champCity.getCurrentRequiredAction()`,
      true,
    );
    assert.equal(initial.ok, true);
    assert.equal(initial.currentAction.routedAction.bindingSource.kind, "evidence_projection");
    assert.equal(initial.currentAction.workCardId, restart ? "WC02" : repairId);

    if (!restart) {
      assert.equal(initial.currentAction.id, "implementer_execution_required");
      assert.equal(initial.currentAction.workCardId, repairId);
      assert.equal(initial.currentAction.routedAction.targetArtifactId, `${projectId}/${phaseId}/work_card/${repairId}`);
      assert.equal(
        initial.currentAction.routedAction.expectedOutput.artifactId,
        `${projectId}/${phaseId}/implementer_report/${repairId}`,
      );

      writeArtifact({
        artifactId: `${projectId}/${phaseId}/implementer_report/${repairId}`,
        artifactType: "implementer_report",
        phaseId,
        workCardId: repairId,
        parentArtifactId: `${projectId}/${phaseId}/work_card/${workCardId}`,
        stem: `planning/phases/${phaseId}/Implementer_Reports/IMPLEMENTER_REPORT_${repairId}_mounted_repair`,
        sources: [`${projectId}/${phaseId}/work_card/${repairId}`],
        expectedOutputs: [`${projectId}/${phaseId}/architect_review/${workCardId}`],
        data: {
          workCardId: repairId,
          logicalRepairReportArtifactId: `${projectId}/${phaseId}/implementer_report/${repairId}`,
        },
        title: `Implementer Report: ${repairId} Mounted Repair`,
      });

      await window.webContents.executeJavaScript(
        `([...document.querySelectorAll("button")].find((button) => button.textContent.includes("Refresh project state"))?.click(), true)`,
        true,
      );
      await waitFor(
        window,
        `window.champCity.getCurrentRequiredAction().then((result) => result.currentAction?.id === "architect_review_of_implementer_report_required" && result.currentAction?.workCardId === "${workCardId}")`,
        "combined parent Architect Review after external repair report refresh",
        20000,
      );
      const combined = await window.webContents.executeJavaScript(
        `window.champCity.getCurrentRequiredAction()`,
        true,
      );
      assert.equal(combined.currentAction.routedAction.targetArtifactId, `${projectId}/${phaseId}/work_card/${workCardId}`);
      assert.deepEqual(combined.currentAction.routedAction.sourceArtifactIds, [
        `${projectId}/${phaseId}/implementer_report/${workCardId}`,
        `${projectId}/${phaseId}/implementer_report/${repairId}`,
        `${projectId}/${phaseId}/architect_review/${workCardId}`,
        `${projectId}/${phaseId}/work_card/${repairId}`,
      ]);
      assert.equal(combined.currentAction.routedAction.expectedOutput.artifactId, `${projectId}/${phaseId}/architect_review/${workCardId}`);
      await window.webContents.executeJavaScript(
        `([...document.querySelectorAll("button")].find((button) => button.textContent.includes("Continue current action: Architect Review"))?.click(), true)`,
        true,
      );
      await waitFor(
        window,
        `document.body.innerText.includes("Combined Architect Review of Parent WC01") && document.body.innerText.includes("No additional numbered repair is permitted")`,
        "repaired-parent Architect Review UI",
      );

      const routedUiState = await window.webContents.executeJavaScript(
        `(async () => {
          const current = await window.champCity.getCurrentRequiredAction();
          const binding = current.routedArchitectReviewBinding;
          const text = document.body.innerText;
          const selects = [...document.querySelectorAll("select")].map((select) => ({
            value: select.value,
            disabled: select.disabled,
            options: [...select.options].map((option) => option.textContent || ""),
          }));
          return {
            hasBinding: Boolean(binding),
            binding,
            text,
            selects,
            reportSummary: text.match(/Associated Implementer Report: [^\\n]+/)?.[0] || "",
          };
        })()`,
        true,
      );
      assert.equal(routedUiState.hasBinding, true, "Architect Review form must receive the routedReviewBinding.");
      assert.equal(routedUiState.binding.phaseId, phaseId);
      assert.equal(routedUiState.binding.workCardId, workCardId);
      assert.equal(routedUiState.binding.reviewScope, "combined_parent_and_final_repair");
      assert.ok(routedUiState.binding.implementerReportFileName, "Canonical binding must name the primary Implementer Report.");
      assert.ok(routedUiState.binding.expectedOutputPath, "Canonical binding must name the expected Architect Review output.");
      assert.ok(
        routedUiState.binding.combinedEvidence.some(
          (item) => item.artifactId === `${projectId}/${phaseId}/implementer_report/${workCardId}`,
        ),
        "Canonical binding must include parent Implementer Report evidence.",
      );
      assert.ok(
        routedUiState.binding.combinedEvidence.some(
          (item) => item.artifactId === `${projectId}/${phaseId}/implementer_report/${repairId}`,
        ),
        "Canonical binding must include final repair Implementer Report evidence.",
      );
      assert.ok(routedUiState.text.includes(routedUiState.binding.implementerReportFileName), "Routed Implementer Report filename must be visible in the review workspace.");
      assert.ok(routedUiState.text.includes(routedUiState.binding.expectedOutputPath), "Routed expected output path must be visible in the review workspace.");
      assert.ok(routedUiState.text.includes("combined parent and final repair evidence"), "Combined evidence review mode must be visible.");
      assert.ok(routedUiState.text.includes("Implementer Report: WC01 Mounted Authority Cutover"), "Parent Implementer Report evidence must be visible.");
      assert.ok(routedUiState.text.includes(`Implementer Report: ${repairId} Mounted Repair`), "Final repair Implementer Report evidence must be visible.");
      assert.ok(!routedUiState.text.includes("Associated Implementer Report: none"), "Routed Architect Review must not display an empty Implementer Report association.");
      assert.ok(!routedUiState.text.includes("Select an Implementer Report to review."), "Routed Architect Review must not require manual Implementer Report selection.");
      assert.ok(
        routedUiState.selects.some((select) => select.disabled && select.value === routedUiState.binding.implementerReportFileName),
        "The visible Implementer Report control must be hydrated from the routed binding and locked.",
      );

      const referenceRetargetAttempt = await window.webContents.executeJavaScript(
        `(async () => {
          const before = (await window.champCity.getCurrentRequiredAction()).routedArchitectReviewBinding;
          for (const select of [...document.querySelectorAll("select")]) {
            if (select.disabled) continue;
            const other = [...select.options].find((option) => option.value && option.value !== select.value && option.textContent.includes("WC02"));
            if (!other) continue;
            select.value = other.value;
            select.dispatchEvent(new Event("change", { bubbles: true }));
          }
          await new Promise((resolve) => setTimeout(resolve, 250));
          const after = (await window.champCity.getCurrentRequiredAction()).routedArchitectReviewBinding;
          return { before, after, text: document.body.innerText };
        })()`,
        true,
      );
      assert.deepEqual(referenceRetargetAttempt.after, referenceRetargetAttempt.before, "Manual Reference card changes must not retarget the routed Architect Review binding.");
      assert.ok(referenceRetargetAttempt.text.includes(routedUiState.binding.implementerReportFileName), "Routed binding filename must remain visible after Reference card changes.");

      const uiSaveResult = await window.webContents.executeJavaScript(
        `(async () => {
          const setValue = (element, value) => {
            const prototype = Object.getPrototypeOf(element);
            const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
            descriptor?.set?.call(element, value);
            element.dispatchEvent(new Event("input", { bubbles: true }));
            element.dispatchEvent(new Event("change", { bubbles: true }));
          };
          const decision = [...document.querySelectorAll("select")].find((select) =>
            [...select.options].some((option) => option.value === "Ready for Operator validation")
          );
          setValue(decision, "Ready for Operator validation");
          const values = [
            "Parent WC01 is ready for Operator Validation.",
            "Superseded authority remains removed.",
            "All parent WC01 requirements were revalidated.",
            "WC01-REPAIR01 corrected the identified defects.",
            "Another repair is prohibited.",
            "No observation status changed.",
            "Confirm the routed Operator Validation workspace.",
            "Residual risks remain Operator-owned; no additional repair is permitted."
          ];
          [...document.querySelectorAll("textarea")].slice(0, values.length).forEach((textarea, index) => {
            setValue(textarea, values[index]);
          });
          await new Promise((resolve) => setTimeout(resolve, 1000));
          const previewText = document.body.innerText;
          const button = [...document.querySelectorAll("button")].find((candidate) =>
            candidate.textContent.includes("Save Architect Review") && !candidate.disabled
          );
          button?.click();
          return {
            hadPreview: previewText.includes("## Architect Review Decision"),
            buttonFound: Boolean(button),
            buttonDisabled: button?.disabled ?? null,
            text: previewText,
          };
        })()`,
        true,
      );
      assert.equal(uiSaveResult.hadPreview, true, "The real UI form state must generate the Architect Review preview.");
      assert.equal(uiSaveResult.buttonFound, true, "The real UI Save Architect Review button must become enabled.");
      await waitFor(
        window,
        `window.champCity.getCurrentRequiredAction().then((result) => result.currentAction?.id === "operator_validation_required")`,
        "post-save Operator Validation refresh",
        20000,
      );
      const advanced = await window.webContents.executeJavaScript(
        `window.champCity.getCurrentRequiredAction()`,
        true,
      );
      assert.equal(advanced.currentAction.id, "operator_validation_required");
      assert.equal(advanced.currentAction.workCardId, workCardId);
      assert.equal(advanced.currentAction.routedAction.expectedOutput.artifactId, `${projectId}/${phaseId}/validation_report/${workCardId}`);

      await window.webContents.executeJavaScript(
        `([...document.querySelectorAll("button")].find((button) => button.textContent.includes("Continue current action: Validate"))?.click(), true)`,
        true,
      );
      await waitFor(
        window,
        `document.body.innerText.includes("Routed workspace: Human Validation") && window.champCity.getCurrentRequiredAction().then((result) => result.currentAction?.routedAction?.expectedOutput?.artifactId === "${projectId}/${phaseId}/validation_report/${workCardId}")`,
        "repaired-parent Operator Validation UI",
      );
      writeArtifact({
        artifactId: `${projectId}/${phaseId}/validation_report/${workCardId}`,
        artifactType: "validation_report",
        phaseId,
        workCardId,
        stem: `planning/phases/${phaseId}/Validation_Reports/VALIDATION_REPORT_${workCardId}_mounted_parent`,
        sources: [`${projectId}/${phaseId}/architect_review/${workCardId}`],
        data: { workCardId, result: "Pass" },
        title: "Validation Report: WC01 Parent Pass",
      });
      await window.webContents.executeJavaScript(
        `([...document.querySelectorAll("button")].find((button) => button.textContent.includes("Refresh project state"))?.click(), true)`,
        true,
      );
      await waitFor(
        window,
        `window.champCity.getCurrentRequiredAction().then((result) => result.currentAction?.id === "architect_disposition_required" && result.currentAction?.routedAction?.screenId === "architect-bridge" && result.currentAction?.routedAction?.expectedOutput?.artifactId === "${projectId}/${phaseId}/candidate_disposition/${workCardId}")`,
        "Architect Bridge disposition gate after validation pass",
      );
      const packetResult = await window.webContents.executeJavaScript(
        `window.champCity.ensureArchitectTaskPacket()`,
        true,
      );
      assert.equal(packetResult.ok, true, JSON.stringify(packetResult.errorMessages));
      assert.equal(
        packetResult.packet.payload.data.expectedOutput.artifactId,
        `${projectId}/${phaseId}/candidate_disposition/${workCardId}`,
      );
      writeArtifact({
        artifactId: `${projectId}/${phaseId}/candidate_disposition/${workCardId}`,
        artifactType: "candidate_disposition",
        phaseId,
        workCardId,
        parentArtifactId: `${projectId}/${phaseId}/work_card/${workCardId}`,
        stem: `planning/phases/${phaseId}/Candidate_Dispositions/CANDIDATE_DISPOSITION_${workCardId}`,
        sources: [
          `${projectId}/${phaseId}/work_card/${workCardId}`,
          `${projectId}/${phaseId}/implementer_report/${workCardId}`,
          `${projectId}/${phaseId}/architect_review/${workCardId}`,
          `${projectId}/${phaseId}/work_card/${repairId}`,
          `${projectId}/${phaseId}/implementer_report/${repairId}`,
          `${projectId}/${phaseId}/validation_report/${workCardId}`,
        ],
        data: {
          workCardId,
          status: "completed_via_repair",
          rationale: "Mounted fixture confirms the complete repaired-parent outcome.",
          resolutionPath: "completed_via_repair",
          parentWorkCardArtifactId: `${projectId}/${phaseId}/work_card/${workCardId}`,
        },
        title: `Candidate Disposition: ${workCardId} completed_via_repair`,
      });
      await window.webContents.executeJavaScript(
        `([...document.querySelectorAll("button")].find((button) => button.textContent.includes("Refresh project state"))?.click(), true)`,
        true,
      );
      await waitFor(window, `window.champCity.getCurrentRequiredAction().then((result) => result.currentAction?.id === "implementer_execution_required" && result.currentAction?.workCardId === "WC02")`, "next candidate after durable completed_via_repair disposition");

      await window.webContents.executeJavaScript(`window.champCity.selectProject("${otherProjectId}")`, true);
      await waitFor(window, `window.champCity.getCurrentRequiredAction().then((result) => result.currentAction?.routedAction?.bindingSource?.projectId === "${otherProjectId}")`, "switch to isolated project");
      await window.webContents.executeJavaScript(`window.champCity.selectProject("${projectId}")`, true);
      await waitFor(window, `window.champCity.getCurrentRequiredAction().then((result) => result.currentAction?.id === "implementer_execution_required" && result.currentAction?.workCardId === "WC02")`, "switch back reconstructs next candidate after disposition");
    } else {
      assert.equal(initial.currentAction.id, "implementer_execution_required");
      assert.equal(initial.currentAction.workCardId, "WC02");
      assert.equal(initial.currentAction.routedAction.targetArtifactId, `${projectId}/${phaseId}/work_card/WC02`);
    }

    console.log(JSON.stringify({
      mountedEvidenceWorkflow: "passed",
      mode: restart ? "restart" : "initial-save",
      actionId: "implementer_execution_required",
      projectId,
    }));
    await require("../dist/main/canonicalRuntime.js").shutdownCanonicalRuntime();
    for (const candidate of BrowserWindow.getAllWindows()) candidate.destroy();
    if (cleanup) {
      fs.rmSync(fixtureRoot, { recursive: true, force: true });
      fs.rmSync(fixtureRootOther, { recursive: true, force: true });
      fs.rmSync(workspacePath, { force: true });
    }
    app.exit(0);
  } catch (error) {
    console.error(error);
    try {
      await require("../dist/main/canonicalRuntime.js").shutdownCanonicalRuntime();
    } catch {}
    app.exit(1);
  }
});

function prepareFixture() {
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
  fs.rmSync(fixtureRootOther, { recursive: true, force: true });
  seededArtifacts.length = 0;
  fs.mkdirSync(path.join(fixtureRoot, "planning"), { recursive: true });
  fs.writeFileSync(
    path.join(fixtureRoot, "package.json"),
    JSON.stringify({ name: projectId, productName: "Mounted Evidence Project" }),
    "utf8",
  );
  writeArtifact({
    artifactId: `${projectId}/${phaseId}/phase_activation/${phaseId}`,
    artifactType: "phase_activation",
    phaseId,
    stem: `planning/phases/${phaseId}/Phase_Activation`,
    data: { status: "active", phaseId },
  });
  writeArtifact({
    artifactId: `${projectId}/${phaseId}/work_card_plan/Work_Card_Plan`,
    artifactType: "work_card_plan",
    phaseId,
    stem: `planning/phases/${phaseId}/Work_Card_Plan`,
    data: {
      status: "approved",
      candidates: [
        { id: workCardId, title: "Mounted authority cutover", order: 1 },
        { id: "WC02", title: "Mounted next candidate", order: 2 },
      ],
    },
  });
  writeArtifact({
    artifactId: `${projectId}/${phaseId}/approval/Operator_Phase_Approval`,
    artifactType: "phase_approval",
    phaseId,
    stem: `planning/phases/${phaseId}/Operator_Phase_Approval`,
    data: { decision: "approved" },
  });
  writeArtifact({
    artifactId: `${projectId}/${phaseId}/work_card/${workCardId}`,
    artifactType: "work_card",
    phaseId,
    workCardId,
    stem: `planning/phases/${phaseId}/Work_Cards/WC01_mounted_authority_cutover`,
    expectedOutputs: [`${projectId}/${phaseId}/implementer_report/${workCardId}`],
    data: { workCardId, status: "ready_for_implementer", maxRepairCount: 1 },
    title: "Work Card: WC01 Mounted Authority Cutover",
  });
  writeArtifact({
    artifactId: `${projectId}/${phaseId}/implementer_report/${workCardId}`,
    artifactType: "implementer_report",
    phaseId,
    workCardId,
    stem: `planning/phases/${phaseId}/Implementer_Reports/IMPLEMENTER_REPORT_WC01_mounted_authority_cutover`,
    sources: [`${projectId}/${phaseId}/work_card/${workCardId}`],
    expectedOutputs: [`${projectId}/${phaseId}/architect_review/${workCardId}`],
    data: { workCardId, status: "implemented_awaiting_architect_review" },
    title: "Implementer Report: WC01 Mounted Authority Cutover",
  });
  writeArtifact({
    artifactId: `${projectId}/${phaseId}/architect_review/${workCardId}`,
    artifactType: "architect_review",
    phaseId,
    workCardId,
    stem: `planning/phases/${phaseId}/Architect_Reviews/ARCHITECT_REVIEW_WC01_mounted_authority_cutover`,
    sources: [
      `${projectId}/${phaseId}/work_card/${workCardId}`,
      `${projectId}/${phaseId}/implementer_report/${workCardId}`,
    ],
    expectedOutputs: [`${projectId}/${phaseId}/work_card/${repairId}`],
    data: {
      workCardId,
      decision: "Repair required before Operator validation",
      operatorValidationAuthorized: false,
      requiredRepairId: repairId,
    },
    title: "Architect Review: WC01 Repair Required",
  });
  writeArtifact({
    artifactId: `${projectId}/${phaseId}/work_card/${repairId}`,
    artifactType: "work_card",
    phaseId,
    workCardId: repairId,
    parentArtifactId: `${projectId}/${phaseId}/work_card/${workCardId}`,
    stem: `planning/phases/${phaseId}/Work_Cards/${repairId}_mounted_repair`,
    sources: [
      `${projectId}/${phaseId}/work_card/${workCardId}`,
      `${projectId}/${phaseId}/architect_review/${workCardId}`,
    ],
    expectedOutputs: [`${projectId}/${phaseId}/implementer_report/${repairId}`],
    data: {
      workCardId: repairId,
      parentWorkCardArtifactId: `${projectId}/${phaseId}/work_card/${workCardId}`,
      authorizingArchitectReviewArtifactId: `${projectId}/${phaseId}/architect_review/${workCardId}`,
      authorizingArchitectReviewRevision: 1,
      finalNumberedRepair: true,
      maximumRepairCount: 1,
      logicalRepairReportArtifactId: `${projectId}/${phaseId}/implementer_report/${repairId}`,
      controllingRepairReportArtifactId: `${projectId}/${phaseId}/implementer_report/${repairId}`,
      finalParentAcceptanceTargetArtifactId: `${projectId}/${phaseId}/work_card/${workCardId}`,
    },
    title: `Repair Work Card: ${repairId} Mounted Repair`,
  });
  writeArtifact({
    artifactId: `${projectId}/${phaseId}/work_card/WC02`,
    artifactType: "work_card",
    phaseId,
    workCardId: "WC02",
    stem: `planning/phases/${phaseId}/Work_Cards/WC02_mounted_next_candidate`,
    expectedOutputs: [`${projectId}/${phaseId}/implementer_report/WC02`],
    data: { workCardId: "WC02", status: "ready_for_implementer" },
    title: "Work Card: WC02 Mounted Next Candidate",
  });
  writeRegistry();
  fs.mkdirSync(path.join(fixtureRootOther, "planning"), { recursive: true });
  fs.writeFileSync(
    path.join(fixtureRootOther, "package.json"),
    JSON.stringify({ name: otherProjectId, productName: "Mounted Other Project" }),
    "utf8",
  );
  fs.mkdirSync(userDataRoot, { recursive: true });
  const configured = {
    projectId,
    displayName: "Mounted Evidence Project",
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
  };
  const otherConfigured = {
    ...configured,
    projectId: otherProjectId,
    displayName: "Mounted Other Project",
    repositoryRoot: fixtureRootOther,
    planningRoot: path.join(fixtureRootOther, "planning"),
  };
  fs.writeFileSync(
    workspacePath,
    `${JSON.stringify({ schemaVersion: "champcity.project-workspaces.v1", selectedProjectId: projectId, projects: [configured, otherConfigured] }, null, 2)}\n`,
    "utf8",
  );
}

function writeArtifact(input) {
  const artifact = buildCanonicalArtifact({
    artifactId: input.artifactId,
    artifactType: input.artifactType,
    revision: 1,
    status: "active",
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
      contentMarkdown: `# ${input.title ?? input.artifactType}\n\nMounted production-path evidence.\n`,
      data: input.data ?? {},
    },
  });
  const jsonPath = path.join(fixtureRoot, ...artifact.jsonPath.split("/"));
  const markdownPath = path.join(fixtureRoot, ...artifact.markdownPath.split("/"));
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, canonicalPrettyStringify(artifact), "utf8");
  fs.writeFileSync(markdownPath, renderArtifactMarkdown(artifact), "utf8");
  seededArtifacts.push(artifact);
}

function writeRegistry() {
  const registry = buildArtifactRegistry({
    updatedAt: fixedTime,
    entries: seededArtifacts.map((artifact) => buildArtifactRegistryEntry(artifact)),
  });
  const stem = "planning/system/Artifact_Registry/ARTIFACT_REGISTRY";
  const registryArtifact = buildCanonicalArtifact({
    artifactId: `${projectId}/system/artifact_registry`,
    artifactType: "artifact_registry",
    revision: 1,
    status: "active",
    projectId,
    createdAt: fixedTime,
    updatedAt: fixedTime,
    jsonPath: `${stem}.json`,
    markdownPath: `${stem}.md`,
    relationships: { sources: [], expectedOutputs: [], supersedes: [], children: [] },
    payload: {
      kind: "artifact_registry",
      title: "Canonical Artifact Registry",
      contentMarkdown: `# Canonical Artifact Registry\n\nMounted test registry with ${registry.entries.length} entries.\n`,
      data: registry,
    },
  });
  const jsonPath = path.join(fixtureRoot, ...registryArtifact.jsonPath.split("/"));
  const markdownPath = path.join(fixtureRoot, ...registryArtifact.markdownPath.split("/"));
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, canonicalPrettyStringify(registryArtifact), "utf8");
  fs.writeFileSync(markdownPath, renderArtifactMarkdown(registryArtifact), "utf8");
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

async function waitFor(window, expression, description, timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await window.webContents.executeJavaScript(expression, true)) return;
    await new Promise((resolve) => setTimeout(resolve, 75));
  }
  const bodyText = await window.webContents.executeJavaScript(
    `document.body?.innerText ?? ""`,
    true,
  ).catch(() => "<renderer unavailable>");
  throw new Error(`Timed out waiting for ${description}. Renderer text: ${bodyText.slice(0, 1200)}`);
}
