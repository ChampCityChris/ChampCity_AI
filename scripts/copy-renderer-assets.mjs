import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const rendererSource = path.join(projectRoot, "src", "renderer");
const rendererOutput = path.join(projectRoot, "dist", "renderer");

await mkdir(rendererOutput, { recursive: true });

for (const fileName of ["index.html", "styles.css"]) {
  await copyFile(
    path.join(rendererSource, fileName),
    path.join(rendererOutput, fileName),
  );
}
