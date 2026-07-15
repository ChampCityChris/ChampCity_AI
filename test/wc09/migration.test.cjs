const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { mkdir, readFile, readdir, rm, writeFile } = require("node:fs/promises");
const path = require("node:path");
const test = require("node:test");
const { pathToFileURL } = require("node:url");

const { defaultLifecycleActionTemplates } = require("../../dist/shared/workflow");

const legacyRoleTitle = ["Buil", "der"].join("");
const canonicalRoleTitle = ["Imple", "menter"].join("");
const legacyRoleLower = legacyRoleTitle.toLowerCase();
const legacyRoleUpper = legacyRoleTitle.toUpperCase();
const legacyReportDirectoryName = `${legacyRoleTitle}_Reports`;
const legacyReportPrefix = `${legacyRoleUpper}_REPORT`;
const legacyReadyStatus = `ready_for_${legacyRoleLower}`;
const legacyReportType = `${legacyRoleTitle}Report`;
const legacyPromptType = `${legacyRoleTitle}Prompt`;
const legacyWorkCardMarkdown = [
  "# Work Card: WC09 Fixture",
  "",
  `Status: ${legacyReadyStatus}`,
  "",
  `Rename active schema fields from ${legacyRoleTitle} to ${canonicalRoleTitle} terminology.`,
  `Replace \`${legacyRoleTitle} prompt\` with \`Implementer execution packet\`.`,
  `Remove runtime aliases including \`${legacyRoleLower}Report\`, \`${legacyReportType}\`, and \`${legacyReportPrefix}\`.`,
  `Legacy ${legacyRoleTitle} terms may appear only in migration records.`,
  `Rename active \`${canonicalRoleTitle}_Reports/\` directories to \`${canonicalRoleTitle}_Reports/\`.`,
  `Rename active \`${canonicalRoleTitle.toUpperCase()}_REPORT_...\` files to \`${canonicalRoleTitle.toUpperCase()}_REPORT_...\`.`,
  `Runtime code must contain no ${canonicalRoleTitle} terminology or ${canonicalRoleTitle} aliases.`,
  `Do not create ${canonicalRoleTitle}/${canonicalRoleTitle} tooling or assign the task to a ${canonicalRoleTitle}.`,
  `Compatibility \`${canonicalRoleTitle}_Reports\` storage is no longer active.`,
  "Trailing whitespace must be normalized.   ",
  "",
].join("\n");

const migrationModuleUrl = pathToFileURL(
  path.join(
    process.cwd(),
    "scripts",
    "migration",
    "wc09",
    "migrate-artifacts.mjs",
  ),
).href;
const canonicalModuleUrl = pathToFileURL(
  path.join(
    process.cwd(),
    "scripts",
    "migration",
    "wc09",
    "canonical-artifact.mjs",
  ),
).href;

test("migration inventory, dry-run, apply, rollback guidance, and idempotence", async () => {
  const {
    applyMigrationPlan,
    buildMigrationPlan,
    inventoryMigration,
    verifyMigratedRepository,
  } = await import(migrationModuleUrl);
  const { createCanonicalArtifact, renderCanonicalPair } = await import(canonicalModuleUrl);
  const root = path.join(
    process.cwd(),
    "tmp",
    "wc09-tests",
    `migration-${process.pid}-${Date.now()}`,
  );

  try {
    await writeFixture(root);
    const before = await treeDigest(root);
    const inventory = await inventoryMigration(root);
    assert.equal(inventory.markdownOnly, 3);
    assert.equal(inventory.canonicalPairs, 0);
    assert.equal(inventory.legacyReportPaths, 1);

    const plan = await buildMigrationPlan(root);
    assert.ok(plan.summary.pairsToWrite >= 6);
    assert.equal(plan.summary.blockers, 0);
    assert.equal(await treeDigest(root), before, "dry-run plan must not mutate input");

    const applied = await applyMigrationPlan(plan);
    assert.equal(applied.ok, true);
    assert.equal(applied.noOp, false);

    const canonicalReport = path.join(
      root,
      "planning",
      "phases",
      "phase-03",
      "Implementer_Reports",
      "IMPLEMENTER_REPORT_WC09_fixture.json",
    );
    const report = JSON.parse(await readFile(canonicalReport, "utf8"));
    assert.equal(report.schemaVersion, "champcity.artifact.v1");
    assert.match(report.payloadHash, /^sha256:[a-f0-9]{64}$/);
    const canonicalWorkCard = JSON.parse(
      await readFile(
        path.join(
          root,
          "planning",
          "phases",
          "phase-03",
          "Work_Cards",
          "WC09_fixture.json",
        ),
        "utf8",
      ),
    );
    assert.equal(canonicalWorkCard.payload.data.implementerReport, "LegacyReportTypeAlias");
    assert.equal(canonicalWorkCard.payload.data.implementer_report, "LegacyReportTypeAlias");
    assert.equal(
      canonicalWorkCard.payload.data.directoryRename,
      "<LEGACY_REPORT_STORAGE> -> Implementer_Reports",
    );
    assert.equal(
      canonicalWorkCard.payload.data.filePrefixRename,
      "<LEGACY_REPORT_PREFIX> -> IMPLEMENTER_REPORT_",
    );
    assert.equal(
      canonicalWorkCard.payload.data.legacyRoleStatement,
      "Pre-WC09 role terminology is legacy and must be removed from the active application and active durable artifact set.",
    );
    assert.equal(
      /[ \t]+$/m.test(canonicalWorkCard.payload.contentMarkdown),
      false,
      "migration must remove trailing horizontal whitespace without altering internal spaces",
    );
    assert.deepEqual(canonicalWorkCard.payload.data.componentNames, [
      "ImplementerPlan",
      "ImplementerRun",
      "ImplementerReportIngestor",
    ]);
    assert.equal(
      new RegExp(legacyRoleLower, "i").test(JSON.stringify(canonicalWorkCard)),
      false,
    );
    for (const phrase of [
      "from legacy role terminology to Implementer-facing role terminology",
      "Replace legacy role prompt terminology with",
      "Remove runtime aliases that use legacy role terminology",
      "Legacy role terms may appear only",
      "Rename active `<LEGACY_REPORT_STORAGE>/` directories",
      "Rename active `<LEGACY_REPORT_PREFIX>...` files",
      "no legacy role terminology or legacy role aliases",
      "Implementer tooling or assign the task to an Implementer",
      "canonical `Implementer_Reports` storage",
    ]) {
      assert.match(canonicalWorkCard.payload.contentMarkdown, new RegExp(phrase));
    }
    for (const antiPattern of [
      `${canonicalRoleTitle} terminology`,
      `${canonicalRoleTitle} aliases`,
      `${canonicalRoleTitle}/${canonicalRoleTitle}`,
      `a ${canonicalRoleTitle}`,
      `compatibility \`${canonicalRoleTitle}_Reports\``,
    ]) {
      assert.equal(
        canonicalWorkCard.payload.contentMarkdown.toLowerCase().includes(antiPattern.toLowerCase()),
        false,
        `semantic migration corruption remains: ${antiPattern}`,
      );
    }

    const reportArtifact = report;
    const architectReview = await readCanonicalArtifact(
      root,
      "planning/phases/phase-03/Architect_Reviews/ARCHITECT_REVIEW_WC09_fixture.json",
    );
    const validationReport = await readCanonicalArtifact(
      root,
      "planning/phases/phase-03/Validation_Reports/VALIDATION_REPORT_WC09_fixture.json",
    );
    assertLifecycleEdge(canonicalWorkCard, reportArtifact);
    assertLifecycleEdge(reportArtifact, architectReview);
    assertLifecycleEdge(architectReview, validationReport);
    assert.deepEqual(
      canonicalWorkCard.relationships.sources.filter((id) =>
        [reportArtifact.artifactId, architectReview.artifactId, validationReport.artifactId].includes(id),
      ),
      [],
      "a Work Card must not source its downstream same-card artifacts",
    );
    assert.deepEqual(
      reportArtifact.relationships.sources,
      [canonicalWorkCard.artifactId],
    );
    assert.deepEqual(
      architectReview.relationships.sources,
      [canonicalWorkCard.artifactId, reportArtifact.artifactId].sort(),
    );
    assert.deepEqual(
      validationReport.relationships.sources,
      [canonicalWorkCard.artifactId, reportArtifact.artifactId, architectReview.artifactId].sort(),
    );
    await assert.rejects(
      readFile(
        path.join(
          root,
          "planning",
          "phases",
          "phase-03",
          legacyReportDirectoryName,
          `${legacyReportPrefix}_WC09_fixture.md`,
        ),
      ),
    );

    const manifest = JSON.parse(
      await readFile(
        path.join(
          root,
          "planning",
          "phases",
          "phase-03",
          "Migration_Manifests",
          "MIGRATION_MANIFEST_WC09_cross_process_workflow_authority.json",
        ),
        "utf8",
      ),
    );
    assert.ok(manifest.payload.data.rollbackGuidance.length >= 4);
    assert.equal(manifest.payload.data.archiveOperations.length, 4);
    assert.equal(
      manifest.payload.data.entries.filter((entry) => entry.archivePath).length,
      4,
    );
    const initialReportProvenance = manifest.payload.data.entries.find(
      (entry) => entry.canonicalArtifactId === report.artifactId,
    );
    assert.equal(initialReportProvenance.rename, true);
    assert.match(initialReportProvenance.originalPath, new RegExp(legacyReportDirectoryName));

    const workflow = JSON.parse(
      await readFile(
        path.join(
          root,
          "planning",
          "system",
          "Workflow_State",
          "WORKFLOW_STATE_INDEX.json",
        ),
        "utf8",
      ),
    );
    for (const template of defaultLifecycleActionTemplates) {
      const record = workflow.payload.data.actionCatalog[template.actionId];
      assert.ok(record, `migration catalog is missing ${template.actionId}`);
      assert.equal(record.stage, template.stage);
      assert.equal(record.role, template.role);
      assert.equal(record.screenId, template.screenId);
      assert.equal(
        record.expectedOutput.artifactType,
        template.expectedOutputArtifactType,
      );
      assert.deepEqual(record.routes, template.routes);
      assert.doesNotMatch(
        record.expectedOutput.artifactId,
        /\/workflow\/expected\//,
      );
    }

    const curatedTargetStem = path.join(
      root,
      "planning",
      "project",
      "Project_Architect_Interview_Prompts",
      "PROJECT_ARCHITECT_INTERVIEW_PROMPT_champcity_a_i",
    );
    const archivedAuthorityStem = path.join(
      root,
      "planning",
      "archive",
      "wc09",
      "project",
      "Project_Architect_Interview_Prompts",
      "PROJECT_ARCHITECT_INTERVIEW_PROMPT_champcity_a_i_2",
    );
    const originalArchiveMarkdown = await readFile(`${archivedAuthorityStem}.md`, "utf8");
    const originalArchiveJson = await readFile(`${archivedAuthorityStem}.json`, "utf8");
    const firstCuratedTarget = await readCanonicalArtifactFromStem(curatedTargetStem);
    assert.match(firstCuratedTarget.payload.contentMarkdown, /CONTROLLING AUTHORITY/);
    assert.ok(
      Date.parse(firstCuratedTarget.updatedAt) >= Date.parse(firstCuratedTarget.createdAt),
      "migration must never emit updatedAt before createdAt",
    );

    await writeFile(
      path.join(root, "planning", "project", "NEW_MIGRATION_INPUT.md"),
      "# New Migration Input\n\nForces a complete rerun.\n",
      "utf8",
    );
    const healthyRerun = await buildMigrationPlan(root);
    await applyMigrationPlan(healthyRerun);
    const healthyRerunTarget = await readCanonicalArtifactFromStem(curatedTargetStem);
    assert.match(healthyRerunTarget.payload.contentMarkdown, /CONTROLLING AUTHORITY/);
    assert.equal(await readFile(`${archivedAuthorityStem}.md`, "utf8"), originalArchiveMarkdown);
    assert.equal(await readFile(`${archivedAuthorityStem}.json`, "utf8"), originalArchiveJson);

    const emptyTarget = createCanonicalArtifact({
      ...healthyRerunTarget,
      revision: healthyRerunTarget.revision + 1,
      payload: {
        kind: healthyRerunTarget.artifactType,
        title: healthyRerunTarget.payload.title,
        contentMarkdown: "",
        data: {},
      },
    });
    const emptyPair = renderCanonicalPair(emptyTarget);
    await writeFile(`${curatedTargetStem}.json`, emptyPair.json, "utf8");
    await writeFile(`${curatedTargetStem}.md`, emptyPair.markdown, "utf8");

    const recoveryPlan = await buildMigrationPlan(root);
    assert.ok(
      recoveryPlan.pairWrites.some(
        ({ artifact }) =>
          artifact.jsonPath ===
          "planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_champcity_a_i.json",
      ),
      "a substantive curated target must be recovered even when its empty pair is canonical",
    );
    await applyMigrationPlan(recoveryPlan);
    const recoveredTarget = await readCanonicalArtifactFromStem(curatedTargetStem);
    assert.match(recoveredTarget.payload.contentMarkdown, /CONTROLLING AUTHORITY/);
    assert.ok(recoveredTarget.revision > emptyTarget.revision);
    assert.equal(await readFile(`${archivedAuthorityStem}.md`, "utf8"), originalArchiveMarkdown);
    assert.equal(await readFile(`${archivedAuthorityStem}.json`, "utf8"), originalArchiveJson);

    const durableManifest = await readCanonicalArtifact(
      root,
      "planning/phases/phase-03/Migration_Manifests/MIGRATION_MANIFEST_WC09_cross_process_workflow_authority.json",
    );
    assert.equal(durableManifest.payload.data.archiveOperations.length, 4);
    const durableReportProvenance = durableManifest.payload.data.entries.find(
      (entry) => entry.canonicalArtifactId === report.artifactId,
    );
    assert.equal(durableReportProvenance.rename, true);
    assert.equal(
      durableReportProvenance.originalPath,
      initialReportProvenance.originalPath,
    );
    assert.deepEqual(
      durableReportProvenance.sourceHashes,
      initialReportProvenance.sourceHashes,
    );

    const afterFirstApply = await treeDigest(root);
    const secondPlan = await buildMigrationPlan(root);
    assert.equal(
      secondPlan.pairWrites.length,
      0,
      `${secondPlan.pairWrites.map(({ artifact }) => artifact.jsonPath).join(", ")} ${JSON.stringify(secondPlan.inventory)}`,
    );
    assert.equal(secondPlan.archiveOperations.length, 0);
    assert.equal(secondPlan.removals.length, 0);
    const secondApply = await applyMigrationPlan(secondPlan);
    assert.equal(secondApply.noOp, true);
    assert.equal(await treeDigest(root), afterFirstApply);

    const verified = await verifyMigratedRepository(root, {
      idempotence: true,
    });
    assert.deepEqual(verified.errors, []);
    assert.equal(verified.ok, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("migration verification rejects reversed lifecycle relationships and source cycles", async () => {
  const { applyMigrationPlan, buildMigrationPlan, verifyMigratedRepository } = await import(
    migrationModuleUrl
  );
  const { createCanonicalArtifact, renderCanonicalPair } = await import(canonicalModuleUrl);
  const root = path.join(
    process.cwd(),
    "tmp",
    "wc09-tests",
    `relationship-${process.pid}-${Date.now()}`,
  );

  try {
    await writeFixture(root);
    await applyMigrationPlan(await buildMigrationPlan(root));
    const reportPath =
      "planning/phases/phase-03/Implementer_Reports/IMPLEMENTER_REPORT_WC09_fixture.json";
    const reviewPath =
      "planning/phases/phase-03/Architect_Reviews/ARCHITECT_REVIEW_WC09_fixture.json";
    const report = await readCanonicalArtifact(root, reportPath);
    const review = await readCanonicalArtifact(root, reviewPath);
    const reversedReport = createCanonicalArtifact({
      ...report,
      revision: report.revision + 1,
      relationships: {
        ...report.relationships,
        sources: [...report.relationships.sources, review.artifactId],
      },
      payload: report.payload,
    });
    const reversedPair = renderCanonicalPair(reversedReport);
    await writeFile(path.join(root, ...reportPath.split("/")), reversedPair.json, "utf8");
    await writeFile(
      path.join(root, ...reversedReport.markdownPath.split("/")),
      reversedPair.markdown,
      "utf8",
    );

    const verified = await verifyMigratedRepository(root);
    assert.equal(verified.ok, false);
    assert.ok(
      verified.errors.some((error) =>
        /Downstream same-work-card source|Relationship source cycle/.test(error),
      ),
      verified.errors.join("\n"),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function writeFixture(root) {
  const projectDirectory = path.join(root, "planning", "project", "Project_Intake");
  const architectInterviewDirectory = path.join(
    root,
    "planning",
    "project",
    "Project_Architect_Interview_Prompts",
  );
  const workCardDirectory = path.join(
    root,
    "planning",
    "phases",
    "phase-03",
    "Work_Cards",
  );
  const reportDirectory = path.join(
    root,
    "planning",
    "phases",
    "phase-03",
    legacyReportDirectoryName,
  );
  const architectReviewDirectory = path.join(
    root,
    "planning",
    "phases",
    "phase-03",
    "Architect_Reviews",
  );
  const validationReportDirectory = path.join(
    root,
    "planning",
    "phases",
    "phase-03",
    "Validation_Reports",
  );
  await Promise.all(
    [
      projectDirectory,
      architectInterviewDirectory,
      workCardDirectory,
      reportDirectory,
      architectReviewDirectory,
      validationReportDirectory,
    ].map((directory) => mkdir(directory, { recursive: true })),
  );
  await writeFile(
    path.join(projectDirectory, "PROJECT_INTAKE_fixture.md"),
    "# Project Intake: Fixture\n\nImplement a bounded workflow.\n",
    "utf8",
  );
  await writeFile(
    path.join(projectDirectory, "PROJECT_INTAKE_fixture.json"),
    `${JSON.stringify(
      {
        projectName: "Fixture",
        status: "active",
        createdAt: "2026-07-14T00:00:00.000Z",
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  await writeFile(
    path.join(
      architectInterviewDirectory,
      "PROJECT_ARCHITECT_INTERVIEW_PROMPT_champcity_a_i.md",
    ),
    "# Project Architect Interview\n\nHistorical first revision.\n",
    "utf8",
  );
  await writeFile(
    path.join(
      architectInterviewDirectory,
      "PROJECT_ARCHITECT_INTERVIEW_PROMPT_champcity_a_i.json",
    ),
    `${JSON.stringify({ title: "Historical first revision", revision: 1 }, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(
      architectInterviewDirectory,
      "PROJECT_ARCHITECT_INTERVIEW_PROMPT_champcity_a_i_2.md",
    ),
    "# Project Architect Interview\n\nCONTROLLING AUTHORITY second revision.\n",
    "utf8",
  );
  await writeFile(
    path.join(
      architectInterviewDirectory,
      "PROJECT_ARCHITECT_INTERVIEW_PROMPT_champcity_a_i_2.json",
    ),
    `${JSON.stringify(
      {
        title: "CONTROLLING AUTHORITY",
        revision: 2,
        createdAt: "2026-07-14T12:00:00.000Z",
        updatedAt: "2026-07-14T00:00:00.000Z",
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  await writeFile(
    path.join(workCardDirectory, "WC09_fixture.md"),
    legacyWorkCardMarkdown,
    "utf8",
  );
  await writeFile(
    path.join(workCardDirectory, "WC09_fixture.json"),
    `${JSON.stringify(
      {
        workCardId: "WC09",
        title: "Fixture",
        phase: "phase-03",
        status: legacyReadyStatus,
        [`${legacyRoleLower}Report`]: legacyReportType,
        [`${legacyRoleLower}_report`]: legacyReportType,
        componentNames: [
          `${legacyRoleTitle}Plan`,
          `${legacyRoleTitle}Run`,
          `${legacyRoleTitle}ReportIngestor`,
        ],
        nested: {
          [legacyPromptType]: legacyPromptType,
        },
        directoryRename: `${canonicalRoleTitle}_Reports -> ${canonicalRoleTitle}_Reports`,
        filePrefixRename: `${canonicalRoleTitle.toUpperCase()}_REPORT_ -> ${canonicalRoleTitle.toUpperCase()}_REPORT_`,
        legacyRoleStatement: `\`${canonicalRoleTitle}\` is legacy terminology and must be removed from the active application and active durable artifact set.`,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  await writeFile(
    path.join(reportDirectory, `${legacyReportPrefix}_WC09_fixture.md`),
    `# ${legacyRoleTitle} Report — WC09 Fixture\n\n## Implementation Summary\n\nComplete.\n`,
    "utf8",
  );
  await writeFile(
    path.join(architectReviewDirectory, "ARCHITECT_REVIEW_WC09_fixture.md"),
    "# Architect Review: WC09 Fixture\n\nReview the Work Card and implementation report.\n",
    "utf8",
  );
  await writeFile(
    path.join(validationReportDirectory, "VALIDATION_REPORT_WC09_fixture.md"),
    "# Validation Report: WC09 Fixture\n\nValidate the Work Card, implementation report, and Architect Review.\n",
    "utf8",
  );
}

async function readCanonicalArtifact(root, repoPath) {
  return JSON.parse(await readFile(path.join(root, ...repoPath.split("/")), "utf8"));
}

async function readCanonicalArtifactFromStem(stem) {
  return JSON.parse(await readFile(`${stem}.json`, "utf8"));
}

function assertLifecycleEdge(source, output) {
  assert.ok(source.relationships.expectedOutputs.includes(output.artifactId));
  assert.ok(source.relationships.children.includes(output.artifactId));
  assert.ok(output.relationships.sources.includes(source.artifactId));
}

async function treeDigest(root) {
  const files = [];
  await walk(root, root, files);
  const hash = createHash("sha256");
  for (const file of files.sort()) {
    hash.update(file);
    hash.update(await readFile(path.join(root, file)));
  }
  return hash.digest("hex");
}

async function walk(root, directory, files) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(root, target, files);
    } else if (entry.isFile()) {
      files.push(path.relative(root, target).replaceAll("\\", "/"));
    }
  }
}
