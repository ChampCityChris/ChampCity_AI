import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const brandingOutputDirectory = path.join(repositoryRoot, "dist", "branding");
const brandingAssets = [
  ["assets/branding/ChampCity-AI.ico", "ChampCity-AI.ico"],
  ["assets/branding/svg/champcity-mark.svg", "champcity-mark.svg"],
  ["assets/branding/svg/champcity-app-icon.svg", "champcity-app-icon.svg"],
  ["assets/branding/svg/champcity-mark-monochrome.svg", "champcity-mark-monochrome.svg"],
];

for (const [sourceRelativePath] of brandingAssets) {
  const sourcePath = path.join(repositoryRoot, ...sourceRelativePath.split("/"));
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Required ChampCity branding source is missing: ${sourceRelativePath}`);
  }
}

fs.mkdirSync(brandingOutputDirectory, { recursive: true });
for (const [sourceRelativePath, outputFileName] of brandingAssets) {
  const sourcePath = path.join(repositoryRoot, ...sourceRelativePath.split("/"));
  fs.copyFileSync(sourcePath, path.join(brandingOutputDirectory, outputFileName));
}
