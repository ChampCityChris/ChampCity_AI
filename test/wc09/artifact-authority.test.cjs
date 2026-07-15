const assert = require("node:assert/strict");
const { mkdtemp, readFile, readdir, rm, writeFile } = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const sharedArtifacts = require("../../dist/shared/artifacts");
const mainArtifacts = require("../../dist/main/artifacts");

const {
  computeArtifactPayloadHash,
  getArtifactAuthority,
  listActiveArtifactAuthorities,
  validateArtifactRegistry,
  verifyArtifactPair,
} = sharedArtifacts;
const {
  ARTIFACT_REGISTRY_JSON_PATH,
  ARTIFACT_REGISTRY_MARKDOWN_PATH,
  ArtifactPairService,
  ArtifactPartialWriteError,
  ArtifactRepository,
  buildCanonicalPaths,
} = mainArtifacts;

const PROJECT_ID = "champcity-ai";
const LOCATION = {
  directoryPath: "planning/phases/phase-03/Work_Cards",
  fileStem: "WC09_cross_process_workflow_authority",
};

function createService(projectRoot, options = {}) {
  let transaction = 0;
  let clockTick = 0;
  return new ArtifactPairService({
    projectRoot,
    clock: () =>
      new Date(Date.parse("2026-07-14T12:00:00.000Z") + clockTick++ * 1000).toISOString(),
    transactionIdFactory: () => `wc09-${++transaction}`,
    ...options,
  });
}

function artifactRequest(overrides = {}) {
  return {
    artifactId: "champcity-ai/phase-03/work-card/WC09",
    artifactType: "work_card",
    status: "active",
    projectId: PROJECT_ID,
    phaseId: "phase-03",
    workCardId: "WC09",
    relationships: {
      sources: ["champcity-ai/project/rules/AGENTS"],
      expectedOutputs: ["champcity-ai/phase-03/implementer-report/WC09"],
      supersedes: [],
      children: [],
    },
    payload: {
      title: "WC09 Cross-process workflow authority",
      contentMarkdown: "# WC09\n\nCanonical authority foundation.\n",
      data: {
        workCardId: "WC09",
        objective: "Stabilize cross-process workflow authority.",
      },
    },
    location: LOCATION,
    expectedRevision: null,
    ...overrides,
  };
}

async function withTemporaryRoot(run) {
  const root = await mkdtemp(path.join(os.tmpdir(), "champcity-wc09-artifacts-"));
  try {
    return await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function readRepositoryFile(root, repositoryPath) {
  return readFile(path.join(root, ...repositoryPath.split("/")), "utf8");
}

async function listFilesRecursively(root) {
  const output = [];
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(absolutePath);
      else output.push(path.relative(root, absolutePath).replaceAll("\\", "/"));
    }
  }
  await visit(root);
  return output.sort();
}

test("canonical pair hash synchronizes JSON and Markdown and detects body tampering", async () => {
  await withTemporaryRoot(async (root) => {
    const service = createService(root);
    const request = artifactRequest();
    const commit = await service.commitArtifact(
      artifactRequest({
        payload: {
          ...request.payload,
          contentMarkdown: "# WC09\r\n\r\nCanonical authority foundation.\r\n\r\n",
        },
      }),
    );
    const paths = buildCanonicalPaths(LOCATION);
    const jsonContent = await readRepositoryFile(root, paths.jsonPath);
    const markdownContent = await readRepositoryFile(root, paths.markdownPath);

    assert.equal(commit.pairVerified, true);
    assert.equal(commit.registryCommitted, true);
    assert.equal(
      commit.artifact.payload.contentMarkdown,
      "# WC09\n\nCanonical authority foundation.\n",
    );
    assert.equal(
      commit.artifact.payloadHash,
      computeArtifactPayloadHash(commit.artifact.payload),
    );

    const synchronized = verifyArtifactPair({
      jsonArtifact: jsonContent,
      markdown: markdownContent,
      jsonPath: paths.jsonPath,
      markdownPath: paths.markdownPath,
    });
    assert.equal(synchronized.valid, true);
    assert.equal(synchronized.synchronized, true);
    assert.equal(synchronized.artifact.payloadHash, commit.artifact.payloadHash);

    const tamperedMarkdown = markdownContent.replace(
      "Canonical authority foundation.",
      "Tampered authority foundation.",
    );
    const tampered = verifyArtifactPair({
      jsonArtifact: jsonContent,
      markdown: tamperedMarkdown,
      jsonPath: paths.jsonPath,
      markdownPath: paths.markdownPath,
    });
    assert.equal(tampered.valid, false);
    assert.equal(tampered.synchronized, false);
    assert.match(tampered.errors.join("\n"), /does not match|payload hash|payloadHash|mismatch/i);
  });
});

test("ordinary updates increment revision at fixed paths and never create numbered suffixes", async () => {
  await withTemporaryRoot(async (root) => {
    const service = createService(root);
    const first = await service.commitArtifact(artifactRequest());
    const second = await service.commitArtifact(
      artifactRequest({
        expectedRevision: 1,
        payload: {
          title: "WC09 Cross-process workflow authority",
          contentMarkdown: "# WC09\n\nCanonical authority foundation, revised.\n",
          data: {
            workCardId: "WC09",
            objective: "Stabilize cross-process workflow and artifact authority.",
          },
        },
      }),
    );

    assert.equal(first.artifact.revision, 1);
    assert.equal(second.artifact.revision, 2);
    assert.equal(second.artifact.createdAt, first.artifact.createdAt);
    assert.notEqual(second.artifact.updatedAt, first.artifact.updatedAt);
    assert.equal(second.artifact.jsonPath, first.artifact.jsonPath);
    assert.equal(second.artifact.markdownPath, first.artifact.markdownPath);

    const pairDirectory = path.join(root, ...LOCATION.directoryPath.split("/"));
    assert.deepEqual((await readdir(pairDirectory)).sort(), [
      `${LOCATION.fileStem}.json`,
      `${LOCATION.fileStem}.md`,
    ]);

    const registry = await service.loadRegistry();
    const authorities = registry.entries.filter(
      (entry) => entry.artifactId === artifactRequest().artifactId,
    );
    assert.equal(authorities.length, 1);
    assert.equal(authorities[0].authoritative, true);
    assert.equal(authorities[0].synchronized, true);
    assert.equal(authorities[0].revision, 2);
    assert.equal(getArtifactAuthority(registry, artifactRequest().artifactId).revision, 2);
    assert.equal(listActiveArtifactAuthorities(registry).length, 1);

    await assert.rejects(
      service.commitArtifact(artifactRequest({ expectedRevision: 1 })),
      (error) => error?.code === "stale_revision",
    );
    assert.throws(
      () => buildCanonicalPaths({ ...LOCATION, fileStem: `${LOCATION.fileStem}_2` }),
      (error) => error?.code === "invalid_location",
    );
  });
});

test("registry validation rejects duplicate active authority for one artifact identity", async () => {
  await withTemporaryRoot(async (root) => {
    const service = createService(root);
    await service.commitArtifact(artifactRequest());
    const registry = await service.loadRegistry();
    const duplicate = structuredClone(registry.entries[0]);
    duplicate.revision += 1;
    duplicate.jsonPath = "planning/phases/phase-03/Work_Cards/WC09_conflicting.json";
    duplicate.markdownPath = "planning/phases/phase-03/Work_Cards/WC09_conflicting.md";
    duplicate.updatedAt = "2026-07-14T12:01:00.000Z";

    const conflictingRegistry = structuredClone(registry);
    conflictingRegistry.entries.push(duplicate);
    const validation = validateArtifactRegistry(conflictingRegistry);
    const codes = new Set(validation.issues.map((issue) => issue.code));

    assert.equal(validation.valid, false);
    assert.equal(codes.has("duplicate_artifact_id"), true);
  });
});

test("artifact and registry rollback together when the registry boundary fails", async () => {
  await withTemporaryRoot(async (root) => {
    const initialService = createService(root);
    await initialService.commitArtifact(artifactRequest());
    const paths = buildCanonicalPaths(LOCATION);
    const protectedPaths = [
      paths.jsonPath,
      paths.markdownPath,
      ARTIFACT_REGISTRY_JSON_PATH,
      ARTIFACT_REGISTRY_MARKDOWN_PATH,
    ];
    const before = new Map(
      await Promise.all(
        protectedPaths.map(async (repositoryPath) => [
          repositoryPath,
          await readRepositoryFile(root, repositoryPath),
        ]),
      ),
    );

    const failingService = createService(root, {
      failureInjector: (point) => {
        if (point === "after_registry_update") {
          throw new Error("Injected registry boundary failure.");
        }
      },
    });
    await assert.rejects(
      failingService.commitArtifact(
        artifactRequest({
          expectedRevision: 1,
          payload: {
            title: "WC09 Cross-process workflow authority",
            contentMarkdown: "# WC09\n\nThis revision must roll back.\n",
            data: { workCardId: "WC09", objective: "Rollback probe." },
          },
        }),
      ),
      (error) =>
        error instanceof ArtifactPartialWriteError && error.rollbackStatus === "succeeded",
    );

    for (const repositoryPath of protectedPaths) {
      assert.equal(
        await readRepositoryFile(root, repositoryPath),
        before.get(repositoryPath),
        `${repositoryPath} changed despite rollback`,
      );
    }
    const transientFiles = (await listFilesRecursively(root)).filter((file) =>
      /\.(?:stage|backup)$/.test(file),
    );
    assert.deepEqual(transientFiles, []);
    assert.equal((await initialService.readArtifact(LOCATION)).artifact.revision, 1);
    assert.equal(
      (
        await initialService.readArtifactByPaths(
          ARTIFACT_REGISTRY_JSON_PATH,
          ARTIFACT_REGISTRY_MARKDOWN_PATH,
        )
      ).artifact.revision,
      1,
    );
  });
});

test("registry-backed authority refuses an unsynchronized pair instead of inferring from files", async () => {
  await withTemporaryRoot(async (root) => {
    const service = createService(root);
    await service.commitArtifact(artifactRequest());
    const repository = new ArtifactRepository(service);
    const paths = buildCanonicalPaths(LOCATION);
    const markdownPath = path.join(root, ...paths.markdownPath.split("/"));
    const markdown = await readFile(markdownPath, "utf8");
    await writeFile(markdownPath, `${markdown}\nunauthorized mutation\n`, "utf8");

    const failures = await repository.auditRegisteredPairs("2026-07-14T13:00:00.000Z");
    assert.equal(failures.length, 1);
    assert.equal(failures[0].artifactId, artifactRequest().artifactId);
    assert.equal(failures[0].code, "registered_pair_unsynchronized");
    await assert.rejects(
      repository.readAuthority({
        artifactId: artifactRequest().artifactId,
        artifactType: artifactRequest().artifactType,
        projectId: PROJECT_ID,
      }),
      (error) => error?.code === "registry_sync_failure",
    );
  });
});
