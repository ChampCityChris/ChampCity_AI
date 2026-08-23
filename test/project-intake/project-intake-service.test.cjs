const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

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
    "Aim to complete the interview in approximately 8–12 substantive questions.",
    "",
    "This is a soft operating range, not a hard stop.",
    "",
    "After approximately five substantive questions, summarize:",
    "",
    "- decisions made;",
    "- assumptions recorded;",
    "- unresolved material issues;",
    "- remaining interview areas.",
    "",
    "At approximately ten substantive questions, continue only when unresolved matters could materially affect scope, architecture, risk, dependencies, acceptance, cost, or delivery.",
    "",
    "Do not compress multiple major decisions into one overwhelming question merely to stay within the suggested range.",
    "",
    "## Required Coverage",
    "",
    "Continue until the following are materially resolved:",
    "",
    "- project purpose and desired outcome;",
    "- intended users and primary workflows;",
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
    "- key decisions;",
    "- Architect recommendations accepted;",
    "- assumptions;",
    "- deferred items;",
    "- unresolved issues.",
    "",
    "Ask the Operator to confirm the summary or identify corrections.",
    "",
    "Do not create placeholder output before the interview is substantively complete.",
    "",
    "## Final Output",
    "",
    "When the interview is complete and confirmed, synthesize one complete substantive Project Architect Interview Markdown document body, not a snippet.",
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
    projectPurpose: "Delete paired JSON workflow authority.",
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
  assert.equal(intake.metadata.workflowData.repositoryAuthority.projectRepository, result.projectRoot);
  assert.equal(intake.metadata.workflowData.repositoryAuthority.mcpWorkspaceBinding.mcpWorkspaceId, "alpha");
  assert.equal(intake.metadata.workflowData.repositoryAuthority.mcpWorkspaceBinding.repositoryName, "Test/Alpha");
  assert.match(intake.bodyMarkdown, new RegExp(`^Project Repository: ${escapeRegex(result.projectRoot)}$`, "m"));
  assert.equal((intake.bodyMarkdown.match(/^Project Repository:/gm) ?? []).length, 1);
  assert.equal(prompt.metadata.workflowData.projectRepository, result.projectRoot);
  assert.equal(prompt.metadata.workflowData.projectRepository, intake.metadata.workflowData.projectRepository);
  assert.deepEqual(prompt.metadata.workflowData.repositoryAuthority, intake.metadata.workflowData.repositoryAuthority);

  assert.equal(
    prompt.bodyMarkdown,
    `${expectedArchitectPrompt("Markdown Only", result.projectIntakeMarkdownPath)}\n`,
  );
  assert.match(prompt.bodyMarkdown, /copy its fresh handoff before writing the body/);
  assert.match(prompt.bodyMarkdown, /artifact_toolbox\.write_markdown_artifact/);
  assert.doesNotMatch(prompt.bodyMarkdown, /create_markdown_artifact/);
  assert.match(prompt.bodyMarkdown, /complete substantive Project Architect Interview Markdown document body, not a snippet/);
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
      repositoryAuthority: {
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

test("project intake without explicit MCP binding still persists repository authority", () => {
  const root = tempWorkspaceWithoutBinding("champcity-project-intake-unbound-");
  const result = submitProjectIntake({
    projectName: "Unbound Project",
    projectPurpose: "Prove repository authority without MCP routing.",
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

  assert.equal(intake.metadata.workflowData.repositoryAuthority.projectRepository, path.resolve(root));
  assert.equal(intake.metadata.workflowData.repositoryAuthority.mcpWorkspaceBinding, undefined);
  assert.deepEqual(prompt.metadata.workflowData.repositoryAuthority, intake.metadata.workflowData.repositoryAuthority);
  assert.equal(prompt.metadata.workflowData.repositoryAuthority.projectRepository, path.resolve(root));
  assert.equal(prompt.metadata.workflowData.repositoryAuthority.mcpWorkspaceBinding, undefined);
});

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
