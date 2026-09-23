const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { execFileSync } = require("node:child_process");
const workIntake = require("../../dist/main/workIntake/workIntakeService.js");
const { mainPreloadHarness } = require("../support/production-execution.cjs");

const {
  submitProjectIntake,
} = require("../../dist/main/projectIntake/projectIntakeService.js");
const {
  parseCanonicalMarkdownDocument,
} = require("../../dist/shared/documents/canonicalMarkdown.js");
const {
  tempWorkspace,
  tempWorkspaceWithoutBinding,
} = require("../support/canonical-markdown-fixtures.cjs");
const {
  buildWriteMarkdownArtifactJsonBlock,
  workspaceIdFromProjectRepository,
} = require("../../dist/main/integrations/mcpWorkspacePromptContract.js");

function expectedArchitectPrompt(projectName, intakeMarkdownPath) {
  return [
    `# Project Architect Interview Prompt: ${projectName}`,
    "",
    "Read these application-owned inputs:",
    `- Project Intake Markdown: ${intakeMarkdownPath}`,
    "",
    "Conduct the Project Architect Interview conversationally with the Operator.",
    "",
    "## Interview Method",
    "",
    "Use plain language suitable for an Operator who may not be technically experienced.",
    "",
    "Ask one primary question at a time. Do not present long questionnaires or large batches of unrelated questions.",
    "",
    "Use the Project Intake and available evidence before asking the Operator for information. Do not ask questions whose answers can be derived from the supplied documents, repository evidence, or normal architectural judgment.",
    "",
    "## Repository Evidence and Established Architecture",
    "",
    "Project Intake declares existing source or planning: No.",
    "Repository review context: none provided",
    "",
    "When Project Intake declares existing source or planning, or supplies repository review context, inspect the materially relevant repository source, planning, and architecture evidence before asking unresolved questions.",
    "Distinguish verified current implementation, established planning or architecture intent, historical or legacy evidence, and unresolved assumptions.",
    "When Intake or repository evidence identifies architecture as governing, approved, adopted, canonical, or otherwise established by the Operator, treat it as a controlling constraint and source of truth for planning unless the Operator explicitly revises it.",
    "Assess established architecture for internal consistency, implementation applicability, gaps, stale assumptions, and direct conflicts. Do not redesign, summarize away, or silently supersede it merely to complete this generic interview structure.",
    "Do not treat all repository Markdown as controlling planning direction; require evidence that architecture or planning direction is governing or Operator-established.",
    "Ask the Operator only about genuinely unresolved material product or scope decisions, or concrete architecture conflicts that cannot be resolved through normal Architect judgment.",
    "",
    "For this greenfield project, resolve intended product capabilities, principal workflows, and acceptance outcomes without assuming a prior version or migration baseline.",
    "",
    "Distinguish between:",
    "",
    "- Operator-owned decisions about purpose, users, priorities, constraints, acceptable risk, cost, timing, and desired behavior;",
    "- Architect-owned technical decisions about implementation structure, internal design, libraries, patterns, and engineering approach;",
    "- mixed decisions where technical tradeoffs materially affect product behavior, cost, risk, or scope.",
    "",
    "For Architect-owned decisions, make a recommendation rather than transferring the design problem to the Operator.",
    "",
    "When a question involves a meaningful choice:",
    "",
    "1. ask the question in plain language;",
    "2. explain briefly why it matters;",
    "3. provide the recommended answer and rationale;",
    "4. provide no more than two meaningful alternatives when alternatives are necessary;",
    "5. allow the Operator to answer “use your recommendation” or “unsure.”",
    "",
    "Avoid jargon. When a technical term is necessary, explain it briefly.",
    "",
    "Do not repeatedly request confirmation for low-risk implementation details that the Architect can decide responsibly.",
    "",
    "## Interview Length and Pace",
    "",
    "Evidence review controls interview length. Do not use a target, minimum, or expected question count.",
    "",
    "Inspect the required Project Intake and materially relevant repository evidence before deciding whether clarification is needed.",
    "",
    "Ask only material Operator-owned questions that remain unresolved after evidence review and normal Architect judgment.",
    "",
    "When the Project Intake and materially relevant repository evidence resolve the project context and required coverage, ask zero clarification questions and proceed directly to the concise confirmation summary.",
    "",
    "Do not compress unresolved material decisions merely to shorten the interview.",
    "",
    "## Required Coverage",
    "",
    "Treat the following as coverage obligations to resolve through evidence, normal Architect judgment, or Operator answers. They are not a questionnaire and do not imply one question per section.",
    "",
    "Continue until the following are materially resolved:",
    "",
    "- project purpose and desired outcome;",
    "- intended users and primary workflows;",
    "- intended product capabilities and acceptance outcomes;",
    "- scope and explicit non-scope;",
    "- success and acceptance criteria;",
    "- operational and technical constraints;",
    "- existing systems, data, and integrations;",
    "- security, privacy, compliance, and reliability requirements where applicable;",
    "- major architectural direction;",
    "- material risks and dependencies;",
    "- assumptions;",
    "- deferred decisions;",
    "- unresolved questions requiring later confirmation;",
    "- planning direction for the next project-planning stage.",
    "",
    "Do not ask the Operator to choose implementation technologies or internal architecture unless the choice creates a material product, cost, risk, or operational tradeoff. In those cases, provide a recommendation first.",
    "",
    "## Completion Confirmation",
    "",
    "Before creating the final Interview document, present a concise confirmation summary containing:",
    "",
    "- project understanding;",
    "- principal users and workflows;",
    "- intended product capabilities;",
    "- key decisions and Architect recommendations accepted;",
    "- acceptance direction;",
    "- assumptions;",
    "- deferred or conditional items;",
    "- unresolved material issues.",
    "",
    "Ask the Operator to confirm the summary or identify corrections.",
    "",
    "Do not create placeholder output before the interview is substantively complete.",
    "",
    "## Final Output",
    "",
    "When the interview is complete and confirmed, synthesize one complete substantive Project Architect Interview Markdown document body, not a snippet.",
    "Preserve the confirmed intended product capabilities, principal workflows, and acceptance outcomes within the existing required sections.",
    "",
    "The final document should include:",
    "",
    "1. Project Understanding",
    "2. Users and Primary Workflows",
    "3. Scope",
    "4. Non-Scope",
    "5. Constraints",
    "6. Key Decisions",
    "7. Architect Recommendations",
    "8. Data and Integration Requirements",
    "9. Security, Compliance, and Operational Considerations",
    "10. Risks and Dependencies",
    "11. Assumptions",
    "12. Deferred Decisions",
    "13. Unresolved Questions",
    "14. Acceptance Direction",
    "15. Project Planning Direction",
    "",
    "Open ChampCity A/I Architect Interview and copy its fresh handoff before writing the body.",
    "",
    "That handoff provides the exact temporary draft path and the required `artifact_toolbox.write_markdown_artifact` invocation.",
    "",
    "Do not write canonical metadata or a final Interview path. ChampCity A/I promotes the temporary draft into the Pending canonical Interview.",
  ].join("\n");
}

test("project intake submission writes Project Intake and Architect Prompt Markdown only", () => {
  const root = tempWorkspace("champcity-project-intake-");
  const result = submitProjectIntake({
    projectName: "Markdown Only",
    projectPurpose: "Delete paired JSON workflow state.",
    desiredOutcome: "One canonical Markdown artifact per governed document.",
    projectType: "Desktop application",
    projectRepository: root,
    hasExistingSourceOrPlanning: false,
    knownConstraints: "",
    repositoryReviewContext: "",
  });

  assert.equal(fs.existsSync(path.join(root, result.projectIntakeMarkdownPath)), true);
  assert.equal(fs.existsSync(path.join(root, result.architectPromptMarkdownPath)), true);
  assert.equal(fs.existsSync(path.join(root, result.projectIntakeMarkdownPath.replace(/\.md$/, ".json"))), false);
  assert.equal(["projectIntake", "Json", "Path"].join("") in result, false);
  assert.equal(["architectInterviewTarget", "Json", "Path"].join("") in result, false);

  const intake = parseCanonicalMarkdownDocument(
    fs.readFileSync(path.join(root, result.projectIntakeMarkdownPath), "utf8"),
  );
  const prompt = parseCanonicalMarkdownDocument(
    fs.readFileSync(path.join(root, result.architectPromptMarkdownPath), "utf8"),
  );

  assert.equal(result.projectRoot, path.resolve(root));
  assert.equal(intake.metadata.workflowData.projectRepository, result.projectRoot);
  assert.equal(intake.metadata.workflowData.repositoryBinding.projectRepository, result.projectRoot);
  assert.equal(intake.metadata.workflowData.repositoryBinding.mcpWorkspaceBinding.mcpWorkspaceId, "alpha");
  assert.equal(intake.metadata.workflowData.repositoryBinding.mcpWorkspaceBinding.repositoryName, "Test/Alpha");
  assert.equal("repositoryAuthority" in intake.metadata.workflowData, false);
  assert.match(intake.bodyMarkdown, new RegExp(`^Project Repository: ${escapeRegex(result.projectRoot)}$`, "m"));
  assert.equal((intake.bodyMarkdown.match(/^Project Repository:/gm) ?? []).length, 1);
  assert.equal(prompt.metadata.workflowData.projectRepository, result.projectRoot);
  assert.equal(prompt.metadata.workflowData.projectRepository, intake.metadata.workflowData.projectRepository);
  assert.deepEqual(prompt.metadata.workflowData.repositoryBinding, intake.metadata.workflowData.repositoryBinding);
  assert.equal("repositoryAuthority" in prompt.metadata.workflowData, false);

  assert.equal(
    prompt.bodyMarkdown,
    `${expectedArchitectPrompt("Markdown Only", result.projectIntakeMarkdownPath)}\n`,
  );
  assert.match(prompt.bodyMarkdown, /copy its fresh handoff before writing the body/);
  assert.match(prompt.bodyMarkdown, /artifact_toolbox\.write_markdown_artifact/);
  assert.doesNotMatch(prompt.bodyMarkdown, /create_markdown_artifact/);
  assert.match(prompt.bodyMarkdown, /complete substantive Project Architect Interview Markdown document body, not a snippet/);
  assert.match(prompt.bodyMarkdown, /Evidence review controls interview length\. Do not use a target, minimum, or expected question count\./);
  assert.match(prompt.bodyMarkdown, /ask zero clarification questions and proceed directly to the concise confirmation summary/);
  assert.match(prompt.bodyMarkdown, /coverage obligations.*not a questionnaire.*do not imply one question per section/i);
  assert.doesNotMatch(prompt.bodyMarkdown, /8[–-]12 substantive questions/i);
  assert.doesNotMatch(prompt.bodyMarkdown, /After approximately five substantive questions/i);
  assert.doesNotMatch(prompt.bodyMarkdown, /At approximately ten substantive questions/i);
  assert.doesNotMatch(prompt.bodyMarkdown, /submit_handoff_outputs/);
  assert.doesNotMatch(prompt.bodyMarkdown, /save_architect_interview_output/);
  assert.doesNotMatch(prompt.bodyMarkdown, /paste .*Architect Output import surface/i);
  assert.doesNotMatch(prompt.bodyMarkdown, /Temporary draft Markdown: planning\/Architect_Drafts/);
  assert.doesNotMatch(prompt.bodyMarkdown, /workspaceId/);
});

test("projectRepository folder basename constructs the MCP workspace route", () => {
  const root = tempWorkspaceWithoutBinding("champcity-project-repository-not-mcp-");
  const pdlRepository = path.join(root, "ChampCity_PDL");
  fs.mkdirSync(pdlRepository, { recursive: true });
  const lines = buildWriteMarkdownArtifactJsonBlock(
    pdlRepository,
    "planning/Architect_Drafts/demo.md",
    "<body>",
    {
      repositoryBinding: {
        projectRepository: pdlRepository,
      },
    },
  );
  const block = JSON.parse(lines.join("\n"));

  assert.equal(workspaceIdFromProjectRepository(pdlRepository), "champcity_pdl");
  assert.equal(workspaceIdFromProjectRepository(path.join(root, "ChampCity_AI")), "champcity_ai");
  assert.equal(workspaceIdFromProjectRepository(path.join(root, "ChampCity_GPT")), "champcity_gpt");
  assert.equal(workspaceIdFromProjectRepository(path.join(root, "ChampCity_RP_Desktop")), "champcity_rp_desktop");
  assert.equal(workspaceIdFromProjectRepository(path.join(root, "Revisionary")), "revisionary");
  assert.equal(block.workspaceId, "champcity_pdl");
  assert.equal(block.action, "write_markdown_artifact");
  assert.equal(fs.existsSync(path.join(root, ".champcity", "mcp-workspace-binding.json")), false);
});

test("project intake without explicit MCP binding still persists repository binding", () => {
  const root = tempWorkspaceWithoutBinding("champcity-project-intake-unbound-");
  const result = submitProjectIntake({
    projectName: "Unbound Project",
    projectPurpose: "Prove repository binding without MCP routing.",
    desiredOutcome: "Project documents remain usable before MCP binding setup.",
    projectType: "Desktop application",
    projectRepository: root,
    hasExistingSourceOrPlanning: false,
    knownConstraints: "",
    repositoryReviewContext: "",
  });

  const intake = parseCanonicalMarkdownDocument(
    fs.readFileSync(path.join(root, result.projectIntakeMarkdownPath), "utf8"),
  );
  const prompt = parseCanonicalMarkdownDocument(
    fs.readFileSync(path.join(root, result.architectPromptMarkdownPath), "utf8"),
  );

  assert.equal(intake.metadata.workflowData.repositoryBinding.projectRepository, path.resolve(root));
  assert.equal(intake.metadata.workflowData.repositoryBinding.mcpWorkspaceBinding, undefined);
  assert.deepEqual(prompt.metadata.workflowData.repositoryBinding, intake.metadata.workflowData.repositoryBinding);
  assert.equal(prompt.metadata.workflowData.repositoryBinding.projectRepository, path.resolve(root));
  assert.equal(prompt.metadata.workflowData.repositoryBinding.mcpWorkspaceBinding, undefined);
});

test("Work Intake production APIs persist branch-bound intent and reuse Project identity without planning output", async (t) => {
  const root = tempWorkspace("champcity-work-intake-");
  const historical = submitProjectIntake({
    projectName: "Existing Product", projectPurpose: "Existing product baseline", desiredOutcome: "Preserve this history",
    projectType: "Desktop application", projectRepository: root, hasExistingSourceOrPlanning: true,
  });
  const originalIntake = fs.readFileSync(path.join(root, historical.projectIntakeMarkdownPath), "utf8");
  const originalPrompt = fs.readFileSync(path.join(root, historical.architectPromptMarkdownPath), "utf8");
  const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  git("init", "-b", "integration-target");
  git("config", "user.name", "ChampCity Test");
  git("config", "user.email", "champcity-test@example.invalid");
  git("add", "--all");
  git("commit", "-m", "historical baseline");
  const { api, invocations } = mainPreloadHarness(["workIntake:projection", "workIntake:read", "workIntake:submit"], {
    ...workIntake, getRequiredWorkspaceRoot: () => root,
  });
  const before = await api.getWorkIntakeProjection();
  assert.equal(before.currentIntake, null, "historical Project Intake is not active Work Intake");
  assert.deepEqual(before.intakes, []);
  assert.deepEqual(before.suggestedBase, {
    name: "integration-target", commit: git("rev-parse", "integration-target"),
  });
  const input = {
    projectId: null, projectName: "Existing Product", workRequest: "Add export", desiredOutcome: "Users can export their work",
    knownConstraints: "Preserve existing behavior", hasExistingSourceOrPlanning: true, repositoryReviewContext: "README.md",
    baseBranch: before.suggestedBase.name, baseCommit: before.suggestedBase.commit,
  };
  await assert.rejects(api.submitWorkIntake({ ...input, projectRepository: root }), /unsupported fields/);
  const result = await api.submitWorkIntake(input);
  assert.equal(result.ok, true, JSON.stringify(result));
  const persisted = await api.readWorkIntake(result.value.intakeId);
  assert.deepEqual(persisted.branchBinding, result.binding);
  assert.equal(persisted.branchBinding.currentHead, input.baseCommit);
  assert.equal(git("branch", "--show-current"), result.binding.workBranch);
  const afterFirst = await api.getWorkIntakeProjection();
  assert.equal(persisted.projectId, afterFirst.project.projectId);
  assert.equal(afterFirst.currentIntake.intakeId, persisted.intakeId);
  assert.deepEqual(afterFirst.suggestedBase, {
    name: input.baseBranch, commit: input.baseCommit,
  });
  assert.notEqual(afterFirst.suggestedBase.name, result.binding.workBranch);
  assert.equal(fs.readFileSync(path.join(root, historical.projectIntakeMarkdownPath), "utf8"), originalIntake);
  assert.equal(fs.readFileSync(path.join(root, historical.architectPromptMarkdownPath), "utf8"), originalPrompt);
  const createdPaths = git("ls-files", "--others", "--exclude-standard").split(/\r?\n/).sort();
  assert.deepEqual(createdPaths, ["planning/work-intake/PROJECT.md", persisted.relativePath].sort());
  const canonical = parseCanonicalMarkdownDocument(fs.readFileSync(path.join(root, persisted.relativePath), "utf8"));
  assert.equal(canonical.metadata.artifactType, "work-intake");
  assert.equal(canonical.metadata.sourceRevisions[0].revision, 1);
  assert.equal(JSON.stringify(canonical).includes(root), false);

  // Advance the recorded integration target without moving the checked-out Work Intake branch.
  git("add", "--all");
  const integrationTree = git("write-tree");
  const advancedTarget = git("commit-tree", integrationTree, "-p", input.baseCommit, "-m", "advanced integration target fixture");
  git("update-ref", "refs/heads/integration-target", advancedTarget, input.baseCommit);
  const advancedProjection = await api.getWorkIntakeProjection();
  assert.deepEqual(advancedProjection.suggestedBase, {
    name: input.baseBranch, commit: advancedTarget,
  });
  assert.notEqual(advancedProjection.suggestedBase.commit, persisted.branchBinding.baseCommit);

  // Switching to the advanced target makes the fixture clean while retaining the projected commit for stale-source proof.
  git("switch", "integration-target");
  assert.equal(git("status", "--porcelain"), "");
  const identityBytes = fs.readFileSync(path.join(root, "planning/work-intake/PROJECT.md"), "utf8");
  git("commit", "--allow-empty", "-m", "move target after Work Intake projection");
  const movedTarget = git("rev-parse", "integration-target");
  const stale = await api.submitWorkIntake({
    ...input, projectId: persisted.projectId, workRequest: "Reject stale target",
    baseBranch: advancedProjection.suggestedBase.name, baseCommit: advancedProjection.suggestedBase.commit,
  });
  assert.equal(stale.ok, false);
  assert.equal(stale.error.code, "STALE_SOURCE");
  assert.equal(git("branch", "--show-current"), "integration-target");

  const refreshed = await api.getWorkIntakeProjection();
  assert.deepEqual(refreshed.suggestedBase, { name: "integration-target", commit: movedTarget });
  const second = await api.submitWorkIntake({
    ...input, projectId: persisted.projectId, workRequest: "Improve import",
    baseBranch: refreshed.suggestedBase.name, baseCommit: refreshed.suggestedBase.commit,
  });
  assert.equal(second.ok, true, JSON.stringify(second));
  assert.equal(second.value.projectId, persisted.projectId);
  assert.notEqual(second.value.intakeId, persisted.intakeId);
  assert.notEqual(second.binding.workBranch, result.binding.workBranch);
  assert.equal(second.binding.baseBranch, "integration-target");
  assert.notEqual(second.binding.baseBranch, result.binding.workBranch);
  assert.equal(fs.readFileSync(path.join(root, "planning/work-intake/PROJECT.md"), "utf8"), identityBytes);
  assert.equal(fs.readFileSync(path.join(root, historical.projectIntakeMarkdownPath), "utf8"), originalIntake);
  assert.equal((await api.getWorkIntakeProjection()).intakes.length, 2);

  // An explicitly supplied prior Work Intake branch remains a legal exact base.
  git("add", "--all");
  git("commit", "-m", "second intake fixture baseline");
  const explicitPrior = await api.submitWorkIntake({
    ...input, projectId: persisted.projectId, workRequest: "Use an explicit prior Intake branch",
    baseBranch: result.binding.workBranch, baseCommit: git("rev-parse", result.binding.workBranch),
  });
  assert.equal(explicitPrior.ok, true, JSON.stringify(explicitPrior));
  assert.equal(explicitPrior.binding.baseBranch, result.binding.workBranch);
  assert.equal(explicitPrior.binding.baseCommit, input.baseCommit);

  // Missing recorded targets fail closed instead of falling back to another branch.
  git("branch", "-D", result.binding.workBranch);
  const missingTarget = await api.getWorkIntakeProjection();
  assert.equal(missingTarget.suggestedBase, null);
  assert.match(missingTarget.blockedReason, /recorded integration target branch is unavailable/i);
  assert.ok(invocations.some(({ channel }) => channel === "workIntake:submit"));
  await assert.rejects(api.readWorkIntake("../outside"), /identity/);
});

test("new Project Work Intake persists atomically and retains a clean base on write failure", async () => {
  const root = tempWorkspace("champcity-new-work-intake-");
  const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  git("init", "-b", "initial-product");
  git("config", "user.name", "ChampCity Test");
  git("config", "user.email", "champcity-test@example.invalid");
  git("add", "--all");
  git("commit", "--allow-empty", "-m", "new product baseline");
  const input = {
    projectId: null, projectName: "New Product", workRequest: "Create the product", desiredOutcome: "A useful product",
    knownConstraints: "", hasExistingSourceOrPlanning: false, repositoryReviewContext: "",
    baseBranch: "initial-product", baseCommit: git("rev-parse", "HEAD"),
  };
  const writer = require("../../dist/main/documents/canonicalMarkdownDocumentWriter.js");
  writer.__setCanonicalMarkdownWriterTestHooks({ failInstalledVerification: () => Error("synthetic verification failure") });
  try {
    const failed = await workIntake.submitWorkIntake(root, input);
    assert.equal(failed.ok, false);
    assert.equal(failed.recovery, "restored");
    assert.equal(git("branch", "--show-current"), "initial-product");
    assert.equal(git("status", "--porcelain"), "");
    assert.equal((await workIntake.getWorkIntakeProjection(root)).project, null);
  } finally { writer.__setCanonicalMarkdownWriterTestHooks(); }
  const created = await workIntake.submitWorkIntake(root, input);
  assert.equal(created.ok, true, JSON.stringify(created));
  assert.equal(created.value.projectName, "New Product");
  assert.equal(fs.existsSync(path.join(root, "planning/project/Project_Architect_Interview_Prompts")), false);
  assert.equal(fs.existsSync(path.join(root, "planning/project/Project_Intake")), false);
  assert.equal(fs.existsSync(path.join(root, created.value.relativePath.replace(/\.md$/, ".json"))), false);
});

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
