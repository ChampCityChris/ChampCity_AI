const path = require("node:path");

const repositoryRoot = path.resolve(__dirname, "..", "..", "..");
const {
  acquireDesktopLifecycleLease,
  releaseDesktopLifecycleLease,
} = require(path.join(
  repositoryRoot,
  "dist/main/agentHarness/runtime/desktopLifecycleLease.js",
));

const userDataRoot = process.argv[2];
const owner = process.argv[3];
if (!userDataRoot || !["desktop", "uninstall-maintenance"].includes(owner)) {
  throw new Error("Exclusion contender requires a userData root and valid owner.");
}

void (async () => {
  const acquisition = await acquireDesktopLifecycleLease(userDataRoot, owner);
  await sendMessage({ type: "acquisition", acquisition });
  if (!acquisition.acquired) {
    process.exit(0);
    return;
  }
  process.on("message", (message) => {
    if (!message || message.type !== "release") return;
    void releaseDesktopLifecycleLease(userDataRoot, acquisition.lease).then(async (released) => {
      await sendMessage({ type: "released", released });
      process.exit(released ? 0 : 1);
    });
  });
})().catch((error) => {
  void sendMessage({
    type: "error",
    error: error instanceof Error ? error.message : String(error),
  }).finally(() => process.exit(1));
});

function sendMessage(message) {
  return new Promise((resolve) => {
    if (!process.send) {
      resolve();
      return;
    }
    process.send(message, resolve);
  });
}
