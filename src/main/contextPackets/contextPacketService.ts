import path from "node:path";

import {
  authorizeContextPacketExport,
  type ContextPacket,
  type ContextPacketExportResult,
  type ContextPacketManifest,
} from "../../shared/contextPackets/contextPacket";
import type { JsonValue } from "../../shared/artifacts";
import {
  ArtifactPairService,
  locationFromPairPaths,
} from "../artifacts";

export interface ContextPacketPairWriteRequest {
  artifactId: string;
  artifactType: "context_packet" | "context_manifest";
  status: "active";
  projectId: string;
  phaseId?: string;
  createdAt: string;
  updatedAt: string;
  markdownPath: string;
  jsonPath: string;
  relationships: {
    sources: string[];
    expectedOutputs: string[];
    supersedes: string[];
    children: string[];
  };
  payload: {
    kind: "context_packet" | "context_manifest";
    title: string;
    contentMarkdown: string;
    data: Record<string, unknown>;
  };
}

export interface ContextPacketPairBatchWriter {
  saveBatch(
    requests: readonly ContextPacketPairWriteRequest[],
  ): Promise<{
    ok: boolean;
    errorMessages?: string[];
  }>;
}

export interface ContextPacketExportRequest {
  packet: ContextPacket;
  operatorAcknowledgedOverBudget: boolean;
  projectId?: string;
}

export class ContextPacketService {
  constructor(
    private readonly repositoryRoot: string,
    private readonly pairWriter: ContextPacketPairBatchWriter,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async exportPacket(
    request: ContextPacketExportRequest,
  ): Promise<ContextPacketExportResult> {
    const authorization = authorizeContextPacketExport(
      request.packet,
      request.operatorAcknowledgedOverBudget,
    );

    if (!authorization.allowed) {
      return {
        ok: false,
        blocked: true,
        acknowledgementRequired: authorization.acknowledgementRequired,
        errorMessages: authorization.errorMessage
          ? [authorization.errorMessage]
          : ["Context packet export is blocked."],
      };
    }

    const packetMarkdownPath = normalizeApprovedPlanningPath(
      this.repositoryRoot,
      request.packet.suggestedPacketPath,
    );
    const manifestMarkdownPath = normalizeApprovedPlanningPath(
      this.repositoryRoot,
      request.packet.suggestedManifestPath,
    );
    const packetJsonPath = replaceMarkdownExtension(packetMarkdownPath);
    const manifestJsonPath = replaceMarkdownExtension(manifestMarkdownPath);
    const timestamp = this.now();
    const phaseId = extractPhaseId(packetMarkdownPath);
    const includedArtifactIds = request.packet.manifest.included
      .filter((entry) => entry.category === "artifact")
      .map((entry) => entry.id);
    const manifestArtifactId = `${request.packet.packetId}/manifest`;
    const packetRequest: ContextPacketPairWriteRequest = {
      artifactId: request.packet.packetId,
      artifactType: "context_packet",
      status: "active",
      projectId: request.projectId ?? "champcity-ai",
      phaseId,
      createdAt: timestamp,
      updatedAt: timestamp,
      markdownPath: packetMarkdownPath,
      jsonPath: packetJsonPath,
      relationships: {
        sources: includedArtifactIds,
        expectedOutputs: [],
        supersedes: [],
        children: [manifestArtifactId],
      },
      payload: {
        kind: "context_packet",
        title: request.packet.title,
        contentMarkdown: request.packet.markdown,
        data: {
          packetKind: request.packet.packetKind,
          scenario: request.packet.scenario,
          manifestArtifactId,
          estimatedTokens: request.packet.manifest.estimatedTokens,
          budgetTokens: request.packet.manifest.budgetTokens,
          overBudgetAcknowledged:
            request.packet.manifest.overBudget &&
            request.operatorAcknowledgedOverBudget,
        },
      },
    };
    const manifestRequest: ContextPacketPairWriteRequest = {
      artifactId: manifestArtifactId,
      artifactType: "context_manifest",
      status: "active",
      projectId: request.projectId ?? "champcity-ai",
      phaseId,
      createdAt: timestamp,
      updatedAt: timestamp,
      markdownPath: manifestMarkdownPath,
      jsonPath: manifestJsonPath,
      relationships: {
        sources: [request.packet.packetId, ...includedArtifactIds],
        expectedOutputs: [],
        supersedes: [],
        children: [],
      },
      payload: {
        kind: "context_manifest",
        title: `${request.packet.title} — Context Manifest`,
        contentMarkdown: renderContextManifestMarkdown(request.packet.manifest),
        data: request.packet.manifest as unknown as Record<string, unknown>,
      },
    };
    const writeResult = await this.pairWriter.saveBatch([
      packetRequest,
      manifestRequest,
    ]);

    if (!writeResult.ok) {
      return {
        ok: false,
        blocked: true,
        acknowledgementRequired: false,
        errorMessages: writeResult.errorMessages ?? [
          "The context packet pair and adjacent manifest were not committed.",
        ],
      };
    }

    return {
      ok: true,
      blocked: false,
      acknowledgementRequired: false,
      packetMarkdownPath,
      packetJsonPath,
      manifestMarkdownPath,
      manifestJsonPath,
    };
  }
}

/** Atomic adapter: packet, adjacent manifest, and registry commit or roll back together. */
export class ArtifactPairContextPacketWriter
  implements ContextPacketPairBatchWriter
{
  constructor(private readonly artifactPairs: ArtifactPairService) {}

  async saveBatch(
    requests: readonly ContextPacketPairWriteRequest[],
  ): Promise<{ ok: boolean; errorMessages?: string[] }> {
    try {
      await this.artifactPairs.commitArtifactsBatch(
        requests.map((request) => ({
          artifactId: request.artifactId,
          artifactType: request.artifactType,
          status: request.status,
          projectId: request.projectId,
          ...(request.phaseId ? { phaseId: request.phaseId } : {}),
          relationships: request.relationships,
          payload: {
            title: request.payload.title,
            contentMarkdown: request.payload.contentMarkdown,
            data: request.payload.data as unknown as JsonValue,
          },
          location: locationFromPairPaths(
            request.jsonPath,
            request.markdownPath,
          ),
        })),
      );
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        errorMessages: [error instanceof Error ? error.message : String(error)],
      };
    }
  }
}

export function renderContextManifestMarkdown(
  manifest: ContextPacketManifest,
): string {
  return [
    `# Context Manifest — ${manifest.packetId}`,
    "",
    `- Packet kind: ${manifest.packetKind}`,
    `- Scenario: ${manifest.scenario}`,
    `- Estimated tokens: ${manifest.estimatedTokens}`,
    `- Budget: ${manifest.budgetTokens}`,
    `- Over budget: ${manifest.overBudget ? "yes" : "no"}`,
    `- Explicit acknowledgment required: ${manifest.requiresOperatorAcknowledgment ? "yes" : "no"}`,
    `- Estimate method: ${manifest.estimationMethod}`,
    "",
    "## Included",
    "",
    ...renderManifestEntries(manifest.included),
    "",
    "## Excluded",
    "",
    ...renderManifestEntries(manifest.excluded),
    "",
    "## Largest Contributors",
    "",
    ...(manifest.largestContributors.length === 0
      ? ["- None."]
      : manifest.largestContributors.map(
          (entry) =>
            `- ${entry.title} (${entry.id}): ${entry.estimatedTokens} estimated tokens`,
        )),
    "",
  ].join("\n");
}

function renderManifestEntries(
  entries: ContextPacketManifest["included"],
): string[] {
  return entries.length === 0
    ? ["- None."]
    : entries.map(
        (entry) =>
          `- ${entry.title} (${entry.id}) — ${entry.reason} [${entry.estimatedTokens} estimated tokens]`,
      );
}

function normalizeApprovedPlanningPath(
  repositoryRoot: string,
  repoRelativePath: string,
): string {
  const normalized = repoRelativePath.replaceAll("\\", "/");
  if (
    !normalized.startsWith("planning/") ||
    !normalized.endsWith(".md") ||
    normalized.split("/").includes("..")
  ) {
    throw new Error("Context packet paths must stay inside approved planning paths.");
  }

  const root = path.resolve(repositoryRoot);
  const absolute = path.resolve(root, normalized);
  const relative = path.relative(root, absolute);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Context packet paths must stay inside the repository.");
  }

  return normalized;
}

function replaceMarkdownExtension(filePath: string): string {
  return `${filePath.slice(0, -3)}.json`;
}

function extractPhaseId(filePath: string): string | undefined {
  return filePath.match(/^planning\/phases\/([^/]+)\//)?.[1];
}
