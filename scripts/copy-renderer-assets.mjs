import { cp, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const rendererSource = path.join(projectRoot, "src", "renderer");
const rendererOutput = path.join(projectRoot, "dist", "renderer");
const rendererAssetsSource = path.join(rendererSource, "assets");
const rendererAssetsOutput = path.join(rendererOutput, "assets");

await mkdir(rendererOutput, { recursive: true });

await cp(rendererAssetsSource, rendererAssetsOutput, {
  recursive: true,
  force: true,
});
