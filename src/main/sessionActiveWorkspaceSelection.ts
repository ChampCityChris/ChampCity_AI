import type { WorkspaceSelection } from "../shared/workspaceContracts";

type WorkspaceDeactivationHandler = (workspaceRoot: string) => void;

function unboundWorkspaceSelection(): WorkspaceSelection {
  return {
    ok: false,
    workspaceRoot: null,
    reason: "No workspace selected.",
  };
}

function copyWorkspaceSelection(selection: WorkspaceSelection): WorkspaceSelection {
  if (!selection.ok) {
    return { ...selection };
  }

  return {
    ...selection,
    ...(selection.mcpWorkspaceBinding
      ? { mcpWorkspaceBinding: { ...selection.mcpWorkspaceBinding } }
      : {}),
  };
}

export class SessionActiveWorkspaceSelection {
  private activeSelection: WorkspaceSelection = unboundWorkspaceSelection();

  currentSelection(): WorkspaceSelection {
    return copyWorkspaceSelection(this.activeSelection);
  }

  retainCurrentSelection(): WorkspaceSelection {
    return this.currentSelection();
  }

  requireWorkspaceRoot(): string {
    if (!this.activeSelection.ok) {
      throw new Error(this.activeSelection.reason);
    }

    return this.activeSelection.workspaceRoot;
  }

  activateFromValidation(
    selection: WorkspaceSelection,
    onBeforeReplace?: WorkspaceDeactivationHandler,
  ): WorkspaceSelection {
    if (!selection.ok) {
      return copyWorkspaceSelection(selection);
    }

    if (this.activeSelection.ok) {
      onBeforeReplace?.(this.activeSelection.workspaceRoot);
    }

    this.activeSelection = copyWorkspaceSelection(selection);
    return this.currentSelection();
  }

  deactivate(onBeforeDeactivate?: WorkspaceDeactivationHandler): WorkspaceSelection {
    if (this.activeSelection.ok) {
      onBeforeDeactivate?.(this.activeSelection.workspaceRoot);
    }

    this.activeSelection = unboundWorkspaceSelection();
    return this.currentSelection();
  }
}
