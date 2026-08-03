const esbuild = require("esbuild");
const fs = require("node:fs");
const path = require("node:path");

function loadRendererSourceModule(relativeSourcePath) {
  const sourcePath = path.join(__dirname, "..", "..", relativeSourcePath);
  const tempDir = fs.mkdtempSync(path.join(__dirname, ".tmp-renderer-module-"));
  const outfile = path.join(tempDir, "module.cjs");
  esbuild.buildSync({
    entryPoints: [sourcePath],
    outfile,
    bundle: true,
    platform: "node",
    format: "cjs",
    jsx: "automatic",
    logLevel: "silent",
    external: [
      "lucide-react",
      "react",
      "react-dom",
      "react-dom/server",
    ],
  });
  process.once("exit", () => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });
  return require(outfile);
}

module.exports = { loadRendererSourceModule };
