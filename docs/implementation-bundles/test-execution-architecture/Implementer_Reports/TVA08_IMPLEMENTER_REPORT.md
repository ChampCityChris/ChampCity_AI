# TVA08 Implementer Report

## Scope and repository

Work Card TVA08. Approved repository/worktree root verified. Branch codex/test-execution-architecture from dev 05eef38; origin/dev was 45 commits behind at initialization. No fetch, push, stage, commit or merge in this pass. Final Operator-directed commit/merge remains pending safety review.

## Complete audit

Initial inventory: 48 records meeting source/disposition/environment/timing criteria. Additional false remote-service declarations also audited below. Every executable and adopted behavior retains catalog coverage. Most source labels described existing AST/VM execution or rendered output and were stale. Ordinary source-text proof is now limited to the intentional Work Card Markdown standard; NSIS/PowerShell structural contracts stay in packaging. The one formatting-dependent ordinary handler extractor now selects TypeScript declarations.

| Test | Current source classification; disposition; lane | Evidence or exception |
| --- | --- | --- |
| test/agent-harness/agent-harness-process-boundary.test.cjs | none; quarantine; desktop-platform | Actual Electron recovery; no source assertion after TVA02 split. |
| test/agent-harness/agent-harness-process-contract.test.cjs | ast-static-analysis; preserve; integration | AST import prohibition and compiled route execution; inherited Electron/Git/timing metadata removed. |
| test/agent-harness/agent-harness-runtime.test.cjs | none; preserve; integration | Bounded functional proof retained with isolated workspace/loopback/injected boundary. Local Git availability remains probed; timing deadlines are functional, with soak in its explicit lane. |
| test/agent-harness/agent-harness-service-host-protocol-compatibility.test.cjs | none; preserve; integration | Bounded functional proof retained with isolated workspace/loopback/injected boundary. Local Git availability remains probed; timing deadlines are functional, with soak in its explicit lane. |
| test/agent-harness/background-agent-tray-presentation.test.cjs | none; quarantine; desktop-platform | Windows behavioral contract retained; explicit direct-invocation skip added. |
| test/agent-harness/candidate-validation-snapshot.test.cjs | none; quarantine; desktop-platform | Windows behavioral contract retained; explicit direct-invocation skip added. |
| test/agent-harness/git-mutation-boundary.test.cjs | ast-static-analysis; preserve; integration | AST dependency prohibition and real Git safety; decomposed in TVA02A. Whole file remains quarantined from this bundle execution. |
| test/agent-harness/mcp-operational-diagnostics.test.cjs | none; preserve; integration | Bounded functional proof retained with isolated workspace/loopback/injected boundary. Local Git availability remains probed; timing deadlines are functional, with soak in its explicit lane. |
| test/agent-harness/mcp-session-lifecycle.test.cjs | none; preserve; integration | Bounded functional proof retained with isolated workspace/loopback/injected boundary. Local Git availability remains probed; timing deadlines are functional, with soak in its explicit lane. |
| test/agent-harness/mcp-tool-contract-generation.test.cjs | none; preserve; integration | Bounded functional proof retained with isolated workspace/loopback/injected boundary. Local Git availability remains probed; timing deadlines are functional, with soak in its explicit lane. |
| test/agent-harness/multi-user-startup-registration.test.cjs | none; quarantine; desktop-platform | Windows behavioral contract retained; explicit direct-invocation skip added. |
| test/agent-harness/oauth-offline-access.test.cjs | none; preserve; integration | Bounded functional proof retained with isolated workspace/loopback/injected boundary. Local Git availability remains probed; timing deadlines are functional, with soak in its explicit lane. |
| test/agent-harness/release-toolbox-boundary.test.cjs | none; preserve; integration | Compiled adapter executed in VM and temporary Git; no source-string assertion. |
| test/agent-harness/repository-enumeration-semantics.test.cjs | none; preserve; integration | Bounded functional proof retained with isolated workspace/loopback/injected boundary. Local Git availability remains probed; timing deadlines are functional, with soak in its explicit lane. |
| test/agent-harness/repository-io-hardening.test.cjs | none; preserve; integration | Bounded functional proof retained with isolated workspace/loopback/injected boundary. Local Git availability remains probed; timing deadlines are functional, with soak in its explicit lane. |
| test/agent-harness/service-host-power-recovery.test.cjs | none; quarantine; desktop-platform | Windows behavioral contract retained; explicit direct-invocation skip added. |
| test/agent-harness/visual-asset-preview.test.cjs | none; preserve; integration | Bounded functional proof retained with isolated workspace/loopback/injected boundary. Local Git availability remains probed; timing deadlines are functional, with soak in its explicit lane. |
| test/agent-harness/visual-asset-toolbox.test.cjs | none; preserve; integration | Bounded functional proof retained with isolated workspace/loopback/injected boundary. Local Git availability remains probed; timing deadlines are functional, with soak in its explicit lane. |
| test/agent-harness/windows-npm-execution.test.cjs | none; quarantine; desktop-platform | Windows behavioral contract retained; explicit direct-invocation skip added. |
| test/app-shell/clipboard-handoff.test.cjs | ast-static-analysis; preserve; integration | AST-selected real clipboard handlers, including distinct rejection propagation. |
| test/app-shell/native-dialog.test.cjs | ast-static-analysis; preserve; integration | AST-selected dialog options executed for Windows/Linux/macOS; no live dialog needed. |
| test/app-shell/native-product-identity.test.cjs | ast-static-analysis; preserve; static | AST-selected BrowserWindow executed; preload isolation and actual branding byte equality. |
| test/architect-outputs/architect-output-workspace-repair.test.cjs | ast-static-analysis; preserve; integration | Durable revision/rollback behavior and AST-selected IPC execution. |
| test/browser/architect-browser-handoff.test.cjs | ast-static-analysis; preserve; integration | Executed AST-selected IPC/preload, service counters and ACK fencing. |
| test/development-environment/elevated-command-transport.test.cjs | none; quarantine; desktop-platform | Windows behavioral contract retained; explicit direct-invocation skip added. |
| test/development-environment/windows-development-environment-provisioner.test.cjs | none; quarantine; desktop-platform | Windows behavioral contract retained; explicit direct-invocation skip added. |
| test/development-environment/windows-environment-refresh.test.cjs | none; quarantine; desktop-platform | Windows behavioral contract retained; explicit direct-invocation skip added. |
| test/documents/disposition-transaction.test.cjs | ast-static-analysis; preserve; integration | Executed transaction handlers and read/write counts; inherited timing trait removed after TVA02 split. |
| test/external-providers/external-mcp-provider-gateway.test.cjs | none; preserve; integration | Synthetic local stdio and loopback HTTP; no external provider. |
| test/external-providers/github-provider.test.cjs | none; preserve; integration | Fake session/gateway and intercepted fetch; no GitHub credentials/API. |
| test/issue-resolution/issue-fix-card-service.test.cjs | none; preserve; integration | Bounded functional proof retained with isolated workspace/loopback/injected boundary. Local Git availability remains probed; timing deadlines are functional, with soak in its explicit lane. |
| test/packaging/windows-installer-scope.test.cjs | source-text; quarantine; packaging | Exception retained: NSIS scope, ordered cleanup, literal quoted commands and data-preservation structural contracts. No installed NSIS parser; not installer execution acceptance. |
| test/packaging/windows-packaging-lifecycle.test.cjs | mixed; quarantine; packaging | Executed compiled lifecycle/rollback plus deliberate NSIS disclosure and read-only PowerShell structural prohibitions. |
| test/performance/disposition-transaction-collapse.test.cjs | none; quarantine; performance-soak | Actual controlled latency gate; no source assertion. Thresholds preserved. |
| test/performance/mcp-operational-soak.test.cjs | none; quarantine; performance-soak | Bounded functional proof retained with isolated workspace/loopback/injected boundary. Local Git availability remains probed; timing deadlines are functional, with soak in its explicit lane. |
| test/performance/mcp-session-volume.test.cjs | none; quarantine; performance-soak | Bounded functional proof retained with isolated workspace/loopback/injected boundary. Local Git availability remains probed; timing deadlines are functional, with soak in its explicit lane. |
| test/renderer/document-review-surface-source.test.cjs | ast-static-analysis; preserve; affected-capability | Rendered body/error/empty states and executed AST-selected refresh callback. |
| test/renderer/figma-redesign-shell.test.cjs | none; preserve; affected-capability | Rendered markup only; source labels were stale. |
| test/renderer/issue-screenshot-intake.test.cjs | ast-static-analysis; preserve; affected-capability | Native-import AST prohibition plus clipboard admission, cleanup and rendered guidance. |
| test/renderer/workflow-hub-shell.test.cjs | ast-static-analysis; preserve; affected-capability | Formatting/neighbor-sensitive handler slicing replaced with AST declarations. Two obsolete greenfield expectations updated to adopted Work Intake and retained legacy recovery. |
| test/repository/issue-screenshot-submission-wiring.test.cjs | ast-static-analysis; preserve; static | Executed intake/App/preload/main/writer chain and actual PNG bytes. |
| test/repository/phase-validation-wiring.test.cjs | ast-static-analysis; preserve; static | Executed public preload/main/service boundaries using existing AST harness. |
| test/repository/runtime-wiring-source.test.cjs | ast-static-analysis; preserve; static | Compiled preload and actual main handlers; restricted inputs and API exclusions. |
| test/work-card-building/codex-app-server-transport.test.cjs | none; preserve; fast | Injected EventEmitter/PassThrough App Server, no real service; bounded disposal deadline is functional. |
| test/work-card-building/codex-implementer-execution-service.test.cjs | none; preserve; integration | Injected preflight and fake JSONL child; no authenticated Codex. |
| test/work-card-building/codex-runtime-initializer-process.test.cjs | none; quarantine; desktop-platform | Actual Electron cancellation before readiness; Windows platform added, live Codex requirement removed. |
| test/work-card-planning/work-card-planning-service.test.cjs | mixed; preserve; integration | AST IPC behavior plus intentional Markdown governance text contract; retained structural inventory-cost proof. |
| test/workspace-evidence/selected-workspace-evidence-notifier.test.cjs | none; preserve; integration | Bounded functional proof retained with isolated workspace/loopback/injected boundary. Local Git availability remains probed; timing deadlines are functional, with soak in its explicit lane. |
| test/characterization/desktop-runtime-model-selection.test.cjs | none; preserve; affected-capability | Local reducer, fake process or injected runtime fixture; false live provider requirement removed. |
| test/renderer/codex-execution-presentation-ownership.test.cjs | none; preserve; affected-capability | Local reducer, fake process or injected runtime fixture; false live provider requirement removed. |
| test/renderer/github-provider-settings.test.cjs | none; preserve; affected-capability | Local reducer, fake process or injected runtime fixture; false live provider requirement removed. |
| test/work-card-building/codex-runtime-initializer-client.test.cjs | none; preserve; integration | Local reducer, fake process or injected runtime fixture; false live provider requirement removed. |
| test/work-card-building/codex-runtime-manager.test.cjs | none; preserve; integration | Local reducer, fake process or injected runtime fixture; false live provider requirement removed. |

Four duplicate generated lookup/download/probe/promotion cases were removed from codex-runtime-manager. Preferred retained proof: desktop-runtime-model-selection's generated Desktop runtime failure cases. They retain degraded status, original executable, explicit selection and active lease, now also asserting no promotion. Behavior ID failure-failure-retains-last-known-good-with-degraded-status moved to this exact retained primary locator. The remaining manager file is preserve because consolidation is complete; no phantom mappings for removed assertions were kept. Desktop characterization requiresBuild corrected because its fixture imports compiled runtime. No file or unique behavior retired.

Current WorkflowHubWorkspace.tsx and adopted docs/architecture/CHAMPCITY_WORK_INTAKE_ROUTING_AND_PLANNING_ARCHITECTURE.md sections 1–3 supersede two greenfield Hub strings. Tests now assert primary Start Work/Work Intake plus retained legacy Development/Issue recovery. No product code was changed to satisfy obsolete expectations.

## File disposition and safety

Created test/support/windows-test.cjs and this report. Modified validation/capability-map.json; workflow-hub-shell, codex-runtime-manager, desktop-runtime-model-selection tests; and all twelve Windows platform/packaging test files listed above to share an explicit unsupported-platform skip reason. Helper source ownership maps to their owning capabilities. No production code, dependencies, migrations, integrations, file deletions or new permanent test files. All remaining test cases preserved. No secrets/concrete machine paths intentionally added; temporary output stays ignored. Exact staged safety scan remains mandatory before final commit.

## Focused validation

All child-process commands used normal Windows with installed dependencies:

- node --test --test-concurrency=1 test/validation/capability-map.test.cjs test/renderer/workflow-hub-shell.test.cjs test/work-card-building/codex-runtime-manager.test.cjs test/characterization/desktop-runtime-model-selection.test.cjs test/work-card-building/codex-app-server-transport.test.cjs test/external-providers/github-provider.test.cjs test/external-providers/external-mcp-provider-gateway.test.cjs: exit 1. All fake provider/transport contracts passed. Two stale Hub assertions and a pending-consolidation metadata mismatch failed, then corrected as documented.
- node --test --test-concurrency=1 test/validation/capability-map.test.cjs test/renderer/workflow-hub-shell.test.cjs test/work-card-building/codex-runtime-manager.test.cjs test/characterization/desktop-runtime-model-selection.test.cjs: exit 0, 32/32, 838.00 ms.
- node -e "Object.defineProperty(process,'platform',{value:'linux'});require('./test/packaging/windows-installer-scope.test.cjs')": exit 0, six explicit Windows skips, zero passes. Skip conformance only.
- npm test: exit 0/passed, 88 tests/12 files, total 14992 ms, one build 10442 ms. The previously false remote-service unavailability is resolved without contacting a provider.
- node --test --test-concurrency=1 test/packaging/windows-installer-scope.test.cjs test/agent-harness/background-agent-tray-presentation.test.cjs: exit 0, 8/8, 185.67 ms. Representative named quarantine proof, no installer mutation.
- planValidation previews for desktop-platform, packaging, performance-soak, full-supported-platform: exit 0. Respectively 10, 2, 3 and 143 files. Every quarantine remains reachable. Every desktop file explicitly declares Windows. Full composition was not executed.

No permanent test-count target. Existing proof reused/modified/consolidated; no new permanent test. Raw unsupported platform runs clearly skip; executor reports unavailable/incomplete. Quarantine is not a pass. Broad platform, full regression, release qualification and visual acceptance remain unclaimed.

TVA08 complete. Next: TVA09 telemetry, budgets and focused acceptance.
