const assert = require("node:assert/strict");
const test = require("node:test");

const {
  lifecycleLevels,
  lifecycleRelationships,
  lifecycleStages,
} = require("../../dist/shared/lifecycle/nestedLifecycle.js");
const {
  createWorkspaceRegistry,
  getWorkspaceById,
  getWorkspacesForLocation,
} = require("../../dist/shared/workspaces/workspaceRegistry.js");
const {
  workspaceDefinitions,
} = require("../../dist/shared/workspaceContracts.js");

test("nested lifecycle vocabulary is fixed to the approved model", () => {
  assert.deepEqual(lifecycleLevels, ["project", "phase", "workCard"]);
  assert.deepEqual(lifecycleStages, ["intake", "planning", "building", "validation", "close"]);
});

test("static lifecycle relationships encode containment and return targets only", () => {
  assert.deepEqual(lifecycleRelationships, [
    {
      parent: "project",
      containedChild: "phase",
      closeReturnsTo: null,
      terminalOnClose: true,
    },
    {
      parent: "phase",
      containedChild: "workCard",
      closeReturnsTo: { level: "project", stage: "building" },
      terminalOnClose: false,
    },
    {
      parent: "workCard",
      containedChild: null,
      closeReturnsTo: { level: "phase", stage: "building" },
      terminalOnClose: false,
    },
  ]);
});

test("visible workspaces are registry definitions with preserved legacy labels and Architect Interview", () => {
  assert.deepEqual(
    workspaceDefinitions.map(({ id, label, location, order }) => ({
      id,
      label,
      location,
      order,
    })),
    [
      {
        id: "project-intake-capture",
        label: "Project Intake Capture",
        location: { level: "project", stage: "intake" },
        order: 10,
      },
      {
        id: "architect-interview",
        label: "Architect Interview",
        location: { level: "project", stage: "intake" },
        order: 20,
      },
      {
        id: "project-planning-review",
        label: "Project Plan and Roadmap Review",
        location: { level: "project", stage: "planning" },
        order: 10,
      },
      {
        id: "project-phase-map",
        label: "Phase Map",
        location: { level: "project", stage: "building" },
        order: 10,
      },
      {
        id: "project-validation",
        label: "Project Validation",
        location: { level: "project", stage: "validation" },
        order: 10,
      },
      {
        id: "project-close",
        label: "Project Close",
        location: { level: "project", stage: "close" },
        order: 10,
      },
      {
        id: "phase-interview",
        label: "Phase Interview",
        location: { level: "phase", stage: "intake" },
        order: 10,
      },
      {
        id: "phase-planning-bundle",
        label: "Phase Planning",
        location: { level: "phase", stage: "planning" },
        order: 10,
      },
      {
        id: "phase-work-card-selection",
        label: "Work Card Selection",
        location: { level: "phase", stage: "building" },
        order: 10,
      },
      {
        id: "work-card-intake",
        label: "Work Card Intake",
        location: { level: "workCard", stage: "intake" },
        order: 10,
      },
      {
        id: "work-card-planning",
        label: "Work Card Planning",
        location: { level: "workCard", stage: "planning" },
        order: 10,
      },
      {
        id: "work-card-building-review",
        label: "Implementer Build",
        location: { level: "workCard", stage: "building" },
        order: 10,
      },
      {
        id: "work-card-report-review",
        label: "Review & Validation",
        location: { level: "workCard", stage: "building" },
        order: 15,
      },
      {
        id: "work-card-repair",
        label: "Work Card Repair",
        location: { level: "workCard", stage: "building" },
        order: 20,
      },
      {
        id: "work-card-validation",
        label: "Work Card Validation",
        location: { level: "workCard", stage: "validation" },
        order: 10,
      },
      {
        id: "work-card-close",
        label: "Work Card Close",
        location: { level: "workCard", stage: "close" },
        order: 10,
      },
      {
        id: "phase-validation",
        label: "Phase Validation",
        location: { level: "phase", stage: "validation" },
        order: 10,
      },
      {
        id: "phase-close",
        label: "Phase Close",
        location: { level: "phase", stage: "close" },
        order: 10,
      },
    ],
  );
});

test("registry rejects duplicate workspace IDs", () => {
  assert.throws(
    () =>
      createWorkspaceRegistry([
        { id: "duplicate", label: "One", location: { level: "project", stage: "intake" }, order: 10 },
        { id: "duplicate", label: "Two", location: { level: "project", stage: "intake" }, order: 20 },
      ]),
    /Duplicate workspace ID/,
  );
});

test("registry supports multiple ordered Work Card Intake workspaces", () => {
  const registry = createWorkspaceRegistry([
    {
      id: "work-card-intake",
      label: "Work Card Intake",
      location: { level: "workCard", stage: "intake" },
      order: 10,
    },
    {
      id: "work-card-intake-review",
      label: "Work Card Intake Review",
      location: { level: "workCard", stage: "intake" },
      order: 20,
    },
    {
      id: "work-card-intake-approval",
      label: "Work Card Intake Approval",
      location: { level: "workCard", stage: "intake" },
      order: 30,
    },
  ]);

  assert.equal(getWorkspaceById(registry, "work-card-intake-review").label, "Work Card Intake Review");
  assert.deepEqual(
    getWorkspacesForLocation(registry, { level: "workCard", stage: "intake" }).map(
      (definition) => definition.label,
    ),
    ["Work Card Intake", "Work Card Intake Review", "Work Card Intake Approval"],
  );
});
