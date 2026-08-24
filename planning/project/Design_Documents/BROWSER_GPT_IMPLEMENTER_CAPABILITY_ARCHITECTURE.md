# Browser GPT Implementer Capability Architecture

## Purpose

ChampCity A/I already integrates the Codex agent harness through the Codex App Server. Codex therefore arrives with a mature local coding substrate: repository exploration, file editing, shell execution, process lifecycle, streamed execution events, user-input requests, MCP use, and an ongoing thread/turn model.

Browser ChatGPT is different. It provides strong reasoning, conversation, tool selection, web access, and MCP client behavior, but it does not inherently possess local development tools for the Operator's Windows machine or repositories. To make Browser GPT a first-class Implementer, ChampCity must provide the missing local-development substrate externally through application-owned capabilities exposed over MCP.

This document defines that gap and the minimum capability architecture required to close it without attempting to recreate the complete Codex harness.

## 1. Architectural Distinction

The important distinction is not model capability. It is execution substrate.

```text
Codex App Server
= model + mature local coding harness

Browser GPT
= model + browser/ChatGPT harness + MCP client
  but no native access to ChampCity's local repositories, shell, processes, or development environment

ChampCity A/I
= workflow authority + resource authority + local-development capability provider + orchestration/control plane
```

ChampCity should therefore avoid rebuilding what Codex already supplies internally. Instead, it should expose application-owned local development capabilities in a provider-neutral form so Browser GPT and future local models can perform real implementation work under ChampCity authority.

## 2. What Codex Already Brings Through App Server

The current Codex App Server integration gives the Codex worker a strong coding harness that includes or exposes:

- repository and filesystem exploration;
- source-file editing and patch application;
- local command execution;
- build and test execution;
- long-running process interaction;
- process cancellation and cleanup;
- persistent thread/turn execution;
- streamed command and file-change events;
- runtime/configuration/capability inspection;
- user-input requests;
- MCP calls and MCP elicitation;
- command/file/permission request handling;
- execution cancellation;
- local development-environment visibility through the process environment;
- evidence about commands, changes, failures, and completion.

These capabilities are part of the Codex worker substrate. ChampCity should treat Codex App Server as one provider/worker runtime, not as the architecture that all other providers must copy internally.

## 3. What Browser GPT Already Has

Browser GPT already supplies capabilities that ChampCity does not need to recreate:

- high-level reasoning;
- conversational context;
- tool selection and tool calling;
- web research and connected application access when available;
- MCP client behavior;
- multimodal reasoning where supported;
- long-form planning and evaluation;
- the ability to interpret Work Cards and implementation evidence.

The missing half is local software-development authority and execution against the Operator's actual machine.

## 4. Current ChampCity MCP Surface

The current ChampCity MCP surface already provides a meaningful portion of the Browser GPT coding substrate.

### Repository inspection

Current `repo_toolbox` capabilities include:

```text
status
list_files
read_file
inspect_text_file
read_text_chunk
read_text_lines
read_markdown_section
search_files
write_markdown_artifact
write_json_artifact
propose_patch
apply_approved_patch
```

This already gives Browser GPT strong bounded repository discovery and reading capabilities plus an initial controlled patch path.

### Git

Current `git_toolbox` capabilities include:

```text
status
diff
pre_commit_scan
readiness_summary
inspect_history
prepare_branch
stage_changes
commit
push
integrate_to_dev
```

Git mutation is separately governed and should remain independently authorized rather than becoming implied by generic file-write or execution access.

### Other current capabilities

ChampCity also exposes artifact, diagnostics, integration, browser-status, knowledge-status, and attached-image write surfaces. These are useful supporting capabilities but do not yet close the Browser Implementer loop.

## 5. Primary Missing Capability: Local Execution Service

The most important missing capability is generic local process execution.

Without execution, Browser GPT can inspect and potentially edit code but cannot independently complete the normal software-development loop:

```text
read code
→ change code
→ build
→ test
→ inspect failure
→ change code again
→ rerun
```

The Local Execution Service should therefore be the highest-priority Browser Implementer capability.

### Required model-facing operations

```text
execution.capabilities
execution.start
execution.status
execution.read_output
execution.send_input
execution.cancel
```

### Structured request model

Execution should be expressed as structured program-plus-arguments data rather than an unbounded shell-string authority.

Example:

```text
program: npm
arguments: ["run", "build"]
workspaceId: champcity_ai
workingDirectory: <authorized repository-relative directory>
timeout: <bounded value>
parentAgentSession: <session identity>
parentWorkCard: <Work Card identity>
```

ChampCity resolves the executable, working directory, resource authority, process ownership, environment, and lifecycle.

### Required execution behavior

The service should support:

- short-lived commands;
- build/test/typecheck/lint commands;
- long-running development servers;
- bounded stdout/stderr retrieval;
- streaming output or cursor-based output reads;
- stdin when required;
- timeout;
- cancellation;
- process-tree cleanup;
- refreshed environment inheritance;
- application shutdown cleanup;
- execution against explicitly authorized workspaces or filesystem roots;
- durable evidence for later review and Implementer Reports.

### Process ownership

A major advantage of application-owned execution is that ChampCity knows which process belongs to which agent task.

```text
execution.start
→ runId 427
→ ChampCity owns PID/process tree

execution.cancel(runId=427)
→ terminate that run's process tree
```

This is safer and simpler than expecting Browser GPT to discover arbitrary PIDs and issue process-kill commands.

## 6. Repository Editing Service

Browser GPT already has strong repository-read capability, but first-class implementation needs a more complete edit surface.

Target repository operations should include:

```text
repo.list/tree
repo.search
repo.read
repo.read_chunk
repo.hash
repo.write/create
repo.delete when authorized
repo.move when authorized
repo.propose_patch
repo.apply_patch
repo.apply_patch_set
repo.diff
```

### Atomic multi-file patch sets

Atomic multi-file edits are particularly important.

A normal implementation may need to change:

```text
shared contract
service
main IPC
preload exposure
renderer
focused tests
```

Those edits should be installable as one validated change set when practical:

```text
repo.apply_patch_set
→ validate every target
→ verify authority for every file
→ apply complete set atomically
→ return before/after hashes and diff evidence
```

This prevents a failed fourth or fifth write from leaving a partially installed implementation.

The application-owned repository service should become the preferred Browser GPT edit route rather than relying on any provider-specific internal patch mechanism.

## 7. Environment Service

Codex runs inside the local development environment and naturally observes whether tools such as Node.js, Git, Python, CMake, or .NET are available.

Browser GPT does not have that local visibility. ChampCity must expose the existing development-environment subsystem as a first-class capability.

Target operations:

```text
environment.inspect
environment.ensure
environment.resolve
environment.status
```

Example:

```text
Browser GPT determines that a Work Card requires CMake
→ environment.inspect("cmake")
→ ChampCity reports satisfied/missing/incompatible
→ environment.ensure("cmake") when authorized
→ existing deterministic/provider/provisioner path executes
→ semantic verification returns evidence
```

Browser GPT should not independently invent installation commands or create a second provisioning system. ChampCity remains the environment authority.

UAC and other genuine Windows secure-desktop interactions remain Operator/OS boundaries.

## 8. Git Service

Codex can invoke Git through its local shell. Browser GPT needs explicit Git capability because it does not possess a local shell unless ChampCity provides one.

A dedicated Git service is preferable to treating all Git operations as generic execution because Git mutation has distinct workflow implications.

Target behavior includes:

```text
git.status
git.diff
git.history
git.branch inspection
git.stage
git.commit
git.restore
git.conflicts
git.push/pull when explicitly authorized
```

Git mutation must remain separate from:

- repository write authority;
- OAuth `files.write` scope;
- local execution authority;
- mere availability of a Git executable.

Browser GPT does not need Git mutation to become a useful Implementer immediately. Initial Browser implementation can leave stage/commit/push under separate workflow authority.

## 9. Evidence and Observability Layer

Codex App Server naturally emits a rich stream of local-worker events. Browser GPT MCP calls are otherwise discrete tool invocations. ChampCity should therefore generate provider-neutral evidence from the underlying services.

Examples:

```text
repo.apply_patch_set
→ files changed
→ before hashes
→ after hashes
→ diff summary

execution.start
→ runId
→ executable + arguments
→ cwd
→ authority identity

execution.completed
→ exit code
→ stdout/stderr cursors
→ duration
→ timeout/cancellation state
→ process-tree cleanup state
```

The evidence layer should normalize work performed by all providers:

```text
                ChampCity Evidence
                       │
        ┌──────────────┼──────────────┐
        │              │              │
   Browser GPT       Codex        Local Model
```

This prevents Codex runs from being richly observable while Browser GPT runs become a collection of uncorrelated MCP calls.

## 10. Browser and UI Validation

A first-class Browser Implementer also needs a way to validate user-facing behavior after changing code.

Playwright should remain the first backend for this capability.

Target operations include:

```text
browser.navigate
browser.inspect_dom
browser.click
browser.fill
browser.capture_screenshot
browser.console_errors
browser.failed_network_requests
```

The desired implementation loop becomes:

```text
edit renderer
→ build
→ launch/start application or dev server
→ inspect UI
→ interact with workflow
→ read console/network failures
→ correct implementation
→ rerun validation
```

A general Windows computer-use clone is not required for the initial Browser Implementer. Native UI Automation can be added later only if real development tasks justify it.

## 11. Context and Skills

Codex's mature harness assembles repository context, instructions, tools, configuration, and reusable skills around a coding session.

Browser GPT needs ChampCity to supply the project-specific equivalent rather than relying on the browser conversation to remember all development authority.

Useful context packs include:

### Work Card Context

```text
Approved Work Card
acceptance criteria
authorized scope
preservation constraints
forbidden changes
Implementer Report target
```

### Repository Context

```text
AGENTS.md
README/build instructions
validation-lane instructions
relevant source excerpts
current diff/status
```

### Resource Context

```text
authorized workspaceIds
authorized filesystem rootIds
execution authority
Git mutation authority
environment authority
```

### Execution Context

```text
previous commands/results
current environment state
current failure evidence
active run IDs
recent changed-file evidence
```

Skills should define reusable execution contracts such as:

```text
implement-work-card
diagnose-build-failure
resolve-development-environment
write-implementer-report
perform-bounded-repair
review-implementation-evidence
```

## 12. Agent Session Service

ChampCity should track Browser GPT sessions independently of ChatGPT itself.

A provider-neutral session record should correlate:

```text
agentSessionId
provider/providerThreadId
role
project/phase/Work Card
registered/authorized workspaceIds
filesystemRootIds
execution authority
Git authority
active tool runs
pending input
last evidence
completion state
```

This enables evidence correlation, worker substitution, cancellation, crash recovery, mobile/remote continuation, and future persistent worker identity.

## 13. Worker Delegation

Browser GPT should become the initial orchestration agent and decide when its externally supplied Browser Implementer capabilities are sufficient and when Codex provides material additional value.

Target worker operations:

```text
worker.delegate_codex
worker.delegate_local
worker.status
worker.result
worker.cancel
```

Example Browser-owned implementation:

```text
Browser GPT
→ inspect repository
→ apply bounded patch set
→ run focused tests
→ update Implementer Report
```

Example delegated implementation:

```text
Browser GPT encounters difficult native/process/debugging problem
→ delegate bounded worker task to Codex App Server
→ ChampCity supplies task/resource authority
→ Codex returns implementation + evidence
→ Browser GPT evaluates and integrates result
```

Codex should be used when its local coding/debugging harness provides meaningful advantage, not merely because Browser GPT lacks an arbitrary local-machine capability that ChampCity should expose generically.

## 14. Minimum Viable Browser Coding Harness

Browser GPT does not need a clone of the entire Codex harness before it can become a useful Implementer.

The minimum viable local-development substrate is:

```text
1. Repository Service
   read / search / edit / patch

2. Local Execution Service
   start / status / output / input / cancel

3. Environment Service
   inspect / ensure / resolve / status

4. Evidence Layer
   structured evidence for every mutation and execution
```

ChampCity already possesses substantial portions of Repository Service and the underlying Environment Service. Therefore the highest-priority functional gap is the Local Execution Service.

Once Browser GPT can:

```text
read code
→ modify code
→ run build
→ run tests
→ inspect failure
→ modify again
→ rerun
```

it becomes a genuine software Implementer rather than an Architect with limited file-write capability.

## 15. Provider-Neutral Target Architecture

The long-term goal is not to force every provider to use identical internal tools. It is to give every provider access to equivalent ChampCity-owned development capabilities where the provider's native harness is insufficient.

```text
                         ChampCity A/I
                              │
                 Workflow + Resource Authority
                              │
                Capability / Evidence Services
                              │
       ┌──────────────────────┼──────────────────────┐
       │                      │                      │
Browser GPT via MCP    Codex App Server       Local Model Adapter
       │                      │                      │
uses ChampCity local   uses native harness     uses ChampCity tools
services directly      + ChampCity services    through function adapter
where required         where appropriate       where required
```

The application-owned capability registry should remain shared:

```text
repo.*
filesystem.*
git.*
execution.*
environment.*
artifact.*
browser.*
knowledge.*
diagnostics.*
worker.*
```

Provider adapters expose or map these capabilities through their native mechanism. The service implementation and resource authority remain owned by ChampCity.

## 16. Core Architecture Principle

The goal is not to build Browser GPT a second Codex App Server.

The goal is to supply Browser GPT with the local-machine half of a coding harness that it does not bring with it, while preserving ChampCity as the authority over repositories, execution, environment, Git, workflow state, evidence, and worker delegation.

The resulting division of responsibility is:

```text
Browser GPT
= reasoning, planning, implementation strategy, orchestration, evaluation

ChampCity A/I
= workflow authority, resource control, local development capabilities, evidence, provider coordination

Codex App Server
= strong local coding/debugging worker with its own mature native harness

Future Local Model
= bounded worker using ChampCity-supplied tools
```

This architecture allows Browser GPT to become a first-class Implementer without rebuilding provider-native functionality unnecessarily and allows ChampCity to remain provider-neutral as additional workers are added.
