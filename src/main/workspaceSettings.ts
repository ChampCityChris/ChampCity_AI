import fs from "node:fs";
import path from "node:path";
import type { WorkspaceSelection } from "../shared/workspaceContracts";

const settingsFileName = "workspace-settings.json";

interface StoredWorkspaceSettings {
  workspaceRoot: string;
}

export function getWorkspaceSettingsPath(userDataRoot: string): string {
  return path.join(userDataRoot, settingsFileName);
}

export function validateWorkspaceRoot(workspaceRoot: string): WorkspaceSelection {
  const resolvedRoot = path.resolve(workspaceRoot);

  try {
    const rootStats = fs.statSync(resolvedRoot);
    if (!rootStats.isDirectory()) {
      return {
        ok: false,
        workspaceRoot: null,
        reason: "Selected path is not a directory.",
      };
    }

    const planningPath = path.join(resolvedRoot, "planning");
    const planningStats = fs.statSync(planningPath);
    if (!planningStats.isDirectory()) {
      return {
        ok: false,
        workspaceRoot: null,
        reason: "Selected directory does not contain planning/.",
      };
    }

    return {
      ok: true,
      workspaceRoot: resolvedRoot,
    };
  } catch {
    return {
      ok: false,
      workspaceRoot: null,
      reason: "Selected directory does not contain planning/.",
    };
  }
}

export function readSelectedWorkspace(userDataRoot: string): WorkspaceSelection {
  const settingsPath = getWorkspaceSettingsPath(userDataRoot);

  if (!fs.existsSync(settingsPath)) {
    return {
      ok: false,
      workspaceRoot: null,
      reason: "No workspace selected.",
    };
  }

  try {
    const settings = JSON.parse(
      fs.readFileSync(settingsPath, "utf8"),
    ) as Partial<StoredWorkspaceSettings>;

    if (typeof settings.workspaceRoot !== "string") {
      return {
        ok: false,
        workspaceRoot: null,
        reason: "Stored workspace setting is invalid.",
      };
    }

    return validateWorkspaceRoot(settings.workspaceRoot);
  } catch {
    return {
      ok: false,
      workspaceRoot: null,
      reason: "Stored workspace setting could not be read.",
    };
  }
}

export function saveSelectedWorkspace(
  userDataRoot: string,
  workspaceRoot: string,
): WorkspaceSelection {
  const validation = validateWorkspaceRoot(workspaceRoot);
  if (!validation.ok) {
    return validation;
  }

  fs.mkdirSync(userDataRoot, { recursive: true });
  fs.writeFileSync(
    getWorkspaceSettingsPath(userDataRoot),
    JSON.stringify({ workspaceRoot: validation.workspaceRoot }, null, 2),
    "utf8",
  );

  return validation;
}

export function clearSelectedWorkspace(userDataRoot: string): WorkspaceSelection {
  const settingsPath = getWorkspaceSettingsPath(userDataRoot);

  if (fs.existsSync(settingsPath)) {
    fs.unlinkSync(settingsPath);
  }

  return {
    ok: false,
    workspaceRoot: null,
    reason: "No workspace selected.",
  };
}
