# EPGA Repair01 Architect Review — 2026-09-29

**Reviewed checkpoint:** `6200d383d61ff890d86492cb5ed6e3e17b3856d9`  
**Disposition:** **NO-GO FOR CONVERTING CHAMPCITY_AI YET**  
**Repair scope:** one demonstrated source-preservation defect

## Accepted behavior

The forced-normalization repair correctly changes Existing Project entry from Git-conformance admission to one warned conversion boundary.

Architect review confirmed:

- conventional Git projects return conversion-required rather than ordinary Git repair diagnostics;
- source preservation staging occurs before Git normalization;
- canonical baseline construction uses the accepted current Project source tree;
- readable branch history is retained as bounded baseline ancestry/ref evidence;
- `main` and `dev` are force-established at the canonical baseline;
- managed Main/Dev checkout verification occurs before root source retirement;
- Current Project registration follows successful source conversion;
- repeated managed reopen is idempotent;
- focused authoritative tests pass on current clean `dev`, including the ChampCity-style fixture and the pre-mutation source-preservation failure fixture.

These parts are accepted.

## Blocking defect — source-governing integration policy is omitted from the canonical baseline

The converter currently excludes the entire root `.champcity/` directory from source preservation:

`copySourceContents(... sourceIsProjectRoot=true)` excludes `.champcity`.

The canonical baseline therefore omits:

`.champcity/integration-policy.json`

even when that file is already tracked source.

ChampCity_AI currently contains this tracked policy.

This is not runtime junk. It is source-governing project configuration.

`integrationPolicyProvider.ts` loads the policy from the repository checkout and from the exact target commit using:

`INTEGRATION_POLICY_PATH = ".champcity/integration-policy.json"`

The exact Workflow integration path calls `loadIntegrationPolicyAtCommit(devRoot, targetCommit)`.

After the current conversion implementation:

- the Project-container copy of the policy would remain at `<Project>/.champcity/integration-policy.json`;
- the new canonical `Main`/`Dev` baseline would not contain it;
- exact Workflow integration would later fail when resolving target-owned integration policy from the Dev commit.

Therefore the conversion is not safe to run against ChampCity_AI yet.

## Required correction

Preserve exactly the known source-governing ChampCity policy path while continuing to exclude application runtime state under `.champcity/`.

Required source-owned path:

`.champcity/integration-policy.json`

Do not copy the entire `.champcity` tree into source.

The conversion must:

1. copy the integration policy into the preservation snapshot when present as a bounded ordinary file;
2. force-add it to the canonical baseline even though `.gitignore` ignores `.champcity/`;
3. preserve exact bytes;
4. include it in Main/Dev after conversion;
5. prove `loadIntegrationPolicyAtCommit(devRoot, baselineRevision)` succeeds after conversion;
6. keep Project State, repository metadata, checkouts, migration journals, and other application-owned `.champcity` state out of the source baseline.

The fallback path for partially/unreadable old Git must also preserve this known policy file when it exists; preservation cannot depend solely on the old Git index being readable.

## Evidence rerun during review

Authoritative connected `test_toolbox` on checkpoint `6200d383...`:

- `test/source-control/managed-project-source.test.cjs` — **10/10 PASS**;
- `test/project-state/current-project-entry.test.cjs` — **13/13 PASS**;
- `test/renderer/workflow-hub-shell.test.cjs` — **23/23 PASS**;
- named ChampCity-style migration proof — **PASS**;
- named source-preservation staging failure proof — **PASS**.

Those tests establish the broader repair but do not cover the tracked integration-policy preservation defect identified by this Architect review.

## Disposition

Do not convert the real ChampCity_AI Project through the UI at checkpoint `6200d383...`.

One bounded Repair02 card is required.

No other Repair01 runtime edge-case work is authorized by this review.
