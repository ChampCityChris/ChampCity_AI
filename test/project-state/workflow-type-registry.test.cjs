"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  WORKFLOW_TYPE_IDS,
  WORKFLOW_TYPE_REGISTRY,
  getWorkflowTypeDefinition,
  isWorkflowType,
} = require("../../dist/shared/projectState/workflowTypeRegistry.js");

const expected = [
  ["project-creation", "Project Creation / Greenfield", false],
  ["feature-capability", "Feature / Capability", true],
  ["refactor-migration", "Refactor / Migration", true],
  ["integration-composition", "Integration / Composition", true],
  ["infrastructure-platform", "Infrastructure / Platform", true],
  ["research-prototype", "Research / Prototype", true],
  ["issue-resolution", "Issue Resolution", true],
  ["work-intake-routing", "Work Intake Routing", true],
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
    return [definition.workflowType, definition.label, definition.repeatable];
  }), expected);
  assert.deepEqual(expected.filter(([, , repeatable]) => !repeatable).map(([id]) => id), ["project-creation"]);
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
