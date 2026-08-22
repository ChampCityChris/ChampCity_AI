const assert = require("node:assert/strict");
const test = require("node:test");

const {
  parseDevelopmentEnvironmentContractFromMarkdown,
  validateDevelopmentEnvironmentContract,
} = require("../../dist/shared/developmentEnvironment/developmentEnvironmentContract.js");

test("development environment contract parser accepts valid v1 schema", () => {
  const contract = parseDevelopmentEnvironmentContractFromMarkdown([
    "# WC01",
    "",
    "```champcity-development-environment",
    JSON.stringify({
      schemaVersion: 1,
      requirements: [{
        capabilityId: "nodejs",
        versionConstraint: ">=20",
        profile: "desktop-typescript",
        provisioning: "managed",
      }],
    }, null, 2),
    "```",
  ].join("\n"));

  assert.deepEqual(contract, {
    schemaVersion: 1,
    requirements: [{
      capabilityId: "nodejs",
      versionConstraint: ">=20",
      profile: "desktop-typescript",
      provisioning: "managed",
    }],
  });
});

test("development environment contract parser trims canonical requirement identity fields", () => {
  const contract = validateDevelopmentEnvironmentContract({
    schemaVersion: 1,
    requirements: [{
      capabilityId: " cmake ",
      versionConstraint: " >=3.29 ",
      profile: " desktop-cpp ",
      provisioning: "managed",
    }],
  });

  assert.deepEqual(contract.requirements[0], {
    capabilityId: "cmake",
    versionConstraint: ">=3.29",
    profile: "desktop-cpp",
    provisioning: "managed",
  });
});

test("development environment contract parser accepts environment-free Work Cards", () => {
  assert.equal(parseDevelopmentEnvironmentContractFromMarkdown("# WC01\n\nNo machine-level requirements."), null);
});

test("development environment contract parser rejects duplicate blocks", () => {
  assert.throws(
    () => parseDevelopmentEnvironmentContractFromMarkdown([
      "```champcity-development-environment",
      "{\"schemaVersion\":1,\"requirements\":[]}",
      "```",
      "",
      "```champcity-development-environment",
      "{\"schemaVersion\":1,\"requirements\":[]}",
      "```",
    ].join("\n")),
    /at most one champcity-development-environment block/,
  );
});

test("development environment contract parser rejects malformed fields", () => {
  assert.throws(
    () => validateDevelopmentEnvironmentContract({
      schemaVersion: 1,
      requirements: [{
        capabilityId: "nodejs",
        provisioning: "managed",
        installerCommand: "winget install OpenJS.NodeJS",
      }],
    }),
    /unsupported field: installerCommand/,
  );
});

test("development environment contract parser rejects unknown provisioning modes and empty capability IDs", () => {
  assert.throws(
    () => validateDevelopmentEnvironmentContract({
      schemaVersion: 1,
      requirements: [{ capabilityId: "nodejs", provisioning: "optional" }],
    }),
    /provisioning must be managed or external/,
  );
  assert.throws(
    () => validateDevelopmentEnvironmentContract({
      schemaVersion: 1,
      requirements: [{ capabilityId: " ", provisioning: "managed" }],
    }),
    /non-empty capabilityId/,
  );
  assert.throws(
    () => validateDevelopmentEnvironmentContract({
      schemaVersion: 1,
      requirements: [{ capabilityId: "nodejs", versionConstraint: " ", provisioning: "managed" }],
    }),
    /versionConstraint must be a non-empty string/,
  );
});

test("development environment contract parser rejects duplicate exact requirement identities", () => {
  assert.throws(
    () => validateDevelopmentEnvironmentContract({
      schemaVersion: 1,
      requirements: [
        { capabilityId: " cmake ", profile: "desktop-cpp", provisioning: "managed" },
        { capabilityId: "cmake", profile: " desktop-cpp ", provisioning: "managed" },
      ],
    }),
    /duplicate requirement identity: cmake/,
  );
});
