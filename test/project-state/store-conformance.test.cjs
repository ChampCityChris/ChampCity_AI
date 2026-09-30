const { createInMemoryProjectStateStore } = require("../../dist/shared/projectState/inMemoryProjectStateStore.js");
const { registerProjectStateStoreConformance } = require("../support/project-state-store-conformance.cjs");

registerProjectStateStoreConformance("in-memory ProjectStateStore", () => createInMemoryProjectStateStore());
