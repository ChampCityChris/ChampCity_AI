import path from "node:path";

import { CurrentContextPacketCompiler } from "./contextPackets/currentContextPacketCompiler";
import {
  ArtifactPairContextPacketWriter,
  ContextPacketService,
} from "./contextPackets/contextPacketService";
import { CanonicalWorkflowAuthority } from "./workCards/canonicalWorkflowAuthority";
import { RoutedProcessInvocationService } from "./workflow";

/** One main-process authority instance serializes every canonical commit. */
export const canonicalRepositoryRoot = path.resolve(__dirname, "..", "..");
export const canonicalWorkflowAuthority = new CanonicalWorkflowAuthority(
  canonicalRepositoryRoot,
);
export const currentContextPacketCompiler = new CurrentContextPacketCompiler(
  canonicalWorkflowAuthority,
);
export const routedProcessInvocationService = new RoutedProcessInvocationService(
  canonicalWorkflowAuthority.routedActions,
  canonicalWorkflowAuthority.workflowStateStore,
  canonicalWorkflowAuthority.artifactPairs,
);
export const contextPacketService = new ContextPacketService(
  canonicalRepositoryRoot,
  new ArtifactPairContextPacketWriter(canonicalWorkflowAuthority.artifactPairs),
);
