const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), test = require("node:test");
const {structuredArchitectFixture} = require("../support/structured-architect-fixture.cjs");
test("Project Intake and Architect Output expose generated Markdown with SQL authority and no sidecars", async context => {
  const env = await structuredArchitectFixture(context);
  for (const relative of [env.intake.reviewDocument.markdownPath, env.candidate.review.relativePath]) {
    assert.ok(fs.existsSync(path.join(env.root, relative))); assert.equal(fs.existsSync(path.join(env.root, relative.replace(/\.md$/, ".json"))), false);
    assert.match(fs.readFileSync(path.join(env.root, relative), "utf8"), /GENERATED FROM CHAMPCITY STRUCTURED PROJECT STATE/);
  }
  const before = (await env.store.listEntities(env.projectId)).map(record => [record.id, record.recordVersion]);
  fs.writeFileSync(path.join(env.root, env.candidate.review.relativePath), "Manual state fiction"); await env.architect.get(env.root, env.workflow.id);
  assert.deepEqual((await env.store.listEntities(env.projectId)).map(record => [record.id, record.recordVersion]), before);
});
