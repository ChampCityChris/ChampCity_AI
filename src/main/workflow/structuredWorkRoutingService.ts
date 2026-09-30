import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { ArchitectOutputDefinition } from "../../shared/architectOutputs/architectOutputContracts";
import type { ExistingProjectWorkRoute } from "../../shared/projectState/workflowTypeRegistry";
import { getWorkflowTypeDefinition } from "../../shared/projectState/workflowTypeRegistry";
import type { ProjectId, ProjectStateRecord } from "../../shared/projectState/domainContracts";
import { createProjectStateService } from "../../shared/projectState/projectStateService";
import type { ProjectStateStore } from "../../shared/projectState/projectStateStore";
import type { StructuredWorkRoutingAssessment, StructuredWorkRoutingDecisionInput, StructuredWorkRoutingModel } from "../../shared/structuredWorkRoutingContracts";
import { workRouteTraitIds, type WorkRouteTrait } from "../../shared/workIntakeRoutingContracts";
import { resolveRepositoryPath } from "../repository/pathPolicy";
import { runBoundedGit } from "../core/gitExecution";
import { buildMcpWorkspaceBindingPromptBlock, buildWriteMarkdownArtifactJsonBlock } from "../integrations/mcpWorkspacePromptContract";
import { createArchitectOutputRegistry } from "../architectOutputs/architectOutputRegistry";
import { prepareArchitectOutputRuntimeSubmission, getActiveArchitectOutputRuntimeSubmission, type ActiveArchitectOutputRuntimeSubmission } from "../architectOutputs/architectOutputRuntimeService";
import { inspectArchitectDraftSubmission, cleanupArchitectDraftSubmission } from "../architectOutputs/architectDraftSubmissionService";
import { buildDeterministicArchitectDraftSubmissionId } from "../architectOutputs/architectDraftPaths";
import { createSQLiteProjectStateStore } from "../projectState/sqliteProjectStateStore";
import { currentProjectRepositoryId, selectedCurrentProjectId } from "../projectState/currentProjectRegistrationService";
import { resolveManagedDevRepositoryCheckout } from "../sourceControl/managedProjectSourceService";
import { writeArtifactTransaction } from "../documents/artifactTransaction";

const outputKind = "structured-work-routing-assessment";
const operator = { principalId: "local-operator", principalType: "human" as const, role: "Operator" };
const architect = { principalId: "embedded-architect", principalType: "agent" as const, role: "Architect" };
const projectionPath = (intakeId: string) => `planning/Generated/Work_Intake_Routing/${intakeId}.md`;
const wirRoutes = ["feature-change", "refactor-migration", "integration-composition", "infrastructure-platform", "research-prototype", "issue-resolution"] as const;
function isWIRRoute(value: unknown): value is ExistingProjectWorkRoute { return wirRoutes.includes(value as ExistingProjectWorkRoute); }
type WorkIntake = ProjectStateRecord<"WorkIntake">;
type Workflow = ProjectStateRecord<"Workflow">;
type RouteAssessmentBody = { recommendation: ExistingProjectWorkRoute; traits: WorkRouteTrait[]; rationale: string; alternate?: ExistingProjectWorkRoute; evidenceNotes: string };
interface PreparedContext { projectId: string; intakeId: string; routingWorkflowId: string; intake: WorkIntake; workflow: Workflow; sourceDevRevision: string | null; revisionInstructions?: string }

function parseAssessment(body: string): RouteAssessmentBody {
  const normalized = body.replace(/\r\n?/g, "\n");
  if (normalized.length > 12_000 || !normalized.startsWith("# Work Intake Routing Assessment\n")) throw Error("Use the bounded Work Intake Routing Assessment format.");
  const parts = normalized.split(/^## /m);
  if (parts[0].trim() !== "# Work Intake Routing Assessment") throw Error("Unexpected routing assessment preamble.");
  const sections = new Map<string, string>();
  const names = ["Recommended Route", "Traits", "Rationale", "Alternate Route", "Ambiguity", "Inspected Evidence Notes"];
  for (const part of parts.slice(1)) {
    const separator = part.indexOf("\n");
    const name = part.slice(0, separator).trim();
    if (separator < 0 || !names.includes(name) || sections.has(name)) throw Error("Unexpected or duplicate routing assessment section.");
    sections.set(name, part.slice(separator + 1).trim());
  }
  const routes: readonly ExistingProjectWorkRoute[] = ["feature-change", "refactor-migration", "integration-composition", "infrastructure-platform", "research-prototype", "issue-resolution"];
  const recommendation = sections.get("Recommended Route") as ExistingProjectWorkRoute | undefined;
  if (!recommendation || !routes.includes(recommendation)) throw Error("Recommend exactly one supported Existing-Project route.");
  const traitText = sections.get("Traits");
  const traits = traitText === "None" ? [] : (traitText ?? "").split("\n").map(line => line.replace(/^- /, "").trim());
  if (traits.some(trait => !workRouteTraitIds.includes(trait as WorkRouteTrait)) || new Set(traits).size !== traits.length || traits.length > 10)
    throw Error("Use supported unique routing traits or None.");
  const rationale = sections.get("Rationale");
  if (!rationale || rationale.length > 3000) throw Error("A concise routing rationale is required.");
  const alternateText = sections.get("Alternate Route");
  let alternate: ExistingProjectWorkRoute | undefined;
  if (alternateText && alternateText !== "None") {
    if (!routes.includes(alternateText as ExistingProjectWorkRoute) || alternateText === recommendation || !sections.get("Ambiguity") || sections.get("Ambiguity")!.length > 1500)
      throw Error("A distinct alternate route requires a concise ambiguity explanation.");
    alternate = alternateText as ExistingProjectWorkRoute;
  } else if (sections.has("Ambiguity")) throw Error("Ambiguity requires an alternate route.");
  const evidenceNotes = sections.get("Inspected Evidence Notes") ?? "";
  if (evidenceNotes.length > 2000) throw Error("Inspected evidence notes exceed the supported bound.");
  return { recommendation, traits: traits as WorkRouteTrait[], rationale, ...(alternate ? { alternate } : {}), evidenceNotes };
}

function canonicalUuid(value: string, label: string): void {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw Error(`${label} must be an exact Current Project identity.`);
}

export function createStructuredWorkRoutingService(dependencies: {
  openStore?: (databasePath: string) => ProjectStateStore & { close(): void };
  resolveRepositoryId?: typeof currentProjectRepositoryId;
  readDevRevision?: (root: string) => Promise<string>;
} = {}) {
  const openStore = dependencies.openStore ?? createSQLiteProjectStateStore;
  const resolveRepositoryId = dependencies.resolveRepositoryId ?? currentProjectRepositoryId;
  const readDevRevision = dependencies.readDevRevision ?? (async (root: string) => {
    const dev = await resolveManagedDevRepositoryCheckout(root);
    const result = await runBoundedGit({ cwd: dev, args: ["rev-parse", "--verify", "HEAD^{commit}"] });
    const revision = result.stdout.trim();
    if (result.exitCode !== 0 || !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(revision)) throw Error("Managed Dev checkout does not expose an exact commit revision.");
    return revision;
  });

  async function withCurrentProject<T>(root: string, action: (store: ProjectStateStore, projectId: ProjectId) => Promise<T>): Promise<T> {
    const canonicalRoot = fs.realpathSync(root);
    const projectId = selectedCurrentProjectId(canonicalRoot);
    if (!projectId) throw Error("Selected Project is not a registered Current Project.");
    const store = openStore(path.join(canonicalRoot, ".champcity", "project-state.sqlite"));
    try {
      const project = await store.getProject(projectId);
      if (!project || project.lifecycleState !== "active") throw Error("Selected Current Project State is unavailable.");
      return await action(store, projectId);
    } finally { store.close(); }
  }

  async function exactContext(store: ProjectStateStore, projectId: ProjectId, intakeId: string, routingWorkflowId: string) {
    canonicalUuid(intakeId, "Work Intake ID"); canonicalUuid(routingWorkflowId, "WIR Workflow ID");
    const intake = await store.getEntity(projectId, intakeId);
    const workflow = await store.getEntity(projectId, routingWorkflowId);
    if (intake?.entityType !== "WorkIntake" || workflow?.entityType !== "Workflow" || workflow.body.workflowType !== "work-intake-routing") throw Error("Exact Work Intake and WIR Workflow are required.");
    const initiated = (await store.listRelationships(projectId, "initiates")).filter(edge => edge.fromEntityId === intakeId && !edge.endedAt);
    if (initiated.length !== 1 || initiated[0].toEntityId !== routingWorkflowId) throw Error("Work Intake does not initiate this exact WIR Workflow.");
    const targets = (await store.listRelationships(projectId, "routes_to")).filter(edge => edge.fromEntityId === routingWorkflowId && !edge.endedAt);
    if (targets.length > 1) throw Error("WIR Workflow has ambiguous target provenance.");
    const targetWorkflowId = targets[0]?.toEntityId ?? null;
    const history = await createProjectStateService(store, operator).getWorkRouteHistory(projectId, intakeId);
    const latestAssessment = history.assessments.at(-1) ?? null;
    const assessmentStale = !!latestAssessment && !new RegExp(`^work-intake-record-version:${intake.recordVersion}(?:;dev-head:(?:[a-f0-9]{40}|[a-f0-9]{64}))?$`, "i").test(latestAssessment.provenance.sourceRef ?? "");
    const latestDecision = history.decisions.filter(record => record.lifecycleState === "active").at(-1) ?? null;
    const currentReview = latestDecision && history.relationships.some(edge => edge.fromEntityId === latestDecision.id && edge.relationshipType === "derived_from" && edge.toEntityId === latestAssessment?.id && !edge.endedAt)
      ? latestDecision : null;
    const target = targetWorkflowId ? await store.getEntity(projectId, targetWorkflowId) : null;
    const routeDecision = history.decisions.filter(record => record.lifecycleState === "active" && isWIRRoute(record.body.outcome)).at(-1);
    const selectedRoute = target && target.entityType === "Workflow" && routeDecision && isWIRRoute(routeDecision.body.outcome)
      ? routeDecision.body.outcome : null;
    return { intake, workflow, history, latestAssessment, assessmentStale, currentReview, targetWorkflowId,
      selectedRoute: selectedRoute ?? null, closed: intake.lifecycleState === "closed" || workflow.lifecycleState === "closed" };
  }

  async function makeDefinition(root: string, projectId: ProjectId, intakeId: string, routingWorkflowId: string): Promise<ArchitectOutputDefinition<"routing-assessment", { projectionPath: string }, PreparedContext>> {
    const snapshot = await withCurrentProject(root, async (store, id) => {
      if (id !== projectId) throw Error("Current Project identity changed.");
      return exactContext(store, id, intakeId, routingWorkflowId);
    });
    if (snapshot.intake.lifecycleState !== "active" || snapshot.closed) throw Error("Closed Work Intake cannot prepare a routing assessment.");
    const relPath = projectionPath(intakeId);
    const resolved = resolveRepositoryPath(root, relPath, { allowMissingLeaf: true });
    if (resolved.relativePath !== relPath) throw Error("Generated Work Intake projection path was redirected.");
    const projectionStore = openStore(path.join(fs.realpathSync(root), ".champcity", "project-state.sqlite"));
    let rendered;
    try { rendered = await createProjectStateService(projectionStore, operator).renderView(projectId, { projectionType: "work-intake", sourceEntityId: intakeId }); }
    finally { projectionStore.close(); }
    const projectionMarkdown = `> Generated Project State context. This file is non-authoritative; Project State is the only routing authority.\n\n${rendered.markdown}`;
    writeArtifactTransaction(root, [{ relativePath: relPath, content: projectionMarkdown }]);
    let sourceDevRevision: string | null = null;
    const repositoryId = await resolveRepositoryId(root);
    if (repositoryId) { try { sourceDevRevision = await readDevRevision(root); } catch { sourceDevRevision = null; } }
    const revisionInstructions = snapshot.currentReview?.body.outcome === "revision_requested" ? snapshot.currentReview.body.rationale : undefined;
    const context: PreparedContext = { projectId, intakeId, routingWorkflowId, intake: snapshot.intake, workflow: snapshot.workflow, sourceDevRevision, ...(revisionInstructions ? { revisionInstructions } : {}) };
    const routeRows: readonly [ExistingProjectWorkRoute, string][] = [
      ["feature-change", "A bounded capability change in an existing product."], ["refactor-migration", "Transform existing architecture while preserving or explicitly changing behavior."],
      ["integration-composition", "Compose external services, packages, platforms, or third-party systems."], ["infrastructure-platform", "Change deployment, environments, packaging, networking, or operations."],
      ["research-prototype", "Resolve a bounded question or prove feasibility."], ["issue-resolution", "Investigate an observed defect, failure, regression, or incorrect behavior."],
    ];
    const submissionId = (input: Parameters<typeof buildDeterministicArchitectDraftSubmissionId>[0]) => buildDeterministicArchitectDraftSubmissionId(input);
    return {
      outputKind, owningWorkspaceId: `wir-${intakeId}`, bundleMode: "single-output",
      buildSubmissionId: input => submissionId({ outputKind, owningWorkspaceId: `wir-${intakeId}`, ...input }),
      buildPromotionGroupId: input => submissionId({ outputKind, owningWorkspaceId: `wir-${intakeId}`, ...input }),
      resolvePreparation: () => ({ sourceHandoff: { path: relPath, revision: snapshot.intake.recordVersion }, domainContext: context }),
      resolvePromotionContext: ({ preparedContext }) => preparedContext as PreparedContext,
      slots: [{ slotId: "routing-assessment", displayLabel: "Advisory Routing Assessment", draftPathComponent: "routing.md",
        validateBody: body => { parseAssessment(body); },
        buildCanonicalDocument: () => { throw Error("Structured route assessment promotion uses Project State, not canonical Markdown."); },
      }],
      buildPreparedInstruction: ({ workspaceRoot, submission }) => [
        ...buildMcpWorkspaceBindingPromptBlock(workspaceRoot, undefined, { includeDiagnosticsToolboxHint: false }), "",
        "Perform only an advisory Existing-Project Work Intake routing assessment. Routing owns no source and does not create a target Workflow.",
        `Read the generated Work Intake projection at ${relPath} (Work Intake recordVersion ${snapshot.intake.recordVersion}). It is non-authoritative context; Project State remains authoritative.`,
        ...(sourceDevRevision ? ["The Current Project has optional managed source. Inspect relevant Dev files only through repo_toolbox Project-relative Dev/... paths. For Git evidence, first identify the exact managed Dev repositoryCheckoutId using git_toolbox and select it explicitly. Do not mutate Git."] : ["Managed source inspection is unavailable or not configured. Continue from the Work Intake and Project evidence without blocking the assessment."]),
        `Request: ${snapshot.intake.body.request}`, `Desired outcome: ${snapshot.intake.body.desiredOutcome}`,
        `Constraints: ${snapshot.intake.body.constraints.join("; ") || "None supplied."}`, `Evidence context: ${snapshot.intake.body.evidenceContext.join("; ") || "None supplied."}`,
        ...(context.revisionInstructions ? [`Operator revision instructions: ${context.revisionInstructions}`] : []),
        "Recommend one route from this exact set:", ...routeRows.map(([route, description]) => `- ${route}: ${description}`),
        `Use only these work traits when applicable: ${workRouteTraitIds.join(", ")}.`,
        "Do not conduct target-specific architecture or planning. Do not create a roadmap, plan, work items, or implementation. Include a concise rationale, an optional distinct alternate with ambiguity explanation, and optional human-readable inspected evidence notes. Source file paths are not required for promotion.",
        "Return body-only Markdown with these exact sections:", "# Work Intake Routing Assessment", "## Recommended Route", "<one exact route ID>",
        "## Traits", "<one trait per bullet, or None>", "## Rationale", "<concise rationale>", "## Alternate Route", "<one distinct route ID or None>",
        "Include ## Ambiguity only when an alternate exists. Include ## Inspected Evidence Notes only when helpful.",
        "Never supply application metadata, selected-route fields, or authoritative output writes. Create only the temporary draft using artifact_toolbox:",
        "```json", ...buildWriteMarkdownArtifactJsonBlock(workspaceRoot, submission.expectedDraftSlots[0].draftRelativePath, "<complete body-only routing assessment>"), "```",
      ].join("\n"),
      buildPostPromotionSelection: () => ({ projectionPath: relPath }),
    };
  }

  async function readOptionalDevRevision(root: string): Promise<string | null> {
    try { return await readDevRevision(root); } catch { return null; }
  }

  function assessmentVersionAndDev(record: ProjectStateRecord<"RouteAssessment">): { version: number; devRevision: string | null } {
    const match = /^work-intake-record-version:(\d+)(?:;dev-head:([a-f0-9]{40}(?:[a-f0-9]{24})?))?$/i.exec(record.provenance.sourceRef ?? "");
    return { version: match ? Number(match[1]) : 0, devRevision: match?.[2] ?? null };
  }

  async function currentModel(root: string, store: ProjectStateStore, projectId: ProjectId, intakeId: string, routingWorkflowId: string,
    runtime?: ActiveArchitectOutputRuntimeSubmission<"routing-assessment">): Promise<StructuredWorkRoutingModel> {
    const context = await exactContext(store, projectId, intakeId, routingWorkflowId);
    const currentAssessment = context.latestAssessment;
    const assessmentSource = currentAssessment ? assessmentVersionAndDev(currentAssessment) : null;
    let assessmentStale = context.assessmentStale;
    if (assessmentSource?.devRevision) {
      try { assessmentStale ||= await readDevRevision(root) !== assessmentSource.devRevision; }
      catch { assessmentStale = true; }
    }
    let assessment: StructuredWorkRoutingAssessment | null = null;
    if (currentAssessment) {
      if (!isWIRRoute(currentAssessment.body.recommendation) || currentAssessment.body.alternate !== undefined && !isWIRRoute(currentAssessment.body.alternate))
        throw Error("Stored RouteAssessment contains a route unavailable to Existing-Project WIR.");
      const relative = projectionPath(intakeId);
      const projection = resolveRepositoryPath(root, relative, { allowMissingLeaf: true });
      let evidenceNotes = "";
      if (fs.existsSync(projection.resolvedPath)) {
        const text = fs.readFileSync(projection.resolvedPath, "utf8");
        const match = text.match(/## Inspected Evidence Notes\n([\s\S]*?)(?:\n## |$)/);
        evidenceNotes = match?.[1]?.trim() ?? "";
      }
      assessment = { assessmentId: currentAssessment.id, recommendation: currentAssessment.body.recommendation,
        traits: [...currentAssessment.body.traits], rationale: currentAssessment.body.rationale,
        ...(currentAssessment.body.alternate ? { alternate: currentAssessment.body.alternate } : {}), evidenceNotes,
        sourceRecordVersion: assessmentSource?.version ?? 0, stale: assessmentStale };
    }
    const reviewState = context.currentReview?.body.outcome === "revision_requested" ? "revision-requested" : context.currentReview ? "decided" : "none";
    const active = runtime ?? getActiveArchitectOutputRuntimeSubmission<"routing-assessment", { projectionPath: string }>(root, `wir-${intakeId}`);
    let preparedStale = false;
    if (active && active.submission.state !== "promoted" && active.submission.state !== "superseded") {
      const prepared = active.preparedContext as PreparedContext;
      preparedStale = prepared.intake.recordVersion !== context.intake.recordVersion;
      if (prepared.sourceDevRevision) {
        try { preparedStale ||= await readDevRevision(root) !== prepared.sourceDevRevision; }
        catch { preparedStale = true; }
      }
      if (preparedStale) {
        active.submission = { ...active.submission, state: "superseded" };
        active.promotionError = "Routing sources changed; prepare a fresh assessment.";
      }
      const inspection = preparedStale ? null : inspectArchitectDraftSubmission(root, active.submission);
      if (inspection?.state === "ready-for-promotion") {
        try {
          const parsed = parseAssessment(inspection.presentSlots[0]?.bodyMarkdown ?? "");
          const sourceRef = `work-intake-record-version:${context.intake.recordVersion}${prepared.sourceDevRevision ? `;dev-head:${prepared.sourceDevRevision}` : ""}`;
          const assessmentRecord = await createProjectStateService(store, architect).recordRouteAssessment(projectId, intakeId,
            { recommendation: parsed.recommendation, traits: parsed.traits, rationale: parsed.rationale,
              ...(parsed.alternate ? { alternate: parsed.alternate } : {}), evidenceIds: [] },
            { reason: "Promote Architect routing assessment into Project State", correlationId: active.submission.submissionId, causationId: sourceRef });
          active.submission = { ...active.submission, state: "promoted", promotionRecord: { finalRelativePaths: [], selection: { projectionPath: projectionPath(intakeId) } } };
          cleanupArchitectDraftSubmission(root, active.submission);
          const markdown = `# Work Intake Routing Assessment\n\n## Recommended Route\n${parsed.recommendation}\n\n## Traits\n${parsed.traits.length ? parsed.traits.map(item => `- ${item}`).join("\n") : "None"}\n\n## Rationale\n${parsed.rationale}\n\n## Alternate Route\n${parsed.alternate ?? "None"}${parsed.alternate ? `\n\n## Ambiguity\n${inspection.presentSlots[0]?.bodyMarkdown.match(/## Ambiguity\\n([\\s\\S]*?)(?:\\n## |$)/)?.[1]?.trim() ?? ""}` : ""}${parsed.evidenceNotes ? `\n\n## Inspected Evidence Notes\n${parsed.evidenceNotes}` : ""}`;
          writeArtifactTransaction(root, [{ relativePath: projectionPath(intakeId), content: `> Generated non-authoritative Architect assessment. Project State RouteAssessment ${assessmentRecord.id} is authoritative.\n\n${markdown}` }]);
          return currentModel(root, store, projectId, intakeId, routingWorkflowId, active);
        } catch (failure) {
          active.promotionError = failure instanceof Error ? failure.message : "Routing assessment promotion failed.";
          active.submission = { ...active.submission, state: "promotion-failed" };
        }
      }
    }
    return { projectId, intakeId, routingWorkflowId, request: context.intake.body.request, desiredOutcome: context.intake.body.desiredOutcome,
      constraints: [...context.intake.body.constraints], evidenceContext: [...context.intake.body.evidenceContext], intakeRecordVersion: context.intake.recordVersion,
      intakeState: context.intake.body.intakeState, workflowState: context.workflow.body.workflowState, assessment,
      reviewState: reviewState as StructuredWorkRoutingModel["reviewState"],
      ...(reviewState === "revision-requested" && context.currentReview ? { revisionInstructions: context.currentReview.body.rationale } : {}),
      ...(active ? { preparedSubmission: active.submission,
        ...(active.submission.state === "waiting-for-drafts" || active.submission.state === "partial-draft-set" ? { preparedInstruction: active.preparedInstruction } : {}),
        ...(active.promotionError ? { error: active.promotionError } : {}) } : {}),
      selectedRoute: context.selectedRoute, targetWorkflowId: context.targetWorkflowId, closed: context.closed };
  }

  async function withModel<T>(root: string, intakeId: string, routingWorkflowId: string,
    action: (store: ProjectStateStore, projectId: ProjectId, model: StructuredWorkRoutingModel) => Promise<T>): Promise<T> {
    const canonicalRoot = fs.realpathSync(root);
    return withCurrentProject(canonicalRoot, async (store, projectId) => {
      const model = await currentModel(canonicalRoot, store, projectId, intakeId, routingWorkflowId);
      return action(store, projectId, model);
    });
  }

  async function get(root: string, intakeId: string, routingWorkflowId: string) {
    return withModel(root, intakeId, routingWorkflowId, async (_store, _projectId, model) => model);
  }

  async function prepare(root: string, intakeId: string, routingWorkflowId: string) {
    const canonicalRoot = fs.realpathSync(root);
    await withCurrentProject(canonicalRoot, async (_store, projectId) => {
      const definition = await makeDefinition(canonicalRoot, projectId, intakeId, routingWorkflowId);
      prepareArchitectOutputRuntimeSubmission(canonicalRoot, outputKind, `wir-${intakeId}`, createArchitectOutputRegistry([definition]));
    });
    return get(canonicalRoot, intakeId, routingWorkflowId);
  }

  async function decide(root: string, intakeId: string, routingWorkflowId: string, input: StructuredWorkRoutingDecisionInput) {
    const canonicalRoot = fs.realpathSync(root);
    return withCurrentProject(root, async (store, projectId) => {
      const context = await exactContext(store, projectId, intakeId, routingWorkflowId);
      if (!input || Object.keys(input).some(key => !["assessmentId", "disposition", "route", "rationale"].includes(key)) ||
        !["accept", "override", "request-revision"].includes(input.disposition) ||
        (input.rationale !== undefined && typeof input.rationale !== "string") ||
        (input.rationale?.trim().length ?? 0) > 4000 ||
        (input.disposition !== "accept" && !input.rationale?.trim()))
        throw Error("A bounded Operator route decision is required.");
      const rationale = input.rationale?.trim() || "Operator accepted Architect recommendation.";
      if (context.currentReview?.body.outcome === "revision_requested") throw Error("Prepare and review the requested revised assessment before selecting a route.");
      if (!context.latestAssessment || context.latestAssessment.id !== input.assessmentId || context.assessmentStale) throw Error("Presented RouteAssessment is stale or unavailable.");
      const assessmentSource = assessmentVersionAndDev(context.latestAssessment);
      if (assessmentSource.devRevision) {
        try { if (await readDevRevision(root) !== assessmentSource.devRevision) throw Error("Managed Dev HEAD changed; refresh and prepare a current routing assessment."); }
        catch (failure) { if (failure instanceof Error && failure.message.includes("Managed Dev HEAD changed")) throw failure; throw Error("Managed Dev HEAD is unavailable; prepare a current routing assessment."); }
      }
      const state = createProjectStateService(store, operator);
      if (input.disposition === "request-revision") {
        await state.recordWorkIntakeRouteRevisionRequest(projectId, intakeId, { assessmentId: input.assessmentId, rationale },
          { reason: "Request revised Architect routing assessment", correlationId: `wir-revision-${randomUUID()}` });
        return currentModel(canonicalRoot, store, projectId, intakeId, routingWorkflowId);
      }
      const route = input.disposition === "accept" ? context.latestAssessment.body.recommendation : input.route;
      if (!isWIRRoute(route) || (input.disposition === "override" && route === context.latestAssessment.body.recommendation)) throw Error("Choose a distinct supported override route.");
      if (input.disposition === "accept" && input.route !== undefined) throw Error("Accept does not accept an override route.");
      const repositoryId = await resolveRepositoryId(root);
      let sourceSeed: { repositoryId: string; integrationTargetSourceLineId: string; baseRevisionId: string } | undefined;
      if (repositoryId) {
        const baseRevisionId = await readDevRevision(root);
        if (assessmentSource.devRevision && assessmentSource.devRevision !== baseRevisionId) throw Error("Managed Dev HEAD changed; prepare a current routing assessment.");
        sourceSeed = { repositoryId, integrationTargetSourceLineId: "dev", baseRevisionId };
      }
      const correlationId = `wir-route-${randomUUID()}`;
      await state.completeWorkIntakeRouteHandoff(projectId, { intakeId, routingWorkflowId, assessmentId: input.assessmentId,
        disposition: input.disposition, route, rationale, targetTitle: context.intake.body.request.slice(0, 200).trim() || "Routed Work",
        ...(sourceSeed ? { sourceSeed } : {}) }, { reason: "Complete structured WIR route handoff", correlationId });
      return currentModel(canonicalRoot, store, projectId, intakeId, routingWorkflowId);
    });
  }

  return { get, prepare, decide };
}
