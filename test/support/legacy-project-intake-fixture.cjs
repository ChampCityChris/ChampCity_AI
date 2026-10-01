// Test-only supported legacy Intake fixture builder. No production caller or authority.
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitProjectIntake = submitProjectIntake;
exports.submitProjectIntakeForRepository = submitProjectIntakeForRepository;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const canonicalMarkdown_1 = require("../../dist/shared/documents/canonicalMarkdown");
const workspaceContracts_1 = require("../../dist/shared/workspaceContracts");
const projectIntakeCorpus_1 = require("../../dist/shared/projectIntake/projectIntakeCorpus");
const planningDocumentService_1 = require("../../dist/main/documents/planningDocumentService");
const canonicalMarkdownDocumentWriter_1 = require("../../dist/main/documents/canonicalMarkdownDocumentWriter");
const repositoryBinding_1 = require("../../dist/main/documents/repositoryBinding");
const mcpWorkspacePromptContract_1 = require("../../dist/main/integrations/mcpWorkspacePromptContract");
const projectArchitectInterviewPromptWriter_1 = require("./legacy-project-architect-prompt.cjs");
const requiredPlanningDirectories = [
    "planning",
    "planning/project",
    "planning/project/Project_Intake",
    "planning/project/Project_Architect_Interview_Prompts",
    "planning/project/Project_Architect_Interviews",
];
function submitProjectIntake(submission) {
    return submitProjectIntakeForRepository(submission.projectRepository, submission);
}
function submitProjectIntakeForRepository(projectRepositoryRoot, submission) {
    const projectRoot = node_path_1.default.resolve(projectRepositoryRoot);
    const repositoryBoundSubmission = {
        ...submission,
        projectRepository: projectRoot,
    };
    validateSubmission(repositoryBoundSubmission);
    assertWritableDirectory(projectRoot);
    return writeProjectIntake(projectRoot, repositoryBoundSubmission);
}
function writeProjectIntake(projectRoot, submission) {
    validateSubmission(submission);
    const documents = (0, planningDocumentService_1.listPlanningDocuments)(projectRoot);
    const corpus = (0, projectIntakeCorpus_1.analyzeProjectIntakeCorpus)(documents);
    if (corpus.state === "conflict") {
        throw new Error(`Project Intake conflict: multiple canonical Project Intake documents exist: ${corpus.evidencePaths.join("; ")}. Resolve the duplicate Intake family before submitting Project Intake.`);
    }
    initializeMinimalPlanning(projectRoot);
    const previousIntake = corpus.state === "single" ? corpus.documents[0] : undefined;
    const projectSlug = previousIntake
        ? stableProjectArtifactKey(projectRoot, previousIntake)
        : slugify(submission.projectName);
    const previousPrompt = previousIntake
        ? findAssociatedPrompt(documents, projectRoot, previousIntake, projectSlug)
        : undefined;
    const previousArchitectPromptMarkdownPath = previousPrompt?.markdownPath ?? `planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_${projectSlug}.md`;
    const previousPromptTargets = previousPrompt?.metadata.architectOutputTargets ??
        readPromptOutputTargets(projectRoot, previousArchitectPromptMarkdownPath);
    const architectInterviewTargetMarkdownPath = previousPromptTargets?.markdown ?? `planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_${projectSlug}.md`;
    const revisionResult = previousIntake
        ? (0, planningDocumentService_1.savePlanningDocumentRevision)(projectRoot, previousIntake.logicalDocumentId)
        : null;
    const artifactRevision = revisionResult?.revisedDocument.metadata.artifactRevision ?? 1;
    const explicitMcpBinding = (0, mcpWorkspacePromptContract_1.readExplicitMcpWorkspaceBinding)(projectRoot);
    const repositoryBinding = (0, repositoryBinding_1.buildRepositoryBindingFromProjectIntake)({
        projectRepository: submission.projectRepository,
        mcpWorkspaceBinding: explicitMcpBinding
            ? {
                mcpWorkspaceId: explicitMcpBinding.workspaceId,
                label: explicitMcpBinding.label,
                repositoryName: explicitMcpBinding.repositoryName,
                branch: explicitMcpBinding.branch,
                gitBacked: explicitMcpBinding.gitBacked,
            }
            : null,
    });
    const intakeContent = {
        ...intakeSubstantiveContent(submission),
        repositoryBinding,
    };
    const projectIntakeMarkdownPath = `planning/project/Project_Intake/PROJECT_INTAKE_${projectSlug}.md`;
    (0, canonicalMarkdownDocumentWriter_1.writeCanonicalMarkdownDocument)({
        workspaceRoot: projectRoot,
        relativePath: projectIntakeMarkdownPath,
        metadata: {
            schemaVersion: 1,
            artifactType: "project-intake",
            artifactRevision,
            participationRole: "gatingReview",
            identity: { "Project.ArtifactKey": projectSlug },
            sourceRevisions: [],
            workflowData: intakeContent,
            documentDisposition: { status: "Pending", notes: "", reviewedAt: null },
        },
        bodyMarkdown: projectIntakeBody(submission),
    });
    const promptRevision = previousPrompt?.metadata.artifactRevision ?? 1;
    const prompt = (0, projectArchitectInterviewPromptWriter_1.writeProjectArchitectInterviewPrompt)({
        workspaceRoot: projectRoot,
        projectName: submission.projectName,
        projectSlug,
        projectIntakeMarkdownPath,
        projectIntakeRevision: artifactRevision,
        projectIntakeWorkflowData: intakeContent,
        promptRevision,
        architectInterviewTargetMarkdownPath,
    });
    const architectPromptMarkdownPath = prompt.relativePath;
    const promptTargets = prompt.metadata.workflowData.architectOutputTargets;
    const resolvedInterviewTargetMarkdownPath = promptTargets?.markdown ?? architectInterviewTargetMarkdownPath;
    const invalidatedPaths = [
        ...(revisionResult?.invalidatedDocuments.map((document) => document.markdownPath) ?? []),
        ...(previousIntake ? invalidateExistingInterview(projectRoot, resolvedInterviewTargetMarkdownPath) : []),
    ];
    return {
        ok: true,
        projectSlug,
        projectRoot,
        projectIntakeMarkdownPath,
        architectPromptMarkdownPath,
        architectInterviewTargetMarkdownPath: resolvedInterviewTargetMarkdownPath,
        artifactRevision,
        promptRevision,
        invalidatedPaths,
    };
}
function projectIntakeBody(submission) {
    return [
        `# Project Intake: ${submission.projectName}`,
        "",
        `Project Purpose: ${submission.projectPurpose}`,
        `Desired Outcome: ${submission.desiredOutcome}`,
        `Project Type: ${submission.projectType}`,
        `Project Repository: ${submission.projectRepository}`,
        `Existing Source Or Planning: ${submission.hasExistingSourceOrPlanning ? "Yes" : "No"}`,
        `Known Constraints: ${submission.knownConstraints ?? ""}`,
        `Repository Review Context: ${submission.repositoryReviewContext ?? ""}`,
    ].join("\n");
}
function intakeSubstantiveContent(submission) {
    return {
        projectName: submission.projectName,
        projectPurpose: submission.projectPurpose,
        desiredOutcome: submission.desiredOutcome,
        projectType: submission.projectType,
        projectRepository: submission.projectRepository,
        hasExistingSourceOrPlanning: submission.hasExistingSourceOrPlanning,
        knownConstraints: submission.knownConstraints ?? "",
        repositoryReviewContext: submission.repositoryReviewContext ?? "",
    };
}
function validateSubmission(submission) {
    const required = [
        submission.projectName,
        submission.projectPurpose,
        submission.desiredOutcome,
        submission.projectRepository,
    ];
    if (required.some((value) => value.trim().length === 0)) {
        throw new Error("Project Intake requires all fixed required fields.");
    }
    if (!workspaceContracts_1.projectTypeOptions.includes(submission.projectType)) {
        throw new Error("Project Type is not one of the approved values.");
    }
}
function assertWritableDirectory(projectRoot) {
    const stats = node_fs_1.default.statSync(projectRoot);
    if (!stats.isDirectory()) {
        throw new Error("Project repository selection must be a directory.");
    }
    node_fs_1.default.accessSync(projectRoot, node_fs_1.default.constants.R_OK | node_fs_1.default.constants.W_OK);
}
function initializeMinimalPlanning(projectRoot) {
    for (const relativePath of requiredPlanningDirectories) {
        node_fs_1.default.mkdirSync(node_path_1.default.join(projectRoot, relativePath), { recursive: true });
    }
}
function invalidateExistingInterview(projectRoot, targetMarkdownPath) {
    const existing = findByPath(projectRoot, targetMarkdownPath);
    if (!existing || existing.effectiveDisposition !== "Approved") {
        return [];
    }
    (0, planningDocumentService_1.setDocumentDisposition)(projectRoot, existing.logicalDocumentId, "Pending");
    return [targetMarkdownPath];
}
function findByPath(projectRoot, relativePath) {
    return (0, planningDocumentService_1.listPlanningDocuments)(projectRoot).find((document) => document.markdownPath === relativePath);
}
function findAssociatedPrompt(documents, projectRoot, intake, projectSlug) {
    const intakePaths = new Set([intake.markdownPath]);
    const promptCandidates = documents.filter(isArchitectPrompt);
    return promptCandidates.find((document) => (document.metadata.sourceRevisions ?? []).some((source) => intakePaths.has(source.path))) ?? promptCandidates.find((document) => promptJsonReferencesIntake(projectRoot, document.markdownPath, intakePaths)) ?? promptCandidates.find((document) => document.markdownPath === `planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_${projectSlug}.md`);
}
function isArchitectPrompt(document) {
    return document.markdownPath.replace(/\\/g, "/").toLowerCase()
        .startsWith("planning/project/project_architect_interview_prompts/");
}
function stableProjectArtifactKey(projectRoot, intake) {
    const fromMarkdown = readProjectArtifactKey(projectRoot, intake.markdownPath);
    if (fromMarkdown) {
        return fromMarkdown;
    }
    const pathKey = keyFromProjectIntakePath(intake.markdownPath);
    return pathKey || slugify(intake.displayFilename.replace(/^PROJECT_INTAKE_?/i, ""));
}
function keyFromProjectIntakePath(relativePath) {
    if (!(0, projectIntakeCorpus_1.isCanonicalProjectIntakePath)(relativePath)) {
        return undefined;
    }
    const filename = node_path_1.default.basename(relativePath ?? "", node_path_1.default.extname(relativePath ?? ""));
    return filename.replace(/^PROJECT_INTAKE_?/i, "").trim() || undefined;
}
function readProjectArtifactKey(projectRoot, relativePath) {
    if (!relativePath) {
        return undefined;
    }
    const parsed = readJsonIfPresent(projectRoot, relativePath);
    const key = parsed?.projectArtifactKey ?? parsed?.projectSlug;
    return typeof key === "string" && key.trim() ? key.trim() : undefined;
}
function readPromptOutputTargets(projectRoot, relativePath) {
    if (!relativePath) {
        return undefined;
    }
    const targets = readJsonIfPresent(projectRoot, relativePath)?.architectOutputTargets;
    if (!targets || typeof targets !== "object") {
        return undefined;
    }
    const markdown = targets.markdown;
    return typeof markdown === "string"
        ? { markdown }
        : undefined;
}
function promptJsonReferencesIntake(projectRoot, relativePath, intakePaths) {
    if (!relativePath) {
        return false;
    }
    const parsed = readJsonIfPresent(projectRoot, relativePath);
    if (!parsed) {
        return false;
    }
    const canonical = parsed.canonicalProjectIntake;
    if (!canonical || typeof canonical !== "object") {
        return false;
    }
    const markdown = canonical.markdown;
    const json = canonical.json;
    return (typeof markdown === "string" && intakePaths.has(markdown)) ||
        (typeof json === "string" && intakePaths.has(json));
}
function readJsonIfPresent(projectRoot, relativePath) {
    const absolutePath = node_path_1.default.join(projectRoot, relativePath);
    if (!node_fs_1.default.existsSync(absolutePath)) {
        return undefined;
    }
    try {
        if (relativePath.endsWith(".md")) {
            return (0, canonicalMarkdown_1.parseCanonicalMarkdownDocument)(node_fs_1.default.readFileSync(absolutePath, "utf8")).metadata.workflowData;
        }
        return JSON.parse(node_fs_1.default.readFileSync(absolutePath, "utf8"));
    }
    catch {
        return undefined;
    }
}
function slugify(value) {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 80) || "project";
}
