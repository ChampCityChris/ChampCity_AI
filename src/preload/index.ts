import { contextBridge, ipcRenderer } from "electron";
import type { AppInfo, ChampCityApi, WorkspaceSelection } from "../shared/workspaceContracts";

const api: ChampCityApi = {
  getSelectedWorkspace: () => ipcRenderer.invoke("workspace:get") as Promise<WorkspaceSelection>,
  chooseWorkspaceFolder: () => ipcRenderer.invoke("workspace:choose") as Promise<WorkspaceSelection>,
  clearSelectedWorkspace: () => ipcRenderer.invoke("workspace:clear") as Promise<WorkspaceSelection>,
  getAppInfo: () => ipcRenderer.invoke("app:info") as Promise<AppInfo>,
  listDocuments: () => ipcRenderer.invoke("documents:list") as ReturnType<ChampCityApi["listDocuments"]>,
  readDocument: (logicalDocumentId) =>
    ipcRenderer.invoke("documents:read", logicalDocumentId) as ReturnType<ChampCityApi["readDocument"]>,
  setDocumentDisposition: (logicalDocumentId, status) =>
    ipcRenderer.invoke(
      "documents:setDisposition",
      logicalDocumentId,
      status,
    ) as ReturnType<ChampCityApi["setDocumentDisposition"]>,
  previewDispositionInitialization: () =>
    ipcRenderer.invoke(
      "documents:previewInitialization",
    ) as ReturnType<ChampCityApi["previewDispositionInitialization"]>,
  applyDispositionInitialization: () =>
    ipcRenderer.invoke(
      "documents:applyInitialization",
    ) as ReturnType<ChampCityApi["applyDispositionInitialization"]>,
  resolveCurrentDocument: () =>
    ipcRenderer.invoke(
      "documents:resolveCurrent",
    ) as ReturnType<ChampCityApi["resolveCurrentDocument"]>,
};

contextBridge.exposeInMainWorld("champcity", api);
