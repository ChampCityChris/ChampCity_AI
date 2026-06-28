import { contextBridge } from "electron";

const api = {
  getAppInfo: () => ({
    name: "ChampCity_AI Work Card MVP",
    stage: "foundation scaffold",
    coreLoop: ["Capture", "Frame", "Plan", "Build", "Prove"],
  }),
};

contextBridge.exposeInMainWorld("champCity", api);
