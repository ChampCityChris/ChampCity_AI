import fs from "node:fs";
import path from "node:path";
import type { McpWorkspaceBinding, WorkspaceSelection } from "../shared/workspaceContracts";
import { requireBoundMcpWorkspace } from "./integrations/mcpWorkspacePromptContract";

const settingsFileName = "workspace-settings.json";

interface StoredWorkspaceSettings {
  workspaceRoot: string;
  mcpWorkspaceBinding?: McpWorkspaceBinding;
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

    fs.accessSync(resolvedRoot, fs.constants.R_OK | fs.constants.W_OK);

    const mcpWorkspaceBinding = optionalMcpWorkspaceBinding(resolvedRoot);
    return {
      ok: true,
      workspaceRoot: resolvedRoot,
      ...(mcpWorkspaceBinding ? { mcpWorkspaceBinding } : {}),
    };
  } catch {
    return {
      ok: false,
      workspaceRoot: null,
      reason: "Selected directory must exist and be readable and writable.",
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
    JSON.stringify({
      workspaceRoot: validation.workspaceRoot,
      ...(validation.mcpWorkspaceBinding ? { mcpWorkspaceBinding: validation.mcpWorkspaceBinding } : {}),
    } satisfies StoredWorkspaceSettings, null, 2),
    "utf8",
  );

  return validation;
}

function optionalMcpWorkspaceBinding(workspaceRoot: string): McpWorkspaceBinding | undefined {
  try {
    const binding = requireBoundMcpWorkspace(workspaceRoot);
    return {
      mcpWorkspaceId: binding.workspaceId,
      label: binding.label,
      repositoryName: binding.repositoryName,
      branch: binding.branch,
      gitBacked: binding.gitBacked,
    };
  } catch {
    return undefined;
  }
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
