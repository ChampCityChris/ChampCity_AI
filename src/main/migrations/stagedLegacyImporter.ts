import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { EntityBodyMap, EntityType, PrincipalRef, ProjectStateEntity } from "../../shared/projectState/domainContracts";
import { validateProjectStateEntity } from "../../shared/projectState/entityTypeRegistry";
import type { ProjectStateRelationship, RelationshipType } from "../../shared/projectState/relationshipRegistry";
import { createSQLiteProjectStateStore } from "../projectState/sqliteProjectStateStore";
import { PROJECT_STATE_DATABASE_SCHEMA_VERSION } from "../projectState/sqliteSchema";
import { inventoryLegacyMarkdownAuthority, type LegacyAuthorityDocument, type LegacyAuthoritySnapshot } from "./legacyAuthorityInventory";

const principal: PrincipalRef = { principalId: "legacy-importer", principalType: "system", role: "migration" };
const importTime = "2000-01-01T00:00:00.000Z";
export const STAGED_LEGACY_IMPORTER_VERSION = 2;
const workKinds = new Map<string, EntityBodyMap["WorkItem"]["workItemKind"]>([["formal-work-card", "feature"], ["repair-work-card", "repair"], ["fix-card", "fix"]]);
const maxSemanticText = 4096;

function digest(value: string): string { return createHash("sha256").update(value).digest("hex"); }
function id(seed: string): string {
  const hex = digest(seed);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
function required(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim() || Buffer.byteLength(value) > maxSemanticText) throw Error(`Legacy import requires bounded ${label}.`);
  return value.trim();
}
function text(value: unknown): string | undefined { return typeof value === "string" && value.trim() ? value.trim() : undefined; }
function heading(document: LegacyAuthorityDocument): string {
  return required(document.content.match(/^#\s+(.+)$/m)?.[1] ?? document.metadata.artifactType, `${document.path} heading`);
}
function body(document: LegacyAuthorityDocument): string {
  const markdown = document.content.split("CHAMPCITY-METADATA -->")[1]?.trim();
  if (!markdown) throw Error(`Legacy import requires ${document.path} body.`);
  let excerpt = "";
  for (const character of markdown) {
    if (Buffer.byteLength(excerpt) + Buffer.byteLength(character) > maxSemanticText) break;
    excerpt += character;
  }
  return required(excerpt, `${document.path} body`);
}
function sourceRef(document: LegacyAuthorityDocument): string {
  return required(`${document.path}#r${document.metadata.artifactRevision}@${document.sha256}`, "provenance source reference");
}

export interface StagedLegacyImport {
  snapshotId: string;
  digest: string;
  importerVersion: number;
  schemaVersion: number;
  projectId: string;
  databasePath: string;
  stageRoot: string;
  correlations: { legacyPath: string; legacyHash: string; artifactRevision: number; evidenceId: string; entityId: string | null; entityType: EntityType | null }[];
}

/** Revalidates one exact source snapshot and builds a disposable candidate, never a live authority switch. */
export async function stageLegacyAuthorityImport(workspaceRoot: string, snapshot: LegacyAuthoritySnapshot): Promise<StagedLegacyImport> {
  const current = inventoryLegacyMarkdownAuthority(workspaceRoot);
  if (!snapshot.complete || !current.complete || snapshot.snapshotId !== current.snapshotId || snapshot.digest !== current.digest ||
    JSON.stringify(snapshot.documents) !== JSON.stringify(current.documents) || JSON.stringify(snapshot.conflicts) !== JSON.stringify(current.conflicts)) {
    throw Error("Legacy snapshot is incomplete or differs from current authority.");
  }
  const projectSources = snapshot.documents.filter(document => ["work-project", "project-intake"].includes(document.metadata.artifactType));
  const explicitProjects = projectSources.filter(document => document.metadata.artifactType === "work-project");
  if (explicitProjects.length > 1 || (!explicitProjects.length && projectSources.length !== 1)) throw Error("Legacy Project authority is missing or ambiguous.");
  const projectSource = explicitProjects[0] ?? projectSources[0];
  const projectName = required(projectSource.metadata.workflowData.name ?? projectSource.metadata.workflowData.projectName, "Project name");
  for (const item of projectSources) {
    const name = text(item.metadata.workflowData.name ?? item.metadata.workflowData.projectName);
    if (name && name !== projectName) throw Error("Legacy Project names conflict.");
  }
  const root = fs.realpathSync(workspaceRoot);
  const appRoot = path.join(root, ".champcity");
  if (fs.existsSync(appRoot) && (fs.lstatSync(appRoot).isSymbolicLink() || !fs.lstatSync(appRoot).isDirectory())) throw Error("Application storage escapes the selected workspace.");
  fs.mkdirSync(appRoot, { recursive: true });
  if (path.dirname(fs.realpathSync(appRoot)) !== root) throw Error("Application storage escapes the selected workspace.");
  const base = path.join(appRoot, "project-state-staging");
  if (fs.existsSync(base) && (fs.lstatSync(base).isSymbolicLink() || !fs.lstatSync(base).isDirectory())) throw Error("Staging storage escapes the selected workspace.");
  fs.mkdirSync(base, { recursive: true });
  if (path.dirname(fs.realpathSync(base)) !== fs.realpathSync(appRoot)) throw Error("Staging storage escapes the selected workspace.");
  const stageRoot = path.join(base, snapshot.snapshotId);
  if (fs.existsSync(stageRoot)) throw Error("This exact legacy snapshot already has a staged candidate; discard it before rebuilding.");
  fs.mkdirSync(stageRoot);
  const databasePath = path.join(stageRoot, "project-state.sqlite");
  const evidenceRoot = path.join(stageRoot, "legacy-evidence");
  fs.mkdirSync(evidenceRoot);
  let store: ReturnType<typeof createSQLiteProjectStateStore> | undefined;
  try {
    const projectId = id(`${snapshot.digest}:project:${projectSource.path}`);
    const records: ProjectStateEntity[] = [];
    const relations: ProjectStateRelationship[] = [];
    const byPath = new Map<string, ProjectStateEntity>();
    const evidenceByPath = new Map<string, ProjectStateEntity>();
    const itemAliases = new Map<string, ProjectStateEntity[]>();
    const phases = new Map<string, ProjectStateEntity[]>();
    const intakesByAlias = new Map<string, ProjectStateEntity>();
    const correlations: StagedLegacyImport["correlations"] = [];
    const entity = <T extends EntityType>(kind: T, document: LegacyAuthorityDocument, role: string, content: EntityBodyMap[T]): ProjectStateEntity => {
      const entityId = role === "project" ? projectId : id(`${snapshot.digest}:${document.path}:${role}`);
      const record = validateProjectStateEntity({ id: entityId, projectId, entityType: kind,
        lineageId: id(`${snapshot.digest}:${document.path}:${role}:lineage`), recordVersion: 1, schemaVersion: 1,
        lifecycleState: "active", createdAt: importTime, updatedAt: importTime, createdBy: principal, updatedBy: principal,
        provenance: { origin: "legacy-import", sourceRef: sourceRef(document), correlationId: snapshot.digest }, body: content });
      records.push(record);
      return record;
    };
    const relate = (from: ProjectStateEntity, kind: RelationshipType, to: ProjectStateEntity) => {
      if (from.id === to.id) throw Error(`Legacy ${kind} relationship cannot point to itself.`);
      if (relations.some(edge => edge.fromEntityId === from.id && edge.relationshipType === kind && edge.toEntityId === to.id)) return;
      relations.push({ id: id(`${snapshot.digest}:edge:${from.id}:${kind}:${to.id}`), projectId, fromEntityId: from.id,
        relationshipType: kind, toEntityId: to.id, createdAt: importTime, createdBy: principal });
    };
    const project = entity("Project", projectSource, "project", { name: projectName,
      description: text(projectSource.metadata.workflowData.description) ?? "Legacy Project description was not recorded." });
    for (const document of snapshot.documents) {
      const evidenceFile = `${document.sha256}.md`;
      const payloadRef = `legacy-evidence/${evidenceFile}`;
      const target = path.join(evidenceRoot, evidenceFile);
      if (!fs.existsSync(target)) fs.writeFileSync(target, document.content, { flag: "wx" });
      const evidence = entity("Evidence", document, "evidence", { evidenceType: "legacy-markdown", description: required(JSON.stringify({ path: document.path,
        artifactType: document.metadata.artifactType, aliases: document.aliases, artifactRevision: document.metadata.artifactRevision }), "Evidence description"),
        capturedAt: importTime, capturedBy: principal, mediaType: "text/markdown", payloadRef, digest: document.sha256, size: document.bytes });
      evidenceByPath.set(document.path, evidence);
      let mapped: ProjectStateEntity | null = document.path === projectSource.path ? project : null;
      const kind = document.metadata.artifactType;
      const data = document.metadata.workflowData;
      if (kind === "work-intake") {
        const branch = data.branchBinding as Record<string, unknown> | undefined;
        const intakeAlias = required(document.metadata.identity.intakeId, "Work Intake alias");
        const hasRoute = snapshot.documents.some(item => item.metadata.artifactType === "operator-route-decision" &&
          item.metadata.identity.intakeId === intakeAlias && Array.isArray(item.metadata.workflowData.history) && item.metadata.workflowData.history.length > 0);
        mapped = entity("WorkIntake", document, "semantic", { request: required(data.workRequest, "Work Intake request"),
          desiredOutcome: required(data.desiredOutcome, "Work Intake outcome"),
          constraints: text(data.knownConstraints) ? [required(data.knownConstraints, "Work Intake constraints")] : [],
          evidenceContext: text(data.repositoryReviewContext) ? [required(data.repositoryReviewContext, "Work Intake evidence context")] : [],
          intakeState: hasRoute ? "routed" : "captured", requestedIntegrationTarget: required(branch?.baseBranch, "Work Intake target SourceLine") });
        intakesByAlias.set(intakeAlias, mapped);
        const workflow = entity("Workflow", document, "workflow", { workflowType: "work-intake", workspace: "work-intake",
          governingEntityId: mapped.id, workflowState: hasRoute ? "active" : "planned" });
        relate(mapped, "initiates", workflow);
        const repositoryId = text(branch?.repositoryId) ?? text(projectSource.metadata.workflowData.repositoryId);
        if (repositoryId) {
          const baseRevisionId = text(branch?.baseCommit);
          const workSourceLineId = text(branch?.workBranch);
          const currentRevisionId = text(branch?.currentHead);
          const ready = Boolean(baseRevisionId && workSourceLineId && currentRevisionId);
          const binding = entity("SourceBinding", document, "source-binding", { workIntakeId: mapped.id,
            repositoryId, integrationTargetSourceLineId: required(branch?.baseBranch, "Work Intake target SourceLine"),
            ...(baseRevisionId ? { baseRevisionId } : {}), ...(workSourceLineId ? { workSourceLineId } : {}),
            ...(currentRevisionId && workSourceLineId ? { currentRevisionId } : {}), preparationState: ready ? "ready" : "unprepared" });
          relate(binding, "binds_source", mapped);
        }
      } else if (workKinds.has(kind)) {
        const candidate = data.candidate && typeof data.candidate === "object" && !Array.isArray(data.candidate) ? data.candidate as Record<string, unknown> : {};
        const closed = snapshot.documents.some(item => ["work-card-close-return-record", "fix-card-close-record"].includes(item.metadata.artifactType) &&
          item.metadata.documentDisposition.status === "Approved" && item.sourceRevisions.some(source => source.path === document.path));
        mapped = entity("WorkItem", document, "semantic", { workItemKind: workKinds.get(kind)!,
          title: required(candidate.title ?? data.title ?? heading(document), "Work Item title"),
          objective: required(candidate.purpose ?? data.objective ?? body(document), "Work Item objective"),
          workState: closed ? "closed" : document.metadata.documentDisposition.status === "Approved" ? "ready" : "planned" });
        for (const alias of [document.metadata.identity.workCardId, document.metadata.identity.fixCardId, document.metadata.identity.repairId, document.metadata.identity.candidateId]) {
          if (typeof alias === "string" && alias) itemAliases.set(alias, [...(itemAliases.get(alias) ?? []), mapped]);
        }
      } else if (kind === "phase-planning") {
        const phaseId = required(document.metadata.identity.phaseId, "Phase alias");
        const sequence = [...phases.keys()].length + 1;
        mapped = entity("Phase", document, "semantic", { title: heading(document), objective: body(document),
          phaseState: document.metadata.documentDisposition.status === "Approved" ? "active" : "planned", sequence });
        phases.set(phaseId, [...(phases.get(phaseId) ?? []), mapped]);
      } else if (kind === "issue-record") {
        mapped = entity("Finding", document, "semantic", { title: heading(document), statement: body(document), category: "legacy-issue",
          impact: "Impact was not recorded by the importer.", observedAt: importTime, findingState: "imported" });
      }
      if (mapped) { byPath.set(document.path, mapped); relate(evidence, "supports", mapped); }
      correlations.push({ legacyPath: document.path, legacyHash: document.sha256, artifactRevision: document.metadata.artifactRevision,
        evidenceId: evidence.id, entityId: mapped?.id ?? null, entityType: mapped?.entityType ?? null });
    }
    for (const document of snapshot.documents.filter(item => ["validation-record", "issue-validation-record"].includes(item.metadata.artifactType))) {
      const data = document.metadata.workflowData;
      const fields = ["targetPath", "validationType", "method", "validationMode", "outcome", "performedBy", "performedAt"] as const;
      const supplied = fields.filter(field => data[field] !== undefined);
      if (!supplied.length) continue; // Older records remain exact historical Evidence when semantic proof facts are absent.
      if (supplied.length !== fields.length) throw Error(`Legacy Validation facts are incomplete: ${document.path}.`);
      const targetPath = required(data.targetPath, "Validation target path");
      const target = byPath.get(targetPath);
      const source = document.sourceRevisions.find(item => item.path === targetPath);
      if (!target || !source) throw Error(`Legacy Validation target is missing or ambiguous: ${document.path}.`);
      const validation = entity("Validation", document, "semantic", {
        validationType: required(data.validationType, "Validation type"), method: required(data.method, "Validation method"),
        validationMode: data.validationMode as EntityBodyMap["Validation"]["validationMode"],
        outcome: data.outcome as EntityBodyMap["Validation"]["outcome"], targetEntityId: target.id,
        targetRecordVersion: source.revision, performedBy: data.performedBy as PrincipalRef,
        performedAt: data.performedAt as string, summary: required(data.summary ?? body(document), "Validation summary"),
      });
      byPath.set(document.path, validation);
      relate(validation, "evaluates", target);
      relate(evidenceByPath.get(document.path)!, "supports", validation);
      const correlation = correlations.find(item => item.legacyPath === document.path)!;
      correlation.entityId = validation.id;
      correlation.entityType = "Validation";
    }
    for (const document of snapshot.documents) {
      const disposition = document.metadata.documentDisposition;
      if (disposition.status === "Pending") continue;
      const target = byPath.get(document.path) ?? evidenceByPath.get(document.path)!;
      const outcome = { Approved: "approved", Rejected: "rejected", RevisionRequested: "revision_requested" }[disposition.status];
      if (!outcome) throw Error(`Unsupported legacy disposition: ${document.path}.`);
      const when = disposition.reviewedAt ?? importTime;
      const decision = entity("Decision", document, "disposition-decision", { decisionType: "legacy-document-disposition", outcome,
        rationale: disposition.notes, decisionRole: "migration-transcription", decisionScope: document.path,
        decidedBy: principal, decidedAt: when, effectiveAt: when });
      relate(decision, "governs", target);
    }
    for (const document of snapshot.documents.filter(item => item.metadata.artifactType === "operator-route-decision")) {
      const history = document.metadata.workflowData.history;
      if (!Array.isArray(history)) throw Error(`Legacy route history is invalid: ${document.path}.`);
      const intake = intakesByAlias.get(required(document.metadata.identity.intakeId, "route Intake alias"));
      if (!intake) throw Error(`Legacy route Intake is missing: ${document.path}.`);
      for (const [index, entry] of history.entries()) {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw Error(`Legacy route history entry is invalid: ${document.path}.`);
        const row = entry as Record<string, unknown>;
        const advice = row.advice as Record<string, unknown> | undefined;
        const decisionData = row.decision as Record<string, unknown> | undefined;
        if (!advice || !decisionData || !Array.isArray(advice.traits) || advice.traits.some(item => typeof item !== "string")) throw Error(`Legacy route facts are incomplete: ${document.path}.`);
        const assessment = entity("RouteAssessment", document, `route-assessment-${index}`, {
          workIntakeId: intake.id, recommendation: required(advice.recommendedRouteId, "recommended route") as EntityBodyMap["RouteAssessment"]["recommendation"],
          traits: advice.traits as string[], rationale: required(advice.rationale, "route rationale"), evidenceIds: [] });
        relate(assessment, "assesses_route", intake);
        const decidedAt = required(row.recordedAt, "route decision time");
        const decision = entity("Decision", document, `route-decision-${index}`, { decisionType: "work-intake-route",
          outcome: required(decisionData.selectedRouteId, "selected route"), rationale: required(decisionData.rationale, "route decision rationale"),
          decisionRole: "migration-transcription", decisionScope: `work-intake:${intake.id}`,
          decidedBy: principal, decidedAt, effectiveAt: decidedAt });
        relate(decision, "governs", intake);
        relate(decision, "governs", assessment);
      }
    }
    for (const document of snapshot.documents) {
      const evidence = evidenceByPath.get(document.path)!;
      for (const source of document.sourceRevisions) {
        const parent = evidenceByPath.get(source.path.replace(/\\/g, "/"));
        if (!parent) throw Error(`Legacy source relationship is dangling: ${document.path}.`);
        relate(evidence, "derived_from", parent);
        if (["validation-record", "issue-validation-record"].includes(document.metadata.artifactType)) {
          const target = byPath.get(source.path.replace(/\\/g, "/"));
          if (target && ["WorkItem", "Finding"].includes(target.entityType)) relate(evidence, "supports", target);
        }
      }
      const mapped = byPath.get(document.path);
      if (!mapped || mapped.entityType !== "WorkItem") continue;
      const phaseAlias = document.metadata.identity.phaseId;
      if (typeof phaseAlias === "string") {
        const matches = phases.get(phaseAlias) ?? [];
        if (matches.length !== 1) throw Error(`Legacy Work Item Phase relationship is missing or ambiguous: ${document.path}.`);
        relate(mapped, "part_of", matches[0]);
      }
      const parentAlias = document.metadata.identity.parentWorkCardId ?? document.metadata.identity.parentFixCardId;
      if (typeof parentAlias === "string") {
        const matches = [...new Map((itemAliases.get(parentAlias) ?? []).map(item => [item.id, item])).values()];
        if (matches.length !== 1) throw Error(`Legacy Repair parent is missing or ambiguous: ${document.path}.`);
        relate(mapped, "repairs", matches[0]);
      }
      const candidate = document.metadata.workflowData.candidate;
      const dependencies = candidate && typeof candidate === "object" && !Array.isArray(candidate)
        ? (candidate as Record<string, unknown>).dependsOn : undefined;
      if (dependencies !== undefined) {
        if (!Array.isArray(dependencies) || dependencies.some(alias => typeof alias !== "string" || !alias)) throw Error(`Legacy Work Item dependencies are invalid: ${document.path}.`);
        for (const alias of dependencies) {
          const matches = [...new Map((itemAliases.get(alias) ?? []).map(item => [item.id, item])).values()];
          if (matches.length !== 1) throw Error(`Legacy Work Item dependency is missing or ambiguous: ${document.path}.`);
          relate(mapped, "depends_on", matches[0]);
        }
      }
    }
    for (const kind of ["repairs", "depends_on", "part_of", "derived_from"] as const) {
      const visiting = new Set<string>();
      const visited = new Set<string>();
      const outgoing = new Map<string, string[]>();
      for (const edge of relations.filter(edge => edge.relationshipType === kind)) outgoing.set(edge.fromEntityId, [...(outgoing.get(edge.fromEntityId) ?? []), edge.toEntityId]);
      const visit = (entityId: string): void => {
        if (visiting.has(entityId)) throw Error(`Legacy ${kind} relationships contain a cycle.`);
        if (visited.has(entityId)) return;
        visiting.add(entityId);
        for (const target of outgoing.get(entityId) ?? []) visit(target);
        visiting.delete(entityId);
        visited.add(entityId);
      };
      for (const entityId of outgoing.keys()) visit(entityId);
    }
    store = createSQLiteProjectStateStore(databasePath);
    await store.transaction(projectId, async unit => {
      for (const record of records) {
        await unit.saveEntity(record, null);
        const changeId = id(`${snapshot.digest}:change:create:${record.id}`);
        await unit.appendStateChange({ id: changeId, projectId, entityId: record.id, fromRecordVersion: null, toRecordVersion: 1,
          operation: "create", principal, occurredAt: importTime, changedFields: Object.keys(record.body).sort(), reason: "Stage legacy import", correlationId: snapshot.digest });
        await unit.appendOutbox({ id: changeId, projectId, entityId: record.id, eventType: "project-state.record-created",
          occurredAt: importTime, payload: { changeId, operation: "create", fromRecordVersion: null, toRecordVersion: 1 } });
      }
      for (const edge of relations) {
        await unit.saveRelationship(edge);
        const changeId = id(`${snapshot.digest}:change:relationship:${edge.id}`);
        await unit.appendStateChange({ id: changeId, projectId, entityId: edge.fromEntityId, fromRecordVersion: 1, toRecordVersion: 1,
          operation: "relationship-create", principal, occurredAt: importTime, changedFields: [`relationship:${edge.relationshipType}`],
          reason: "Stage legacy relationship", correlationId: snapshot.digest });
        await unit.appendOutbox({ id: changeId, projectId, entityId: edge.fromEntityId, eventType: "project-state.relationship-created",
          occurredAt: importTime, payload: { changeId, operation: "relationship-create", fromRecordVersion: 1, toRecordVersion: 1, relationshipId: edge.id } });
      }
    });
    store.close();
    store = undefined;
    return { snapshotId: snapshot.snapshotId, digest: snapshot.digest, importerVersion: STAGED_LEGACY_IMPORTER_VERSION,
      schemaVersion: PROJECT_STATE_DATABASE_SCHEMA_VERSION, projectId, databasePath, stageRoot, correlations };
  } catch (error) {
    store?.close();
    if (path.dirname(stageRoot) === base && fs.existsSync(stageRoot)) fs.rmSync(stageRoot, { recursive: true, force: true });
    throw error;
  }
}
