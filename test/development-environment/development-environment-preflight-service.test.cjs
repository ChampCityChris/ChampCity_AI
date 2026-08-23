const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  DevelopmentEnvironmentPreflightService,
} = require("../../dist/main/developmentEnvironment/developmentEnvironmentPreflightService.js");

test("preflight service reads Formal Work Card requirements and delegates exact managed capabilities", async () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-preflight-service-"));
  const formalWorkCardPath = path.join(
    "planning",
    "phases",
    "phase-00-baseline-ground-zero",
    "Work_Cards",
    "phase-00-wc-01-development-readiness.md",
  );
  fs.mkdirSync(path.dirname(path.join(workspaceRoot, formalWorkCardPath)), { recursive: true });
  fs.writeFileSync(path.join(workspaceRoot, formalWorkCardPath), [
    "# phase-00-wc-01-development-readiness",
    "",
    "```champcity-development-environment",
    JSON.stringify({
      schemaVersion: 1,
      requirements: [
        {
          capabilityId: "git",
          provisioning: "managed",
        },
        {
          capabilityId: "nodejs-lts",
          provisioning: "managed",
        },
      ],
    }, null, 2),
    "```",
  ].join("\n"), "utf8");

  const captured = {};
  const service = new DevelopmentEnvironmentPreflightService({
    async preflight(requirements, root) {
      captured.requirements = requirements;
      captured.workspaceRoot = root;
      return {
        state: "ready",
        summary: "Development environment ready; 2 capability requirement(s) already satisfied.",
        retryAllowed: false,
        requirements: requirements.map((requirement) => ({
          capabilityId: requirement.capabilityId,
          provisioning: requirement.provisioning,
          beforeState: "satisfied",
          actionTaken: "none",
          afterState: "satisfied",
          detectedVersion: requirement.capabilityId === "git" ? "2.54.0.windows.1" : "24.18.1",
          commandSummaries: [],
          retryAllowed: false,
        })),
        evidenceMarkdown: "Development environment preflight evidence:\n- Final state: ready",
      };
    },
  });

  const result = await service.runPreflight({ workspaceRoot, formalWorkCardPath });

  assert.equal(result.state, "ready");
  assert.equal(captured.workspaceRoot, workspaceRoot);
  assert.deepEqual(captured.requirements, [
    {
      capabilityId: "git",
      provisioning: "managed",
    },
    {
      capabilityId: "nodejs-lts",
      provisioning: "managed",
    },
  ]);
});

test("preflight service returns not-required for environment-free Work Cards without invoking provisioner", async () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-preflight-service-"));
  const formalWorkCardPath = path.join("planning", "phases", "phase-00", "Work_Cards", "WC01.md");
  fs.mkdirSync(path.dirname(path.join(workspaceRoot, formalWorkCardPath)), { recursive: true });
  fs.writeFileSync(path.join(workspaceRoot, formalWorkCardPath), "# WC01\n\nNo machine requirements.\n", "utf8");

  let provisionerCalled = false;
  const service = new DevelopmentEnvironmentPreflightService({
    async preflight() {
      provisionerCalled = true;
      throw new Error("Environment-free Work Cards must not invoke the provisioner.");
    },
  });

  const result = await service.runPreflight({ workspaceRoot, formalWorkCardPath });

  assert.equal(result.state, "not-required");
  assert.equal(result.retryAllowed, false);
  assert.deepEqual(result.requirements, []);
  assert.equal(provisionerCalled, false);
});
