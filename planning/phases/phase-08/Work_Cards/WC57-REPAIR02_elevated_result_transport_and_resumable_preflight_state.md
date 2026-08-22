<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC57-REPAIR02",
    "repairId": "WC57-REPAIR02",
    "parentWorkCardId": "WC57"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC57_deterministic_windows_development_environment_provisioner.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC57-REPAIR01_deterministic_provisioning_execution_and_environment_handoff_repair.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC57-REPAIR01_deterministic_provisioning_execution_and_environment_handoff_repair.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC57-REPAIR01_deterministic_provisioning_execution_and_environment_handoff_repair.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Elevated Result Transport and Resumable Preflight State",
    "status": "approved_for_implementation",
    "executionMode": "one bounded repair of the remaining WC57 elevated-process evidence and Operator-resume state defects",
    "parentWorkCardId": "WC57",
    "confirmedDefect": "WC57-REPAIR01 corrected the main provisioning architecture, but the production elevated runner still returns only the outer Start-Process result rather than a structured stdout/stderr result from the elevated child, while fake tests manufacture richer results. The preflight state model also cannot distinguish retryable managed-provisioning failure from structural blocking state, and the Build workspace labels restart-required as Windows-permission-required. These losses can misclassify elevated failures and strand or misdirect the Operator.",
    "rootCause": "Two boundary adapters remain lossy: the UAC elevation transport does not preserve exact target argument/result identity, and the shared preflight projection collapses typed retry/interaction semantics into coarse blocked/waiting states plus free-form text. The downstream classifier, execution service, and renderer therefore do not receive enough structured information to behave deterministically.",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC57-REPAIR02_elevated_result_transport_and_resumable_preflight_state.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Preserve WC56/WC57/WC57-REPAIR01 architecture. Make the real elevated command transport return the actual elevated target exit/stdout/stderr with exact argument boundaries, add typed retry/blocker/human-interaction identity to preflight results, and render/retry permission versus restart versus retryable managed failure correctly. Do not implement WC58 approval transport here.",
    "reviewedAt": "2026-08-21"
  }
}
CHAMPCITY-METADATA -->

# WC57-REPAIR02 — Elevated Result Transport and Resumable Preflight State

Status: Approved for Implementer execution  
Parent: `WC57`  
Depends on: `WC57-REPAIR01`  
Git mutation: prohibited

## Verified Repository Evidence

Current accepted WC57/WC57-REPAIR01 production surface includes:

```text
src/shared/developmentEnvironment/developmentEnvironmentContract.ts
src/shared/developmentEnvironmentContracts.ts
src/main/developmentEnvironment/developmentEnvironmentCapabilityRegistry.ts
src/main/developmentEnvironment/developmentEnvironmentPreflightService.ts
src/main/developmentEnvironment/windowsDevelopmentEnvironmentProvisioner.ts
src/main/developmentEnvironment/windowsEnvironmentRefresh.ts
src/main/workCardBuilding/codexImplementerExecutionService.ts
src/shared/workspaceContracts.ts
src/renderer/app/WorkCardBuildingReviewWorkspace.tsx
src/renderer/app/App.tsx
```

Accepted behavior already present and not to be reopened:

- Codex execution SDK creation occurs after successful environment preflight;
- WinGet v3 requires `>=1.11` and functional `winget configure`;
- WinGet repair uses the Microsoft.WinGet.Client / Repair-WinGetPackageManager path;
- provisioning uses exact application-owned WinGet package identity;
- VS2022 `msvc-x64/desktop-cpp` is bounded to `[17.0,18.0)` and the set path targets Build Tools;
- persisted Machine/User environment state overrides stale process values and PATH preserves process-only additions;
- capability IDs/optional fields are normalized and fixed-major bindings reject incompatible major-line constraints;
- simple installs include `--silent`;
- blocked/waiting preflight no longer projects Codex `ready`.

Current remaining production facts:

1. `NodeCommandRunner.runElevated(...)` creates an outer PowerShell process that calls `Start-Process -Verb RunAs -Wait -PassThru`, then returns the outer PowerShell stdout/stderr plus the elevated child's exit code.
2. The elevated target's stdout/stderr is not redirected into an application-owned result channel.
3. `classifyCommandResult(...)` depends on stdout/stderr text for host-policy, ambiguity, and detailed generic failure classification.
4. Focused tests inject fake runners whose `runElevated(...)` directly returns synthetic stdout/stderr; repository search finds no test that exercises the production `NodeCommandRunner.runElevated(...)` result transport.
5. The production elevation path passes a PowerShell `-ArgumentList` array through `Start-Process`; there is no application-owned encoding/round-trip proof for arguments containing whitespace or quoting-sensitive content.
6. `unavailableModelFromPreflightResult(...)` sets `canRunAgain=true` only for `waiting-for-operator`; every `blocked` result is nonretryable.
7. Managed installation/network/generic provisioning failure is represented as `blocked`, so a transient failure can disable the Run action even though rerunning the exact approved preflight is the correct recovery.
8. `WorkCardBuildingReviewWorkspace.tsx` maps every `waiting-for-operator` state to the primary label `Windows permission required...`, including restart-required results.
9. Exact permission/restart identity currently exists only as free-form `humanInteractionReason` text on requirement results.

Current Microsoft platform constraints relevant to this repair:

- `Start-Process -ArgumentList` joins array elements into one space-delimited argument string; callers are responsible for argument quoting where needed.
- `Start-Process` stdout/stderr redirection is explicit; the `-Verb`/UseShellExecute parameter set used for UAC elevation does not provide the normal redirection parameters in that same invocation.
- therefore the elevated boundary requires an application-owned wrapper/result channel if ChampCity needs the elevated target's exact stdout/stderr rather than only its exit code.

Official reference:

```text
https://learn.microsoft.com/powershell/module/microsoft.powershell.management/start-process
```

## Confirmed Defect 1 — Elevated Transport Is Lossy

The classifier introduced by WC57-REPAIR01 is correct only if `runElevated(...)` returns the result of the command that actually ran.

Production currently provides:

```text
target command + args
→ outer PowerShell
→ Start-Process -Verb RunAs
→ elevated target
→ target exit code returned through Process object
→ target stdout/stderr not returned through a ChampCity-owned channel
→ classifier receives incomplete elevated result
```

Fake tests instead provide:

```text
runElevated(...)
→ synthetic { exitCode, stdout, stderr }
```

The fake path therefore proves a contract the real adapter does not implement.

A policy failure or installer-specific failure after elevation can be reduced to generic failure because the production classifier does not receive the target output that distinguishes the failure.

Argument identity is also not proved across elevation. A configuration path or other authorized argument containing spaces must arrive at the elevated target as exactly one argument, not as multiple tokens produced by `Start-Process` joining behavior.

## Confirmed Defect 2 — Retryable Managed Failure Is Collapsed Into Permanent Block

Current execution projection treats only `waiting-for-operator` as retryable.

A normal approved managed capability can therefore produce:

```text
exact WinGet install
→ temporary network/service/installer failure
→ preflight state = blocked
→ cached blocked preflight
→ canRunAgain = false
→ Run Codex Implementer disabled
```

No architecture change or Operator technical decision is needed. The correct action is simply to rerun the same deterministic preflight from current host state.

The current shared result lacks typed blocker/retry identity, so the execution service cannot distinguish this from external ownership, unsupported capability, impossible version/profile authority, host policy, or ambiguous package authority.

## Confirmed Defect 3 — Human Interaction Identity Is Collapsed Into One Waiting State

The provisioner correctly distinguishes restart and permission internally only through free-form reason text, but the shared result has no typed interaction identity.

The renderer therefore maps all `waiting-for-operator` states to:

```text
Windows permission required...
```

A restart-required result can consequently instruct the user to look for a permission prompt that does not exist.

For the intended nontechnical Operator, permission and restart are different actions and must be represented as typed application state rather than inferred from message wording.

## Objective

Complete the WC57 production boundary so the exact approved action survives elevation and the resulting preflight state remains correctly actionable.

Required sequence:

```text
approved provisioning command + exact args
→ normal execution
→ if elevation required, application-owned UAC wrapper
→ exact elevated command/argument round-trip
→ exact elevated target exit/stdout/stderr result envelope
→ one WC57 classifier
→ typed requirement blocker/interaction/retry semantics
→ typed preflight retryability
→ correct Build workspace instruction
→ rerun same preflight when resumable
→ Codex starts only after ready | not-required
```

## Required Changes

### 1. Replace the lossy elevated target invocation with an application-owned elevated result transport

Keep `DevelopmentEnvironmentCommandRunner.runElevated(...)` as the provisioner-facing abstraction, but correct the production `NodeCommandRunner` implementation.

Do not invoke the final target directly through `Start-Process -Verb RunAs` and then pretend the outer process stdout/stderr is the target result.

Implement an application-owned temporary request/result envelope under the existing ChampCity development-environment temp area or another dedicated `os.tmpdir()` ChampCity subdirectory.

Use a unique execution identifier per elevated call. The transient request/result model must preserve at minimum:

```text
request:
- command
- args[] as an ordered array
- cwd when supplied
- result target identity

result:
- exitCode
- stdout
- stderr
```

The request/result files are execution transport only. They are not project artifacts and must be deleted after the elevated attempt finishes or fails.

### 2. Use an encoded elevated PowerShell wrapper so the outer UAC launch has no whitespace-sensitive target arguments

The application-owned elevated launch must use `powershell.exe -EncodedCommand <base64>` (Windows PowerShell UTF-16LE encoding) or an equivalently deterministic single-payload mechanism.

The encoded wrapper must contain or decode the application-owned request payload; do not pass the final target's arbitrary argument array directly through `Start-Process -ArgumentList`.

Required outer UAC behavior:

```text
non-elevated ChampCity process
→ powershell.exe
→ Start-Process powershell.exe -Verb RunAs -Wait -PassThru
→ elevated PowerShell wrapper receives one encoded payload
```

The only arguments passed through the outer `Start-Process` boundary should be fixed PowerShell switches plus the encoded payload, so paths/scripts containing spaces do not rely on `Start-Process` array-joining semantics.

### 3. Elevated wrapper must execute the target and write the actual target result envelope

Inside the elevated wrapper:

1. decode the request payload;
2. set the requested working directory when supplied;
3. invoke the requested executable with the request `args[]` preserved as discrete arguments;
4. capture stdout and stderr separately;
5. capture the target process exit code;
6. write one UTF-8 JSON result envelope to the predetermined application temp result path;
7. exit with the target exit code where representable.

A bounded implementation may use PowerShell's call operator plus argument-array splatting and stream redirection inside the elevated wrapper, or `System.Diagnostics.Process` inside the already-elevated wrapper, provided tests prove exact argument and stdout/stderr round-trip behavior.

Do not use shell-concatenated target command strings.

### 4. `runElevated(...)` must prefer the result envelope over outer-process text

After the outer UAC process returns:

- when a valid result envelope exists, return a `CommandRunResult` whose `command` and `args` remain the original target identity and whose `exitCode`, `stdout`, and `stderr` come from the elevated target envelope;
- when no result envelope exists because UAC itself was declined/cancelled or the elevated wrapper never started, return the outer PowerShell/UAC failure so the existing classifier can produce the Windows-permission state;
- malformed/missing envelope after a supposedly successful wrapper is a provisioning failure with explicit evidence, not success;
- cleanup request/result/temp files in `finally` behavior.

Do not log or persist unsanitized output beyond the bounded transient transport. Existing summary sanitization/truncation remains downstream authority.

### 5. Add typed blocker and retry semantics to development-environment results

Extend the shared application result contract; do not change the Architect-owned `champcity-development-environment` fenced schema.

Add a bounded blocker classification sufficient to distinguish at minimum:

```text
external
unsupported
host-policy
ambiguous-package
provisioning-failure
verification-failure
```

Add explicit retry identity rather than deriving retryability from text. A requirement result must expose whether its failure is retryable.

Required semantics:

- `external` → nonretryable inside the current managed preflight;
- `unsupported` / impossible version-profile authority → nonretryable;
- `host-policy` → nonretryable by normal retry action;
- `ambiguous-package` → nonretryable until application registry/authority changes;
- generic managed `install | configure | repair-winget` execution failure → retryable;
- post-provision verification failure → retryable through the same bounded preflight unless repository evidence proves a structural authority mismatch.

The preflight result must expose one application-owned `retryAllowed` (or equivalently named boolean) calculated from requirement results.

If any unsatisfied requirement is structural/nonretryable, top-level blocked preflight is nonretryable. If the only blockers are retryable managed failures, top-level blocked preflight remains blocked but `retryAllowed=true`.

### 6. Execution model must honor preflight retry identity

Update `CodexImplementerExecutionService` so:

```text
ready | not-required
→ existing Run action available

waiting-for-operator
→ unavailable but retry allowed after the external action

blocked + preflight.retryAllowed=true
→ unavailable, clearly blocked, Run action available to rerun preflight

blocked + preflight.retryAllowed=false
→ unavailable and Run action disabled
```

A retry must rerun the complete preflight from current host state. It must not convert cached evidence directly to ready.

Do not create automatic retry loops in this card.

### 7. Add typed human-interaction identity

Extend `DevelopmentEnvironmentRequirementResult` with a typed interaction discriminator:

```text
windows-permission
restart-required
```

Use this field for interaction behavior; retain `humanInteractionReason` as the human-readable explanation.

Required classifier mapping:

- UAC declined/cancelled → `windows-permission`;
- elevation required with no successful elevated completion → `windows-permission`;
- reboot/restart required → `restart-required`.

Do not infer the interaction type by regex-matching `humanInteractionReason` in renderer code.

### 8. Generate exact waiting summaries from typed interaction state

`summaryForRequirements(...)` must no longer always return `Windows permission or restart is required...` for every waiting state.

Required summary behavior:

- permission only → say Windows permission is required;
- restart only → say Windows restart is required;
- both kinds present → say Windows permission and restart are required;
- preserve the exact per-requirement reasons in detailed evidence.

### 9. Render the correct Operator action in the existing Build workspace

Update `DevelopmentEnvironmentStatus` so the primary label derives from typed interaction state:

```text
windows-permission only
→ Windows permission required.

restart-required only
→ Windows restart required.

both
→ Windows permission and restart required.
```

The expandable evidence must continue showing the exact per-requirement reason.

Do not create a separate environment-management UI, modal workflow, or free-form technical instructions.

### 10. Add production-boundary tests rather than fake-classifier-only tests

Preserve the existing fake command-runner tests, but add direct coverage of the real elevated transport helpers/adapter.

Automated tests must not trigger real UAC or mutate the host. Introduce the smallest injectable outer-elevation-launch seam necessary to test `NodeCommandRunner.runElevated(...)` transport deterministically.

Tests must prove at minimum:

1. elevated request preserves command identity and ordered args containing spaces;
2. elevated target stdout is returned to `CommandRunResult.stdout`;
3. elevated target stderr is returned separately;
4. elevated target nonzero exit code is returned exactly;
5. a result envelope classifies host-policy text as host-policy blocker;
6. a result envelope classifies generic failure as generic blocker rather than another permission request;
7. outer UAC cancellation with no envelope becomes `windows-permission`;
8. missing/malformed result envelope cannot be treated as success;
9. transient managed install failure produces `blocked` with top-level retry allowed;
10. retryable blocked status leaves Run available and reruns preflight;
11. external/unsupported/policy/ambiguous structural blocks remain nonretryable;
12. restart result carries `humanInteractionKind=restart-required`;
13. UAC/permission result carries `humanInteractionKind=windows-permission`;
14. renderer displays `Windows restart required.` for restart-only waiting state;
15. renderer displays `Windows permission required.` for permission-only state;
16. renderer never maps restart-only state to the permission label;
17. existing WC57-REPAIR01 WinGet/VS2022/environment/SDK-order tests remain green;
18. environment-free Work Cards and existing Codex cancellation/report-refresh behavior remain green.

Source-string assertions may support the UI proof but cannot be the sole proof for retry state calculation or elevated result transport.

## Preserved Behavior

Preserve unchanged:

- WC56 ground-zero semantics and `managed | external` authority;
- the Architect-owned `champcity-development-environment` version-1 schema;
- WC57 application-owned WinGet/WinGet Configuration provisioning architecture;
- WC57-REPAIR01 SDK-after-preflight execution order;
- WinGet `>=1.11` v3 readiness and Microsoft.WinGet.Client repair path;
- exact package registry and no model/web package selection;
- VS2022 `[17.0,18.0)` and Build Tools modification target;
- Machine/User/process PATH merge semantics;
- fixed-major version support and Ninja parsing;
- simple `--silent` WinGet behavior;
- WC54 full-local execution policy until WC58 explicitly supersedes its approval transport;
- WC55 selected-root routing/prompt cleanup;
- secret/credential protections;
- no automatic restart;
- no Git mutation.

## Authorized Surface

Primary production files authorized:

```text
src/shared/developmentEnvironment/developmentEnvironmentContract.ts
src/shared/developmentEnvironmentContracts.ts
src/main/developmentEnvironment/windowsDevelopmentEnvironmentProvisioner.ts
src/main/workCardBuilding/codexImplementerExecutionService.ts
src/shared/workspaceContracts.ts
src/renderer/app/WorkCardBuildingReviewWorkspace.tsx
```

`src/main/developmentEnvironment/developmentEnvironmentPreflightService.ts` may be changed only as required to carry typed retry/interaction state.

`src/renderer/app/App.tsx` may be changed only if required to preserve the existing Run/retry action flow for retryable blocked preflight.

A small dedicated elevated-transport module under `src/main/developmentEnvironment/` is authorized if it materially improves separation between UAC launch, request/result envelope handling, and the provisioner.

Tests authorized:

```text
test/development-environment/windows-development-environment-provisioner.test.cjs
test/development-environment/windows-environment-refresh.test.cjs
test/work-card-building/codex-implementer-execution-service.test.cjs
test/renderer/work-card-building-review-workspace.test.cjs
```

A dedicated elevated-command transport test file under `test/development-environment/` is authorized.

Required report:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC57-REPAIR02_elevated_result_transport_and_resumable_preflight_state.md
```

## Acceptance Criteria

1. The production elevated adapter returns the actual elevated target's exit code/stdout/stderr, not merely the outer PowerShell process output.
2. Elevated target command identity and ordered argument boundaries survive UAC transport, including an argument containing spaces.
3. The UAC outer launch uses an encoded/single-payload wrapper or equivalent mechanism that does not pass arbitrary final target arguments directly through `Start-Process -ArgumentList` joining.
4. UAC cancellation before wrapper/result creation still maps to the correct retryable Windows-permission state.
5. Elevated host-policy output reaches the shared classifier and produces a host-policy blocker.
6. Elevated generic failure reaches the classifier as the elevated target result and cannot become a second permission request.
7. Missing/malformed elevated result envelope cannot be treated as successful provisioning.
8. Elevated transport temp request/result artifacts are cleaned after success, failure, or cancellation.
9. Existing output sanitization/truncation remains applied before evidence is exposed to prompt/UI/report workflows.
10. Development-environment result contracts carry typed blocker identity sufficient to distinguish structural block from retryable managed execution/verification failure.
11. Development-environment result contracts carry typed human interaction identity `windows-permission | restart-required`.
12. Top-level preflight exposes deterministic retry permission independent of message text.
13. Generic managed provisioning failure is blocked but retryable.
14. Post-provision verification failure is blocked but retryable.
15. External capability block is nonretryable in the current preflight.
16. Unsupported/impossible capability authority is nonretryable.
17. Host-policy block is nonretryable by the normal Run retry.
18. Ambiguous package authority is nonretryable.
19. `CodexImplementerExecutionService` projects retryable blocked preflight as unavailable but allows Run to rerun preflight.
20. Nonretryable blocked preflight remains unavailable with Run disabled.
21. Waiting permission/restart preflight remains unavailable and retryable after the external action.
22. A retry reruns current preflight and never promotes cached blocked/waiting evidence directly to ready.
23. Permission-only waiting state renders `Windows permission required.`
24. Restart-only waiting state renders `Windows restart required.`
25. Mixed permission/restart state renders a correct combined instruction rather than choosing the wrong one.
26. Existing WC57-REPAIR01 accepted WinGet, VS2022, environment, version, and SDK-order behavior remains unchanged.
27. Existing WC54/WC55/WC56 lifecycle, Codex cancellation/report refresh, and environment-free Work Card behavior remains green.
28. Automated tests trigger no real UAC, package install, Visual Studio modification, reboot, or host environment mutation.
29. `npm run typecheck`, `npm run build`, focused tests, and `npm test` pass in normal validation lanes.
30. No Git mutation is performed.

## Negative Constraints

Do not:

- redesign the WC56/WC57 provisioning architecture;
- replace WinGet with alternate installers or web-selected packages;
- alter the Architect-owned environment requirement schema;
- weaken exact package/capability authority;
- use free-form output text in renderer code to infer permission versus restart;
- make every blocked state retryable without typed blocker semantics;
- add automatic retry loops;
- bypass UAC or host policy;
- auto-restart Windows;
- persist elevated request/result envelopes outside application temp execution state;
- persist unsanitized elevated output in project artifacts;
- add a general software-management UI;
- add free-form Implementer chat;
- implement App Server/ARC/automatic Codex approval behavior from WC58;
- change Project Planning, Phase Planning, MCP routing, Architect output generation, or unrelated workflow state;
- stage, commit, push, reset, clean, stash, checkout, pull, rebase, merge, or tag.

## Implementer Report Requirements

The report must remain `Pending` and must include:

- exact files changed;
- before/after elevated command transport sequence;
- exact transient request/result envelope shape;
- how target argument boundaries are preserved across UAC;
- how target stdout/stderr/exit code are returned from the real production adapter;
- cleanup behavior;
- blocker classification and retryability table;
- human interaction type and renderer label mapping;
- acceptance-criterion-to-test mapping;
- focused/full commands and results with working directory and exit code;
- confirmation that automated tests triggered no real UAC or host mutation;
- remaining real-machine validation.

End with `Document.Status=Pending`.

## Manual Validation

After Architect code review passes this repair, perform the pending WC57 real-machine validation on a disposable or intentionally incomplete Windows environment.

Include at minimum:

1. one managed install that succeeds without elevation;
2. one real UAC-elevated provisioning action and confirmation that the post-elevation result is classified correctly;
3. one declined UAC attempt followed by retry;
4. one restart-required simulation or real installer result where practical, confirming the Build workspace says restart rather than permission;
5. one transient provisioning failure/recovery where practical, confirming Run remains available for retry;
6. one VS2022 `msvc-x64/desktop-cpp` provisioning/verification path;
7. confirmation Codex starts only after the final environment is ready.

WC58 remains held until WC57 and this repair have passed Architect review and the required WC57 Operator validation.
