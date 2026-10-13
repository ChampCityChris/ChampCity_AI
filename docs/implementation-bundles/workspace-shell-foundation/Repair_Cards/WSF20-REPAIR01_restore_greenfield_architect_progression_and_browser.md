# WSF20-REPAIR01 — Restore Intake → Architect progression and embedded ChatGPT

**Type:** Repair Card  
**Parent:** WSF20  
**Defects:** WSF20-D01, D02, D03, D04  
**Starting baseline:** `52c71a28323b55222ea454723603cf72fd7d8da9`

## Objective

Restore the first usable Greenfield transition exactly as intended:

```text
Project Intake
→ Operator approves current Intake
→ Architect Interview opens immediately
→ recovered Architect Interview shell
→ Project Intake document tab + Architect Review document tab
→ embedded chatgpt.com is visibly loaded and usable
→ Architect submits typed candidate through workflow_toolbox
```

Do not change SQL authority or later workflow stages.

## Confirmed RCA

### D01 / D02 — progression and rogue button

`useWorkflowIntake` already supports an `onApproved` callback, but `ProjectIntakeWorkspace` fails to supply it.

Instead, `ProjectIntakeWorkspace` created a redundant `prepare()` function and standalone `Prepare Architect Interview` button. That path is now acting as the only renderer progression trigger.

### D03 — wrong Architect adapter

WSF20 maps `architect-interview` to `StructuredArchitectWorkspace`.

That component is not the recovered Greenfield shell adapter. It still renders a raw Structured JSON textarea and direct save action.

WSF03 already produced the correct adapter:

`GreenfieldArchitectWorkspace → ArchitectInterviewShell`

and WSF03A already provides external typed candidate ingress.

### D04 — browser load/recovery

`ApplicationBrowserHost` can label an attached native view "ChatGPT ready" even when its browser state is `load-failed`.

The main-process reload path also calls `reload()` unconditionally instead of navigating back to the configured ChatGPT surface when the current surface is failed/blank/disallowed.

Existing navigation diagnostics already record main-frame load failures and error codes but are not surfaced sufficiently to diagnose a failed embedded session.

## Required correction

### 1. Approved Intake immediately progresses

Update `ProjectIntakeWorkspace` to use the existing hook contract:

- supply the Greenfield progression callback to `useWorkflowIntake`;
- after the exact current Intake receives Approved disposition, invoke the supplied progression/resume callback;
- Greenfield then reloads canonical SQL navigation and renders Architect Interview.

Remove the local `prepare()` state/function and remove the standalone `Prepare Architect Interview` control.

Do **not** require `prepareStructuredArchitectWorkspace()` merely to navigate to Architect Interview.

Handoff preparation remains an Architect-workspace action.

### 2. Wire the recovered Architect building block

In `GreenfieldStageComposition`:

- replace the Greenfield `StructuredArchitectWorkspace` mapping with `GreenfieldArchitectWorkspace`;
- pass the existing browser companion and canonical resume callback;
- retain `StructuredArchitectWorkspace` only for non-Greenfield workflow families that still consume it.

Update Greenfield composition proof so `architect-interview` must resolve to `GreenfieldArchitectWorkspace`.

Add a regression assertion that Greenfield composition cannot import/render the obsolete raw JSON Architect form.

### 3. Architect document behavior

The Greenfield Architect workspace must preserve WSF03 behavior:

- first document slot: Project Intake projection;
- second document slot: Architect Review projection after a typed Architect candidate exists;
- review/disposition applies to the exact SQL Architect review cycle;
- final candidate enters through `workflow_toolbox.submit_stage_candidate`;
- no raw JSON candidate textarea or `Save Architect output` control appears anywhere in Greenfield Architect Interview.

After external candidate submission, Refresh must reveal/select the current Architect Review document.

### 4. Repair embedded ChatGPT load/recovery

Correct `ApplicationBrowserHost` browser presentation:

- `browserState === "load-failed"` must display **Browser unavailable** even if the native view remains attached;
- show a bounded load-failure detail from the latest existing main-frame navigation diagnostic (host/event/error code only; no sensitive URL/query leakage);
- Retry must remain visible for load failure as well as attachment failure.

Correct main-process reload/recovery:

- if the native view has no URL, current state is `load-failed`, or current URL is not an allowed embedded Architect URL, explicitly `loadURL(getArchitectSurfaceUrl())`;
- use ordinary `reload()` only for a current allowed Architect/authentication URL;
- reset failure state before retry and let existing load events establish the resulting state;
- retain the persistent Architect session partition and current security/navigation policy.

Do not weaken URL allow-listing, sandbox, context isolation, popup handling, or authentication-window rules.

## Live browser acceptance — mandatory

Automated browser-service tests are not sufficient for D04.

Run the actual Electron application and prove:

1. enter a Greenfield Architect Interview;
2. right-hand browser pane has positive native bounds;
3. `https://chatgpt.com/` visibly renders inside the pane;
4. the page is interactive enough to focus/click the ChatGPT surface;
5. Reload reloads the working surface;
6. a forced/reproducible failed URL/load state reports Browser unavailable rather than ChatGPT ready;
7. Retry returns to the configured ChatGPT surface;
8. navigation diagnostics contain no unexpected blocked OpenAI/ChatGPT main-frame navigation.

If ChatGPT still fails to load, **stop** and report the exact main-frame `did-fail-load` diagnostic/error code and current redacted host. Do not claim D04 fixed.

## Focused automated proof

Add/extend focused owners to prove:

- Approved Intake calls the supplied progression callback exactly once;
- rejected/revision-requested Intake does not progress;
- no `Prepare Architect Interview` button remains;
- Greenfield composition maps Architect Interview to `GreenfieldArchitectWorkspace`;
- Greenfield Architect source contains no raw JSON candidate textarea/direct save path;
- Project Intake and Architect Review slots remain present in the recovered adapter;
- load-failed browser state is never presented as ChatGPT ready;
- reload recovery chooses `loadURL(configured ChatGPT surface)` for failed/blank/disallowed state;
- allowed healthy ChatGPT state still uses reload;
- browser navigation/security tests remain green.

Run at minimum the relevant Project Intake, Greenfield Architect, Greenfield composition, and Architect browser owners plus production build.

## Forbidden changes

- no new SQL entity or schema;
- no Markdown authority restoration;
- no raw JSON candidate entry in Greenfield;
- no changes to Project Planning, Phase, Work Card, Repair, Validation, or Close semantics;
- no attempt to fix WSF20-D05 through D08 in this card;
- no browser security relaxation;
- no replacement of the native embedded browser with an external browser.

## Implementer report

Write:

`Dev/docs/implementation-bundles/workspace-shell-foundation/Implementer_Reports/WSF20_REPAIR01_IMPLEMENTER_REPORT.md`

Report:

- exact files changed;
- D01–D04 proof separately;
- focused test receipts;
- production build result;
- live Electron ChatGPT acceptance result;
- if D04 remains blocked, exact redacted runtime navigation diagnostic.

## Checkpoint

`WSF20-R01 restore Greenfield Architect progression and browser`

After checkpoint, stop for Operator audit. Do not continue into D05–D08 without a new Repair Card.
