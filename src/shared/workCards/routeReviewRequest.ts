import type {
  GovernanceRepairSpecificationGovernanceFlags,
  GovernanceRepairSpecificationTargetSnapshot,
} from "../projects";

export interface RouteReviewEvidenceSnapshot {
  acceptedOrControlling: string[];
  presentPendingDisposition: string[];
  missingRequired: string[];
  nonControlling: string[];
  ambiguityWarnings: string[];
}

export interface RouteReviewRequestInput {
  phase: string;
  currentActionId: string;
  currentActionTitle: string;
  currentActionReason: string;
  workCardId?: string;
  workCardTitle?: string;
  expectedOutput?: string;
  operatorConcern: string;
  operatorExpectedRoute?: string;
  evidenceSnapshot: RouteReviewEvidenceSnapshot;
}

export interface RouteReviewRequestRecord {
  artifactType: "route_review_request";
  requestPurpose: "workflow_route_review" | "governance_repair_specification";
  requestId: string;
  status: "pending_architect_review" | "pending_architect_specification";
  phase: string;
  createdAt: string;
  currentRoute: {
    actionId: string;
    title: string;
    reason: string;
    workCardId?: string;
    workCardTitle?: string;
    expectedOutput?: string;
  };
  operatorConcern: string;
  operatorExpectedRoute?: string;
  evidenceSnapshot: RouteReviewEvidenceSnapshot;
  governanceTargetSnapshot?: GovernanceRepairSpecificationTargetSnapshot;
  expectedRepairWorkCard?: {
    workCardId: string;
    artifactId: string;
  };
  ownership: {
    reportedBy: "Operator";
    dispositionOwner: "Architect";
    evaluatorRepairOwner: "Implementer";
  };
  governance: {
    changesCurrentRoute: false;
    approvesEvidence: false;
    completesWork: false;
    skipsValidation: false;
    advancesWorkflow: false;
  };
  governanceRepairFlags?: GovernanceRepairSpecificationGovernanceFlags;
}

export interface RouteReviewRequestSaveResult {
  ok: boolean;
  errorMessages?: string[];
  record?: RouteReviewRequestRecord;
  markdown?: string;
  savedJsonFileName?: string;
  savedMarkdownFileName?: string;
  savedJsonPath?: string;
  savedMarkdownPath?: string;
}

const safePhasePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const safeIdentifierPattern = /^[A-Za-z0-9]+(?:[-_][A-Za-z0-9]+)*$/;

export function validateRouteReviewRequestInput(
  input: RouteReviewRequestInput,
): string[] {
  const errors: string[] = [];

  if (!safePhasePattern.test(input.phase.trim())) {
    errors.push("Phase must use only letters, numbers, and hyphens.");
  }

  if (!safeIdentifierPattern.test(input.currentActionId.trim())) {
    errors.push(
      "Current action ID must use only letters, numbers, hyphens, and underscores.",
    );
  }

  if (
    input.workCardId?.trim() &&
    !safeIdentifierPattern.test(input.workCardId.trim())
  ) {
    errors.push(
      "Work Card ID must use only letters, numbers, hyphens, and underscores.",
    );
  }

  validateRequiredText(errors, input.currentActionTitle, "Current action title", 240);
  validateRequiredText(errors, input.currentActionReason, "Current action reason", 2_000);
  validateRequiredText(errors, input.operatorConcern, "Route concern", 4_000);
  validateOptionalText(errors, input.workCardTitle, "Work Card title", 240);
  validateOptionalText(errors, input.expectedOutput, "Expected output", 1_000);
  validateOptionalText(
    errors,
    input.operatorExpectedRoute,
    "Expected route or evidence",
    2_000,
  );

  for (const [label, values] of Object.entries(input.evidenceSnapshot)) {
    if (!Array.isArray(values)) {
      errors.push(`${label} must be a list.`);
      continue;
    }

    if (values.length > 25) {
      errors.push(`${label} cannot contain more than 25 entries.`);
    }

    for (const value of values) {
      if (typeof value !== "string" || value.trim().length === 0) {
        errors.push(`${label} entries must be non-empty text.`);
        break;
      }

      if (value.length > 1_000) {
        errors.push(`${label} entries cannot exceed 1000 characters.`);
        break;
      }
    }
  }

  return errors;
}

export function buildRouteReviewRequest(
  input: RouteReviewRequestInput,
  createdAt: string,
): RouteReviewRequestRecord {
  const errors = validateRouteReviewRequestInput(input);

  if (errors.length > 0) {
    throw new Error(errors.join(" "));
  }

  const timestamp = new Date(createdAt);

  if (Number.isNaN(timestamp.getTime())) {
    throw new Error("Route review request timestamp is invalid.");
  }

  const targetId = input.workCardId?.trim() || input.currentActionId.trim();
  const requestId = `ROUTE_REVIEW_${targetId}_${timestamp
    .toISOString()
    .replace(/[^0-9]/g, "")}`;

  return {
    artifactType: "route_review_request",
    requestPurpose: "workflow_route_review",
    requestId,
    status: "pending_architect_review",
    phase: input.phase.trim(),
    createdAt: timestamp.toISOString(),
    currentRoute: {
      actionId: input.currentActionId.trim(),
      title: input.currentActionTitle.trim(),
      reason: input.currentActionReason.trim(),
      workCardId: optionalText(input.workCardId),
      workCardTitle: optionalText(input.workCardTitle),
      expectedOutput: optionalText(input.expectedOutput),
    },
    operatorConcern: input.operatorConcern.trim(),
    operatorExpectedRoute: optionalText(input.operatorExpectedRoute),
    evidenceSnapshot: {
      acceptedOrControlling: cleanList(
        input.evidenceSnapshot.acceptedOrControlling,
      ),
      presentPendingDisposition: cleanList(
        input.evidenceSnapshot.presentPendingDisposition,
      ),
      missingRequired: cleanList(input.evidenceSnapshot.missingRequired),
      nonControlling: cleanList(input.evidenceSnapshot.nonControlling),
      ambiguityWarnings: cleanList(input.evidenceSnapshot.ambiguityWarnings),
    },
    ownership: {
      reportedBy: "Operator",
      dispositionOwner: "Architect",
      evaluatorRepairOwner: "Implementer",
    },
    governance: {
      changesCurrentRoute: false,
      approvesEvidence: false,
      completesWork: false,
      skipsValidation: false,
      advancesWorkflow: false,
    },
  };
}

export function renderRouteReviewRequestMarkdown(
  record: RouteReviewRequestRecord,
): string {
  if (record.requestPurpose === "governance_repair_specification") {
    return renderGovernanceRepairSpecificationMarkdown(record);
  }
  return [
    `# Route Review Request - ${record.currentRoute.workCardId ?? record.currentRoute.actionId}`,
    "",
    "## Request Status",
    "",
    "Status: Pending Architect review",
    `Request ID: ${record.requestId}`,
    `Phase: ${record.phase}`,
    `Created: ${record.createdAt}`,
    "",
    "## Currently Selected Route",
    "",
    `- Action: ${record.currentRoute.title}`,
    `- Action ID: ${record.currentRoute.actionId}`,
    `- Work Card: ${record.currentRoute.workCardId ?? "Not reported"}${record.currentRoute.workCardTitle ? ` - ${record.currentRoute.workCardTitle}` : ""}`,
    `- Route reason: ${record.currentRoute.reason}`,
    `- Expected output: ${record.currentRoute.expectedOutput ?? "Not reported"}`,
    "",
    "## Operator Route Concern",
    "",
    record.operatorConcern,
    "",
    "## Expected Route Or Evidence",
    "",
    record.operatorExpectedRoute ?? "Not specified by the Operator.",
    "",
    ...renderEvidenceSection(
      "Accepted Or Controlling Evidence",
      record.evidenceSnapshot.acceptedOrControlling,
    ),
    ...renderEvidenceSection(
      "Evidence Present But Pending Architect Disposition",
      record.evidenceSnapshot.presentPendingDisposition,
    ),
    ...renderEvidenceSection(
      "Missing And Required Evidence",
      record.evidenceSnapshot.missingRequired,
    ),
    ...renderEvidenceSection(
      "Stale, Historical, Superseded, Or Non-Controlling Evidence",
      record.evidenceSnapshot.nonControlling,
    ),
    ...renderEvidenceSection(
      "Duplicate Or Ambiguous Evidence",
      record.evidenceSnapshot.ambiguityWarnings,
    ),
    "## Ownership And Governance",
    "",
    "- Operator reports the route concern.",
    "- Architect reviews the request and decides which evidence or disposition controls.",
    "- Implementer repairs the evaluator or artifact model only when the Architect assigns that work.",
    "- This request does not change the current route, approve evidence, complete work, skip validation, or advance workflow state.",
    "",
  ].join("\n");
}

function renderGovernanceRepairSpecificationMarkdown(
  record: RouteReviewRequestRecord,
): string {
  const target = record.governanceTargetSnapshot;
  const flags = record.governanceRepairFlags;
  const expected = record.expectedRepairWorkCard;
  return [
    `# Governance Repair Specification Request - ${record.requestId}`,
    "",
    "## Request Status",
    "",
    "Status: Pending Architect specification",
    `Request ID: ${record.requestId}`,
    `Phase: ${record.phase}`,
    `Created: ${record.createdAt}`,
    "",
    "## Selected Governance Target",
    "",
    `- Artifact ID: ${target?.targetArtifactId ?? "Unavailable"}`,
    `- Artifact type: ${target?.artifactType ?? "Unavailable"}`,
    `- Status: ${target?.status ?? "Unavailable"}`,
    `- Revision: ${target?.revision ?? "Unavailable"}`,
    `- JSON path: ${target?.jsonPath ?? "Unavailable"}`,
    `- Markdown path: ${target?.markdownPath ?? "Unavailable"}`,
    `- Candidate fingerprint: ${target?.candidateFingerprint ?? "Unavailable"}`,
    `- Projection revision: ${target?.projectionRevision ?? "Unavailable"}`,
    `- Registry revision: ${target?.registryRevision ?? "Unavailable"}`,
    "",
    "## Repair Block",
    "",
    `- Repair kind: ${target?.repairKind ?? "Unavailable"}`,
    `- Issue type: ${target?.issueType ?? "Unavailable"}`,
    `- Item status: ${target?.itemStatus ?? "Unavailable"}`,
    `- Repair status: ${target?.repairStatus ?? "Unavailable"}`,
    `- Operation label: ${target?.operationLabel ?? "Unavailable"}`,
    `- Block reason: ${target?.blockReason ?? "Unavailable"}`,
    `- Verification error: ${target?.verificationError ?? "Unavailable"}`,
    `- Registry status: ${target?.registryStatus ?? "Unavailable"}`,
    "",
    "## Expected Repair Work Card",
    "",
    `- Work Card ID: ${expected?.workCardId ?? "Unavailable"}`,
    `- Artifact ID: ${expected?.artifactId ?? "Unavailable"}`,
    "",
    "## Operator Concern",
    "",
    record.operatorConcern,
    "",
    "## Expected Route",
    "",
    record.operatorExpectedRoute ?? "Not specified by the Operator.",
    "",
    ...renderEvidenceSection(
      "Accepted Or Controlling Evidence",
      record.evidenceSnapshot.acceptedOrControlling,
    ),
    ...renderEvidenceSection(
      "Evidence Present But Pending Architect Disposition",
      record.evidenceSnapshot.presentPendingDisposition,
    ),
    ...renderEvidenceSection(
      "Missing And Required Evidence",
      record.evidenceSnapshot.missingRequired,
    ),
    ...renderEvidenceSection(
      "Stale, Historical, Superseded, Or Non-Controlling Evidence",
      record.evidenceSnapshot.nonControlling,
    ),
    ...renderEvidenceSection(
      "Duplicate Or Ambiguous Evidence",
      record.evidenceSnapshot.ambiguityWarnings,
    ),
    "## Governance Effects",
    "",
    ...(flags
      ? Object.entries(flags).map(([key, value]) => `- ${key}: ${String(value)}`)
      : ["- Governance effects unavailable."]),
    "",
    "## Ownership And Governance",
    "",
    "- Operator reports the governance repair concern.",
    "- Architect owns the bounded repair specification.",
    "- Implementer performs work only after one exact approved Work Card exists.",
    "- This request does not repair the target, create a Work Card, approve evidence, authorize implementation, or advance normal workflow.",
    "",
  ].join("\n");
}

export function buildRouteReviewRequestFileNames(
  record: RouteReviewRequestRecord,
): { json: string; markdown: string } {
  return {
    json: `${record.requestId}.json`,
    markdown: `${record.requestId}.md`,
  };
}

function validateRequiredText(
  errors: string[],
  value: string,
  label: string,
  maxLength: number,
): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(`${label} is required.`);
  } else if (value.length > maxLength) {
    errors.push(`${label} cannot exceed ${maxLength} characters.`);
  }
}

function validateOptionalText(
  errors: string[],
  value: string | undefined,
  label: string,
  maxLength: number,
): void {
  if (value !== undefined && typeof value !== "string") {
    errors.push(`${label} must be text.`);
  } else if (value && value.length > maxLength) {
    errors.push(`${label} cannot exceed ${maxLength} characters.`);
  }
}

function optionalText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function cleanList(values: string[]): string[] {
  return values.map((value) => value.trim()).filter(Boolean);
}

function renderEvidenceSection(title: string, values: string[]): string[] {
  return [
    `## ${title}`,
    "",
    ...(values.length > 0 ? values.map((value) => `- ${value}`) : ["None reported."]),
    "",
  ];
}
