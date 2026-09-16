# Work Card and Repair Card Creation Standard

## Applicability during the structured-state transition

Current V1 and manual documentation workflows retain the card/report requirements below until an implemented structured reporting path replaces them. Future workflow records follow the [Structured Project State domain model](../architecture/CHAMPCITY_STRUCTURED_PROJECT_STATE_DOMAIN_MODEL.md): workers supply semantic results; ChampCity captures mechanical receipts and renders reports. A future design does not waive today's required Implementer Report.

For current V1 execution, the Implementer Report continues to identify any remaining Operator validation because V1's workflow still models card-level Operator disposition. V2 target architecture follows `CCAI-AUTH-001` and `CCAI-GOV-001`: routine Work/Repair validation does not require Operator disposition when applicable criteria can be established through deterministic proof and required independent semantic review. Any remaining human validation should identify the actual visual, experiential, policy, risk, or product judgment that requires the Operator.

Genuine policy, architecture, governance, and design documents remain authored Markdown. They are not live workflow state merely because an agent writes them. A documentation-only Work Card uses content, consistency, reference, and scope checks appropriate to its objective; it does not require unrelated Electron builds or claim runtime behavior from a document check. Runtime and regression proof below applies when executable behavior is changed.

Document status, canonical locations, and unresolved dependencies are recorded in the [corpus index](../architecture/CHAMPCITY_V2_ARCHITECTURE_CORPUS_INDEX.md). This applicability clarification does not create a new approval layer or alter the rule that the human Operator is the only authority.

Our **Work Card creation standard** and **Repair Card creation standard** are related, but they are not the same.

Both card types must be **concise and tightly bounded**. Card size is an execution-control concern, not merely a writing preference: overly large or multi-domain cards increase the risk of Implementer drift. When Operator-directed work cannot be stated and proved compactly, split it into smaller bounded cards rather than combining broad or loosely related work into one assignment.

## Work Card creation standard

A Work Card is a **bounded forward-implementation contract**. It records the Operator's direction as scoped instructions; it does not independently grant permission for work. It should describe a bounded product/workflow objective that the Implementer can build and prove without redesigning the system.

A proper Work Card must:

1. **Start from verified evidence**

   The card must be based on inspected repository state, applicable planning artifacts, Operator decisions/evidence where relevant, or a clearly stated workflow-hardening need. Do not write from assumption.
2. **Define the objective, not just the symptom**

   The card must state what the system must do after implementation, including the intended runtime/user workflow.
3. **Be concise and tightly bounded**

   It must identify what is in scope and what is explicitly out of scope. A Work Card should not become a general refactor, broad cleanup, or “fix whatever you find” assignment. Keep the Operator-directed objective compact enough for the Implementer to execute without drifting into adjacent work.
4. **Embed architecture decisions**

   The Implementer should not be asked to design the system from scratch. The card must provide the relevant architectural decision, ownership boundary, and expected integration path.
5. **Identify required files/areas to inspect**

   It should list the production and test surfaces that must be inspected or modified, but not over-prescribe exact code unless necessary.
6. **Preserve prior validated behavior**

   The card must explicitly state what must not regress, especially recently repaired or validated workflow behavior.
7. **Define forbidden changes**

   It must prohibit out-of-scope mechanisms: hidden state, alternate workflow routes, direct final writes, schema changes, Git mutation when explicitly prohibited, fallback routing, provider SDKs, unrelated rewrites, etc., as applicable.
8. **Specify acceptance criteria**

   Acceptance criteria must be observable and testable. They should prove the runtime behavior, not merely file existence.
9. **Require tests and validation**

   The card must name the focused test suites and general validation lanes the Implementer must run, with exact command/result reporting where the current workflow requires model-maintained reporting.
   Validation scope must map to the card's owned behavior. When a shared test file or suite contains unrelated domains, do not make the entire shared surface an all-or-nothing acceptance gate unless the card owns those domains. Unrelated or pre-existing failures discovered by broader validation must be recorded and routed to the proper owner rather than automatically attributed to the current card.
10. **Require an Implementer Report or structured implementation result**

    Under V1/manual workflows, the report path must be specified. The report must include repository verification, files changed, implementation summary, proof, command results, deviations, blockers, and remaining human validation required by the governing workflow. Under V2 structured reporting, the Work Item must require the equivalent semantic result while ChampCity captures deterministic receipts and renders the human-readable report.
11. **State Git scope and constraints explicitly when material**

    The Operator is the only authority. An explicit prohibition such as `no Git this turn` constrains the Implementer and must be obeyed. When the Operator's current direction or bounded task includes Git work, the card may record the required or allowed operations as ordinary task scope; that wording does not create a machine permission grant. Do not invent a separate Git-authorization gate merely because a Git action mutates the repository.
12. **Return to workflow**

    The card must state the expected post-implementation path. In V1 this may include Architect review and Operator validation. In V2, follow the applicable Design Reviewer/Validator and deterministic completion semantics rather than manufacturing a card-level human disposition when none is required.

## Repair Card creation standard

A Repair Card is for **correcting a failed or defective prior implementation**. It must be evidence-derived and narrower than a normal Work Card.

A proper Repair Card must:

1. **Start from failed review or validation evidence**

   A repair cannot be speculative. It must identify the exact failure, screenshot, error, review finding, runtime behavior, or other evidence that proved the defect.
2. **Reference the governing card/report or structured Work Item**

   It must identify the parent Work Card or prior Repair Card/Work Item, the relevant implementation result, and the failed acceptance or validation point.
3. **Inspect the actual implementation path**

   Before writing the repair, the Architect must inspect the relevant production code and tests. The Repair Card must distinguish confirmed code facts from assumptions.
4. **State the confirmed defect**

   It must describe the defect plainly: what happened, what should have happened, and where the behavior diverged from the governed workflow or implementation contract.
5. **State root cause**

   The card must identify the architectural or implementation cause, not just the visible symptom.
6. **Limit the correction and keep it concise**

   The repair scope must include only the minimal correction needed to resolve the confirmed defect. It must not re-open passed scope or rewrite unrelated work. If the repair grows beyond a compact correction boundary, split the work rather than giving the Implementer a broad multi-domain repair that invites drift.
7. **Preserve passed behavior**

   Prior accepted or validated behavior must be protected. Historical validation remains evidence of what was true at that time; a later defect or changed implementation may require revalidation without rewriting history.
8. **Forbid broad redesign**

   The Implementer must not introduce new workflow models, hidden state, alternate persistence, schema drift, fallbacks, or unrelated UI changes unless the Operator's direction or applicable architecture expands scope accordingly.
9. **Define precise acceptance criteria**

   Acceptance criteria must prove the defect is fixed and that preserved behavior still works.
10. **Require regression proof**

    Tests must cover the failed scenario and relevant no-regression scenarios. Screenshots alone are not enough for a repair pass when deterministic/runtime proof is available.
11. **Require a Repair Implementer Report or structured implementation result**

    Under V1/manual workflows, the report must include the confirmed defect, root cause, files changed, proof, commands/results, deviations, blockers, and remaining human validation. Under V2 structured reporting, the equivalent semantic result is stored in Project State while ChampCity captures mechanical receipts.
12. **Return to the original workflow**

    A repair should return the system to the parent workflow path after correction and required revalidation. It should not create a new workflow unless the Operator's direction or governing architecture requires one.

The short distinction:

```text
Work Card = bounded forward implementation or hardening.

Repair Card = evidence-derived correction of a failed implementation.
```

For both, the core standard is the same: **verified evidence, concise bounded scope, explicit preservation, explicit constraints, objective acceptance, and truthful implementation proof.**

## Operator decisions, task scope, and infrastructure

The human Operator is the only authority over product intent, material scope, material risk/exception acceptance, and other human decisions reserved by `CCAI-AUTH-001`. Work Cards and Repair Cards are bounded execution contracts: they record direction, task scope, instructions, constraints, and evidence, but they cannot serve as permission principals.

The Implementer must follow the Operator's current direction and every explicit task constraint. In particular, `no Git this turn` or another Git prohibition must be obeyed. When Git operations are part of the task, a card may describe the required or allowed operations in ordinary prose as scope. No heading, token list, metadata field, card format, validation record, or workflow state becomes a machine permission grant.

MCP and future RepositoryService implementations enforce execution-security and policy boundaries such as authenticated access scope, exact Repository identity/binding, containment, Git-backed preconditions where required, bounded action schemas, and deterministic command safety checks. They do not infer an Operator Decision from a card or manufacture a separate approval hierarchy for ordinary task mechanics.
