const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const {
  acquireDesktopLifecycleLease,
  getDesktopLifecycleLeasePath,
  releaseDesktopLifecycleLease,
} = require("../../dist/main/agentHarness/runtime/desktopLifecycleLease.js");

const contenderPath = path.join(
  __dirname,
  "fixtures",
  "desktop-lifecycle-exclusion-contender.cjs",
);

void (async () => {
  const contention = await proveConcurrentStaleDiagnosticContention();
  const crashRecovery = await proveCrashHandleRelease();
  process.stdout.write(`${JSON.stringify({ contention, crashRecovery })}\n`);
})().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});

async function proveConcurrentStaleDiagnosticContention() {
  const userDataRoot = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-exclusion-contention-"));
  writeStaleDiagnostic(userDataRoot, "11111111-1111-4111-8111-111111111111");
  const contenderA = spawnContender(userDataRoot, "desktop");
  const contenderB = spawnContender(userDataRoot, "uninstall-maintenance");
  const [resultA, resultB] = await Promise.all([
    waitForAcquisition(contenderA, 10_000),
    waitForAcquisition(contenderB, 10_000),
  ]);
  const contenders = [
    { child: contenderA, result: resultA },
    { child: contenderB, result: resultB },
  ];
  const winners = contenders.filter(({ result }) => result.acquired);
  const losers = contenders.filter(({ result }) => !result.acquired);
  assert.equal(winners.length, 1);
  assert.equal(losers.length, 1);
  const winner = winners[0];
  const loser = losers[0];
  assert.equal(loser.result.reason, "live-owner");
  assert.equal(loser.result.existingLease.leaseId, winner.result.lease.leaseId);
  assert.equal(isProcessRunning(winner.child.pid), true);

  const third = await acquireDesktopLifecycleLease(userDataRoot, "desktop");
  assert.equal(third.acquired, false);
  assert.equal(third.reason, "live-owner");
  assert.equal(third.existingLease.leaseId, winner.result.lease.leaseId);
  const diagnostic = JSON.parse(fs.readFileSync(getDesktopLifecycleLeasePath(userDataRoot), "utf8"));
  assert.equal(diagnostic.leaseId, winner.result.lease.leaseId);

  const releasedMessage = waitForMessage(winner.child, "released", 10_000);
  winner.child.send({ type: "release" });
  const released = await releasedMessage;
  assert.equal(released.released, true);
  assert.equal(await waitForChildExit(winner.child, 10_000), 0);
  assert.equal(await waitForChildExit(loser.child, 10_000), 0);
  assert.equal(fs.existsSync(getDesktopLifecycleLeasePath(userDataRoot)), false);
  return {
    winnerProcessId: winner.child.pid,
    winnerOwner: winner.result.lease.owner,
    loserProcessId: loser.child.pid,
    loserReason: loser.result.reason,
    exactlyOneAcquired: true,
    winnerRemainedCurrent: true,
  };
}

async function proveCrashHandleRelease() {
  const userDataRoot = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-exclusion-crash-"));
  const crashedOwner = spawnContender(userDataRoot, "desktop");
  const crashedAcquisition = await waitForAcquisition(crashedOwner, 10_000);
  assert.equal(crashedAcquisition.acquired, true);
  const staleLeaseId = crashedAcquisition.lease.leaseId;
  assert.equal(JSON.parse(
    fs.readFileSync(getDesktopLifecycleLeasePath(userDataRoot), "utf8"),
  ).leaseId, staleLeaseId);

  assert.equal(crashedOwner.kill(), true);
  await waitForChildExit(crashedOwner, 10_000);
  assert.equal(fs.existsSync(getDesktopLifecycleLeasePath(userDataRoot)), true);
  assert.equal(JSON.parse(
    fs.readFileSync(getDesktopLifecycleLeasePath(userDataRoot), "utf8"),
  ).leaseId, staleLeaseId);

  const replacement = await acquireDesktopLifecycleLease(userDataRoot, "uninstall-maintenance");
  assert.equal(replacement.acquired, true);
  assert.notEqual(replacement.lease.leaseId, staleLeaseId);
  assert.equal(JSON.parse(
    fs.readFileSync(getDesktopLifecycleLeasePath(userDataRoot), "utf8"),
  ).leaseId, replacement.lease.leaseId);
  assert.equal(await releaseDesktopLifecycleLease(userDataRoot, replacement.lease), true);
  return {
    crashedProcessId: crashedOwner.pid,
    staleDiagnosticLeaseId: staleLeaseId,
    replacementProcessId: replacement.lease.processId,
    replacementLeaseId: replacement.lease.leaseId,
    osHandleReleasedAfterCrash: true,
    staleDiagnosticIgnored: true,
  };
}

function spawnContender(userDataRoot, owner) {
  return spawn(process.execPath, [contenderPath, userDataRoot, owner], {
    cwd: path.join(__dirname, "..", ".."),
    stdio: ["ignore", "pipe", "pipe", "ipc"],
    windowsHide: true,
  });
}

function waitForAcquisition(child, timeoutMs) {
  return waitForMessage(child, "acquisition", timeoutMs).then((message) => message.acquisition);
}

function waitForMessage(child, type, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Timed out waiting for contender ${type}.`)), timeoutMs);
    const onMessage = (message) => {
      if (!message || message.type !== type) {
        if (message?.type === "error") {
          clearTimeout(timeout);
          child.off("message", onMessage);
          reject(new Error(message.error));
        }
        return;
      }
      clearTimeout(timeout);
      child.off("message", onMessage);
      resolve(message);
    };
    child.on("message", onMessage);
    child.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

function waitForChildExit(child, timeoutMs) {
  if (child.exitCode !== null) return Promise.resolve(child.exitCode);
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Contender did not exit.")), timeoutMs);
    child.once("exit", (code) => {
      clearTimeout(timeout);
      resolve(code);
    });
    child.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

function writeStaleDiagnostic(userDataRoot, leaseId) {
  fs.writeFileSync(getDesktopLifecycleLeasePath(userDataRoot), `${JSON.stringify({
    schemaVersion: 1,
    owner: "desktop",
    processId: 999999,
    leaseId,
    acquiredAt: "2026-09-11T12:00:00.000Z",
  }, null, 2)}\n`, "utf8");
}

function isProcessRunning(processId) {
  try {
    process.kill(processId, 0);
    return true;
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ESRCH") return false;
    if (error && typeof error === "object" && error.code === "EPERM") return true;
    throw error;
  }
}
