# WSF20-REPAIR03 — Restore writable MCP candidate ingress and browser reattachment

**Type:** Repair Card  
**Parent:** WSF20  
**Defects:** WSF20-D12, WSF20-D13  
**Starting baseline:** `f238f3d44d66b09aa6dd482974c3bcbcbfa99757`

## Objective

Restore the two runtime dependencies required to continue the live Greenfield Architect audit:

1. the connected ChatGPT MCP client must actually receive the bounded `workflow_toolbox.submit_stage_candidate` action;
2. the native ChatGPT browser must survive/recover a workspace leave → return lifecycle.

Do not change candidate schemas, SQL authority, browser security, or later workflow semantics.

# D12 — writable MCP candidate ingress

## Confirmed architecture

`submit_stage_candidate` is already implemented.

Its correct authority is the existing OAuth `files.write` resource scope because it mutates Structured Project State by creating/revising a proposed candidate.

Do **not** move this action under `files.read`.

The primary public Agent Harness contract is already declared as:

`files.read files.write`

but OAuth/DCR defaults currently issue read-only authorization when the client omits scope.

## Required correction

### A. Align OAuth defaults with the primary public MCP contract

Use one authoritative primary resource-scope constant for the normal full ChampCity MCP connection.

For DCR clients that omit `scope`:

- register the client with `files.read files.write`, not only `files.read`.

For `/oauth/authorize` requests that omit `scope`:

- authorize the normal primary public resource scope `files.read files.write`, not only `files.read`.

Do not alter explicit scope requests. A client that explicitly requests `files.read` must remain read-only.

Do not silently mutate already-issued access tokens.

### B. Existing connection migration / reauthorization

Because the live ChatGPT token is already read-only, Repair03 must define and prove the supported recovery path:

- after deployment, reconnect/re-authorize the ChampCity MCP connection so a new token is minted with `files.read files.write`;
- no manual editing of the OAuth store;
- no token-file mutation;
- refresh tokens retain their originally granted scope and must not be silently elevated.

If the existing ChatGPT DCR client is reused and its stored client default scope remains read-only, authorization with an omitted scope must still resolve to the primary full MCP scope **only where the authorization request omitted scope**. Explicit read-only authorization remains read-only.

### C. Make status truthful under reduced scope

`workflow_toolbox.status` must not tell a read-only caller that submission is available.

Return bounded status facts such as:

- `implemented: true`
- `supportedStages`
- `submissionAvailable: boolean`
- `requiredWriteScope: "files.write"`
- `availableActions` for the presented scope

A read-only token should see status and an explicit statement that candidate submission requires reauthorization/write scope.

A full token must publish both `status` and `submit_stage_candidate` in the MCP tool schema.

### D. Contract proof must use the real public MCP capture

Do not prove this only with direct `registry.callTool(..., scope:"files.read files.write")`.

Tests must capture/list the public MCP contract for:

- read-only token → `workflow_toolbox.actions === ["status"]`;
- full token → includes `status` and `submit_stage_candidate`;
- omitted-scope normal OAuth authorization → token receives the primary full resource scope;
- explicit `files.read` request → remains read-only;
- full OAuth token can execute the candidate through the MCP server boundary and persist the SQL review candidate.

# D13 — native browser leave/return reattachment

## Confirmed architecture defect

Bounds sequence freshness must be scoped to the attachment generation.

A sequence from generation N must never make sequence 1 in generation N+1 stale.

The current main service retains `latestBoundsSequence` across generation changes while each new renderer host starts its sequence at zero.

## Required correction

### A. Make bounds sequence generation-local

When the main process accepts a strictly newer `attachmentGeneration`:

- reset/advance the bounds-sequence baseline for that new generation so its first sequence is valid;
- continue rejecting older generations;
- continue rejecting older/equal-invalid sequences within the same generation according to the existing ordering contract;
- stale completion from a prior generation must never detach, zero, or overwrite a newer attachment.

Implement this in one main-process freshness boundary rather than renderer-specific sequence hacks.

Do not use an ever-growing renderer-global sequence merely to work around the service bug.

### B. Reload must recover attachment as well as page state

The visible **Reload ChatGPT** control is the Operator's recovery action.

If the current browser status is not `attached-visible`:

1. re-run the current coordinator attachment/retry path;
2. require positive host measurement and accepted current-generation bounds;
3. then reload/recover the ChatGPT URL.

If already `attached-visible`, ordinary page reload remains sufficient.

A detached/zero-bounds host must not remain forever at `Starting browser...` with no usable recovery action.

Retry may remain as an additional diagnostic recovery control, but Reload must recover the common leave/return case.

### C. Preserve loaded ChatGPT session

Leaving an Architect-enabled workspace must detach/hide the native view without destroying its WebContents/session.

Returning must reattach the same live WebContentsView when it remains valid.

Do not create a new browser session merely to fix layout attachment.

### D. Add the missing real lifecycle test

Add a deterministic test reproducing:

```text
attach generation A
set multiple bounds so sequence > 1
detach generation B
create a new renderer-style coordinator whose local sequence begins at 0
attach generation C
set sequence 1
=> attached-visible, accepted, same native view/session
```

Also cover:

- stale old-generation detach completion after generation C cannot override C;
- Reload on detached/zero-bounds invokes attachment recovery;
- healthy attached-visible Reload does not unnecessarily replace the view;
- navigation/security policies remain unchanged.

# Live acceptance — mandatory

Automated proof is not sufficient for either defect.

## MCP live proof

Using the actual embedded ChatGPT / configured ChampCity MCP connection:

1. reconnect/re-authorize after the repaired build;
2. ask ChatGPT to inspect `workflow_toolbox.status`;
3. verify the live MCP schema exposes `submit_stage_candidate`;
4. run the same Greenfield Architect handoff;
5. ChatGPT calls `workflow_toolbox.submit_stage_candidate`;
6. candidate is persisted to SQL;
7. Refresh in ChampCity reveals the generated Architect Review;
8. no manual JSON transfer is used.

If ChatGPT still sees only `status`, stop and return the actual granted OAuth scope and captured public tool contract fingerprint/actions.

## Browser live proof

In the actual Electron application:

1. open Architect Interview and verify ChatGPT is loaded;
2. navigate to another Greenfield workspace/inspection so the browser host unmounts;
3. return to Architect Interview;
4. same ChatGPT session visibly reappears and is interactive;
5. repeat leave/return at least three times;
6. verify native bounds are positive after every return;
7. use Reload after one return and prove it reconnects/reloads successfully;
8. no stale-sequence or stale-generation diagnostic blocks the current attachment.

# Focused automated proof

Run/extend at minimum:

- OAuth/DCR runtime owners;
- MCP public contract generation owner;
- reserved `workflow_toolbox` owner;
- actual MCP-server tool-call owner;
- Architect browser main-process handoff owner;
- renderer attachment coordinator owner;
- ApplicationBrowserHost owner;
- production build/static validation.

## Forbidden changes

- no `submit_stage_candidate` under `files.read`;
- no silent scope elevation of already-issued tokens or refresh tokens;
- no manual OAuth-store edits;
- no candidate schema/domain change;
- no SQL schema migration;
- no browser allow-list/security relaxation;
- no browser-session replacement as the normal reattachment strategy;
- no D05–D08 repair work.

## Implementer report

Write:

`Dev/docs/implementation-bundles/workspace-shell-foundation/Implementer_Reports/WSF20_REPAIR03_IMPLEMENTER_REPORT.md`

Report separately:

- D12 OAuth scope/RFC behavior and live granted scope;
- captured read-only versus full MCP schemas;
- actual live `submit_stage_candidate` MCP call and SQL result;
- D13 sequence-generation fix;
- leave/return lifecycle proof;
- live Electron repeated reattachment result;
- exact focused test/build receipts.

## Checkpoint

`WSF20-R03 restore MCP candidate ingress and browser reattachment`

After checkpoint, stop for Operator audit.
