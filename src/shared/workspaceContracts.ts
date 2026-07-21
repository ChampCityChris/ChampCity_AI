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

export type WorkspaceLabel =
  | "Project Planning"
  | "Phase Planning"
  | "Work Card"
  | "Operator Validation"
  | "Phase Closeout";

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

export interface ChampCityApi {
  getSelectedWorkspace: () => Promise<WorkspaceSelection>;
  chooseWorkspaceFolder: () => Promise<WorkspaceSelection>;
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
}

export const workspaceLabels: WorkspaceLabel[] = [
  "Project Planning",
  "Phase Planning",
  "Work Card",
  "Operator Validation",
  "Phase Closeout",
];
