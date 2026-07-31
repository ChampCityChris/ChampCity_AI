# Implementer Continuation — WC26

Repository: `C:\Users\chapm\Projects\ChampCity_AI`  
Remote: `ChampCityChris/ChampCity_AI`  
Branch: `feature/phase-04-wc01-repair01-evidence-derived-workflow`  
Reasoning: high  
Git mutation: prohibited

Continue the existing WC26 implementation. Do not create a new Work Card or repair. Preserve all current WC25, REPAIR09, WC26, WC27, and unrelated dirty-tree changes.

Read first:

- `planning/phases/phase-08/Work_Cards/WC26_project_planning_architect_workspace_and_project_rail_status_completion.md` revision 2;
- `planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC26_project_planning_architect_workspace_and_project_rail_status_completion.md`;
- the current WC26 diff.

## Objective

Correct only these three WC26 defects:

1. destructive/non-idempotent Project Planning handoff preparation;
2. silent last-match selection in later top-project rail statuses;
3. hidden and race-prone Project Planning polling failures.

Do not implement WC27 reconciliation or the ChampCity_GPT planning-output action.

## Correction 1 — Idempotent Handoff Preparation

Current defect:

```text
Prepare Handoff
→ existing artifact revision + 1 on every click
→ Profile/Roadmap source revisions become stale
```

Required behavior:

- compute the expected current handoff metadata, body, source revisions, identity, and targets before writing;
- when an existing valid handoff is byte-equivalent or canonically equivalent to the expected current handoff, return it unchanged;
- do not increment the revision for an unchanged retry;
- `canPrepareHandoff=true` only when prerequisites are ready and no valid current handoff exists;
- once a valid current handoff exists, the normal enabled action is Copy;
- disable Prepare in waiting-for-output, partial-output, ready-for-review, RevisionRequested, Rejected, Completed, and Needs Attention states;
- do not overwrite malformed, wrong-role, wrong-type, identity-conflicting, or stale handoff evidence through an ordinary Prepare action;
- a changed upstream source revision may produce a new handoff revision only through the correctly resolved new current context;
- repeated Prepare cannot invalidate current Profile or Roadmap outputs.

Add focused tests proving:

1. first Prepare creates revision 1;
2. identical Prepare retry remains revision 1 and preserves bytes;
3. Prepare is unavailable after a valid handoff exists;
4. Prepare is unavailable when outputs are Pending, RevisionRequested, Rejected, Approved, partial, or invalid;
5. repeated preparation cannot change an existing output's freshness;
6. a genuine upstream revision permits exactly one new current handoff revision.

## Correction 2 — Conflict-Safe Top Project Rail Projection

Current defect:

```text
matching evidence family
→ find()/at(-1)
→ silent selection
```

Correct the rail projection only. Do not implement later workspaces.

For each governing family used by Phase Map, Phases, Project Validation, and Project Close, resolve:

```text
zero
exactly one valid current candidate
conflict / invalid evidence
```

Required behavior:

- historical and archive evidence remains excluded;
- duplicate active governing candidates return `Needs Attention`;
- wrong artifact type, wrong participation role, unreadable canonical metadata, stale evidence, mismatched source revisions, or mixed governing evidence returns `Needs Attention`;
- do not choose by filename order, traversal order, timestamp, or final array entry;
- preserve accepted Project Intake and Architect Interview mappings;
- preserve the WC26 Project Planning model override;
- preserve selection and required-step styling independence.

At minimum cover:

1. duplicate active Phase Map handoffs;
2. duplicate active Phase Maps;
3. stale Phase Map;
4. wrong-role Phase Map;
5. duplicate active Project Closeouts;
6. stale/unreadable Project Closeout;
7. mixed closeout population that cannot establish all phases complete;
8. valid single candidates retain Ready, Waiting for Output, Awaiting Approval, In Progress, Completed, or Not Ready as appropriate.

Do not add hidden lifecycle state.

## Correction 3 — Visible, Ordered Project Planning Polling

Current defect:

- periodic `quiet` failures are swallowed;
- the action bar always receives an empty polling error;
- overlapping requests can apply stale results.

Required behavior:

- add dedicated Project Planning polling-error state;
- preserve the last readable selected document and model during transient refresh failure;
- display the polling error separately in the Project Planning action bar;
- clear the error after a successful refresh;
- add an in-flight or request-sequence guard equivalent in effect to the accepted Architect Interview refresh path;
- prevent an older request from replacing a newer model, inventory, selection, or error state;
- retain the 2–5 second active-workspace interval and manual Refresh Planning Outputs;
- stop polling when leaving Project Planning or unmounting;
- do not create a global watcher.

Add focused tests or testable helpers proving:

1. transient failure preserves the last readable preview;
2. failure becomes visible;
3. later success clears it;
4. stale request completion is ignored;
5. polling stops outside Project Planning.

## WC26/WC27 Boundary

WC26 revision 2 explicitly defers live invocation of:

```text
artifact_toolbox.save_project_planning_outputs
```

Do not add that tool, implement reconciliation, or use a generic-writer fallback.

WC26 running-product proof uses a controlled external creation of a valid canonical Pending Profile/Roadmap pair to validate:

- exact output detection;
- complete previews;
- Profile/Roadmap selection;
- viewed-both approval gating;
- RevisionRequested notes;
- synchronized bundle disposition;
- revision refresh;
- rail progression.

The actual embedded ChatGPT purpose-built save action belongs to WC27 and ChampCity_GPT WC-V1-0202C.

## Validation

First prove the corrected product behavior. Then run once in the normal Windows lane:

```text
npm run typecheck
npm run build
npm test
```

Do not repeatedly rerun passing lanes.

## Evidence Checklist

Record each item `Proven` or `NotProven`:

1. unchanged handoff preparation is idempotent;
2. Prepare cannot invalidate existing outputs;
3. duplicate later-project governing evidence produces Needs Attention;
4. valid single-evidence rail mappings remain correct;
5. polling failures are visible while prior preview remains;
6. stale polling results cannot replace newer state;
7. migration UI remains absent and no migration runs;
8. Project Planning dedicated dual-pane layout remains intact;
9. controlled external Pending Profile/Roadmap pair is detected;
10. both documents can be reviewed completely;
11. approval is disabled until both current revisions are opened;
12. bundle revision and synchronized disposition remain correct;
13. Architect Interview is not regressed;
14. typecheck, build, and all tests pass.

Any `NotProven` item means WC26 remains active. Do not create a repair card.

## Implementer Report

Create the WC26 Implementer Report only after all revised WC26 evidence items are Proven.

The report must clearly distinguish:

- automated evidence;
- controlled Electron evidence;
- the WC27-deferred live purpose-built MCP save path.

Include exact files changed, validation lanes, final dirty-tree inventory, and confirmation that no Git operation or migration occurred.
