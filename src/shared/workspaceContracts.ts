import type {
  FirstNonApprovedResult,
} from "./documents/documentOrder";
import type {
  InitializationPreview,
  InitializationResult,
  PlanningDocumentDetail,
  PlanningDocumentSummary,
} from "./documents/planningDocument";
import type { DocumentDispositionStatus } from "./documents/documentDisposition";
import {
  createWorkspaceRegistry,
  type WorkspaceDefinition,
  type WorkspaceId,
  type WorkspaceLabel,
} from "./workspaces/workspaceRegistry";

export type { WorkspaceDefinition, WorkspaceId, WorkspaceLabel };

export type WorkspaceSelection =
  | {
      ok: true;
      workspaceRoot: string;
    }
  | {
      ok: false;
      workspaceRoot: null;
      reason: string;
    };

export interface AppInfo {
  name: "ChampCity A/I";
  version: string;
}

export const projectTypeOptions = [
  "Desktop application",
  "Web application",
  "Mobile application",
  "CLI or tool",
  "Library or service",
  "Documentation or process",
  "Other",
] as const;

export type ProjectType = (typeof projectTypeOptions)[number];

export interface ProjectRepositorySelection {
  ok: true;
  repositoryPath: string;
  selectionReference: "selected-project-repository";
}

export interface ProjectIntakeSubmission {
  projectName: string;
  projectPurpose: string;
  desiredOutcome: string;
  projectType: ProjectType;
  projectRepository: string;
  hasExistingSourceOrPlanning: boolean;
  knownConstraints?: string;
  repositoryReviewContext?: string;
}

export interface ProjectIntakeSubmissionResult {
  ok: true;
  projectSlug: string;
  projectRoot: string;
  projectIntakeMarkdownPath: string;
  projectIntakeJsonPath: string;
  architectPromptMarkdownPath: string;
  architectPromptJsonPath: string;
  architectInterviewTargetMarkdownPath: string;
  architectInterviewTargetJsonPath: string;
  artifactRevision: number;
  promptRevision: number;
  invalidatedPaths: string[];
}

export type ArchitectBrowserLoadState =
  | "detached"
  | "loading"
  | "loaded-auth-state-unknown"
  | "operator-confirmed-signed-in"
  | "handoff-ready"
  | "handoff-submitted"
  | "output-detected"
  | "load-failed";

export type ArchitectHandoffState =
  | "handoff-unavailable"
  | "handoff-ready"
  | "handoff-failed";

export interface ArchitectHandoffManifest {
  state: ArchitectHandoffState;
  promptMarkdownPath?: string;
  promptJsonPath?: string;
  projectIntakeMarkdownPath?: string;
  projectIntakeJsonPath?: string;
  repositoryReference?: "<PROJECT_REPO>";
  reason?: string;
}

export interface ArchitectBrowserFoundationStatus {
  surfaceUrl: string;
  sessionPartition: "persist:champcity-architect";
  browserState: ArchitectBrowserLoadState;
  handoff: ArchitectHandoffManifest;
  security: {
    nodeIntegration: false;
    contextIsolation: true;
    sandbox: true;
    preload: null;
  };
}

export type ClosureDecision = "Close" | "DoNotClose";

export interface BrowserViewBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RuntimeActionResult {
  ok: true;
  action: string;
  message: string;
  payload?: unknown;
}

export interface CurrentWorkspaceModel {
  activeWorkspaceId: WorkspaceId;
  level: string;
  stage: string;
  currentPhaseId?: string;
  currentWorkCardId?: string;
  currentTarget: string;
  sourceEvidence: string[];
  requiredAction: string;
  expectedOutput: string;
  eligibility: string;
  blocker?: string;
  expectedNextState: string;
}

export interface ChampCityApi {
  getSelectedWorkspace: () => Promise<WorkspaceSelection>;
  chooseWorkspaceFolder: () => Promise<WorkspaceSelection>;
  chooseProjectRepositoryFolder: () => Promise<ProjectRepositorySelection | WorkspaceSelection>;
  clearSelectedWorkspace: () => Promise<WorkspaceSelection>;
  getAppInfo: () => Promise<AppInfo>;
  listDocuments: () => Promise<PlanningDocumentSummary[]>;
  readDocument: (logicalDocumentId: string) => Promise<PlanningDocumentDetail>;
  setDocumentDisposition: (
    logicalDocumentId: string,
    status: DocumentDispositionStatus,
  ) => Promise<PlanningDocumentSummary>;
  previewDispositionInitialization: () => Promise<InitializationPreview>;
  applyDispositionInitialization: () => Promise<InitializationResult>;
  resolveCurrentDocument: () => Promise<FirstNonApprovedResult>;
  submitProjectIntake: (
    submission: ProjectIntakeSubmission,
  ) => Promise<ProjectIntakeSubmissionResult>;
  getArchitectBrowserFoundationStatus: () => Promise<ArchitectBrowserFoundationStatus>;
  setArchitectBrowserBounds: (
    bounds: BrowserViewBounds,
  ) => Promise<ArchitectBrowserFoundationStatus>;
  showArchitectBrowser: () => Promise<ArchitectBrowserFoundationStatus>;
  hideArchitectBrowser: () => Promise<ArchitectBrowserFoundationStatus>;
  confirmArchitectSignedIn: () => Promise<ArchitectBrowserFoundationStatus>;
  getCurrentWorkspaceModel: () => Promise<CurrentWorkspaceModel>;
  generateCurrentHandoff: () => Promise<RuntimeActionResult>;
  applyCurrentDisposition: (
    status: DocumentDispositionStatus,
  ) => Promise<RuntimeActionResult>;
  createRepairForCurrentFailure: (defect: string) => Promise<RuntimeActionResult>;
  createValidationAttemptForCurrentWorkCard: () => Promise<RuntimeActionResult>;
  createPhaseCloseoutForCurrentPhase: (
    closureDecision: ClosureDecision,
    rationale: string,
  ) => Promise<RuntimeActionResult>;
  createProjectCloseoutForCurrentProject: (
    closureDecision: ClosureDecision,
    rationale: string,
  ) => Promise<RuntimeActionResult>;
}

export const visibleWorkspaceDefinitions: readonly WorkspaceDefinition[] = createWorkspaceRegistry([
  {
    id: "project-intake-capture",
    label: "Project Intake Capture",
    location: { level: "project", stage: "intake" },
    order: 10,
  },
  {
    id: "architect-interview",
    label: "Architect Interview",
    location: { level: "project", stage: "intake" },
    order: 20,
  },
  {
    id: "project-planning-review",
    label: "Project Plan and Roadmap Review",
    location: { level: "project", stage: "planning" },
    order: 10,
  },
  {
    id: "project-phase-map",
    label: "Phase Map",
    location: { level: "project", stage: "building" },
    order: 10,
  },
  {
    id: "project-validation",
    label: "Project Validation",
    location: { level: "project", stage: "validation" },
    order: 10,
  },
  {
    id: "project-close",
    label: "Project Close",
    location: { level: "project", stage: "close" },
    order: 10,
  },
  {
    id: "phase-interview",
    label: "Phase Interview",
    location: { level: "phase", stage: "intake" },
    order: 10,
  },
  {
    id: "phase-planning-bundle",
    label: "Phase Planning",
    location: { level: "phase", stage: "planning" },
    order: 10,
  },
  {
    id: "phase-work-card-selection",
    label: "Work Card Selection",
    location: { level: "phase", stage: "building" },
    order: 10,
  },
  {
    id: "work-card-intake",
    label: "Work Card Intake",
    location: { level: "workCard", stage: "intake" },
    order: 10,
  },
  {
    id: "work-card-planning",
    label: "Work Card Planning",
    location: { level: "workCard", stage: "planning" },
    order: 10,
  },
  {
    id: "work-card-building-review",
    label: "Implementer Handoff and Report Review",
    location: { level: "workCard", stage: "building" },
    order: 10,
  },
  {
    id: "work-card-repair",
    label: "Work Card Repair",
    location: { level: "workCard", stage: "building" },
    order: 20,
  },
  {
    id: "work-card-validation",
    label: "Work Card Validation",
    location: { level: "workCard", stage: "validation" },
    order: 10,
  },
  {
    id: "work-card-close",
    label: "Work Card Close",
    location: { level: "workCard", stage: "close" },
    order: 10,
  },
  {
    id: "phase-validation",
    label: "Phase Validation",
    location: { level: "phase", stage: "validation" },
    order: 10,
  },
  {
    id: "phase-close",
    label: "Phase Close",
    location: { level: "phase", stage: "close" },
    order: 10,
  },
]);

export const phase08WorkspaceDefinitions: readonly WorkspaceDefinition[] = createWorkspaceRegistry([
  {
    id: "project-intake-capture",
    label: "Project Intake Capture",
    location: { level: "project", stage: "intake" },
    order: 10,
  },
  {
    id: "architect-interview",
    label: "Architect Interview",
    location: { level: "project", stage: "intake" },
    order: 20,
  },
  {
    id: "project-planning-review",
    label: "Project Plan and Roadmap Review",
    location: { level: "project", stage: "planning" },
    order: 10,
  },
  {
    id: "project-phase-map",
    label: "Phase Map",
    location: { level: "project", stage: "building" },
    order: 10,
  },
  {
    id: "project-validation",
    label: "Project Validation",
    location: { level: "project", stage: "validation" },
    order: 10,
  },
  {
    id: "project-close",
    label: "Project Close",
    location: { level: "project", stage: "close" },
    order: 10,
  },
  {
    id: "phase-interview",
    label: "Phase Interview",
    location: { level: "phase", stage: "intake" },
    order: 10,
  },
  {
    id: "phase-planning-bundle",
    label: "Phase Planning",
    location: { level: "phase", stage: "planning" },
    order: 10,
  },
  {
    id: "phase-work-card-selection",
    label: "Work Card Selection",
    location: { level: "phase", stage: "building" },
    order: 10,
  },
  {
    id: "phase-validation",
    label: "Phase Validation",
    location: { level: "phase", stage: "validation" },
    order: 10,
  },
  {
    id: "phase-close",
    label: "Phase Close",
    location: { level: "phase", stage: "close" },
    order: 10,
  },
  {
    id: "work-card-intake",
    label: "Work Card Intake",
    location: { level: "workCard", stage: "intake" },
    order: 10,
  },
  {
    id: "work-card-planning",
    label: "Work Card Planning",
    location: { level: "workCard", stage: "planning" },
    order: 10,
  },
  {
    id: "work-card-building-review",
    label: "Implementer Handoff and Report Review",
    location: { level: "workCard", stage: "building" },
    order: 10,
  },
  {
    id: "work-card-repair",
    label: "Work Card Repair",
    location: { level: "workCard", stage: "building" },
    order: 20,
  },
  {
    id: "work-card-validation",
    label: "Operator Validation",
    location: { level: "workCard", stage: "validation" },
    order: 10,
  },
  {
    id: "work-card-close",
    label: "Work Card Close",
    location: { level: "workCard", stage: "close" },
    order: 10,
  },
]);

export const workspaceDefinitions = visibleWorkspaceDefinitions;
export const resolverWorkspaceDefinitions = phase08WorkspaceDefinitions;

export const workspaceLabels: WorkspaceLabel[] = workspaceDefinitions.map(
  (definition) => definition.label,
);

export const workspaceIds: WorkspaceId[] = workspaceDefinitions.map(
  (definition) => definition.id,
);
