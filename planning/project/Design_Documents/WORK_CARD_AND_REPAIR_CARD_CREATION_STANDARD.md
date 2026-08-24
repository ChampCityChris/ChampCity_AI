# Work Card and Repair Card Creation Standard

Our **Work Card creation standard** and **Repair Card creation standard** are related, but they are not the same.

Both card types must be **concise and tightly bounded**. Card size is an execution-control concern, not merely a writing preference: overly large or multi-domain cards increase the risk of Implementer drift. When authorized work cannot be stated and proved compactly, split it into smaller bounded cards rather than combining broad or loosely related work into one assignment.

## Work Card creation standard

A Work Card is for **authorized forward implementation**. It should describe a bounded product/workflow objective that the Implementer can build and prove without redesigning the system.

A proper Work Card must:

1. **Start from verified evidence**

   The card must be based on inspected repository state, approved planning artifacts, Operator validation evidence, or a clearly stated workflow-hardening need. Do not write from assumption.
2. **Define the objective, not just the symptom**

   The card must state what the system must do after implementation, including the intended runtime/user workflow.
3. **Be concise and tightly bounded**

   It must identify what is in scope and what is explicitly out of scope. A Work Card should not become a general refactor, broad cleanup, or “fix whatever you find” assignment. Keep the authorized objective compact enough for the Implementer to execute without drifting into adjacent work.
4. **Embed architecture decisions**

   The Implementer should not be asked to design the system from scratch. The card must provide the relevant architectural decision, ownership boundary, and expected integration path.
5. **Identify required files/areas to inspect**

   It should list the production and test surfaces that must be inspected or modified, but not over-prescribe exact code unless necessary.
6. **Preserve prior validated behavior**

   The card must explicitly state what must not regress, especially recently repaired or validated workflow behavior.
7. **Define forbidden changes**

   It must prohibit unauthorized mechanisms: hidden state, alternate workflow routes, direct final writes, schema changes, Git mutation, fallback routing, provider SDKs, unrelated rewrites, etc., as applicable.
8. **Specify acceptance criteria**

   Acceptance criteria must be observable and testable. They should prove the runtime behavior, not merely file existence.
9. **Require tests and validation**

    The card must name the focused test suites and general validation lanes the Implementer must run, with exact command/result reporting.
    Validation scope must map to the card's owned behavior. When a shared test file or suite contains unrelated domains, do not make the entire shared surface an all-or-nothing acceptance gate unless the card owns those domains. Unrelated or pre-existing failures discovered by broader validation must be recorded and routed to the proper owner rather than automatically attributed to the current card.
10. **Require an Implementer Report**

    The report path must be specified. The report must include repository verification, files changed, implementation summary, proof, command results, deviations, blockers, and remaining Operator validation.
11. **Avoid Git mutation unless explicitly authorized**

    Default is no stage/commit/push/branch mutation unless the Operator explicitly authorizes it.
12. **Return to workflow**

    The card must say what happens after implementation: Architect review, then Operator validation if approved.

## Repair Card creation standard

A Repair Card is for **correcting a failed or defective prior implementation**. It must be evidence-derived and narrower than a normal Work Card.

A proper Repair Card must:

1. **Start from failed review or Operator validation evidence**

   A repair cannot be speculative. It must identify the exact failure, screenshot, error, review finding, or runtime behavior that proved the defect.
2. **Reference the governing card/report**

   It must identify the parent Work Card or prior Repair Card, the relevant Implementer Report, and the failed acceptance or validation point.
3. **Inspect the actual implementation path**

   Before writing the repair, the Architect must inspect the relevant production code and tests. The Repair Card must distinguish confirmed code facts from assumptions.
4. **State the confirmed defect**

   It must describe the defect plainly: what happened, what should have happened, and where the behavior diverged from the approved workflow.
5. **State root cause**

   The card must identify the architectural or implementation cause, not just the visible symptom.
6. **Limit the correction and keep it concise**

   The repair must only authorize the minimal correction needed to resolve the confirmed defect. It must not re-open passed scope or rewrite unrelated work. If the repair grows beyond a compact correction boundary, split the work rather than giving the Implementer a broad multi-domain repair that invites drift.
7. **Preserve passed behavior**

   Prior accepted or validated behavior must be protected. A passed card is not retroactively a failure unless the Operator explicitly reopens it.
8. **Forbid broad redesign**

   The Implementer must not introduce new workflow models, hidden state, alternate persistence, schema drift, fallbacks, or unrelated UI changes unless explicitly authorized.
9. **Define precise acceptance criteria**

   Acceptance criteria must prove the defect is fixed and that preserved behavior still works.
10. **Require regression proof**

    Tests must cover the failed scenario and relevant no-regression scenarios. Screenshots alone are not enough for a repair pass.
11. **Require a Repair Implementer Report**

    The report must include the confirmed defect, root cause, files changed, proof, commands/results, deviations, blockers, and remaining Operator validation.
12. **Return to the original workflow**

    A repair should return the system to the parent workflow path after correction. It should not create a new workflow unless explicitly authorized.

The short distinction:

```text
Work Card = bounded forward implementation or hardening.

Repair Card = evidence-derived correction of a failed implementation.
```

For both, the core standard is the same: **verified evidence, concise bounded scope, explicit preservation, forbidden changes, objective acceptance, and Implementer proof.**
