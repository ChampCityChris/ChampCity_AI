# WIR23-REPAIR03C-REPAIR02-REPAIR02 — Architect Review

**Review date:** 2026-09-22  
**Card standard:** Implementer-Ready Work Card Standard V2  
**Calibration:** V2 calibration card #1

## Result

The Implementer conformed to the V2 card.

The prescribed shared-fixture repair is present and correct. Three of the four shared-fixture permanent owners now pass through ChampCity's actual authoritative `test_toolbox` execution path.

The remaining `integration-profile-gate.test.cjs` failure is a real repository mismatch outside the card's prescribed shared-fixture repair boundary.

One evidence correction is required: the Implementer Report identifies missing `profileEvidence` in the shared scenario as the first meaningful failure. Independent Architect isolation shows that the profile owner's earlier direct validation-profile test also fails under the authoritative runner. Therefore missing `profileEvidence` is a downstream symptom, not the earliest failure.

This review does **not** identify an Architect/card defect in the V2 card itself.

## 1. Implementation Conformance

### Shared fixture Git seam

Verified `test/support/integration-scenarios.cjs`:

- uses fixed short repository prefix `cc-int-`;
- routes shared fixture Git through `fixtureGit()`;
- `fixtureGit()` calls `childProcess.execFileSync` at execution time;
- every fixture-owned Git command receives `-c core.longpaths=true`;
- disposable repositories set local `core.longpaths=true` immediately after initialization;
- `configureGitIdentity()`, `commitAllFixtureState()`, and `git()` all use `fixtureGit()`;
- scenario lists and production assertions were not weakened;
- no production `src/**` change is attributable to the card.

The prior telemetry repair remains intact because the helper continues to resolve `childProcess.execFileSync` through the module object.

### Change boundary

The implementation remained inside the card's expected test/support boundary.

No validation runner, executor, production IntegrationCandidate, WIR, SourceControl, or Integration Repair semantics were changed.

## 2. Independent Authoritative Verification

Architect review used the actual connected ChampCity `test_toolbox.run_test_file` path.

### Candidate semantics

`test/agent-harness/integration-candidate-semantics.test.cjs`

- **8/8 passed**
- zero skipped/cancelled
- test process: 16.111 s
- authoritative result: PASS

This confirms the original candidate-owner runner discrepancy is corrected by the shared fixture repair.

### Integration policy semantics

`test/agent-harness/integration-policy-semantics.test.cjs`

- **10/10 passed**
- zero skipped/cancelled
- test process: 21.202 s
- authoritative result: PASS

This confirms target-owned policy scenarios also survive the authoritative isolated-temp environment.

### Integration Repair source semantics

The card told the Implementer to stop after the profile mismatch, so this owner was not included in its report.

Architect review completed the remaining shared-fixture verification:

`test/agent-harness/integration-repair-source-semantics.test.cjs`

- **4/4 passed**
- zero skipped/cancelled
- test process: 19.272 s
- authoritative result: PASS

This further confirms the shared fixture repair is complete across its intended ownership set.

### Integration profile gate

`test/agent-harness/integration-profile-gate.test.cjs`

- 7 discovered
- **3 passed / 4 failed**
- zero skipped/cancelled
- test process: 14.744 s
- authoritative result: FAIL

This matches the Implementer's stop decision.

## 3. Correction to the Implementer Report

The report states:

> First meaningful failure: candidate.validation[0].profileEvidence is absent...

That is true for the nested:

`actual candidate profile receipts control target eligibility`

scenario, but it is not the earliest failing contract in the file.

Architect isolated all three permanent proof groups through the authoritative toolbox runner.

### Direct profile adapter owner

`candidate profile uses immutable target toolkit ownership and revisions through repair revalidation`

Result:

- **0/1 passed**
- failure at line 34;
- profile adapter returned:
  `Validation profile planning or execution failed.`
- expected `exitCode === 0`;
- actual `exitCode === null`.

This owner does **not** use `integration-scenarios.cjs`.

Therefore the remaining failure cannot be caused by the shared fixture path/prefix repaired by this card.

### Frozen runner-context shared scenarios

`candidate orchestration supplies frozen exact runner context`

Result:

- **3/3 passed**

This confirms the shared candidate orchestration fixture is working under the authoritative environment.

### Candidate profile receipt shared scenarios

`actual candidate profile receipts control target eligibility`

Result:

- **0/3 passed**
- both nested profile scenarios lack persisted `profileEvidence`;
- parent fails because both children fail.

The missing `profileEvidence` is consistent with the earlier direct profile-adapter failure: `runValidationProfile()` did not return valid structured profile evidence.

## 4. Mismatch Classification

The card's governing invariant was:

> disposable integration fixtures must be independent of authoritative-runner temp-root depth.

That invariant is now satisfied across candidate, policy, and repair-source semantic owners.

The card explicitly required a stop if, after that fix, an affected owner reached a substantive profile/policy/candidate assertion requiring another ownership decision.

That condition occurred.

Accordingly:

- **Implementer execution error:** NO
- **Implementer capability limit:** NO
- **Architect/card defect:** NO evidence from this card
- **Repository mismatch:** YES
- **Root cause of mismatch:** not yet fully classified
- **Earliest failing owner:** validation-profile adapter execution under the authoritative toolbox environment
- **Current likely domain:** validation-profile runner / nested validation execution / profile evidence contract, not shared IntegrationCandidate fixture Git

Do not yet label this a production IntegrationCandidate defect.

The production candidate service merely persists `profileEvidence` when the trusted validation-profile adapter returns it. Independent evidence shows the adapter is already returning invalid/incomplete evidence in its direct owner.

## 5. V2 Calibration Interpretation

This card is useful positive evidence for the V2 card standard.

The ownership sweep expanded the original candidate-only diagnosis to the full shared fixture ownership set. Sol implemented that compiled repair correctly:

- candidate owner closed;
- policy owner closed;
- repair-source owner closed;
- no scope drift;
- no product redesign;
- mismatch policy stopped the card at a genuinely different contract boundary.

The card did **not** achieve its aspirational four-owner all-pass objective because qualification exposed an independent validation-profile failure, but that is not currently attributable to omitted reasoning in the card.

For experiment accounting:

- **card implementation conformance:** PASS
- **card correctness:** PASS
- **intended shared-fixture defect closed:** PASS
- **authoritative qualification:** PARTIAL / BLOCKED_BY_NEW_REPOSITORY_MISMATCH
- **V2 Architect/card-defect repair required:** NO
- **new investigation required:** YES — validation-profile authority/execution path

This should not count as one of the three fully closed V2 calibration cards until the repository mismatch is resolved and final qualification passes, but it also should not reset the V2 calibration sequence as an Architect/card failure.

## 6. Next Boundary

The next Architect investigation should begin from the direct failing proof:

`candidate profile uses immutable target toolkit ownership and revisions through repair revalidation`

and trace:

`createIntegrationPolicyProvider`
→ `runValidationProfile`
→ target-owned `profile-runner.cjs`
→ nested `executePlan`
→ returned structured receipt
→ `validTelemetry()` / profile-evidence persistence.

The first question is why `runValidationProfile()` returns `exitCode: null` with `Validation profile planning or execution failed.` under the authoritative toolbox environment when the same contract has historically passed in direct execution.

Do not start from the nested IntegrationCandidate assertion; it is downstream evidence.
