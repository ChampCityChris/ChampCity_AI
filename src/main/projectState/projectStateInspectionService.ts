import fs from "node:fs";
import path from "node:path";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { AgentHarnessError } from "../core/applicationErrors";
import { ENTITY_TYPE_REGISTRY } from "../../shared/projectState/entityTypeRegistry";
import type { EntityType } from "../../shared/projectState/domainContracts";
import { selectedCurrentProjectId } from "./currentProjectRegistrationService";
import { createSQLiteProjectStateReader, type ProjectStateInspectionPage } from "./sqliteProjectStateStore";

export const PROJECT_STATE_INSPECTION_MAX_BYTES = 60 * 1024; // Reserve space for the MCP result envelope.
const cursorKey = randomBytes(32);
const bytes = (value: unknown) => Buffer.byteLength(JSON.stringify(value), "utf8");
const invalid = (): never => { throw new AgentHarnessError("INVALID_INPUT", "Project State inspection parameters or continuation are invalid."); };
type Params = Record<string, unknown>;
type Cursor = { binding: string; after: [string, string | number] };

function encodeCursor(value: Cursor): string {
  const payload = Buffer.from(JSON.stringify(value)).toString("base64url");
  return payload + "." + createHmac("sha256", cursorKey).update(payload).digest("base64url");
}
function decodeCursor(value: unknown): Cursor | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.length > 2048) return invalid();
  const [payload, signature, extra] = value.split(".");
  if (!payload || !signature || extra !== undefined || !/^[A-Za-z0-9_-]+$/.test(payload + signature)) invalid();
  const expected = createHmac("sha256", cursorKey).update(payload).digest();
  const actual = Buffer.from(signature, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) invalid();
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Cursor;
    if (typeof parsed.binding !== "string" || !Array.isArray(parsed.after) || parsed.after.length !== 2 ||
      typeof parsed.after[0] !== "string" || !(typeof parsed.after[1] === "string" || Number.isSafeInteger(parsed.after[1]))) invalid();
    return parsed;
  } catch { return invalid(); }
}

/** Preserve ordinary values exactly; redact whole sensitive scalars and identify their field paths. */
function publicValues(value: unknown): { value: unknown; redactedFields: string[]; redactionCount: number } {
  const redactedFields: string[] = [];
  let redactionCount = 0;
  const secretKey = /token|secret|password|verifier|cookie|authorization|credential|api[_-]?key|private[_-]?key/i;
  const sensitiveText = /\bBearer\s+\S+|(?:token|secret|password|credential|verifier|private[_-]?key|api[_-]?key|authorization|cookie)\s*["']?\s*[:=]|\b(?:gh[pousr]_[A-Za-z0-9_]+|sk-[A-Za-z0-9_-]{16,}|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)\b|-----BEGIN [A-Z ]*PRIVATE KEY-----|[a-z]:[\\/]|\\\\[^\\\s]+\\|(?:^|\s)\/(?!\/)[^\s]+|\b(?:https?|ssh):\/\/[^\s/]+@/i;
  const visit = (entry: unknown, field: string, sensitive = false): unknown => {
    if (sensitive || (typeof entry === "string" && sensitiveText.test(entry))) {
      // Domain field names are bounded, but redact arbitrary scalar-map keys too.
      redactionCount++;
      if (redactedFields.length < 100) redactedFields.push(sensitiveText.test(field) || field.length > 200 ? "[redacted-field-name]" : field);
      return "[redacted]";
    }
    if (Array.isArray(entry)) return entry.map((item, index) => visit(item, `${field}[${index}]`));
    if (entry && typeof entry === "object") return Object.fromEntries(Object.entries(entry).map(([key, item]) => [
      sensitiveText.test(key) ? "[redacted-key]" : key, visit(item, field ? `${field}.${key}` : key, secretKey.test(key)),
    ]));
    return entry;
  };
  const safe = visit(value, "");
  return {value: safe, redactedFields, redactionCount};
}

/** Only the validated workspace root reaches this service; no caller-selected Project or path. */
export async function inspectRegisteredProjectState(root: string, workspaceId: string, action: string, params: Params) {
  const cursor = decodeCursor(params.cursor);
  const limit = params.limit === undefined ? 20 : params.limit;
  if (!Number.isSafeInteger(limit) || Number(limit) < 1 || Number(limit) > 50) invalid();
  if (params.recordVersion !== undefined && (!Number.isSafeInteger(params.recordVersion) || Number(params.recordVersion) < 1)) invalid();
  if (params.entityType !== undefined && !Object.hasOwn(ENTITY_TYPE_REGISTRY, String(params.entityType))) invalid();
  let projectId: string | null = null;
  let reader: ReturnType<typeof createSQLiteProjectStateReader> | undefined;
  try {
    // lstat also catches dangling redirects, which existsSync alone treats as absent.
    for (const relative of [".champcity", ".champcity/project-state.sqlite"]) {
      try { if (fs.lstatSync(path.join(root, relative)).isSymbolicLink()) throw Error("Redirected store."); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
    }
    projectId = selectedCurrentProjectId(root, {includeClosed: true});
    if (projectId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(projectId)) {
      projectId = null; throw Error("Invalid Project identity.");
    }
    const identity = {workspaceId, projectId};
    if (!projectId) return {...identity, toolbox: "data_toolbox", implemented: true, state: "implemented", availability: "not-registered", storeAvailable: false,
      capability: "bounded-read-only-project-state", maxPageSize: 50, maxResponseBytes: PROJECT_STATE_INSPECTION_MAX_BYTES};
    reader = createSQLiteProjectStateReader(path.join(fs.realpathSync(root), ".champcity", "project-state.sqlite"));
    if (action === "status") {
      if (!reader.hasInspectionEntity(projectId, projectId)) throw Error("Missing registered Project.");
      return {...identity, toolbox: "data_toolbox", state: "implemented", implemented: true, availability: "available", storeAvailable: true,
        capability: "bounded-read-only-project-state", maxPageSize: 50, maxResponseBytes: PROJECT_STATE_INSPECTION_MAX_BYTES,
        continuationLifetime: "current-runtime"};
    }
    const entityId = String(params.entityId ?? "");
    // Exact lookup uses the existing reader's hydration and domain validation.
    const current = action === "inspect_entity" ? await reader.getEntity(projectId, entityId) : null;
    if (action !== "list_entities" && !(current || reader.hasInspectionEntity(projectId, entityId))) {
      const safe = publicValues({entityId});
      return {...identity, status: "not-found", ...safe.value as Params, redactedFields: safe.redactedFields, redactionCount: safe.redactionCount};
    }
    if (action === "inspect_entity") {
      const record = params.recordVersion === undefined ? current : await reader.getEntityVersion(projectId, entityId, Number(params.recordVersion));
      if (!record) return {...identity, status: "version-not-found", entityId, recordVersion: params.recordVersion};
      const availableBodyFields = Object.keys(record.body);
      const fields = params.bodyFields as string[] | undefined;
      if (fields && (new Set(fields).size !== fields.length || fields.some(field => !availableBodyFields.includes(field)))) invalid();
      const omittedBodyFields = fields ? availableBodyFields.filter(field => !fields.includes(field)) : [];
      const projected = fields ? {...record, body: Object.fromEntries(fields.map(field => [field, (record.body as unknown as Params)[field]]))} : record;
      const safe = publicValues(projected);
      const result = {...identity, status: "found", versionSelection: params.recordVersion === undefined ? "current" : "historical",
        currentRecordVersion: current!.recordVersion, record: safe.value, partialBody: !!fields, omittedBodyFields,
        redactedFields: safe.redactedFields, redactionCount: safe.redactionCount};
      if (bytes(result) <= PROJECT_STATE_INSPECTION_MAX_BYTES) return result;
      return {...identity, status: "response-too-large", entityId, recordVersion: record.recordVersion, maxResponseBytes: PROJECT_STATE_INSPECTION_MAX_BYTES,
        omittedFields: ["record"], availableBodyFields, retry: "Use inspect_entity with bodyFields selecting fewer top-level body fields."};
    }
    const kinds: Record<string, ProjectStateInspectionPage["kind"]> = {
      list_entities: "entities", list_entity_versions: "versions", list_entity_relationships: "relationships", list_entity_changes: "changes",
    };
    const kind = kinds[action];
    if (!kind) invalid();
    const direction = (params.direction ?? "both") as ProjectStateInspectionPage["direction"];
    const selection = (params.selection ?? "both") as ProjectStateInspectionPage["selection"];
    const binding = createHmac("sha256", cursorKey).update(JSON.stringify([workspaceId, projectId, action, params.entityId, params.entityType, direction, selection])).digest("hex");
    if (cursor && cursor.binding !== binding) invalid();
    const rows = reader.inspectPage(projectId, {kind, entityId, entityType: params.entityType as EntityType, direction, selection,
      after: cursor?.after ?? ["", 0], limit: Number(limit) + 1});
    const items: unknown[] = [];
    let after: [string, string | number] = cursor?.after ?? ["", 0];
    const base = {...identity, status: "available", items, hasMore: false, nextCursor: null as string | null};
    for (const row of rows.slice(0, Number(limit))) {
      if (typeof row.id !== "string" || row.id.length > 128 || publicValues(row.id).redactionCount > 0 ||
        (kind === "versions" && (!Number.isSafeInteger(row.recordVersion) || Number(row.recordVersion) < 1)) ||
        (kind === "changes" && (typeof row.occurredAt !== "string" || row.occurredAt.length > 64 || publicValues(row.occurredAt).redactionCount > 0))) throw Error("Invalid stored inspection key.");
      const safe = publicValues(row);
      let item: unknown = {...safe.value as Params, redactedFields: safe.redactedFields, redactionCount: safe.redactionCount};
      if (bytes(item) > 12 * 1024) item = {id: publicValues(row.id).value, recordVersion: row.recordVersion,
        omitted: true, reason: "row-too-large", retry: "Use inspect_entity for version bodies; this summary exceeds the row budget."};
      if (bytes({...base, items: [...items, item]}) > PROJECT_STATE_INSPECTION_MAX_BYTES - 4096) break;
      items.push(item);
      after = kind === "versions" ? ["", Number(row.recordVersion)] : kind === "changes" ? [String(row.occurredAt), String(row.id)] : [String(row.id), 0];
    }
    base.hasMore = rows.length > items.length;
    base.nextCursor = base.hasMore ? encodeCursor({binding, after}) : null;
    return base;
  } catch (error) {
    if (error instanceof AgentHarnessError) throw error;
    // Never propagate paths, engine messages, body fragments or SQLite internals.
    return {workspaceId, projectId, status: "unavailable", availability: "unavailable", storeAvailable: false,
      message: "Registered Project State inspection is unavailable; verify storage and registration."};
  } finally { reader?.close(); }
}
