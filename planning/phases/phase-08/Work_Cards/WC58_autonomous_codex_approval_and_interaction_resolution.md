<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 2,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC58"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC58_autonomous_codex_approval_and_interaction_resolution.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC57-REPAIR05_contract_faithful_provider_execution_and_regression_proof.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Embedded Codex App Server Harness Parity Bundle",
    "status": "approved_for_implementation",
    "executionMode": "three sequential child Work Cards with one Architect bundle review after all three Implementer Reports are complete",
    "prerequisite": "WC57-REPAIR06 must pass Architect review before WC58-01 begins",
    "childWorkCards": ["WC58-01", "WC58-02", "WC58-03"],
    "gitMutationAuthorized": false
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Revision 2 supersedes the oversized revision-1 execution design. Implement App Server transport, native approval auto-response, and Codex capability/config parity as three bounded sequential cards. Do not perform child Architect dispositions; review WC58 once after all three Pending Implementer Reports exist.",
    "reviewedAt": "2026-08-21"
  }
}
CHAMPCITY-METADATA -->

# WC58 — Embedded Codex App Server Harness Parity Bundle

Status: Approved implementation bundle  
Prerequisite: `WC57-REPAIR06` Architect Approved  
Git mutation: prohibited

## Purpose

Replace ChampCity's current `@openai/codex-sdk -> codex exec` Implementer path with the richer local Codex App Server harness and carry Approved Work Card authority through Codex-native approval requests without an automatic review model.

WC58 revision 2 supersedes revision 1.

## Governing Runtime Model

```text
Approved Work Card
→ WC57 deterministic environment preflight
→ local Codex App Server
→ full inherited user/development environment
→ same Codex auth/config/CODEX_HOME
→ thread with danger-full-access + on-request + approvalsReviewer=user
→ ChampCity automatically answers native approval requests
→ Codex continues the same turn
→ genuine OS/external boundary only when actually encountered
```

ChampCity does not add a command-risk reviewer, Guardian, semantic approval classifier, or second human approval gate.

A Codex approval request is not the same as Windows UAC. Native Codex requests belonging to the active Approved Work Card session are client-answerable and are auto-approved. Genuine UAC/restart/credential/license/physical boundaries remain external interactions.

## Child Work Cards

### WC58-01 — Local App Server Transport and Runtime Parity

Establish the production App Server client, packaged runtime resolution, full process-environment inheritance, native Codex auth/config inheritance, persistent thread/turn lifecycle, streaming, cancellation, and deterministic process cleanup. Preserve the existing Work Card execution-service contract to the rest of ChampCity.

### WC58-02 — Native Approval Routing and Automatic Client Approval

Run the embedded Implementer with `approvalPolicy=on-request`, `approvalsReviewer=user`, and `danger-full-access`. Route Codex command/file/permission/MCP approval requests to ChampCity and automatically return the protocol's supported approval decision for the active Work Card session. Do not use `auto_review` or a second model.

### WC58-03 — Capability Parity, Observability, and End-to-End Migration

Prove and expose the effective App Server runtime state and Codex-native capability surfaces: config/model/reasoning, MCP servers, skills, apps, plugins, web/tool configuration where exposed, effective sandbox/reviewer, and selected project root. Migrate Work Card implementation and Environment Resolution fully to App Server and prove command plus file-change approval continuation end to end.

## Bundle Review Rule

The three child cards are sequentially implementable:

```text
WC58-01 → WC58-02 → WC58-03
```

Each child must produce its required Pending Implementer Report and may proceed to the next child when its own automated acceptance suite passes and the report states implementation complete.

**Do not create individual Architect approval dispositions for WC58-01/02/03.**

After all three Implementer Reports exist, the Architect performs one WC58 bundle review against all three Work Cards, all three reports, and the final integrated production code. A child that reports incomplete/blocked stops the sequence and returns to Architect disposition.

## Bundle Acceptance

WC58 is not complete until the integrated result proves all of the following:

1. normal Work Card implementation no longer uses `runStreamed()`/`codex exec` as its production transport;
2. the App Server process uses the selected project root and the user's real Codex auth/config environment;
3. ChampCity no longer replaces the full process environment with a small allowlisted environment map;
4. effective thread state reports the intended sandbox, approval policy, approval reviewer, model, reasoning effort where available, and cwd;
5. native command and file-change approval requests reach ChampCity and are automatically approved for the exact active Work Card session;
6. no `auto_review`/Guardian/subagent is used for those approvals;
7. approval completion continues the same Codex turn rather than producing prose that asks the Operator to repeat authorization;
8. permission/MCP approval methods supported by the pinned runtime are handled through the same bounded client-owned approval strategy;
9. `request_user_input` is not fabricated or semantically auto-answered: genuine information requests are surfaced distinctly if they occur;
10. MCP/skills/apps/plugins and other Codex-native capability inventories exposed by App Server can be queried and observed without reproducing their configuration in ChampCity;
11. Environment Resolution uses the same App Server harness and receives the WC57 evidence payload;
12. streamed progress, cancellation, report refresh, retry, and Build workspace behavior remain functional;
13. App Server child processes terminate on completion/cancellation/application shutdown;
14. a native Codex runtime/tool denial that offers no client approval response is reported distinctly from an approval request;
15. all focused, typecheck, build, and full tests pass without permissive fixtures that prove behavior production does not have.

## Negative Constraints

- Do not mutate `~/.codex/config.toml`.
- Do not attach to or control ChatGPT Desktop/Codex Desktop sessions.
- Do not add a second semantic safety/approval reviewer.
- Do not convert approval requests into Operator technical work.
- Do not automate Windows secure-desktop UAC.
- Do not redesign WC57 provider logic.
- Do not add unrelated Implement workspace features.
- Do not perform Git mutation.
