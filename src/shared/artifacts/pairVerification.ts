import {
  getArtifactRevisionIdentity,
  validateCanonicalArtifact,
  type ArtifactPayload,
  type ArtifactValidationIssue,
  type CanonicalArtifact,
} from "./artifactEnvelope";
import { canonicalStringify } from "./canonicalJson";
import {
  buildMarkdownArtifactEnvelope,
  validateMarkdownEnvelope,
} from "./markdownEnvelope";

export interface ArtifactPair {
  jsonArtifact: unknown;
  markdown: string;
  jsonPath?: string;
  markdownPath?: string;
}

export type ArtifactPairIssueSide = "json" | "markdown" | "pair";

export interface ArtifactPairVerificationIssue extends ArtifactValidationIssue {
  side: ArtifactPairIssueSide;
}

export interface ArtifactPairVerificationResult<
  TPayload extends ArtifactPayload = ArtifactPayload,
> {
  valid: boolean;
  synchronized: boolean;
  artifact?: CanonicalArtifact<TPayload>;
  markdownArtifact?: CanonicalArtifact<TPayload>;
  pairIdentity?: string;
  issues: ArtifactPairVerificationIssue[];
  errors: string[];
}

export function verifyArtifactPair<TPayload extends ArtifactPayload = ArtifactPayload>(
  pair: ArtifactPair,
): ArtifactPairVerificationResult<TPayload>;
export function verifyArtifactPair<TPayload extends ArtifactPayload = ArtifactPayload>(
  jsonArtifact: unknown,
  markdown: string,
): ArtifactPairVerificationResult<TPayload>;
export function verifyArtifactPair<TPayload extends ArtifactPayload = ArtifactPayload>(
  pairOrJson: ArtifactPair | unknown,
  markdownArgument?: string,
): ArtifactPairVerificationResult<TPayload> {
  const pair = isArtifactPairInput(pairOrJson, markdownArgument)
    ? pairOrJson
    : { jsonArtifact: pairOrJson, markdown: markdownArgument as string };
  const issues: ArtifactPairVerificationIssue[] = [];
  const addIssues = (
    side: ArtifactPairIssueSide,
    sourceIssues: ArtifactValidationIssue[],
  ): void => {
    issues.push(...sourceIssues.map((issue) => ({ ...issue, side })));
  };

  let jsonValue = pair.jsonArtifact;
  if (typeof jsonValue === "string") {
    try {
      jsonValue = JSON.parse(jsonValue);
    } catch (error) {
      issues.push({
        side: "json",
        code: "json_parse_error",
        path: "$json",
        message: error instanceof Error ? error.message : "Artifact JSON could not be parsed.",
      });
    }
  }

  const jsonValidation = validateCanonicalArtifact<CanonicalArtifact<TPayload>>(jsonValue);
  if (!jsonValidation.valid) {
    addIssues("json", jsonValidation.issues);
  }

  const markdownValidation = validateMarkdownEnvelope<TPayload>(pair.markdown);
  if (!markdownValidation.valid) {
    addIssues("markdown", markdownValidation.issues);
  }

  const jsonArtifact = jsonValidation.artifact;
  const parsedMarkdown = markdownValidation.parsed;

  if (jsonArtifact && pair.jsonPath !== undefined && jsonArtifact.jsonPath !== pair.jsonPath) {
    issues.push({
      side: "pair",
      code: "json_path_mismatch",
      path: "$.jsonPath",
      message: `Envelope jsonPath ${jsonArtifact.jsonPath} does not match ${pair.jsonPath}.`,
    });
  }
  if (
    jsonArtifact &&
    pair.markdownPath !== undefined &&
    jsonArtifact.markdownPath !== pair.markdownPath
  ) {
    issues.push({
      side: "pair",
      code: "markdown_path_mismatch",
      path: "$.markdownPath",
      message: `Envelope markdownPath ${jsonArtifact.markdownPath} does not match ${pair.markdownPath}.`,
    });
  }

  if (jsonArtifact && parsedMarkdown) {
    const expectedEnvelope = buildMarkdownArtifactEnvelope(jsonArtifact);
    if (canonicalStringify(expectedEnvelope) !== canonicalStringify(parsedMarkdown.envelope)) {
      issues.push({
        side: "pair",
        code: "markdown_envelope_mismatch",
        path: "$markdown.envelope",
        message: "Markdown envelope metadata does not match the JSON artifact.",
      });
    }
    if (jsonArtifact.payload.contentMarkdown !== parsedMarkdown.contentMarkdown) {
      issues.push({
        side: "pair",
        code: "markdown_content_mismatch",
        path: "$markdown.contentMarkdown",
        message: "Markdown body does not match JSON payload.contentMarkdown.",
      });
    }
  }

  const valid = issues.length === 0 && jsonArtifact !== undefined && parsedMarkdown !== undefined;
  return {
    valid,
    synchronized: valid,
    artifact: jsonArtifact,
    markdownArtifact: valid ? jsonArtifact : undefined,
    pairIdentity: jsonArtifact ? getArtifactPairIdentity(jsonArtifact) : undefined,
    issues,
    errors: issues.map((issue) => `${issue.side}:${issue.path}: ${issue.message}`),
  };
}

export function assertArtifactPair<TPayload extends ArtifactPayload = ArtifactPayload>(
  pair: ArtifactPair,
): CanonicalArtifact<TPayload>;
export function assertArtifactPair<TPayload extends ArtifactPayload = ArtifactPayload>(
  jsonArtifact: unknown,
  markdown: string,
): CanonicalArtifact<TPayload>;
export function assertArtifactPair<TPayload extends ArtifactPayload = ArtifactPayload>(
  pairOrJson: ArtifactPair | unknown,
  markdownArgument?: string,
): CanonicalArtifact<TPayload> {
  const verification =
    markdownArgument === undefined && isArtifactPairInput(pairOrJson)
      ? verifyArtifactPair<TPayload>(pairOrJson)
      : verifyArtifactPair<TPayload>(pairOrJson, markdownArgument as string);

  if (!verification.valid || !verification.artifact) {
    throw new Error(`Artifact pair verification failed: ${verification.errors.join(" ")}`);
  }
  return verification.artifact;
}

export function getArtifactPairIdentity(
  artifact: Pick<
    CanonicalArtifact,
    "projectId" | "artifactType" | "artifactId" | "revision"
  >,
): string {
  return getArtifactRevisionIdentity(artifact);
}

function isArtifactPairInput(
  value: unknown,
  markdownArgument?: string,
): value is ArtifactPair {
  return (
    markdownArgument === undefined &&
    value !== null &&
    typeof value === "object" &&
    Object.prototype.hasOwnProperty.call(value, "jsonArtifact") &&
    typeof (value as ArtifactPair).markdown === "string"
  );
}
