import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { PROJECT_STATE_DATABASE_SCHEMA_VERSION } from "../projectState/sqliteSchema";
import { createSQLiteProjectStateStore } from "../projectState/sqliteProjectStateStore";
import { createProjectStateService } from "../../shared/projectState/projectStateService";
import type { ProjectStateEntity } from "../../shared/projectState/domainContracts";
import { inventoryLegacyMarkdownAuthority, type LegacyAuthoritySnapshot } from "./legacyAuthorityInventory";
import { STAGED_LEGACY_IMPORTER_VERSION, type StagedLegacyImport } from "./stagedLegacyImporter";

export interface EquivalenceMismatch { code: string; severity: "blocking" | "non-blocking"; path: string; expected: string; actual: string }
export interface LegacyEquivalenceResult { snapshotId: string; snapshotDigest: string; importerVersion: number; schemaVersion: number; eligible: boolean; shadowRead: boolean; comparedFacts: number; projectionDigests: { path: string; sha256: string }[]; mismatches: EquivalenceMismatch[] }
function hash(value: string | Buffer): string { return createHash("sha256").update(value).digest("hex"); }
function value(value: unknown): string { return typeof value === "string" ? value : JSON.stringify(value); }

/** Read-only comparison of an exact V1 source and a disposable staged SQLite graph. */
export async function verifyStagedLegacyEquivalence(workspaceRoot: string, snapshot: LegacyAuthoritySnapshot,
  staged: StagedLegacyImport, options: { shadowRead?: boolean } = {}): Promise<LegacyEquivalenceResult> {
  const mismatches: EquivalenceMismatch[] = [];
  const projectionDigests: LegacyEquivalenceResult["projectionDigests"] = [];
  let comparedFacts = 0;
  const add = (code: string, path: string, expected: unknown, actual: unknown, severity: EquivalenceMismatch["severity"] = "blocking") => {
    mismatches.push({ code, path, expected: value(expected), actual: value(actual), severity });
  };
  const result = (): LegacyEquivalenceResult => ({ snapshotId: snapshot.snapshotId, snapshotDigest: snapshot.digest,
    importerVersion: STAGED_LEGACY_IMPORTER_VERSION, schemaVersion: PROJECT_STATE_DATABASE_SCHEMA_VERSION,
    eligible: !mismatches.some(item => item.severity === "blocking"), shadowRead: options.shadowRead === true,
    comparedFacts, projectionDigests, mismatches: mismatches.sort((a, b) => a.path.localeCompare(b.path) || a.code.localeCompare(b.code)) });
  const current = inventoryLegacyMarkdownAuthority(workspaceRoot);
  if (!snapshot.complete || !current.complete || current.digest !== snapshot.digest || current.snapshotId !== snapshot.snapshotId ||
    JSON.stringify(current.documents) !== JSON.stringify(snapshot.documents)) {
    add("stale-source", "<snapshot>", snapshot.digest, current.digest);
    return result();
  }
  const root = fs.realpathSync(workspaceRoot);
  const expectedStage = path.join(root, ".champcity", "project-state-staging", snapshot.snapshotId);
  if (staged.snapshotId !== snapshot.snapshotId || staged.digest !== snapshot.digest || staged.stageRoot !== expectedStage ||
    staged.importerVersion !== STAGED_LEGACY_IMPORTER_VERSION || staged.schemaVersion !== PROJECT_STATE_DATABASE_SCHEMA_VERSION ||
    staged.databasePath !== path.join(expectedStage, "project-state.sqlite") || !fs.existsSync(staged.databasePath) ||
    !fs.lstatSync(staged.databasePath).isFile() || fs.lstatSync(staged.databasePath).isSymbolicLink()) {
    add("staged-candidate", "<candidate>", expectedStage, staged.stageRoot);
    return result();
  }
  const database = new DatabaseSync(staged.databasePath, { readOnly: true });
  try {
    const schema = (database.prepare("PRAGMA user_version").get() as { user_version: number }).user_version;
    if (schema !== PROJECT_STATE_DATABASE_SCHEMA_VERSION) add("schema-version", "<candidate>", PROJECT_STATE_DATABASE_SCHEMA_VERSION, schema);
  } finally { database.close(); }
  if (mismatches.length) return result();
  const store = createSQLiteProjectStateStore(staged.databasePath);
  try {
    const service = createProjectStateService(store, { principalId: "legacy-verifier", principalType: "system", role: "verification" });
    const records = await store.listEntities(staged.projectId);
    const byId = new Map(records.map(record => [record.id, record]));
    const edges = await store.listRelationships(staged.projectId);
    const edge = (from: string | null | undefined, type: string, to: string | null | undefined) =>
      Boolean(from && to && edges.some(item => item.fromEntityId === from && item.relationshipType === type && item.toEntityId === to && !item.endedAt));
    const correlations = new Map(staged.correlations.map(item => [item.legacyPath, item]));
    const evidence = (name: string) => byId.get(correlations.get(name)?.evidenceId ?? "");
    const semantic = (name: string) => byId.get(correlations.get(name)?.entityId ?? "");
    const intakeDocuments = snapshot.documents.filter(item => item.metadata.artifactType === "work-intake");
    const activeIntakeCount = records.filter(item => item.entityType === "WorkIntake" && item.lifecycleState === "active").length;
    comparedFacts++;
    if (activeIntakeCount !== intakeDocuments.length) add("active-intake-count", "<project>", intakeDocuments.length, activeIntakeCount);
    const projectSource = snapshot.documents.find(item => item.metadata.artifactType === "work-project") ?? snapshot.documents.find(item => item.metadata.artifactType === "project-intake");
    const project = byId.get(staged.projectId);
    if (projectSource) {
      const expectedName = projectSource.metadata.workflowData.name ?? projectSource.metadata.workflowData.projectName;
      comparedFacts++;
      if (project?.entityType !== "Project" || project.body.name !== expectedName) add("project-name", projectSource.path, expectedName, project?.entityType === "Project" ? project.body.name : null);
    }
    for (const document of snapshot.documents) {
      const correlation = correlations.get(document.path);
      const proof = evidence(document.path);
      const payload = proof?.entityType === "Evidence" ? path.join(expectedStage, proof.body.payloadRef) : "";
      comparedFacts++;
      if (!correlation || correlation.legacyHash !== document.sha256 || correlation.artifactRevision !== document.metadata.artifactRevision ||
        proof?.entityType !== "Evidence" || proof.body.digest !== document.sha256 ||
        !proof.provenance.sourceRef?.includes(`${document.path}#r${document.metadata.artifactRevision}@${document.sha256}`) ||
        !payload.startsWith(path.join(expectedStage, "legacy-evidence") + path.sep) || !fs.existsSync(payload) || hash(fs.readFileSync(payload)) !== document.sha256) {
        add("evidence-fidelity", document.path, document.sha256, proof?.entityType === "Evidence" ? proof.body.digest : null);
      }
      for (const source of document.sourceRevisions) {
        comparedFacts++;
        if (!edge(proof?.id, "derived_from", evidence(source.path.replace(/\\/g, "/"))?.id)) add("source-lineage", document.path, source.path, "missing edge");
      }
      const mapped = semantic(document.path);
      const kind = document.metadata.artifactType;
      const expectedType = kind === "work-intake" ? "WorkIntake" : kind === "phase-planning" ? "Phase" :
        ["formal-work-card", "repair-work-card", "fix-card"].includes(kind) ? "WorkItem" : kind === "issue-record" ? "Finding" : null;
      if (expectedType) {
        comparedFacts++;
        if (mapped?.entityType !== expectedType) add("semantic-type", document.path, expectedType, mapped?.entityType ?? null);
      }
      if (kind === "work-intake" && mapped?.entityType === "WorkIntake") {
        const hasRoute = snapshot.documents.some(item => item.metadata.artifactType === "operator-route-decision" &&
          item.metadata.identity.intakeId === document.metadata.identity.intakeId && Array.isArray(item.metadata.workflowData.history) && item.metadata.workflowData.history.length > 0);
        const expectedState = hasRoute ? "routed" : "captured";
        comparedFacts++;
        if (mapped.body.intakeState !== expectedState) add("intake-stage", document.path, expectedState, mapped.body.intakeState);
      }
      if (mapped?.entityType === "WorkItem") {
        const closed = snapshot.documents.some(item => ["work-card-close-return-record", "fix-card-close-record"].includes(item.metadata.artifactType) &&
          item.metadata.documentDisposition.status === "Approved" && item.sourceRevisions.some(source => source.path === document.path));
        const expectedState = closed ? "closed" : document.metadata.documentDisposition.status === "Approved" ? "ready" : "planned";
        comparedFacts++;
        if (mapped.body.workState !== expectedState) add("work-stage", document.path, expectedState, mapped.body.workState);
        const phaseAlias = document.metadata.identity.phaseId;
        if (typeof phaseAlias === "string") {
          const phase = snapshot.documents.find(item => item.metadata.artifactType === "phase-planning" && item.metadata.identity.phaseId === phaseAlias);
          comparedFacts++;
          if (!edge(mapped.id, "part_of", phase && semantic(phase.path)?.id)) add("phase-membership", document.path, phaseAlias, "missing edge");
        }
        const parentAlias = document.metadata.identity.parentWorkCardId ?? document.metadata.identity.parentFixCardId;
        if (typeof parentAlias === "string") {
          const parent = snapshot.documents.find(item => ["formal-work-card", "fix-card"].includes(item.metadata.artifactType) &&
            [item.metadata.identity.workCardId, item.metadata.identity.fixCardId, item.metadata.identity.candidateId].includes(parentAlias));
          comparedFacts++;
          if (!edge(mapped.id, "repairs", parent && semantic(parent.path)?.id)) add("open-repair", document.path, parentAlias, "missing edge");
        }
        const candidate = document.metadata.workflowData.candidate as Record<string, unknown> | undefined;
        for (const alias of Array.isArray(candidate?.dependsOn) ? candidate.dependsOn : []) {
          const dependency = snapshot.documents.find(item => ["formal-work-card", "repair-work-card", "fix-card"].includes(item.metadata.artifactType) &&
            [item.metadata.identity.workCardId, item.metadata.identity.repairId, item.metadata.identity.fixCardId, item.metadata.identity.candidateId].includes(alias));
          comparedFacts++;
          if (!edge(mapped.id, "depends_on", dependency && semantic(dependency.path)?.id)) add("dependency", document.path, alias, "missing edge");
        }
      }
      if (kind === "phase-planning" && mapped?.entityType === "Phase") {
        const expectedState = document.metadata.documentDisposition.status === "Approved" ? "active" : "planned";
        comparedFacts++;
        if (mapped.body.phaseState !== expectedState) add("phase-stage", document.path, expectedState, mapped.body.phaseState);
      }
      if (kind === "operator-route-decision") {
        const history = document.metadata.workflowData.history;
        if (Array.isArray(history)) for (const entry of history) {
          const row = entry as Record<string, unknown>;
          const advice = row.advice as Record<string, unknown> | undefined;
          const decision = row.decision as Record<string, unknown> | undefined;
          const assessments = records.filter(item => item.entityType === "RouteAssessment" && item.provenance.sourceRef?.startsWith(`${document.path}#`));
          const decisions = records.filter(item => item.entityType === "Decision" && item.body.decisionType === "work-intake-route" && item.provenance.sourceRef?.startsWith(`${document.path}#`));
          comparedFacts++;
          if (!assessments.some(item => item.entityType === "RouteAssessment" && item.body.recommendation === advice?.recommendedRouteId) ||
            !decisions.some(item => item.entityType === "Decision" && item.body.outcome === decision?.selectedRouteId)) {
            add("route-state", document.path, { recommendation: advice?.recommendedRouteId, selected: decision?.selectedRouteId },
              { assessments: assessments.length, decisions: decisions.length });
          }
        }
        if (Array.isArray(history)) {
          const selected = [...history].reverse().map(entry => (entry as Record<string, unknown>).decision as Record<string, unknown> | undefined)
            .find(decision => typeof decision?.selectedRouteId === "string");
          const intakeSource = snapshot.documents.find(item => item.metadata.artifactType === "work-intake" &&
            item.metadata.identity.intakeId === document.metadata.identity.intakeId);
          const intake = intakeSource ? semantic(intakeSource.path) : null;
          const route = intake?.entityType === "WorkIntake" ? await service.getCurrentWorkRoute(staged.projectId, intake.id) : null;
          comparedFacts++;
          if ((selected?.selectedRouteId ?? null) !== (route?.route ?? null)) {
            add("route-effective-state", document.path, selected?.selectedRouteId ?? null, route?.route ?? null);
          }
        }
      }
      if (["validation-record", "issue-validation-record"].includes(kind)) {
        const data = document.metadata.workflowData;
        const explicit = data.targetPath !== undefined;
        comparedFacts++;
        if (explicit && (mapped?.entityType !== "Validation" || mapped.body.outcome !== data.outcome ||
          mapped.body.targetEntityId !== semantic(String(data.targetPath))?.id)) add("validation-state", document.path, data.outcome, mapped?.entityType === "Validation" ? mapped.body.outcome : "historical Evidence only");
        if (!explicit) add("validation-facts-absent", document.path, "typed Validation facts", "historical Evidence retained");
      }
      const status = document.metadata.documentDisposition.status;
      if (status !== "Pending") {
        const expected = { Approved: "approved", Rejected: "rejected", RevisionRequested: "revision_requested" }[status];
        const decisions = records.filter(item => item.entityType === "Decision" && item.body.decisionType === "legacy-document-disposition" &&
          item.provenance.sourceRef?.startsWith(`${document.path}#`));
        comparedFacts++;
        if (decisions.length !== 1 || decisions[0].entityType !== "Decision" || decisions[0].body.outcome !== expected ||
          !edge(decisions[0].id, "governs", mapped?.id ?? proof?.id)) add("disposition", document.path, expected, decisions.map(item => item.entityType === "Decision" ? item.body.outcome : null));
      }
      if (mapped && ["WorkIntake", "WorkItem", "Validation"].includes(mapped.entityType)) {
        const projectionType = mapped.entityType === "WorkIntake" ? "work-intake" : mapped.entityType === "Validation" ? "validation" :
          mapped.entityType === "WorkItem" && mapped.body.workItemKind === "repair" ? "repair" :
          mapped.entityType === "WorkItem" && mapped.body.workItemKind === "fix" ? "fix" : "work-item";
        try {
          const projection = await service.renderView(staged.projectId, { projectionType, sourceEntityId: mapped.id });
          const normalized = projection.markdown.replace(/\| generatedAt \|[^\n]+/, "| generatedAt | <generated> |");
          const projectionHash = hash(normalized);
          projectionDigests.push({ path: document.path, sha256: projectionHash });
          comparedFacts++;
          if (!projection.markdown.includes(mapped.id) || projection.metadata.authoritative) add("projection", document.path, mapped.id, "missing semantic identity");
          if (projectionHash !== document.sha256) add("projection-format", document.path, document.sha256, projectionHash, "non-blocking");
        } catch (error) { add("projection", document.path, "renderable structured view", error instanceof Error ? error.message : String(error)); }
      }
    }
  } finally { store.close(); }
  projectionDigests.sort((a, b) => a.path.localeCompare(b.path));
  return result();
}
