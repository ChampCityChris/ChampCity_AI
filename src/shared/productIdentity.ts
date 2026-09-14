export const productIdentity = Object.freeze({
  productName: "ChampCity A/I",
  windowsAppUserModelId: "ChampCity.AI",
  windowsExecutableName: "ChampCityAI.exe",
});

export const champCityUserDataDirectoryName = "champcity-ai";

export interface ElectronProductIdentityApplication {
  getPath(name: "userData"): string;
  setPath(name: "userData", path: string): void;
  setName(name: string): void;
  setAppUserModelId(id: string): void;
}

export function applyElectronProductIdentity(
  application: ElectronProductIdentityApplication,
): string {
  const preservedUserDataRoot = application.getPath("userData");

  application.setName(productIdentity.productName);
  application.setPath("userData", preservedUserDataRoot);
  application.setAppUserModelId(productIdentity.windowsAppUserModelId);

  return preservedUserDataRoot;
}

export function resolveChampCityUserDataRoot(appDataRoot: string): string {
  const trimmedRoot = appDataRoot.replace(/[\\/]+$/, "");
  const separator = trimmedRoot.includes("\\") ? "\\" : "/";
  return `${trimmedRoot}${separator}${champCityUserDataDirectoryName}`;
}
