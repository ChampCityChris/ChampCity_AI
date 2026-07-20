import {
  buildMarkdownArtifactEnvelope,
  canonicalPrettyStringify,
  canonicalStringify,
  renderArtifactMarkdown,
  validateCanonicalArtifact,
  type CanonicalArtifact,
} from "../../shared/artifacts";

export type GovernancePayloadImpact = "unchanged" | "would_change" | "unknown";

export type GovernanceRepairKind =
  | "canonical_serialization_repair"
  | "missing_registry_registration"
  | "semantic_identity_repair"
  | "irreconcilable_semantic_conflict"
  | "none";

export interface GovernancePairRepairAnalysis {
  artifact?: CanonicalArtifact;
  artifactId: string;
  artifactType: string;
  revision: number;
  jsonPath: string;
  markdownPath: string;
  repairKind: GovernanceRepairKind;
  safelyRepairable: boolean;
  verificationError: string;
  blockReason?: string;
  payloadImpact: GovernancePayloadImpact;
  canonicalJson?: string;
  canonicalMarkdown?: string;
}

export function analyzeGovernancePairRepair(input: {
  jsonContent: string | null;
  markdownContent: string | null;
  jsonPath: string;
  markdownPath: string;
  projectId?: string;
}): GovernancePairRepairAnalysis {
  const base = {
    artifactId: "unknown",
    artifactType: "unknown",
    revision: 0,
    jsonPath: input.jsonPath,
    markdownPath: input.markdownPath,
  };
  if (input.jsonContent === null || input.markdownContent === null) {
    return {
      ...base,
      repairKind: "none",
      safelyRepairable: false,
      verificationError: "Canonical artifact pair is incomplete.",
      blockReason: "Both JSON and Markdown representations are required before repair.",
      payloadImpact: "unknown",
    };
  }

  let jsonValue: unknown;
  try {
    jsonValue = JSON.parse(input.jsonContent);
  } catch (error) {
    return {
      ...base,
      repairKind: "none",
      safelyRepairable: false,
      verificationError: `Artifact JSON could not be parsed: ${plainError(error)}`,
      blockReason: "Artifact JSON is not parseable.",
      payloadImpact: "unknown",
    };
  }

  const validation = validateCanonicalArtifact(jsonValue);
  if (!validation.valid || !validation.artifact) {
    return {
      ...base,
      artifactId: artifactIdOf(jsonValue) ?? "unknown",
      artifactType: artifactTypeOf(jsonValue) ?? "unknown",
      revision: revisionOf(jsonValue) ?? 0,
      repairKind: "none",
      safelyRepairable: false,
      verificationError: validation.errors.join(" "),
      blockReason: "Artifact JSON is not a valid canonical artifact.",
      payloadImpact: "unknown",
    };
  }

  const artifact = validation.artifact;
  const known = {
    ...base,
    artifact,
    artifactId: artifact.artifactId,
    artifactType: artifact.artifactType,
    revision: artifact.revision,
  };
  if (artifact.artifactType === "artifact_registry") {
    return {
      ...known,
      repairKind: "none",
      safelyRepairable: false,
      verificationError: "Artifact Registry is maintained through internal registry transactions.",
      blockReason: "Registry self-registration is not supported.",
      payloadImpact: "unknown",
    };
  }
  if (input.projectId && artifact.projectId !== input.projectId) {
    return {
      ...known,
      repairKind: "none",
      safelyRepairable: false,
      verificationError: `Artifact projectId is not ${input.projectId}.`,
      blockReason: "Project identity mismatch.",
      payloadImpact: "unknown",
    };
  }
  if (artifact.jsonPath !== input.jsonPath || artifact.markdownPath !== input.markdownPath) {
    return {
      ...known,
      repairKind: "none",
      safelyRepairable: false,
      verificationError: "Artifact paths do not exactly match the inspected files.",
      blockReason: "Canonical paths disagree with inspected files.",
      payloadImpact: "unknown",
    };
  }

  const markdown = parseLaxMarkdown(input.markdownContent);
  if (!markdown.ok) {
    return {
      ...known,
      repairKind: "none",
      safelyRepairable: false,
      verificationError: markdown.reason,
      blockReason: markdown.reason,
      payloadImpact: "unknown",
    };
  }
  if (markdown.body !== artifact.payload.contentMarkdown) {
    return {
      ...known,
      repairKind: "none",
      safelyRepairable: false,
      verificationError: "Markdown body does not exactly match payload.contentMarkdown.",
      blockReason: "Repair would change payload content.",
      payloadImpact: "would_change",
    };
  }
  const expectedEnvelope = buildMarkdownArtifactEnvelope(artifact);
  if (!governanceEnvelopeMatchesArtifact(markdown.envelope, expectedEnvelope, artifact)) {
    return {
      ...known,
      repairKind: "none",
      safelyRepairable: false,
      verificationError: "Markdown envelope metadata semantically disagrees with the JSON artifact.",
      blockReason: "Markdown envelope metadata does not match JSON authority.",
      payloadImpact: "unchanged",
    };
  }

  const canonicalJson = `${canonicalPrettyStringify(artifact)}\n`;
  const canonicalMarkdown = renderArtifactMarkdown(artifact);
  const alreadyCanonical =
    input.jsonContent === canonicalJson && input.markdownContent === canonicalMarkdown;
  return {
    ...known,
    repairKind: alreadyCanonical ? "none" : "canonical_serialization_repair",
    safelyRepairable: !alreadyCanonical,
    verificationError: alreadyCanonical
      ? "Pair is canonical."
      : "Pair serialization is not canonical.",
    ...(alreadyCanonical ? { blockReason: "No serialization repair is required." } : {}),
    payloadImpact: "unchanged",
    canonicalJson,
    canonicalMarkdown,
  };
}

function parseLaxMarkdown(markdown: string):
  | { ok: true; envelope: unknown; body: string }
  | { ok: false; reason: string } {
  const normalized = markdown.replace(/\r\n?/g, "\n");
  const match = normalized.match(
    /^<!-- champcity-artifact-envelope\n([\s\S]*?)\n-->\n\n([\s\S]*)$/,
  );
  if (!match) return { ok: false, reason: "Artifact Markdown does not use the canonical envelope boundary." };
  try {
    return { ok: true, envelope: JSON.parse(match[1]), body: match[2] };
  } catch (error) {
    return {
      ok: false,
      reason: `Artifact Markdown envelope is not valid JSON: ${plainError(error)}`,
    };
  }
}

function governanceEnvelopeMatchesArtifact(
  envelope: unknown,
  expectedEnvelope: unknown,
  artifact: CanonicalArtifact,
): boolean {
  if (canonicalStringify(expectedEnvelope) === canonicalStringify(envelope)) return true;
  if (!isPlainObject(envelope)) return false;
  const candidate = { ...envelope };
  const payload = candidate.payload;
  if (
    isPlainObject(payload) &&
    canonicalStringify(payload) === canonicalStringify(artifact.payload)
  ) {
    candidate.payload = {
      kind: artifact.payload.kind,
      title: artifact.payload.title,
    };
    return canonicalStringify(expectedEnvelope) === canonicalStringify(candidate);
  }
  return false;
}

function artifactIdOf(value: unknown): string | null {
  return isPlainObject(value) && typeof value.artifactId === "string" ? value.artifactId : null;
}

function artifactTypeOf(value: unknown): string | null {
  return isPlainObject(value) && typeof value.artifactType === "string" ? value.artifactType : null;
}

function revisionOf(value: unknown): number | null {
  return isPlainObject(value) && typeof value.revision === "number" ? value.revision : null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function plainError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
