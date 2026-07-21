import type { ChampCityApi } from "../shared/workspaceContracts";

declare global {
  interface Window {
    champcity: ChampCityApi;
  }
}

export {};
