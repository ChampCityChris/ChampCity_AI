"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  WORKFLOW_TYPE_IDS,
  WORKFLOW_TYPE_REGISTRY,
  getWorkflowTypeDefinition,
  isWorkflowType,
  workflowTypeForWorkRoute,
} = require("../../dist/shared/projectState/workflowTypeRegistry.js");

const expected = [
  ["project-creation", "Greenfield Project", false, "project-intake", false, 1, undefined],
  ["feature-capability", "Feature / Capability", true, "feature-intake", true, 2, "Start Feature"],
  ["refactor-migration", "Refactor / Migration", true, "refactor-intake", true, 3, "Start Migration"],
  ["integration-composition", "Integration / Composition", true, "integration-intake", true, 4, "Start Integration"],
  ["infrastructure-platform", "Infrastructure / Platform", true, "infrastructure-intake", true, 6, "Start Infrastructure Work"],
  ["research-prototype", "Research / Prototype", true, "research-intake", true, 7, "Start Research"],
  ["issue-resolution", "Issue Resolution", true, "issue-intake", true, 5, "New Issue"],
  ["work-intake-routing", "Work Intake Routing", true, "work-intake", false, 0, undefined],
];

test("canonical Workflow type registry has exact IDs and repeatability metadata", () => {
  const ids = expected.map(([id]) => id);
  assert.deepEqual(WORKFLOW_TYPE_IDS, ids);
  assert.equal(new Set(WORKFLOW_TYPE_IDS).size, WORKFLOW_TYPE_IDS.length);
  assert.deepEqual(Object.keys(WORKFLOW_TYPE_REGISTRY), ids);
  assert.deepEqual(ids.map(id => {
    const definition = getWorkflowTypeDefinition(id);
    assert.equal(isWorkflowType(id), true);
    assert.ok(definition);
    assert.ok(definition.purpose && definition.purpose.startsWith("Use "));
    return [definition.workflowType, definition.label, definition.repeatable, definition.entryWorkspace, definition.directStart,
      definition.hubOrder, definition.startLabel];
  }), expected);
  assert.deepEqual(expected.filter(([, , repeatable]) => !repeatable).map(([id]) => id), ["project-creation"]);
  assert.deepEqual(Object.values(WORKFLOW_TYPE_REGISTRY).sort((a, b) => a.hubOrder - b.hubOrder).map(row => row.workflowType), [
    "work-intake-routing", "project-creation", "feature-capability", "refactor-migration",
    "integration-composition", "issue-resolution", "infrastructure-platform", "research-prototype",
  ]);
});

test("Existing-Project WIR route mapping is exact and excludes Greenfield and unknown routes", () => {
  assert.deepEqual([
    ["feature-change", "feature-capability"], ["refactor-migration", "refactor-migration"],
    ["integration-composition", "integration-composition"], ["infrastructure-platform", "infrastructure-platform"],
    ["research-prototype", "research-prototype"], ["issue-resolution", "issue-resolution"],
  ].map(([route]) => workflowTypeForWorkRoute(route)), [
    "feature-capability", "refactor-migration", "integration-composition", "infrastructure-platform", "research-prototype", "issue-resolution",
  ]);
  assert.equal(workflowTypeForWorkRoute("greenfield"), undefined);
  assert.equal(workflowTypeForWorkRoute("unknown"), undefined);
});

test("legacy and unknown Workflow identifiers are rejected without aliases", () => {
  for (const value of ["development", "work-intake", "greenfield", "project-planning", "unknown", null, 1]) {
    assert.equal(isWorkflowType(value), false);
    assert.equal(getWorkflowTypeDefinition(value), undefined);
  }
});

test("registry IDs and definitions cannot be mutated by consumers", () => {
  assert.equal(Object.isFrozen(WORKFLOW_TYPE_IDS), true);
  assert.equal(Object.isFrozen(WORKFLOW_TYPE_REGISTRY), true);
  for (const id of WORKFLOW_TYPE_IDS) {
    assert.equal(Object.isFrozen(WORKFLOW_TYPE_REGISTRY[id]), true);
  }
  assert.throws(() => WORKFLOW_TYPE_IDS.push("other"), TypeError);
  assert.throws(() => { WORKFLOW_TYPE_REGISTRY["project-creation"].repeatable = true; }, TypeError);
  assert.throws(() => { WORKFLOW_TYPE_REGISTRY["feature-capability"] = undefined; }, TypeError);
});
