import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import {
  access,
  copyFile,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import {
  canonicalEnvelopeProjection,
  createCanonicalArtifact,
  isCanonicalArtifact,
  normalizeMarkdown,
  normalizeRepoPath,
  parseCanonicalMarkdown,
  renderCanonicalPair,
  resolveInsideRoot,
  sha256Tagged,
  sortKeysDeep,
  stableJsonFile,
  stableStringify,
  verifyCanonicalPair,
} from "./canonical-artifact.mjs";

const migrationTimestamp = "2026-07-14T00:00:00.000Z";
const migrationBaselineRef =
  "feature/phase-03-wc08-repair06-current-action-architect-review-binding";
const execFileAsync = promisify(execFile);
const manifestStem =
  "planning/phases/phase-03/Migration_Manifests/MIGRATION_MANIFEST_WC09_cross_process_workflow_authority";
const registryStem =
  "planning/system/Artifact_Registry/ARTIFACT_REGISTRY";
const workflowStem =
  "planning/system/Workflow_State/WORKFLOW_STATE_INDEX";

const activeRoots = ["planning/project", "planning/phases/phase-03"];
const excludedDirectories = new Set([
  "Figma_Source",
  "Migration_Manifests",
  "Validation_Evidence",
]);

const knownDuplicateRules = [
  {
    id: "project-architect-interview-duplicate",
    sources: [
      "planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_champcity_a_i.md",
      "planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_champcity_a_i.json",
      "planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_champcity_a_i_2.md",
      "planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_champcity_a_i_2.json",
    ],
    authorityStem:
      "planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_champcity_a_i_2",
    targetStem:
      "planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_champcity_a_i",
    revision: 2,
    decision:
      "Content-equivalent duplicate consolidated by curated WC09 decision; earliest creation and latest update are retained.",
  },
  {
    id: "wc04-repair01-validation-revision",
    sources: [
      "planning/phases/phase-03/Validation_Reports/VALIDATION_REPORT_WC04-REPAIR01_validation_flow_and_current_action_panel_usability.md",
      "planning/phases/phase-03/Validation_Reports/VALIDATION_REPORT_WC04-REPAIR01_validation_flow_and_current_action_panel_usability.json",
      "planning/phases/phase-03/Validation_Reports/VALIDATION_REPORT_WC04-REPAIR01_validation_flow_and_current_action_panel_usability_2.md",
      "planning/phases/phase-03/Validation_Reports/VALIDATION_REPORT_WC04-REPAIR01_validation_flow_and_current_action_panel_usability_2.json",
    ],
    authorityStem:
      "planning/phases/phase-03/Validation_Reports/VALIDATION_REPORT_WC04-REPAIR01_validation_flow_and_current_action_panel_usability_2",
    targetStem:
      "planning/phases/phase-03/Validation_Reports/VALIDATION_REPORT_WC04-REPAIR01_validation_flow_and_current_action_panel_usability",
    revision: 2,
    decision:
      "Curated evidence declares the passing second revision controlling; the partial first revision remains archived trigger evidence.",
  },
  {
    id: "wc08-repair02-validation-conflict",
    sources: [
      "planning/phases/phase-03/Validation_Reports/VALIDATION_REPORT_WC08-REPAIR02_report_review_protocol_and_validation_disposition_governance.md",
      "planning/phases/phase-03/Validation_Reports/VALIDATION_REPORT_WC08-REPAIR02_report_review_protocol_and_validation_disposition_governance.json",
      "planning/phases/phase-03/Validation_Reports/VALIDATION_REPORT_WC08-REPAIR02_report_review_protocol_and_validation_disposition_governance_2.md",
      "planning/phases/phase-03/Validation_Reports/VALIDATION_REPORT_WC08-REPAIR02_report_review_protocol_and_validation_disposition_governance_2.json",
    ],
    archiveOnly: true,
    decision:
      "Conflicting records remain historical evidence; neither is selected. The later WC08-REPAIR04 through WC09 chain supersedes their routing role.",
  },
  {
    id: "wc08-repair06-implementer-report-revision",
    sources: [
      "planning/phases/phase-03/Builder_Reports/BUILDER_REPORT_WC08-REPAIR06_current_action_architect_review_binding_authority.md",
      "planning/phases/phase-03/Builder_Reports/BUILDER_REPORT_WC08-REPAIR06_revised_routed_review_binding_contract.md",
    ],
    authorityStem:
      "planning/phases/phase-03/Builder_Reports/BUILDER_REPORT_WC08-REPAIR06_revised_routed_review_binding_contract",
    targetStem:
      "planning/phases/phase-03/Implementer_Reports/IMPLEMENTER_REPORT_WC08-REPAIR06_current_action_architect_review_binding_authority",
    revision: 2,
    decision:
      "The WC08-REPAIR06 Architect Review explicitly names the revised report as controlling and the initial report as historical.",
  },
];

const knownGovernanceArchiveRules = [
  {
    id: "governance-history",
    sourcePath:
      "planning/phases/phase-03/Builder_Reports/BUILDER_REPORT_GIT_commit_hash_reporting_rule.md",
    decision: "Repository governance history is archived outside workflow discovery.",
  },
  {
    id: "governance-history",
    sourcePath:
      "planning/phases/phase-03/Builder_Reports/BUILDER_REPORT_GIT_dev_branch_and_repo_hygiene_policy.md",
    decision: "Repository governance history is archived outside workflow discovery.",
  },
];

export async function inventoryMigration(repositoryRoot) {
  const root = path.resolve(repositoryRoot);
  const files = await collectActiveFiles(root);
  const inventoryFiles = await collectInventoryFiles(root);
  const textFiles = files.filter((file) => [".md", ".json"].includes(path.extname(file)));
  const attachments = inventoryFiles.filter(
    (file) => ![".md", ".json"].includes(path.extname(file)),
  );
  const groups = groupByStem(textFiles);
  const paired = [...groups.values()].filter(
    (group) => group.markdownPath && group.jsonPath,
  ).length;
  const markdownOnly = [...groups.values()].filter(
    (group) => group.markdownPath && !group.jsonPath,
  ).length;
  const jsonOnly = [...groups.values()].filter(
    (group) => !group.markdownPath && group.jsonPath,
  ).length;
  let canonicalPairs = 0;
  let synchronizationFailures = 0;
  let terminologyConversionsRequired = 0;

  for (const file of textFiles) {
    const source = await readFile(resolveInsideRoot(root, file), "utf8");
    if (replaceLegacyText(source) !== source) {
      terminologyConversionsRequired += 1;
    }
  }

  for (const group of groups.values()) {
    if (!group.markdownPath || !group.jsonPath) {
      continue;
    }
    try {
      const artifact = JSON.parse(
        await readFile(resolveInsideRoot(root, group.jsonPath), "utf8"),
      );
      const markdown = await readFile(
        resolveInsideRoot(root, group.markdownPath),
        "utf8",
      );
      if (isCanonicalArtifact(artifact)) {
        verifyCanonicalPair({ artifact, markdown });
        canonicalPairs += 1;
      }
    } catch {
      synchronizationFailures += 1;
    }
  }

  return {
    activeRoots,
    totalTextFiles: textFiles.length,
    paired,
    markdownOnly,
    jsonOnly,
    attachments: attachments.length,
    canonicalPairs,
    synchronizationFailures,
    terminologyConversionsRequired,
    legacyReportPaths: textFiles.filter((file) =>
      /(?:Builder_Reports|BUILDER_REPORT_)/.test(file),
    ).length,
    numberedRevisionPairs: [...groups.keys()].filter((stem) => /_\d+$/.test(stem)).length,
  };
}

export async function buildMigrationPlan(repositoryRoot) {
  const root = path.resolve(repositoryRoot);
  const inventory = await inventoryMigration(root);
  const files = (await collectActiveFiles(root)).filter((file) =>
    [".md", ".json"].includes(path.extname(file)),
  );
  const existingManifest = await readCanonicalPairIfPresent(root, manifestStem);
  const existingRegistry = await readCanonicalPairIfPresent(root, registryStem);
  const existingWorkflow = await readCanonicalPairIfPresent(root, workflowStem);
  const suppressed = new Set();
  const archiveOperations = [];
  const manifestEntries = [];
  const specialGroups = [];

  for (const rule of knownDuplicateRules) {
    if (!rule.archiveOnly && (await hasHealthyCanonicalTarget(root, rule))) {
      continue;
    }

    const presentSources = [];
    for (const sourcePath of rule.sources) {
      if (await exists(resolveInsideRoot(root, sourcePath))) {
        presentSources.push(sourcePath);
        suppressed.add(sourcePath);
      }
    }

    const authoritySource = rule.archiveOnly
      ? undefined
      : await resolveCuratedAuthoritySource(root, rule);

    if (presentSources.length === 0 && !authoritySource) {
      continue;
    }

    for (const sourcePath of presentSources) {
      archiveOperations.push({
        sourcePath,
        archivePath: archivePathFor(sourcePath),
        reason: rule.decision,
      });
    }

    if (!rule.archiveOnly) {
      if (!authoritySource) {
        throw new Error(
          `Curated authority ${rule.id} cannot be recovered from its active or archived authority pair.`,
        );
      }
      const recoverableTarget = await readCanonicalPairIfPresent(root, rule.targetStem);
      specialGroups.push({
        stem: normalizeRepoPath(rule.targetStem),
        markdownPath: authoritySource.markdownPath,
        jsonPath: authoritySource.jsonPath,
        sourcePaths: presentSources,
        revision: recoverableTarget
          ? Math.max(rule.revision, recoverableTarget.revision + 1)
          : rule.revision,
        authorityDecision: authoritySource.archived
          ? `${rule.decision} The controlling pair was recovered from its immutable WC09 archive after the active authority source had moved.`
          : rule.decision,
      });
    } else {
      manifestEntries.push(
        ...(await Promise.all(
          presentSources.map((sourcePath) =>
            buildArchiveManifestEntry(root, sourcePath, rule),
          ),
        )),
      );
    }
  }

  for (const sourcePath of files) {
    if (
      /planning\/phases\/phase-03\/Builder_Reports\/BUILDER_REPORT_GIT_/i.test(
        sourcePath,
      )
    ) {
      suppressed.add(sourcePath);
      archiveOperations.push({
        sourcePath,
        archivePath: archivePathFor(sourcePath),
        reason: "Repository governance history is archived outside workflow discovery.",
      });
      manifestEntries.push(
        await buildArchiveManifestEntry(root, sourcePath, {
          id: "governance-history",
          decision:
            "Repository governance history is archived outside workflow discovery.",
        }),
      );
    }
  }

  const normalGroups = groupByStem(files.filter((file) => !suppressed.has(file)));
  const sourceGroups = [...normalGroups.values(), ...specialGroups];
  const drafts = [];

  for (const group of sourceGroups.sort((left, right) => left.stem.localeCompare(right.stem))) {
    const draft = await buildArtifactDraft(root, group);
    if (draft) {
      drafts.push(draft);
    }
  }

  const draftByPath = new Map();
  for (const draft of drafts) {
    draftByPath.set(draft.artifact.markdownPath, draft);
    draftByPath.set(draft.artifact.jsonPath, draft);
  }
  enrichRelationships(drafts, draftByPath);

  const pairWrites = [];
  for (const draft of drafts) {
    const pair = renderCanonicalPair(draft.artifact);
    const unchanged = await canonicalPairMatches(root, draft.artifact, pair);
    if (!unchanged) {
      pairWrites.push({ artifact: draft.artifact, pair });
    }
    manifestEntries.push(
      await buildMigrationManifestEntry(root, draft, unchanged),
    );
  }

  const baselineProvenance = await collectGitBaselineProvenance(root);
  const provenanceRecoveredEntries = manifestEntries.map((entry) =>
    applyBaselineProvenance(entry, baselineProvenance),
  );
  const durableArchiveOperations = await collectDurableArchiveOperations(
    root,
    archiveOperations,
    existingManifest?.payload?.data?.archiveOperations,
  );
  const durableArchiveEntries = durableArchiveOperations.map(
    buildDurableArchiveManifestEntry,
  );
  const durableManifestEntries = mergeDurableManifestEntries(
    [...provenanceRecoveredEntries, ...durableArchiveEntries],
    existingManifest?.payload?.data?.entries,
  );

  const manifestData = {
    migrationId: "WC09_cross_process_workflow_authority",
    generatedAt: migrationTimestamp,
    scope: activeRoots,
    inventory,
    rollbackGuidance: [
      "Before apply, commit or preserve the pre-migration Git state.",
      "Use the manifest originalPath and archivePath mapping to inspect every move.",
      "If apply reports rollback failure, stop runtime use and restore the feature branch from Git before retrying.",
      "Do not choose authority from suffixes, timestamps, directory order, or first match during rollback.",
    ],
    archiveOperations: durableArchiveOperations,
    entries: durableManifestEntries.sort((left, right) =>
      `${left.originalPath}:${left.canonicalArtifactId}`.localeCompare(
        `${right.originalPath}:${right.canonicalArtifactId}`,
      ),
    ),
    unresolvedBlockers: [],
  };
  const manifestArtifact = buildSystemArtifact({
    artifactId: "champcity-ai/phase-03/migration_manifest/WC09",
    artifactType: "migration_manifest",
    stem: manifestStem,
    title: "WC09 Canonical Artifact Migration Manifest",
    contentMarkdown: renderMigrationManifestMarkdown(manifestData),
    data: manifestData,
    status: "active",
    phaseId: "phase-03",
    relationships: {
      sources: drafts.map((draft) => draft.artifact.artifactId),
      expectedOutputs: [],
      supersedes: [],
      children: [],
    },
    existing: existingManifest,
  });

  const workflowArtifact = buildSystemArtifact({
    artifactId: "champcity-ai/system/workflow_state",
    artifactType: "workflow_state",
    stem: workflowStem,
    title: "Canonical Workflow State Index",
    contentMarkdown: renderWorkflowStateMarkdown(),
    data: buildInitialWorkflowState(),
    status: "active",
    phaseId: "phase-03",
    relationships: {
      sources: [
        "champcity-ai/phase-03/work_card/WC08-REPAIR04",
        "champcity-ai/phase-03/implementer_report/WC08-REPAIR04",
      ],
      expectedOutputs: [
        "champcity-ai/phase-03/architect_review/WC08-REPAIR04",
      ],
      supersedes: [],
      children: [],
    },
    existing: existingWorkflow,
  });

  const registryEntries = [
    ...drafts.map((draft) => registryEntry(draft.artifact)),
    registryEntry(manifestArtifact),
    registryEntry(workflowArtifact),
  ].sort((left, right) => left.artifactId.localeCompare(right.artifactId));
  assertSingleAuthority(registryEntries);
  const registryArtifact = buildSystemArtifact({
    artifactId: "champcity-ai/system/artifact_registry",
    artifactType: "artifact_registry",
    stem: registryStem,
    title: "Canonical Artifact Registry",
    contentMarkdown: renderRegistryMarkdown(registryEntries),
    data: {
      registryVersion: 1,
      updatedAt: migrationTimestamp,
      entries: registryEntries,
    },
    status: "active",
    relationships: {
      sources: registryEntries.map((entry) => entry.artifactId),
      expectedOutputs: [],
      supersedes: [],
      children: [],
    },
    existing: existingRegistry,
  });

  for (const artifact of [manifestArtifact, workflowArtifact, registryArtifact]) {
    const pair = renderCanonicalPair(artifact);
    if (!(await canonicalPairMatches(root, artifact, pair))) {
      pairWrites.push({ artifact, pair });
    }
  }

  const removals = [];
  for (const draft of drafts) {
    for (const sourcePath of draft.sourcePaths) {
      if (
        sourcePath !== draft.artifact.markdownPath &&
        sourcePath !== draft.artifact.jsonPath &&
        !archiveOperations.some((operation) => operation.sourcePath === sourcePath)
      ) {
        removals.push(sourcePath);
      }
    }
  }

  return {
    root,
    inventory,
    drafts,
    pairWrites,
    archiveOperations: dedupeOperations(archiveOperations),
    removals: [...new Set(removals)].sort(),
    manifest: manifestArtifact,
    workflow: workflowArtifact,
    registry: registryArtifact,
    summary: {
      artifacts: drafts.length,
      pairsToWrite: pairWrites.length,
      archives: dedupeOperations(archiveOperations).length,
      removals: [...new Set(removals)].length,
      blockers: manifestData.unresolvedBlockers.length,
    },
  };
}

export async function applyMigrationPlan(plan) {
  if (plan.summary.blockers > 0) {
    throw new Error("Migration apply is blocked by unresolved authority decisions.");
  }

  if (
    plan.pairWrites.length === 0 &&
    plan.archiveOperations.length === 0 &&
    plan.removals.length === 0
  ) {
    return { ok: true, noOp: true, ...plan.summary };
  }

  const transactionRoot = resolveInsideRoot(
    plan.root,
    `tmp/wc09-migration-${process.pid}`,
  );
  const backupRoot = path.join(transactionRoot, "backup");
  const stageRoot = path.join(transactionRoot, "stage");
  const impacted = new Set([
    ...plan.pairWrites.flatMap(({ artifact }) => [
      artifact.markdownPath,
      artifact.jsonPath,
    ]),
    ...plan.archiveOperations.flatMap(({ sourcePath, archivePath }) => [
      sourcePath,
      archivePath,
    ]),
    ...plan.removals,
  ]);
  const originallyPresent = new Set();

  await rm(transactionRoot, { recursive: true, force: true });
  await mkdir(backupRoot, { recursive: true });
  await mkdir(stageRoot, { recursive: true });

  try {
    for (const repoPath of [...impacted].sort()) {
      const absolute = resolveInsideRoot(plan.root, repoPath);
      if (await exists(absolute)) {
        originallyPresent.add(repoPath);
        const backup = path.join(backupRoot, repoPath);
        await mkdir(path.dirname(backup), { recursive: true });
        await copyFile(absolute, backup);
      }
    }

    for (const write of plan.pairWrites) {
      const stagedJson = path.join(stageRoot, write.artifact.jsonPath);
      const stagedMarkdown = path.join(stageRoot, write.artifact.markdownPath);
      await mkdir(path.dirname(stagedJson), { recursive: true });
      await mkdir(path.dirname(stagedMarkdown), { recursive: true });
      await writeFile(stagedJson, write.pair.json, "utf8");
      await writeFile(stagedMarkdown, write.pair.markdown, "utf8");
      const stagedArtifact = JSON.parse(await readFile(stagedJson, "utf8"));
      verifyCanonicalPair({
        artifact: stagedArtifact,
        markdown: await readFile(stagedMarkdown, "utf8"),
        expectedJsonPath: write.artifact.jsonPath,
        expectedMarkdownPath: write.artifact.markdownPath,
      });
    }

    for (const operation of plan.archiveOperations) {
      const source = resolveInsideRoot(plan.root, operation.sourcePath);
      if (!(await exists(source))) {
        continue;
      }
      const archive = resolveInsideRoot(plan.root, operation.archivePath);
      if (await exists(archive)) {
        continue;
      }
      await mkdir(path.dirname(archive), { recursive: true });
      await copyFile(source, archive);
    }

    for (const write of plan.pairWrites) {
      const targetJson = resolveInsideRoot(plan.root, write.artifact.jsonPath);
      const targetMarkdown = resolveInsideRoot(plan.root, write.artifact.markdownPath);
      await mkdir(path.dirname(targetJson), { recursive: true });
      await mkdir(path.dirname(targetMarkdown), { recursive: true });
      await copyFile(path.join(stageRoot, write.artifact.jsonPath), targetJson);
      await copyFile(path.join(stageRoot, write.artifact.markdownPath), targetMarkdown);
    }

    const protectedTargets = new Set(
      plan.pairWrites.flatMap(({ artifact }) => [artifact.jsonPath, artifact.markdownPath]),
    );
    for (const repoPath of [
      ...plan.archiveOperations.map((operation) => operation.sourcePath),
      ...plan.removals,
    ]) {
      if (!protectedTargets.has(repoPath)) {
        await rm(resolveInsideRoot(plan.root, repoPath), { force: true });
      }
    }

    for (const write of plan.pairWrites) {
      const artifact = JSON.parse(
        await readFile(resolveInsideRoot(plan.root, write.artifact.jsonPath), "utf8"),
      );
      verifyCanonicalPair({
        artifact,
        markdown: await readFile(
          resolveInsideRoot(plan.root, write.artifact.markdownPath),
          "utf8",
        ),
      });
    }

    await rm(transactionRoot, { recursive: true, force: true });
    return { ok: true, noOp: false, ...plan.summary };
  } catch (error) {
    const rollbackErrors = [];
    for (const repoPath of [...impacted].sort()) {
      try {
        const target = resolveInsideRoot(plan.root, repoPath);
        if (originallyPresent.has(repoPath)) {
          await mkdir(path.dirname(target), { recursive: true });
          await copyFile(path.join(backupRoot, repoPath), target);
        } else {
          await rm(target, { force: true });
        }
      } catch (rollbackError) {
        rollbackErrors.push(`${repoPath}: ${plainError(rollbackError)}`);
      }
    }
    await rm(transactionRoot, { recursive: true, force: true });
    throw new Error(
      `Migration apply failed and rollback ${rollbackErrors.length === 0 ? "completed" : `reported ${rollbackErrors.join("; ")}`}: ${plainError(error)}`,
    );
  }
}

export async function verifyMigratedRepository(repositoryRoot, { idempotence = false } = {}) {
  const root = path.resolve(repositoryRoot);
  const registry = await readCanonicalPairIfPresent(root, registryStem);
  const workflow = await readCanonicalPairIfPresent(root, workflowStem);
  const manifest = await readCanonicalPairIfPresent(root, manifestStem);
  const errors = [];

  for (const [label, artifact] of [
    ["registry", registry],
    ["workflow", workflow],
    ["manifest", manifest],
  ]) {
    if (!artifact) {
      errors.push(`Canonical ${label} pair is missing.`);
    }
  }
  if (stableStringify(workflow?.payload?.data, 0).includes("/workflow/expected/")) {
    errors.push("Canonical workflow state contains unresolved placeholder artifact identities.");
  }
  if (manifest) {
    errors.push(...(await validateManifestDurability(root, manifest)));
  }

  const registryEntries = registry?.payload?.data?.entries ?? [];
  const registeredArtifacts = [];
  try {
    assertSingleAuthority(registryEntries);
  } catch (error) {
    errors.push(plainError(error));
  }
  for (const entry of registryEntries) {
    try {
      const artifact = JSON.parse(
        await readFile(resolveInsideRoot(root, entry.jsonPath), "utf8"),
      );
      verifyCanonicalPair({
        artifact,
        markdown: await readFile(resolveInsideRoot(root, entry.markdownPath), "utf8"),
      });
      registeredArtifacts.push(artifact);
    } catch (error) {
      errors.push(`${entry.artifactId}: ${plainError(error)}`);
    }
  }
  errors.push(...validateRelationshipIntegrity(registeredArtifacts));

  const activeFiles = await collectActiveFiles(root);
  const activeLegacyPaths = activeFiles.filter((file) =>
    /(?:Builder_Reports|BUILDER_REPORT_|Builder_Prompts|BUILDER_PROMPT_)/.test(file),
  );
  if (activeLegacyPaths.length > 0) {
    errors.push(`Active legacy paths remain: ${activeLegacyPaths.join(", ")}`);
  }
  const activeNumberedRevisions = activeFiles.filter((file) =>
    /_\d+\.(?:md|json)$/i.test(file),
  );
  if (activeNumberedRevisions.length > 0) {
    errors.push(
      `Active numbered revisions remain: ${activeNumberedRevisions.join(", ")}`,
    );
  }

  let idempotenceSummary;
  if (idempotence && errors.length === 0) {
    const nextPlan = await buildMigrationPlan(root);
    idempotenceSummary = nextPlan.summary;
    if (
      nextPlan.pairWrites.length > 0 ||
      nextPlan.archiveOperations.length > 0 ||
      nextPlan.removals.length > 0
    ) {
      errors.push(
        `Migration is not idempotent: ${JSON.stringify(nextPlan.summary)}.`,
      );
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    registryEntries: registryEntries.length,
    idempotence: idempotenceSummary,
  };
}

async function validateManifestDurability(root, manifest) {
  const errors = [];
  const entries = manifest.payload?.data?.entries;
  const archiveOperations = manifest.payload?.data?.archiveOperations;
  if (!Array.isArray(entries) || entries.length === 0) {
    return ["Migration manifest contains no durable provenance entries."];
  }
  if (!Array.isArray(archiveOperations)) {
    return ["Migration manifest contains no durable archive-operation ledger."];
  }
  for (const operation of archiveOperations) {
    if (
      !operation?.sourcePath ||
      !operation?.archivePath ||
      !operation?.sourceHash ||
      !operation?.reason
    ) {
      errors.push(`Migration archive operation is incomplete: ${operation?.sourcePath ?? "<unknown>"}.`);
      continue;
    }
    try {
      const archivedBytes = await readFile(resolveInsideRoot(root, operation.archivePath));
      if (sha256Tagged(archivedBytes) !== operation.sourceHash) {
        errors.push(`Migration archive hash mismatch: ${operation.archivePath}.`);
      }
    } catch (error) {
      errors.push(`Migration archive is missing: ${operation.archivePath} (${plainError(error)}).`);
    }
    if (
      !entries.some(
        (entry) =>
          entry.originalPath === operation.sourcePath &&
          (entry.archivePath === operation.archivePath ||
            entry.archivePaths?.includes(operation.archivePath)),
      )
    ) {
      errors.push(`Migration archive provenance entry is missing: ${operation.sourcePath}.`);
    }
  }
  return errors;
}

async function buildArtifactDraft(root, group) {
  const targetStem = replaceLegacyPath(group.stem);
  const markdownPath = `${targetStem}.md`;
  const jsonPath = `${targetStem}.json`;
  let markdown = "";
  let parsedJson = {};
  let existingCanonical;

  if (group.markdownPath) {
    markdown = await readFile(resolveInsideRoot(root, group.markdownPath), "utf8");
  }
  if (group.jsonPath) {
    try {
      parsedJson = JSON.parse(
        await readFile(resolveInsideRoot(root, group.jsonPath), "utf8"),
      );
      if (isCanonicalArtifact(parsedJson)) {
        existingCanonical = parsedJson;
      }
    } catch (error) {
      throw new Error(`${group.jsonPath}: invalid JSON (${plainError(error)}).`);
    }
  }

  if (existingCanonical && group.markdownPath && group.jsonPath) {
    try {
      verifyCanonicalPair({ artifact: existingCanonical, markdown });
      const convertedPayload = convertCanonicalPayloadTerminology(
        existingCanonical.payload,
      );
      if (
        existingCanonical.markdownPath === markdownPath &&
        existingCanonical.jsonPath === jsonPath &&
        stableStringify(existingCanonical.payload, 0) ===
          stableStringify(convertedPayload, 0)
      ) {
        return {
          artifact: existingCanonical,
          sourcePaths: group.sourcePaths ?? [group.markdownPath, group.jsonPath],
          originalSchema: existingCanonical.schemaVersion,
          originalTerminology: "canonical",
          authorityDecision: group.authorityDecision ?? "Existing canonical authority retained.",
        };
      }
    } catch {
      // A changed Markdown body is treated as an explicit revision of the same artifact.
    }
  }

  let contentMarkdown = markdown;
  if (markdown.startsWith("<!-- champcity-artifact-envelope")) {
    contentMarkdown = parseCanonicalMarkdown(markdown).contentMarkdown;
  }
  contentMarkdown = replaceLegacyText(contentMarkdown);
  if (!contentMarkdown && Object.keys(parsedJson).length > 0) {
    contentMarkdown = `# ${titleFromStem(targetStem)}\n\n\`\`\`json\n${stableStringify(parsedJson)}\n\`\`\`\n`;
  }

  const metadata = inferMetadata(targetStem, parsedJson, contentMarkdown);
  const existingRevision = existingCanonical?.revision ?? 0;
  const requestedRevision = group.revision ?? (Number(parsedJson.revision) || 1);
  const revision = existingCanonical
    ? existingRevision + 1
    : Math.max(1, requestedRevision);
  const data = sanitizePayloadData(
    existingCanonical?.payload?.data ?? parsedJson,
  );
  const artifact = createCanonicalArtifact({
    artifactId: existingCanonical?.artifactId ?? metadata.artifactId,
    artifactType: existingCanonical?.artifactType ?? metadata.artifactType,
    revision,
    status: existingCanonical?.status ?? metadata.status,
    projectId: "champcity-ai",
    phaseId: metadata.phaseId,
    workCardId: metadata.workCardId,
    parentArtifactId: metadata.parentArtifactId,
    createdAt:
      existingCanonical?.createdAt ??
      parsedJson.createdAt ??
      parsedJson.created ??
      migrationTimestamp,
    updatedAt:
      existingCanonical?.updatedAt ??
      parsedJson.updatedAt ??
      parsedJson.lastUpdated ??
      migrationTimestamp,
    markdownPath,
    jsonPath,
    relationships: existingCanonical
      ? replaceLegacyDeep(existingCanonical.relationships)
      : {
          sources: [],
          expectedOutputs: [],
          supersedes: [],
          children: [],
        },
    payload: {
      kind: existingCanonical?.artifactType ?? metadata.artifactType,
      title: replaceLegacyText(
        existingCanonical?.payload?.title ?? titleFromMarkdown(contentMarkdown, targetStem),
      ),
      contentMarkdown,
      data,
    },
  });

  return {
    artifact,
    sourcePaths:
      group.sourcePaths ?? [group.markdownPath, group.jsonPath].filter(Boolean),
    originalSchema:
      parsedJson.schemaVersion ?? parsedJson.artifactType ?? "markdown_or_unversioned_json",
    originalTerminology:
      (group.sourcePaths ?? [group.markdownPath, group.jsonPath])
        .filter(Boolean)
        .some((sourcePath) => /Builder|BUILDER|builder/.test(sourcePath)) ||
      /Builder|BUILDER|builder/.test(markdown)
        ? "legacy_implementer_role_term"
        : "implementer",
    authorityDecision:
      group.authorityDecision ?? "One source stem mapped to one canonical artifact identity.",
  };
}

function inferMetadata(stem, data, markdown) {
  const normalized = normalizeRepoPath(stem);
  const phaseId = normalized.match(/^planning\/phases\/([^/]+)\//)?.[1];
  const workCardId =
    stringValue(data.workCardId) ||
    stringValue(data.repairId) ||
    normalized.match(/(?:^|_)(WC\d+(?:-REPAIR\d+)?)(?:_|$)/i)?.[1]?.toUpperCase();
  const artifactType = inferArtifactType(normalized);
  const suffix =
    workCardId ||
    path.posix.basename(normalized).replace(/[^A-Za-z0-9-]+/g, "_");
  const location = phaseId ?? "project";
  const artifactId = `champcity-ai/${location}/${artifactType}/${suffix}`;
  const parentWorkCardId = workCardId?.match(/^(WC\d+)-REPAIR\d+$/i)?.[1];
  const parentArtifactId = parentWorkCardId
    ? `champcity-ai/${phaseId}/${"work_card"}/${parentWorkCardId.toUpperCase()}`
    : undefined;
  const status = inferCanonicalStatus(normalized, data, markdown, workCardId);
  return {
    artifactId,
    artifactType,
    status,
    phaseId,
    workCardId,
    parentArtifactId,
  };
}

function inferArtifactType(stem) {
  const rules = [
    ["/Project_Intake/", "project_intake"],
    ["/Project_Architect_Interview_Prompts/", "architect_interview"],
    ["/Project_Planning_Documents/", "project_planning"],
    ["/Repository_Reconciliation/", "repository_reconciliation"],
    ["/Project_Roadmap/", "roadmap"],
    ["/Phase_Map/", "phase_map"],
    ["/Work_Cards/", "work_card"],
    ["/Implementer_Reports/", "implementer_report"],
    ["/Architect_Reviews/", "architect_review"],
    ["/Validation_Reports/", "validation_report"],
    ["/Repair_Prompts/", "repair_record"],
    ["/Phase_Planning_Documents/", "phase_planning"],
    ["/Work_Card_Plans/", "work_card_plan"],
    ["/Design_Documents/", "design_document"],
  ];
  for (const [fragment, artifactType] of rules) {
    if (stem.includes(fragment)) {
      return artifactType;
    }
  }
  const base = path.posix.basename(stem);
  if (/Observation_Register/i.test(base)) return "observation_register";
  if (/Operator_.*Approval/i.test(base)) return "approval";
  if (/Phase_Interview/i.test(base)) return "architect_interview";
  if (/Phase_Planning/i.test(base)) return "phase_planning";
  if (/Work_Card_Plan/i.test(base)) return "work_card_plan";
  if (/Backlog/i.test(base)) return "backlog";
  return "supporting_document";
}

function inferCanonicalStatus(stem, data, markdown, workCardId) {
  if (/Operator_Phase_Approval_PENDING/i.test(stem)) return "superseded";
  if (/Phase_Planning_Documents|Work_Card_Plans/i.test(stem)) return "superseded";
  if (/WC08-REPAIR04/i.test(stem)) return "active";
  if (/WC09/i.test(stem)) return "active";
  if (/Observation_Register|Phase_Interview|Phase_Planning|Work_Card_Plan/i.test(stem)) {
    return "active";
  }
  if (/planning\/project\//.test(stem)) {
    const status = stringValue(data.status).toLowerCase();
    if (/pending|blocked|false/.test(status + markdown)) return "pending";
    return "active";
  }
  if (workCardId && !/^WC08(?:-REPAIR04)?$|^WC09$/i.test(workCardId)) {
    return "historical";
  }
  return "historical";
}

function sanitizePayloadData(value) {
  const data = replaceLegacyDeep(value && typeof value === "object" ? value : {});
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const copy = { ...data };
    for (const key of [
      "artifactId",
      "artifactType",
      "schemaVersion",
      "revision",
      "payloadHash",
      "markdownPath",
      "jsonPath",
      "relationships",
      "payload",
    ]) {
      delete copy[key];
    }
    return sortKeysDeep(copy);
  }
  return {};
}

function convertCanonicalPayloadTerminology(payload) {
  return {
    kind: payload.kind,
    title: replaceLegacyText(payload.title),
    contentMarkdown: replaceLegacyText(payload.contentMarkdown),
    data: sanitizePayloadData(payload.data),
  };
}

const lifecycleTypeRank = new Map([
  ["work_card", 0],
  ["implementer_report", 1],
  ["architect_review", 2],
  ["validation_report", 3],
]);

function enrichRelationships(drafts, draftByPath) {
  const byWorkCard = new Map();
  const byArtifactId = new Map();
  for (const draft of drafts) {
    byArtifactId.set(draft.artifact.artifactId, draft.artifact);
    const id = draft.artifact.workCardId;
    if (!id) continue;
    const key = `${draft.artifact.phaseId}:${id}`;
    const existing = byWorkCard.get(key) ?? {};
    existing[draft.artifact.artifactType] = draft.artifact.artifactId;
    byWorkCard.set(key, existing);
  }

  const children = new Map();
  for (const draft of drafts) {
    const artifact = draft.artifact;
    const sources = new Set();
    for (const [repoPath, referencedDraft] of draftByPath) {
      const referencedArtifact = referencedDraft.artifact;
      if (
        referencedArtifact.artifactId !== artifact.artifactId &&
        isSemanticallyPrior(referencedArtifact, artifact) &&
        (artifact.payload.contentMarkdown.includes(repoPath) ||
          artifact.payload.contentMarkdown.includes(path.posix.basename(repoPath)))
      ) {
        sources.add(referencedArtifact.artifactId);
      }
    }
    if (
      artifact.parentArtifactId &&
      byArtifactId.has(artifact.parentArtifactId) &&
      artifact.parentArtifactId !== artifact.artifactId
    ) {
      sources.add(artifact.parentArtifactId);
    }
    const workCardArtifacts = artifact.workCardId
      ? byWorkCard.get(`${artifact.phaseId}:${artifact.workCardId}`) ?? {}
      : {};
    const expectedOutputs = new Set();
    if (artifact.artifactType === "work_card" && artifact.phaseId && artifact.workCardId) {
      expectedOutputs.add(
        workCardArtifacts.implementer_report ??
          `champcity-ai/${artifact.phaseId}/implementer_report/${artifact.workCardId}`,
      );
    }
    if (artifact.artifactType === "implementer_report") {
      if (workCardArtifacts.work_card) sources.add(workCardArtifacts.work_card);
      if (artifact.phaseId && artifact.workCardId) {
        expectedOutputs.add(
          workCardArtifacts.architect_review ??
            `champcity-ai/${artifact.phaseId}/architect_review/${artifact.workCardId}`,
        );
      }
    }
    if (artifact.artifactType === "architect_review") {
      if (workCardArtifacts.work_card) sources.add(workCardArtifacts.work_card);
      if (workCardArtifacts.implementer_report) sources.add(workCardArtifacts.implementer_report);
      if (artifact.phaseId && artifact.workCardId) {
        expectedOutputs.add(
          workCardArtifacts.validation_report ??
            `champcity-ai/${artifact.phaseId}/validation_report/${artifact.workCardId}`,
        );
      }
    }
    if (artifact.artifactType === "validation_report") {
      if (workCardArtifacts.work_card) sources.add(workCardArtifacts.work_card);
      if (workCardArtifacts.implementer_report) sources.add(workCardArtifacts.implementer_report);
      if (workCardArtifacts.architect_review) sources.add(workCardArtifacts.architect_review);
    }
    artifact.relationships = sortKeysDeep({
      children: [],
      sources: [...sources].filter(Boolean).sort(),
      expectedOutputs: [...expectedOutputs].filter(Boolean).sort(),
      supersedes: (artifact.relationships.supersedes ?? [])
        .filter((artifactId) => artifactId !== artifact.artifactId)
        .sort(),
    });
    for (const sourceId of sources) {
      const values = children.get(sourceId) ?? new Set();
      values.add(artifact.artifactId);
      children.set(sourceId, values);
    }
  }
  for (const draft of drafts) {
    draft.artifact.relationships.children = [
      ...(children.get(draft.artifact.artifactId) ?? []),
    ].sort();
  }
}

function isSemanticallyPrior(source, target) {
  if (source.artifactId === target.artifactId) return false;
  if (source.workCardId && target.workCardId) {
    if (source.phaseId !== target.phaseId) return false;
    if (source.workCardId === target.workCardId) {
      const sourceRank = lifecycleTypeRank.get(source.artifactType);
      const targetRank = lifecycleTypeRank.get(target.artifactType);
      return sourceRank !== undefined && targetRank !== undefined && sourceRank < targetRank;
    }
    return compareWorkCardOrder(source.workCardId, target.workCardId) < 0;
  }
  if (!source.workCardId && target.workCardId) {
    return source.phaseId === undefined || source.phaseId === target.phaseId;
  }
  return false;
}

function compareWorkCardOrder(left, right) {
  const leftKey = workCardOrderKey(left);
  const rightKey = workCardOrderKey(right);
  for (let index = 0; index < Math.max(leftKey.length, rightKey.length); index += 1) {
    const difference = (leftKey[index] ?? 0) - (rightKey[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return String(left).localeCompare(String(right));
}

function workCardOrderKey(value) {
  const normalized = String(value ?? "").toUpperCase();
  const match = normalized.match(/^WC(\d+)(?:-([A-Z]+)(\d+)?)?$/);
  if (!match) return [Number.MAX_SAFE_INTEGER, 0, 0];
  const base = Number(match[1]);
  const suffix = match[2] ?? "";
  if (suffix === "PREFLIGHT") return [base, -1, Number(match[3] ?? 0)];
  if (suffix === "REPAIR") return [base, 1, Number(match[3] ?? 0)];
  return [base, suffix ? 2 : 0, Number(match[3] ?? 0)];
}

async function buildMigrationManifestEntry(root, draft, unchanged) {
  const originalPaths = draft.sourcePaths.filter(Boolean);
  const sourceHashes = [];
  for (const originalPath of originalPaths) {
    if (await exists(resolveInsideRoot(root, originalPath))) {
      sourceHashes.push({
        path: originalPath,
        hash: sha256Tagged(
          await readFile(resolveInsideRoot(root, originalPath)),
        ),
      });
    }
  }
  return {
    originalPath: originalPaths.join(" | "),
    originalSchema: String(draft.originalSchema),
    originalTerminology: draft.originalTerminology,
    sourceHashes,
    canonicalArtifactId: draft.artifact.artifactId,
    canonicalMarkdownPath: draft.artifact.markdownPath,
    canonicalJsonPath: draft.artifact.jsonPath,
    revision: draft.artifact.revision,
    status: draft.artifact.status,
    authorityDecision: draft.authorityDecision,
    rename: originalPaths.some(
      (sourcePath) =>
        sourcePath !== draft.artifact.markdownPath &&
        sourcePath !== draft.artifact.jsonPath,
    ),
    archiveDisposition: "Canonicalized or explicitly archived by a curated rule.",
    unresolvedBlocker: null,
    payloadHash: draft.artifact.payloadHash,
    relationships: draft.artifact.relationships,
    postWriteVerification: "canonical_pair_verified_by_apply",
  };
}

async function buildArchiveManifestEntry(root, sourcePath, rule) {
  return {
    originalPath: sourcePath,
    originalSchema: "historical_or_conflicting_source",
    originalTerminology: /Builder|BUILDER|builder/.test(sourcePath)
      ? "legacy_implementer_role_term"
      : "implementer",
    sourceHashes: [
      {
        path: sourcePath,
        hash: sha256Tagged(await readFile(resolveInsideRoot(root, sourcePath))),
      },
    ],
    canonicalArtifactId: `archive/${rule.id}/${path.posix.basename(sourcePath)}`,
    canonicalMarkdownPath: path.extname(sourcePath) === ".md" ? archivePathFor(sourcePath) : null,
    canonicalJsonPath: path.extname(sourcePath) === ".json" ? archivePathFor(sourcePath) : null,
    revision: 1,
    status: "historical",
    authorityDecision: rule.decision,
    rename: true,
    archiveDisposition: archivePathFor(sourcePath),
    unresolvedBlocker: null,
    payloadHash: null,
    relationships: { sources: [], expectedOutputs: [], supersedes: [], children: [] },
    postWriteVerification: "archive_hash_recorded",
  };
}

async function collectGitBaselineProvenance(root) {
  try {
    const { stdout: topLevel } = await execFileAsync(
      "git",
      ["rev-parse", "--show-toplevel"],
      { cwd: root, encoding: "utf8", windowsHide: true },
    );
    if (path.resolve(topLevel.trim()) !== path.resolve(root)) return new Map();
    await execFileAsync("git", ["rev-parse", "--verify", `${migrationBaselineRef}^{commit}`], {
      cwd: root,
      encoding: "utf8",
      windowsHide: true,
    });
    const { stdout } = await execFileAsync(
      "git",
      ["ls-tree", "-r", "--name-only", migrationBaselineRef, "--", ...activeRoots],
      { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024, windowsHide: true },
    );
    const baselinePaths = stdout
      .split(/\r?\n/)
      .map(normalizeRepoPath)
      .filter((repoPath) =>
        [".md", ".json"].includes(path.posix.extname(repoPath).toLowerCase()),
      )
      .filter(
        (repoPath) =>
          ![...excludedDirectories].some((directory) =>
            repoPath.split("/").includes(directory),
          ),
      );
    const records = await mapWithConcurrency(baselinePaths, 8, async (repoPath) => {
      const { stdout: content } = await execFileAsync(
        "git",
        ["show", `${migrationBaselineRef}:${repoPath}`],
        { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024, windowsHide: true },
      );
      return { repoPath, content, hash: sha256Tagged(content) };
    });
    const groups = new Map();
    for (const record of records) {
      const stem = canonicalStemForBaselinePath(record.repoPath);
      if (!stem) continue;
      const values = groups.get(stem) ?? [];
      values.push(record);
      groups.set(stem, values);
    }
    const result = new Map();
    for (const [stem, values] of groups) {
      const sorted = values.sort((left, right) => left.repoPath.localeCompare(right.repoPath));
      const duplicateRule = knownDuplicateRules.find(
        (rule) => !rule.archiveOnly && normalizeRepoPath(rule.targetStem) === stem,
      );
      const authorityJsonPath = duplicateRule ? `${duplicateRule.authorityStem}.json` : undefined;
      const jsonRecord =
        sorted.find((item) => item.repoPath === authorityJsonPath) ??
        sorted.find((item) => item.repoPath.endsWith(".json"));
      let originalSchema = "markdown_or_unversioned_json";
      if (jsonRecord) {
        try {
          const parsed = JSON.parse(jsonRecord.content);
          originalSchema = String(
            parsed.schemaVersion ?? parsed.artifactType ?? "markdown_or_unversioned_json",
          );
        } catch {
          originalSchema = "invalid_json";
        }
      }
      const originalTerminology = sorted.some(
        (item) =>
          /Builder|BUILDER|builder/.test(item.repoPath) ||
          /\b(?:Builder|builder|BUILDER)\b/.test(item.content),
      )
        ? "legacy_implementer_role_term"
        : "implementer";
      result.set(stem, {
        originalPath: sorted.map((item) => item.repoPath).join(" | "),
        originalSchema,
        originalTerminology,
        sourceHashes: sorted.map((item) => ({ path: item.repoPath, hash: item.hash })),
        archivePaths: sorted
          .filter((item) => knownDuplicateRules.some((rule) => rule.sources.includes(item.repoPath)))
          .map((item) => archivePathFor(item.repoPath))
          .sort(),
        authorityDecision:
          duplicateRule?.decision ?? "Approved baseline source mapped to one canonical artifact identity.",
      });
    }
    return result;
  } catch {
    return new Map();
  }
}

function canonicalStemForBaselinePath(repoPath) {
  if (knownGovernanceArchiveRules.some((rule) => rule.sourcePath === repoPath)) return null;
  for (const rule of knownDuplicateRules) {
    if (!rule.sources.includes(repoPath)) continue;
    return rule.archiveOnly ? null : normalizeRepoPath(rule.targetStem);
  }
  const extension = path.posix.extname(repoPath);
  return replaceLegacyPath(repoPath.slice(0, -extension.length));
}

function applyBaselineProvenance(entry, baselineProvenance) {
  const stem = normalizeRepoPath(entry.canonicalJsonPath ?? "").replace(/\.json$/i, "");
  const provenance = baselineProvenance.get(stem);
  if (!provenance) return entry;
  const canonicalPaths = new Set(
    [entry.canonicalJsonPath, entry.canonicalMarkdownPath].filter(Boolean),
  );
  const originalPaths = provenance.originalPath.split(" | ");
  return {
    ...entry,
    originalPath: provenance.originalPath,
    originalSchema: provenance.originalSchema,
    originalTerminology: provenance.originalTerminology,
    sourceHashes: provenance.sourceHashes,
    authorityDecision: provenance.authorityDecision,
    rename: originalPaths.some((repoPath) => !canonicalPaths.has(repoPath)),
    archiveDisposition:
      provenance.archivePaths.length > 0
        ? `Archived original sources: ${provenance.archivePaths.join(" | ")}`
        : "Canonicalized from the approved migration baseline.",
    archivePaths: provenance.archivePaths,
    provenanceSource: `git:${migrationBaselineRef}`,
  };
}

async function collectDurableArchiveOperations(root, currentOperations, priorOperations) {
  const candidates = new Map();
  const add = (operation) => {
    const sourcePath = normalizeRepoPath(operation.sourcePath ?? operation.originalPath);
    const archivePath = normalizeRepoPath(operation.archivePath);
    if (!sourcePath || !archivePath) return;
    candidates.set(`${sourcePath}->${archivePath}`, {
      ruleId: operation.ruleId ?? archiveRuleForSource(sourcePath)?.id ?? "curated-archive",
      sourcePath,
      archivePath,
      reason:
        operation.reason ??
        archiveRuleForSource(sourcePath)?.decision ??
        "Historical source archived outside active workflow discovery.",
      sourceHash: operation.sourceHash ?? null,
      recordedAt: operation.recordedAt ?? migrationTimestamp,
    });
  };
  for (const operation of Array.isArray(priorOperations) ? priorOperations : []) add(operation);
  for (const operation of currentOperations) add(operation);
  for (const rule of knownDuplicateRules) {
    for (const sourcePath of rule.sources) {
      add({ ruleId: rule.id, sourcePath, archivePath: archivePathFor(sourcePath), reason: rule.decision });
    }
  }
  for (const rule of knownGovernanceArchiveRules) {
    add({
      ruleId: rule.id,
      sourcePath: rule.sourcePath,
      archivePath: archivePathFor(rule.sourcePath),
      reason: rule.decision,
    });
  }

  const durable = [];
  for (const operation of candidates.values()) {
    const archive = resolveInsideRoot(root, operation.archivePath);
    const source = resolveInsideRoot(root, operation.sourcePath);
    const hashSource = (await exists(archive)) ? archive : (await exists(source)) ? source : null;
    if (!hashSource && !operation.sourceHash) continue;
    durable.push({
      ...operation,
      sourceHash: operation.sourceHash ?? sha256Tagged(await readFile(hashSource)),
    });
  }
  return durable.sort((left, right) => left.sourcePath.localeCompare(right.sourcePath));
}

function archiveRuleForSource(sourcePath) {
  for (const rule of knownDuplicateRules) {
    if (rule.sources.includes(sourcePath)) return { id: rule.id, decision: rule.decision };
  }
  const governance = knownGovernanceArchiveRules.find((rule) => rule.sourcePath === sourcePath);
  return governance
    ? { id: governance.id, decision: governance.decision }
    : undefined;
}

function buildDurableArchiveManifestEntry(operation) {
  const extension = path.posix.extname(operation.sourcePath).toLowerCase();
  return {
    originalPath: operation.sourcePath,
    originalSchema: "historical_or_conflicting_source",
    originalTerminology: /Builder|BUILDER|builder/.test(operation.sourcePath)
      ? "legacy_implementer_role_term"
      : "implementer",
    sourceHashes: [{ path: operation.sourcePath, hash: operation.sourceHash }],
    canonicalArtifactId: `archive/${operation.ruleId}/${path.posix.basename(operation.sourcePath)}`,
    canonicalMarkdownPath: extension === ".md" ? operation.archivePath : null,
    canonicalJsonPath: extension === ".json" ? operation.archivePath : null,
    archivePath: operation.archivePath,
    archivePaths: [operation.archivePath],
    revision: 1,
    status: "historical",
    authorityDecision: operation.reason,
    rename: true,
    archiveDisposition: operation.archivePath,
    unresolvedBlocker: null,
    payloadHash: null,
    relationships: { sources: [], expectedOutputs: [], supersedes: [], children: [] },
    postWriteVerification: "archive_hash_recorded",
    provenanceSource: "durable_archive_record",
  };
}

function mergeDurableManifestEntries(currentEntries, priorEntries) {
  const merged = new Map(
    currentEntries.map((entry) => [entry.canonicalArtifactId, entry]),
  );
  for (const prior of Array.isArray(priorEntries) ? priorEntries : []) {
    const current = merged.get(prior.canonicalArtifactId);
    if (!current) {
      merged.set(prior.canonicalArtifactId, prior);
      continue;
    }
    if (current.provenanceSource) continue;
    merged.set(prior.canonicalArtifactId, {
      ...current,
      originalPath: prior.originalPath,
      originalSchema: prior.originalSchema,
      originalTerminology: prior.originalTerminology,
      sourceHashes: prior.sourceHashes,
      authorityDecision: prior.authorityDecision,
      rename: prior.rename,
      archiveDisposition: prior.archiveDisposition,
      ...(prior.archivePath ? { archivePath: prior.archivePath } : {}),
      ...(prior.archivePaths ? { archivePaths: prior.archivePaths } : {}),
      provenanceSource: prior.provenanceSource ?? "preserved_prior_manifest",
    });
  }
  return [...merged.values()];
}

async function mapWithConcurrency(values, limit, task) {
  const results = new Array(values.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(limit, values.length) }, async () => {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await task(values[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

function buildSystemArtifact({
  artifactId,
  artifactType,
  stem,
  title,
  contentMarkdown,
  data,
  status,
  phaseId,
  relationships,
  existing,
}) {
  const payload = { kind: artifactType, title, contentMarkdown, data };
  const unchanged =
    existing &&
    stableStringify(existing.payload, 0) ===
      stableStringify(
        {
          kind: artifactType,
          title,
          contentMarkdown: normalizeMarkdown(contentMarkdown),
          data: sortKeysDeep(data),
        },
        0,
      );
  return createCanonicalArtifact({
    artifactId,
    artifactType,
    revision: unchanged ? existing.revision : (existing?.revision ?? 0) + 1,
    status,
    projectId: "champcity-ai",
    phaseId,
    createdAt: existing?.createdAt ?? migrationTimestamp,
    updatedAt: unchanged ? existing.updatedAt : migrationTimestamp,
    markdownPath: `${stem}.md`,
    jsonPath: `${stem}.json`,
    relationships,
    payload,
  });
}

function buildInitialWorkflowState() {
  const createdAt = migrationTimestamp;
  const workflowStateArtifactId = "champcity-ai/system/workflow_state";
  const currentActionId =
    "architect_review_of_implementer_report_required";
  const currentTarget =
    "champcity-ai/phase-03/work_card/WC08-REPAIR04";
  const currentSource =
    "champcity-ai/phase-03/implementer_report/WC08-REPAIR04";
  const currentOutput =
    "champcity-ai/phase-03/architect_review/WC08-REPAIR04";
  const bindings = migrationWorkflowBindings();
  const templates = [
    ["project_intake_required", "capture", "operator", "project-intake", "project_intake", "project_architect_interview_required", null, null],
    ["project_architect_interview_required", "frame", "architect", "project-architect-interview", "architect_interview", "project_planning_required", null, null],
    ["project_planning_required", "plan", "architect", "project-planning", "project_planning", "repository_reconciliation_required", null, null],
    ["repository_reconciliation_required", "plan", "architect", "repository-reconciliation", "repository_reconciliation", "project_roadmap_required", null, null],
    ["project_roadmap_required", "plan", "architect", "project-roadmap", "roadmap", "operator_project_approval_required", null, null],
    ["operator_project_approval_required", "plan", "operator", "operator-project-approval", "project_approval", "phase_mapping_required", "project_planning_required", "project_planning_required"],
    ["phase_mapping_required", "plan", "architect", "phase-mapping", "phase_map", "phase_intake_required", null, null],
    ["phase_intake_required", "capture", "operator", "phase-intake", "phase_intake", "phase_architect_interview_required", null, null],
    ["phase_architect_interview_required", "frame", "architect", "phase-architect-interview", "architect_interview", "phase_planning_required", null, null],
    ["phase_planning_required", "plan", "architect", "phase-planning", "phase_planning", "work_card_plan_review_required", null, null],
    ["work_card_plan_review_required", "plan", "architect", "work-card-plan-review", "work_card_plan_review", "operator_phase_approval_required", null, null],
    ["operator_phase_approval_required", "plan", "operator", "operator-phase-approval", "phase_approval", "work_card_authoring_required", "phase_planning_required", "phase_planning_required"],
    ["work_card_authoring_required", "plan", "architect", "work-card-authoring", "work_card", "operator_work_card_approval_required", null, null],
    ["operator_work_card_approval_required", "build", "operator", "operator-work-card-approval", "work_card_approval", "implementer_handoff_required", "work_card_authoring_required", "work_card_authoring_required"],
    ["implementer_handoff_required", "build", "architect", "implementer-handoff", "implementer_execution_packet", "implementer_execution_required", null, null],
    ["implementer_execution_required", "build", "implementer", "implementer-execution", "implementer_report", currentActionId, null, null],
    [currentActionId, "prove", "architect", "architect-review", "architect_review", "operator_validation_required", currentActionId, "architect_disposition_required"],
    ["operator_validation_required", "prove", "operator", "operator-validation", "validation_report", "phase_closeout_required", "architect_disposition_required", "architect_disposition_required"],
    ["architect_disposition_required", "prove", "architect", "architect-disposition", "architect_disposition", "phase_closeout_required", "repair_work_card_required", "repair_work_card_required"],
    ["repair_work_card_required", "plan", "architect", "repair-work-card-authoring", "work_card", "operator_work_card_approval_required", null, null],
    ["phase_closeout_required", "prove", "architect", "phase-closeout", "phase_closeout", "operator_closeout_approval_required", null, null],
    ["operator_closeout_approval_required", "prove", "operator", "operator-closeout-approval", "phase_closeout_approval", "roadmap_update_required", "phase_closeout_required", "phase_closeout_required"],
    ["roadmap_update_required", "prove", "application", "roadmap-update", "roadmap", "next_phase_activation_required", null, null],
    ["next_phase_activation_required", "capture", "application", "next-phase-activation", "phase_activation", "workflow_complete", null, null],
    ["route_review_request_required", "prove", "operator", "route-review-request", "route_review_request", null, null, null],
    ["workflow_complete", "prove", "application", "workflow-complete", "workflow_completion", null, null, null],
  ];
  const actionCatalog = Object.fromEntries(
    templates.map(
      ([actionId, stage, role, screenId, outputType, success, failure, repair]) => {
        const binding = bindings[actionId];
        if (!binding) {
          throw new Error(`Migration workflow binding is missing for ${actionId}.`);
        }
        const record = {
          actionId,
          stage,
          role,
          screenId,
          targetArtifactId: binding.targetArtifactId,
          sourceArtifactIds: [...binding.sourceArtifactIds],
          expectedOutput: {
            artifactId: binding.expectedOutputArtifactId,
            artifactType: outputType,
          },
          routes: { success, failure, repair },
        };
        return [actionId, record];
      },
    ),
  );
  const currentRecord = actionCatalog[currentActionId];
  const currentAction = {
    schemaVersion: "champcity.routed-action.v1",
    ...currentRecord,
    bindingSource: {
      kind: "workflow_state_index",
      workflowStateArtifactId,
      stateRevision: 1,
    },
    authorityStatus: "ready",
    blockers: [],
    stateRevision: 1,
  };
  return {
    schemaVersion: "champcity.workflow-state.v1",
    workflowStateArtifactId,
    projectId: "champcity-ai",
    stateRevision: 1,
    createdAt,
    updatedAt: createdAt,
    currentStage: "prove",
    activePhaseId: "phase-03",
    currentActionId,
    responsibleRole: "architect",
    authoritativeTargetArtifactId: currentTarget,
    requiredSourceArtifactIds: [currentSource],
    expectedOutput: { artifactId: currentOutput, artifactType: "architect_review" },
    routes: { ...currentRecord.routes },
    blockingConditions: [],
    currentAction,
    stageStates: {
      capture: { stage: "capture", progress: "complete", startedAt: createdAt, completedAt: createdAt },
      frame: { stage: "frame", progress: "complete", startedAt: createdAt, completedAt: createdAt },
      plan: { stage: "plan", progress: "complete", startedAt: createdAt, completedAt: createdAt },
      build: { stage: "build", progress: "complete", startedAt: createdAt, completedAt: createdAt },
      prove: { stage: "prove", progress: "active", startedAt: createdAt, completedAt: null },
    },
    actionCatalog,
    openRepairChain: {
      status: "open",
      rootWorkCardArtifactId: "champcity-ai/phase-03/work_card/WC08",
      activeRepairArtifactIds: [
        "champcity-ai/phase-03/work_card/WC08-REPAIR04",
        "champcity-ai/phase-03/work_card/WC08-REPAIR05",
        "champcity-ai/phase-03/work_card/WC08-REPAIR06",
      ],
      latestDispositionArtifactId: null,
    },
    closeout: { status: "blocked", closeoutArtifactId: null, approvalArtifactId: null },
    roadmap: { status: "blocked", roadmapArtifactId: null },
    nextPhase: { status: "blocked", phaseId: null, activationArtifactId: null },
    transitionHistory: [],
  };
}

function migrationWorkflowBindings() {
  const projectIntake = "champcity-ai/project/project_intake/PROJECT_INTAKE_champcity_a_i";
  const projectInterview =
    "champcity-ai/project/architect_interview/PROJECT_ARCHITECT_INTERVIEW_PROMPT_champcity_a_i";
  const projectPlanning =
    "champcity-ai/project/project_planning/PROJECT_PLANNING_DOCUMENTS_champcity_a_i";
  const reconciliation =
    "champcity-ai/project/repository_reconciliation/REPOSITORY_RECONCILIATION_champcity_a_i";
  const roadmap = "champcity-ai/project/roadmap/PROJECT_ROADMAP_champcity_a_i";
  const projectApproval =
    "champcity-ai/project/approval/OPERATOR_PROJECT_REBASELINE_APPROVAL_PENDING";
  const phaseMap = "champcity-ai/project/phase_map/PHASE_MAP_champcity_a_i";
  const phaseIntake = "champcity-ai/phase-03/phase_intake/PHASE_INTAKE";
  const phaseInterview = "champcity-ai/phase-03/architect_interview/Phase_Interview";
  const phasePlanning = "champcity-ai/phase-03/phase_planning/Phase_Planning";
  const workCardPlan = "champcity-ai/phase-03/work_card_plan/Work_Card_Plan";
  const workCardPlanReview =
    "champcity-ai/phase-03/work_card_plan_review/Work_Card_Plan";
  const phaseApproval = "champcity-ai/phase-03/approval/Operator_Phase_Approval";
  const workCard = "champcity-ai/phase-03/work_card/WC08-REPAIR04";
  const workCardApproval =
    "champcity-ai/phase-03/work_card_approval/WC08-REPAIR04";
  const handoff =
    "champcity-ai/phase-03/implementer_execution_packet/WC08-REPAIR04";
  const report = "champcity-ai/phase-03/implementer_report/WC08-REPAIR04";
  const review = "champcity-ai/phase-03/architect_review/WC08-REPAIR04";
  const validation = "champcity-ai/phase-03/validation_report/WC08-REPAIR04";
  const disposition =
    "champcity-ai/phase-03/architect_disposition/WC08-REPAIR04";
  const closeout = "champcity-ai/phase-03/phase_closeout/phase-03";
  const closeoutApproval =
    "champcity-ai/phase-03/phase_closeout_approval/phase-03";
  const phaseActivation = "champcity-ai/phase-04/phase_activation/phase-04";
  const routeReview =
    "champcity-ai/phase-03/route_review_request/WC08-REPAIR04";
  const workflowCompletion =
    "champcity-ai/project/workflow_completion/champcity-ai";
  const binding = (targetArtifactId, sourceArtifactIds, expectedOutputArtifactId) => ({
    targetArtifactId,
    sourceArtifactIds,
    expectedOutputArtifactId,
  });
  return {
    project_intake_required: binding(null, [], projectIntake),
    project_architect_interview_required: binding(projectIntake, [projectIntake], projectInterview),
    project_planning_required: binding(projectInterview, [projectInterview], projectPlanning),
    repository_reconciliation_required: binding(projectPlanning, [projectPlanning], reconciliation),
    project_roadmap_required: binding(reconciliation, [reconciliation], roadmap),
    operator_project_approval_required: binding(roadmap, [projectPlanning, reconciliation, roadmap], projectApproval),
    phase_mapping_required: binding(projectApproval, [projectApproval, roadmap], phaseMap),
    phase_intake_required: binding(phaseMap, [phaseMap], phaseIntake),
    phase_architect_interview_required: binding(phaseIntake, [phaseIntake], phaseInterview),
    phase_planning_required: binding(phaseInterview, [phaseInterview], phasePlanning),
    work_card_plan_review_required: binding(phasePlanning, [phasePlanning, workCardPlan], workCardPlanReview),
    operator_phase_approval_required: binding(workCardPlanReview, [phasePlanning, workCardPlanReview], phaseApproval),
    work_card_authoring_required: binding(phaseApproval, [phaseApproval, workCardPlan], workCard),
    operator_work_card_approval_required: binding(workCard, [workCard], workCardApproval),
    implementer_handoff_required: binding(workCard, [workCard, workCardApproval], handoff),
    implementer_execution_required: binding(workCard, [handoff], report),
    architect_review_of_implementer_report_required: binding(workCard, [report], review),
    operator_validation_required: binding(workCard, [review], validation),
    architect_disposition_required: binding(workCard, [validation], disposition),
    repair_work_card_required: binding(workCard, [disposition], workCard),
    phase_closeout_required: binding(phasePlanning, [phaseApproval, validation], closeout),
    operator_closeout_approval_required: binding(closeout, [closeout], closeoutApproval),
    roadmap_update_required: binding(closeoutApproval, [closeoutApproval], roadmap),
    next_phase_activation_required: binding(roadmap, [roadmap], phaseActivation),
    route_review_request_required: binding(workCard, [workCard, report], routeReview),
    workflow_complete: binding(phaseActivation, [phaseActivation], workflowCompletion),
  };
}

function registryEntry(artifact) {
  return {
    artifactId: artifact.artifactId,
    artifactType: artifact.artifactType,
    revision: artifact.revision,
    status: artifact.status,
    authoritative: ["active", "pending", "blocked"].includes(artifact.status),
    synchronized: true,
    projectId: artifact.projectId,
    phaseId: artifact.phaseId,
    workCardId: artifact.workCardId,
    parentArtifactId: artifact.parentArtifactId,
    markdownPath: artifact.markdownPath,
    jsonPath: artifact.jsonPath,
    payloadHash: artifact.payloadHash,
    relationships: artifact.relationships,
  };
}

function assertSingleAuthority(entries) {
  const activeById = new Map();
  for (const entry of entries) {
    if (!entry.authoritative) continue;
    if (activeById.has(entry.artifactId)) {
      throw new Error(`Duplicate active authority for ${entry.artifactId}.`);
    }
    activeById.set(entry.artifactId, entry);
  }
}

function validateRelationshipIntegrity(artifacts) {
  const errors = [];
  const byId = new Map(artifacts.map((artifact) => [artifact.artifactId, artifact]));
  const byWorkCard = new Map();
  for (const artifact of artifacts) {
    if (!artifact.workCardId) continue;
    const key = `${artifact.phaseId}:${artifact.workCardId}`;
    const group = byWorkCard.get(key) ?? {};
    group[artifact.artifactType] = artifact;
    byWorkCard.set(key, group);
  }

  for (const artifact of artifacts) {
    for (const sourceId of artifact.relationships?.sources ?? []) {
      if (sourceId === artifact.artifactId) {
        errors.push(`Relationship self-cycle: ${artifact.artifactId} sources itself.`);
        continue;
      }
      const source = byId.get(sourceId);
      if (
        source &&
        source.phaseId === artifact.phaseId &&
        source.workCardId &&
        source.workCardId === artifact.workCardId
      ) {
        const sourceRank = lifecycleTypeRank.get(source.artifactType);
        const targetRank = lifecycleTypeRank.get(artifact.artifactType);
        if (sourceRank !== undefined && targetRank !== undefined && sourceRank >= targetRank) {
          errors.push(
            `Downstream same-work-card source: ${artifact.artifactId} sources ${source.artifactId}.`,
          );
        }
      }
    }
  }

  for (const cycle of findSourceCycles(artifacts, byId)) {
    errors.push(`Relationship source cycle: ${cycle.join(" -> ")}.`);
  }

  for (const [key, group] of byWorkCard) {
    assertLifecycleRelationship(errors, key, group.work_card, group.implementer_report);
    assertLifecycleRelationship(errors, key, group.implementer_report, group.architect_review);
    assertLifecycleRelationship(errors, key, group.architect_review, group.validation_report);
  }
  return errors;
}

function assertLifecycleRelationship(errors, key, source, output) {
  if (!source || !output) return;
  if (!(source.relationships?.expectedOutputs ?? []).includes(output.artifactId)) {
    errors.push(`Lifecycle expected output missing for ${key}: ${source.artifactId} -> ${output.artifactId}.`);
  }
  if (!(output.relationships?.sources ?? []).includes(source.artifactId)) {
    errors.push(`Lifecycle source missing for ${key}: ${output.artifactId} <- ${source.artifactId}.`);
  }
  if (!(source.relationships?.children ?? []).includes(output.artifactId)) {
    errors.push(`Lifecycle child missing for ${key}: ${source.artifactId} -> ${output.artifactId}.`);
  }
}

function findSourceCycles(artifacts, byId) {
  const cycles = [];
  const state = new Map();
  const stack = [];
  const positions = new Map();
  const visit = (artifact) => {
    state.set(artifact.artifactId, 1);
    positions.set(artifact.artifactId, stack.length);
    stack.push(artifact.artifactId);
    for (const sourceId of artifact.relationships?.sources ?? []) {
      const source = byId.get(sourceId);
      if (!source) continue;
      if ((state.get(sourceId) ?? 0) === 0) {
        visit(source);
      } else if (state.get(sourceId) === 1) {
        const start = positions.get(sourceId) ?? 0;
        cycles.push([...stack.slice(start), sourceId]);
      }
    }
    stack.pop();
    positions.delete(artifact.artifactId);
    state.set(artifact.artifactId, 2);
  };
  for (const artifact of artifacts) {
    if ((state.get(artifact.artifactId) ?? 0) === 0) visit(artifact);
  }
  return cycles;
}

function renderMigrationManifestMarkdown(data) {
  return [
    "# WC09 Canonical Artifact Migration Manifest",
    "",
    `- Generated: ${data.generatedAt}`,
    `- Source artifacts inventoried: ${data.inventory.totalTextFiles}`,
    `- Canonical pairs before migration: ${data.inventory.canonicalPairs}`,
    `- Entries: ${data.entries.length}`,
    `- Durable archive operations: ${data.archiveOperations.length}`,
    `- Unresolved blockers: ${data.unresolvedBlockers.length}`,
    "",
    "## Rollback Guidance",
    "",
    ...data.rollbackGuidance.map((item) => `- ${item}`),
    "",
    "## Durable Archive Operations",
    "",
    ...data.archiveOperations.flatMap((operation) => [
      `- ${operation.sourcePath}`,
      `  - Archive path: ${operation.archivePath}`,
      `  - Source hash: ${operation.sourceHash}`,
      `  - Authority decision: ${operation.reason}`,
    ]),
    "",
    "## Migration Entries",
    "",
    ...data.entries.flatMap((entry) => [
      `### ${entry.canonicalArtifactId}`,
      "",
      `- Original path: ${entry.originalPath}`,
      `- Original schema/type: ${entry.originalSchema}`,
      `- Original terminology: ${entry.originalTerminology}`,
      `- Canonical Markdown: ${entry.canonicalMarkdownPath ?? "archived only"}`,
      `- Canonical JSON: ${entry.canonicalJsonPath ?? "archived only"}`,
      `- Revision: ${entry.revision}`,
      `- Status: ${entry.status}`,
      `- Authority decision: ${entry.authorityDecision}`,
      `- Rename: ${entry.rename ? "yes" : "no"}`,
      `- Archive disposition: ${entry.archiveDisposition}`,
      `- Archive path(s): ${(entry.archivePaths ?? []).join(" | ") || entry.archivePath || "none"}`,
      `- Provenance source: ${entry.provenanceSource ?? "current migration input"}`,
      `- Unresolved blocker: ${entry.unresolvedBlocker ?? "none"}`,
      "",
    ]),
  ].join("\n");
}

function renderWorkflowStateMarkdown() {
  const state = buildInitialWorkflowState();
  return [
    "# Canonical Workflow State Index",
    "",
    `- State revision: ${state.stateRevision}`,
    `- Current stage: ${state.currentStage}`,
    `- Active phase: ${state.activePhaseId}`,
    `- Current action: ${state.currentActionId}`,
    `- Responsible role: ${state.responsibleRole}`,
    `- Authoritative target: ${state.authoritativeTargetArtifactId}`,
    `- Required sources: ${state.requiredSourceArtifactIds.join(", ")}`,
    `- Expected output: ${state.expectedOutput.artifactId}`,
    `- Success route: ${state.routes.success}`,
    `- Blocking conditions: ${state.blockingConditions.map((item) => item.message).join("; ") || "none"}`,
    "",
    "Reference navigation is excluded from routed authority.",
    "",
  ].join("\n");
}

function renderRegistryMarkdown(entries) {
  return [
    "# Canonical Artifact Registry",
    "",
    `Entries: ${entries.length}`,
    "",
    "| Artifact ID | Type | Revision | Status | Authority | Synchronized |",
    "| --- | --- | ---: | --- | --- | --- |",
    ...entries.map(
      (entry) =>
        `| ${entry.artifactId} | ${entry.artifactType} | ${entry.revision} | ${entry.status} | ${entry.authoritative ? "yes" : "no"} | ${entry.synchronized ? "yes" : "no"} |`,
    ),
    "",
  ].join("\n");
}

async function collectActiveFiles(root) {
  const output = [];
  for (const repoRoot of activeRoots) {
    const absolute = resolveInsideRoot(root, repoRoot);
    if (await exists(absolute)) {
      await walk(root, absolute, output);
    }
  }
  return output.sort();
}

async function collectInventoryFiles(root) {
  const output = [];
  for (const repoRoot of activeRoots) {
    const absolute = resolveInsideRoot(root, repoRoot);
    if (await exists(absolute)) {
      await walkInventory(root, absolute, output);
    }
  }
  return output.sort();
}

async function walkInventory(root, directory, output) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && entry.name === "Migration_Manifests") continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await walkInventory(root, absolute, output);
    } else if (entry.isFile()) {
      output.push(normalizeRepoPath(path.relative(root, absolute)));
    }
  }
}

async function walk(root, directory, output) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && excludedDirectories.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(root, absolute, output);
    } else if (entry.isFile()) {
      output.push(normalizeRepoPath(path.relative(root, absolute)));
    }
  }
}

function groupByStem(files) {
  const groups = new Map();
  for (const repoPath of files) {
    const extension = path.extname(repoPath).toLowerCase();
    const stem = normalizeRepoPath(repoPath.slice(0, -extension.length));
    const group = groups.get(stem) ?? { stem, sourcePaths: [] };
    group.sourcePaths.push(repoPath);
    if (extension === ".md") group.markdownPath = repoPath;
    if (extension === ".json") group.jsonPath = repoPath;
    groups.set(stem, group);
  }
  return groups;
}

function replaceLegacyPath(value) {
  return normalizeRepoPath(value)
    .replaceAll("/Builder_Reports/", "/Implementer_Reports/")
    .replaceAll("BUILDER_REPORT_", "IMPLEMENTER_REPORT_")
    .replaceAll("/Builder_Prompts/", "/Implementer_Execution_Packets/")
    .replaceAll("BUILDER_PROMPT_", "IMPLEMENTER_EXECUTION_PACKET_")
    .replaceAll("_builder_", "_implementer_");
}

export function replaceLegacyText(value) {
  const source = String(value ?? "");
  const exactAliases = new Map([
    ["builderReport", "legacyReportAlias"],
    ["BuilderReport", "LegacyReportTypeAlias"],
    ["BUILDER_REPORT", "LEGACY_REPORT_PREFIX"],
    ["builderPrompt", "legacyPromptAlias"],
    ["BuilderPrompt", "LegacyPromptTypeAlias"],
    ["BUILDER_PROMPT", "LEGACY_PROMPT_PREFIX"],
  ]);
  const exactReplacement = exactAliases.get(source.trim());
  if (exactReplacement) {
    return normalizeMigratedTrailingWhitespace(
      source.replace(source.trim(), exactReplacement),
    );
  }

  const migrated = source
    .replace(
      /Remove runtime aliases including[^.\n]*\./g,
      "Remove runtime aliases that use legacy role terminology, including former report and prompt aliases and legacy storage names.",
    )
    .replaceAll("BUILDER TO IMPLEMENTER", "LEGACY TERMINOLOGY TO IMPLEMENTER")
    .replaceAll("Builder-to-Implementer", "Legacy-to-Implementer")
    .replaceAll("builder-to-implementer", "legacy-to-implementer")
    .replaceAll("Builder terminology", "legacy role terminology")
    .replaceAll("builder terminology", "legacy role terminology")
    .replaceAll("Builder aliases", "legacy role aliases")
    .replaceAll("builder aliases", "legacy role aliases")
    .replaceAll("Builder paths", "legacy role paths")
    .replaceAll("builder paths", "legacy role paths")
    .replaceAll("Builder-named", "legacy-role-named")
    .replaceAll("builder-named", "legacy-role-named")
    .replaceAll("Builder-name", "legacy-role-name")
    .replaceAll("builder-name", "legacy-role-name")
    .replaceAll("Legacy Builder terms", "Legacy role terms")
    .replaceAll("legacy Builder terms", "legacy role terms")
    .replaceAll("Builder_Reports", "Implementer_Reports")
    .replaceAll("BUILDER_REPORT", "IMPLEMENTER_REPORT")
    .replaceAll("Builder Report", "Implementer Report")
    .replaceAll("builder report", "implementer report")
    .replaceAll("Builder_Prompts", "Implementer_Execution_Packets")
    .replaceAll("BUILDER_PROMPT", "IMPLEMENTER_EXECUTION_PACKET")
    .replaceAll("Builder Prompt", "Implementer Execution Packet")
    .replaceAll("builder prompt", "implementer execution packet")
    .replaceAll("ready_for_builder", "ready_for_implementer")
    .replaceAll("in_builder_pass", "in_implementer_pass")
    .replaceAll("builder_report_received", "implementer_report_received")
    .replaceAll("BuilderPrompt", "ImplementerExecutionPacket")
    .replaceAll("builderPrompt", "implementerExecutionPacket")
    .replaceAll("Builder", "Implementer")
    .replaceAll("builder", "implementer")
    .replaceAll("BUILDER", "IMPLEMENTER")
    .replaceAll("from Implementer to Implementer terminology", "from legacy role terminology to Implementer terminology")
    .replaceAll("Legacy Implementer terms", "Legacy role terms")
    .replaceAll("legacy Implementer terms", "legacy role terms")
    .replaceAll("Replace `Implementer prompt` with", "Replace legacy role prompt terminology with")
    .replace(
      /`Implementer_Reports\/`\s*(?:\r?\n\s*)+→\s*(?:\r?\n\s*)+`Implementer_Reports\/`/g,
      "`<LEGACY_REPORT_STORAGE>/`\n\n→\n\n`Implementer_Reports/`",
    )
    .replace(
      /`IMPLEMENTER_REPORT_\.\.\.`\s*(?:\r?\n\s*)+→\s*(?:\r?\n\s*)+`IMPLEMENTER_REPORT_\.\.\.`/g,
      "`<LEGACY_REPORT_PREFIX>...`\n\n→\n\n`IMPLEMENTER_REPORT_...`",
    );
  return normalizeMigratedTrailingWhitespace(repairSemanticMigrationText(migrated));
}

function normalizeMigratedTrailingWhitespace(value) {
  return String(value ?? "").replace(/[ \t]+(?=\r?$)/gm, "");
}

function repairSemanticMigrationText(value) {
  return String(value ?? "")
    .replaceAll(
      "`Implementer` is legacy terminology and must be removed from the active application and active durable artifact set.",
      "Pre-WC09 role terminology is legacy and must be removed from the active application and active durable artifact set.",
    )
    .replaceAll(
      "Implementer is canonical. Implementer-facing role terminology and Implementer_Reports/IMPLEMENTER_REPORT paths are removed from active runtime and active artifacts.",
      "Implementer is canonical. Legacy role terminology and legacy report storage paths are removed from active runtime and active artifacts.",
    )
    .replaceAll(
      "Rename implementerReport, ImplementerReport, Implementer execution packet, IPC channels, renderer APIs, form labels, prompts, headings, validation text, and documentation to Implementer-facing role terminology.",
      "Rename legacy role schema fields, types, functions, IPC channels, renderer APIs, form labels, prompts, headings, validation text, and documentation to Implementer-facing role terminology.",
    )
    .replaceAll(
      "Implementer_Reports -> Implementer_Reports",
      "<LEGACY_REPORT_STORAGE> -> Implementer_Reports",
    )
    .replaceAll(
      "IMPLEMENTER_REPORT_ -> IMPLEMENTER_REPORT_",
      "<LEGACY_REPORT_PREFIX> -> IMPLEMENTER_REPORT_",
    )
    .replaceAll(
      "Do not preserve runtime legacy schema or Implementer-facing role terminology aliases.",
      "Do not preserve runtime legacy schemas or legacy role aliases.",
    )
    .replaceAll("Implementer-facing role terminology aliases", "legacy role aliases")
    .replaceAll("Phase Map Implementer", "Phase Map Composer")
    .replaceAll("Implementer Prompts", "Implementer Execution Packets")
    .replaceAll("Implementer Prompt", "Implementer Execution Packet")
    .replaceAll("Implementer prompts", "Implementer execution packets")
    .replaceAll("Implementer prompt", "Implementer execution packet")
    .replace(
      /Rename active `Implementer_Reports\/` directories to `Implementer_Reports\/`\./g,
      "Rename active `<LEGACY_REPORT_STORAGE>/` directories to `Implementer_Reports/`.",
    )
    .replace(
      /Rename active `IMPLEMENTER_REPORT_\.\.\.` files to `IMPLEMENTER_REPORT_\.\.\.`\./g,
      "Rename active `<LEGACY_REPORT_PREFIX>...` files to `IMPLEMENTER_REPORT_...`.",
    )
    .replace(
      /`Implementer_Reports\/`\s*(?:\r?\n\s*)+(?:→|â†’|->)\s*(?:\r?\n\s*)+`Implementer_Reports\/`/g,
      "`<LEGACY_REPORT_STORAGE>/`\n\n→\n\n`Implementer_Reports/`",
    )
    .replace(
      /`IMPLEMENTER_REPORT_\.\.\.`\s*(?:\r?\n\s*)+(?:→|â†’|->)\s*(?:\r?\n\s*)+`IMPLEMENTER_REPORT_\.\.\.`/g,
      "`<LEGACY_REPORT_PREFIX>...`\n\n→\n\n`IMPLEMENTER_REPORT_...`",
    )
    .replace(
      /rename Implementer terminology and paths to Implementer terminology/gi,
      "migrate legacy role terminology and paths to Implementer-facing role terminology",
    )
    .replace(/\bno Implementer terminology\b/gi, "no legacy role terminology")
    .replace(/\bImplementer terminology\b/g, "Implementer-facing role terminology")
    .replace(/\bimplementer terminology\b/g, "implementer-facing role terminology")
    .replace(/\bImplementer aliases\b/g, "legacy role aliases")
    .replace(/\bimplementer aliases\b/g, "legacy role aliases")
    .replace(/\bImplementer-named\b/g, "legacy-role-named")
    .replace(/\bimplementer-named\b/g, "legacy-role-named")
    .replace(/\bImplementer-name\b/g, "legacy-role-name")
    .replace(/\bimplementer-name\b/g, "legacy-role-name")
    .replace(/\blegacy Implementer role\b/gi, "legacy role")
    .replace(/\blegacy Implementer artifact names\b/gi, "legacy role artifact names")
    .replace(/\blegacy Implementer paths?\b/gi, "legacy role paths")
    .replace(/\blegacy Implementer Reports?\b/gi, "historical implementation reports")
    .replace(
      /\b(?:legacy|compatibility) `Implementer_Reports` (?:folder|storage(?: name)?)\b/gi,
      "canonical `Implementer_Reports` storage",
    )
    .replace(/\bcompatibility `Implementer_Reports`/gi, "canonical `Implementer_Reports`")
    .replace(
      /Compatibility note: the product-facing role is Implementer, but repair reports still use the canonical `Implementer_Reports` storage and `IMPLEMENTER_REPORT_REPAIR_\*` filename pattern\./g,
      "Repair reports use the canonical `Implementer_Reports` folder and `IMPLEMENTER_REPORT_REPAIR_*` filename pattern.",
    )
    .replace(/\bImplementer\/Implementer tooling\b/g, "Implementer tooling")
    .replace(/\bImplementer\/Implementer\b/g, "Implementer")
    .replace(/\ba Implementer\b/g, "an Implementer")
    .replace(
      /Historical Implementer artifact paths remain compatibility storage names until a dedicated migration Work Card changes them safely\./g,
      "Active Implementer artifacts use canonical storage names; historical archived paths remain evidence only.",
    )
    .replace(
      /Compatibility storage remains unresolved\. The decision notes say historical Implementer artifact paths remain compatibility storage names until a dedicated migration Work Card changes them safely\. That is not blocking current planning, but it is technical debt\./g,
      "Canonical Implementer storage migration is complete. Historical archived paths remain evidence only and are excluded from active workflow discovery.",
    )
    .replace(
      /Compatibility note: the product-facing role is Implementer, but repair reports still use the legacy `Implementer_Reports` folder and `IMPLEMENTER_REPORT_REPAIR_\*` filename pattern\./g,
      "Repair reports use the canonical `Implementer_Reports` folder and `IMPLEMENTER_REPORT_REPAIR_*` filename pattern.",
    )
    .replace(
      /- Implementer: Legacy compatibility wording for older artifact names and storage paths\. Product-facing copy should use Implementer unless referring to historical `Implementer_\*` compatibility artifacts\./g,
      "- Historical role terminology: Archived compatibility wording is evidence only. Active product copy and artifacts use Implementer.",
    )
    .replace(/\blegacy Implementer handoff heading\b/gi, "historical execution handoff heading");
}

function replaceLegacyKey(value) {
  return String(value ?? "")
    .replaceAll("BuilderPrompt", "ImplementerExecutionPacket")
    .replaceAll("builderPrompt", "implementerExecutionPacket")
    .replaceAll("BUILDER_PROMPT", "IMPLEMENTER_EXECUTION_PACKET")
    .replaceAll("Builder", "Implementer")
    .replaceAll("builder", "implementer")
    .replaceAll("BUILDER", "IMPLEMENTER");
}

function replaceLegacyDeep(value, location = "payload.data") {
  if (Array.isArray(value)) {
    return value.map((item, index) => replaceLegacyDeep(item, `${location}[${index}]`));
  }
  if (value && typeof value === "object") {
    const converted = {};
    for (const [key, item] of Object.entries(value).sort(([left], [right]) =>
      left.localeCompare(right),
    )) {
      const convertedKey = replaceLegacyKey(key);
      if (Object.hasOwn(converted, convertedKey)) {
        throw new Error(
          `Legacy terminology conversion produced a duplicate key at ${location}.${convertedKey}.`,
        );
      }
      converted[convertedKey] = replaceLegacyDeep(item, `${location}.${convertedKey}`);
    }
    return converted;
  }
  return typeof value === "string" ? replaceLegacyText(value) : value;
}

function archivePathFor(sourcePath) {
  return replaceLegacyPath(`planning/archive/wc09/${sourcePath.slice("planning/".length)}`);
}

async function hasHealthyCanonicalTarget(root, rule) {
  const artifact = await readCanonicalPairIfPresent(root, rule.targetStem);
  return Boolean(artifact && hasSubstantiveCanonicalPayload(artifact));
}

function hasSubstantiveCanonicalPayload(artifact) {
  const data = artifact?.payload?.data;
  if (data && typeof data === "object" && Object.keys(data).length > 0) {
    return true;
  }
  const body = normalizeMarkdown(artifact?.payload?.contentMarkdown)
    .replace(/^#\s+[^\n]+\n*/u, "")
    .trim();
  if (!body) return false;
  return !/^```json\s*\{\s*\}\s*```$/su.test(body);
}

async function resolveCuratedAuthoritySource(root, rule) {
  const active = {
    markdownPath: `${rule.authorityStem}.md`,
    jsonPath: `${rule.authorityStem}.json`,
    archived: false,
  };
  if (
    (await exists(resolveInsideRoot(root, active.markdownPath))) &&
    (await exists(resolveInsideRoot(root, active.jsonPath)))
  ) {
    return active;
  }

  const archived = {
    markdownPath: archivePathFor(active.markdownPath),
    jsonPath: archivePathFor(active.jsonPath),
    archived: true,
  };
  if (
    (await exists(resolveInsideRoot(root, archived.markdownPath))) &&
    (await exists(resolveInsideRoot(root, archived.jsonPath)))
  ) {
    return archived;
  }
  return undefined;
}

async function readCanonicalPairIfPresent(root, stem) {
  const jsonPath = resolveInsideRoot(root, `${stem}.json`);
  const markdownPath = resolveInsideRoot(root, `${stem}.md`);
  if (!(await exists(jsonPath)) || !(await exists(markdownPath))) return undefined;
  const artifact = JSON.parse(await readFile(jsonPath, "utf8"));
  if (!isCanonicalArtifact(artifact)) return undefined;
  const markdown = await readFile(markdownPath, "utf8");
  try {
    verifyCanonicalPair({ artifact, markdown });
    return artifact;
  } catch {
    return recoverTimestampOrderOnlyPair(artifact, markdown);
  }
}

function recoverTimestampOrderOnlyPair(artifact, markdown) {
  if (
    !Number.isFinite(Date.parse(artifact.createdAt)) ||
    !Number.isFinite(Date.parse(artifact.updatedAt)) ||
    Date.parse(artifact.updatedAt) >= Date.parse(artifact.createdAt)
  ) {
    return undefined;
  }
  try {
    const repaired = sortKeysDeep({ ...artifact, updatedAt: artifact.createdAt });
    const parsed = parseCanonicalMarkdown(markdown);
    if (parsed.contentMarkdown !== repaired.payload.contentMarkdown) return undefined;
    const normalizedEnvelope = sortKeysDeep({
      ...parsed.envelope,
      updatedAt: repaired.updatedAt,
    });
    if (
      stableStringify(normalizedEnvelope, 0) !==
      stableStringify(canonicalEnvelopeProjection(repaired), 0)
    ) {
      return undefined;
    }
    verifyCanonicalPair({
      artifact: repaired,
      markdown: renderCanonicalPair(repaired).markdown,
    });
    return repaired;
  } catch {
    return undefined;
  }
}

async function canonicalPairMatches(root, artifact, renderedPair) {
  const jsonPath = resolveInsideRoot(root, artifact.jsonPath);
  const markdownPath = resolveInsideRoot(root, artifact.markdownPath);
  if (!(await exists(jsonPath)) || !(await exists(markdownPath))) return false;
  return (
    (await readFile(jsonPath, "utf8")) === renderedPair.json &&
    (await readFile(markdownPath, "utf8")) === renderedPair.markdown
  );
}

function dedupeOperations(operations) {
  return [
    ...new Map(
      operations.map((operation) => [
        `${operation.sourcePath}->${operation.archivePath}`,
        operation,
      ]),
    ).values(),
  ].sort((left, right) => left.sourcePath.localeCompare(right.sourcePath));
}

function titleFromMarkdown(markdown, stem) {
  return (
    markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() || titleFromStem(stem)
  );
}

function titleFromStem(stem) {
  return path.posix
    .basename(stem)
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stringValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

function plainError(error) {
  return error instanceof Error ? error.message : String(error);
}
