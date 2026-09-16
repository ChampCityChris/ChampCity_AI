# ChampCity A/I Governance Vocabulary

| Field | Value |
| --- | --- |
| Standard ID | `CCAI-VOCAB-001` |
| Status | **Adopted normative governance vocabulary — September 14, 2026** |
| Applies to | ChampCity A/I product, Desktop, Server, Product Core, workflows, docs, tests, APIs, schemas, tools, MCP, Runtime, and Project State |

## 1. Governing rule

**Authority is reserved for the human Operator.**

No AI role, document, state record, validation result, workflow state, service, MCP surface, repository, runtime, tool, schema, process, or persistence mechanism possesses authority.

If a concept is not the Operator's human decision power, use the most precise technical term below instead of attaching `authority` to it.

## 2. Canonical terms

| Term | Canonical meaning |
| --- | --- |
| **Authority** | The Operator's exclusive human decision power over product intent, scope changes, material risk, exceptions, acceptance, and other decisions reserved to the human. |
| **Authorization (security/access)** | A technical access-control determination, such as OAuth authorization, that an authenticated client may use a scoped capability. This term is valid only for security/access semantics and does not represent product authority, task scope, workflow eligibility, or Operator intent. |
| **Operator Decision** | An explicit human choice or disposition. The recorded decision is state/evidence produced by the Operator's authority; the record itself does not become authority. |
| **Direction** | An Operator instruction establishing an objective, outcome, or requested action. |
| **Scope** | The bounded work included in the current task, Work Item, solution, or execution. |
| **Constraint** | An explicit prohibition, requirement, limit, or non-negotiable that narrows execution. Example: `No Git mutation this turn.` |
| **Delegation** | Assignment of execution responsibility or technical judgment within defined scope. Delegation never transfers authority. |
| **Policy** | A deterministic product, project, repository, runtime, or environment rule applied without discretionary approval. |
| **Eligibility** | A computed determination that deterministic prerequisites for an operation or state transition are satisfied. |
| **Capability** | A technical operation a tool, runtime, service, or environment can perform. Capability does not imply task scope or Operator intent. |
| **Access** | Authenticated, registered, or otherwise technically valid ability to reach a resource or capability. Access is a security/resource boundary, not authority. |
| **Binding** | A deterministic association between identities/resources, such as Project-to-Repository or Repository-to-MCP-workspace association. |
| **Containment** | Enforcement that an operation remains inside its permitted resource boundary. |
| **State / Status** | The current lifecycle or operational condition derived from records and events. State does not make discretionary decisions. |
| **Disposition** | A recorded Operator decision state such as Approved, RevisionRequested, or Rejected. |
| **Evidence** | Observed facts, outputs, validation results, receipts, screenshots, logs, hashes, or other material supporting a conclusion. |
| **Basis** | The exact evidence/state used as the deterministic input to a later operation. Use when a record/hash is the prerequisite for close, revision, or another transition. |
| **Source** | The originating record, event, or input for derived state. |
| **Provenance / Lineage** | Where a record came from and how it relates to predecessor/source records. |
| **Identity** | The stable identifier or exact digest used to distinguish a resource, record, process, revision, or execution. |
| **Ownership** | Technical possession/responsibility for a process, lease, resource, or lifecycle operation. Ownership is not authority. |
| **Integrity / Freshness** | Deterministic checks that state, revisions, hashes, bindings, and source material remain internally consistent and current. |
| **Canonical Source** | The system-designated source used to read/write a class of state. Being canonical does not make the source an authority principal. |
| **Precedence** | Deterministic ordering used to select between sources/records. Precedence is not authority. |
| **Blocker** | A condition that prevents safe or legal continuation. A blocker may be mechanical and does not automatically require an Operator decision. |
| **Operator Decision Required** | A condition where genuine human judgment reserved to the Operator is needed. This is the only governance concept representing a human decision boundary. |

## 3. Required vocabulary mappings

The following mappings are normative when cleaning existing ChampCity terminology:

| Legacy/incorrect concept | Canonical replacement |
| --- | --- |
| repository authority | repository binding / repository context, depending on semantics |
| active workspace authority | active workspace selection |
| Work Card loop authority | Work Card loop state / lifecycle resolution |
| completion authority | completion state / completion evidence |
| close authority | close record / close basis / completion evidence |
| validation authority | validation basis / validation evidence |
| revision authority | revision source / revision basis |
| authority hash / expected authority hash | basis hash / expected basis hash, named for the exact basis |
| canonical authority | canonical source |
| runtime authority | runtime identity / loaded build identity / runtime source, depending on semantics |
| repository-native dependency authority | repository-native dependency source / contract |
| startup authority | startup registration / startup ownership |
| routing authority | routing binding / registered access |
| workflow authority | workflow state / eligibility / Operator decision, depending on semantics |
| source-of-truth authority | canonical source / source precedence |
| permission/authority check | scope check, constraint check, policy check, access check, capability check, or Operator Decision Required |
| contract/record/workflow state authorizes action | Operator direction establishes scope; policy/state makes the action eligible or ineligible; a record may be the required source/basis but does not authorize |
| authorized surface | in-scope surface / implementation surface |
| authorized work | Operator-directed work / in-scope work, unless the text explicitly refers to a human Operator authorization event |

A rename MUST preserve the underlying semantic distinction. Do not replace every occurrence with one generic word.

The verb **authorize** MUST NOT be used with a contract, record, workflow state, validation result, test result, service, runtime, or tool as the acting subject. Use `eligible`, `in scope`, `required basis`, `source`, `permitted by policy`, `directed by the Operator`, or another exact canonical term. OAuth and other genuine access-control protocol terminology are exempt because they describe technical access rather than product authority.

## 4. Contracts, records, and state

Work Cards, Repair Cards, Issues, prompts, Decisions, Validation records, close records, Project State, and metadata may carry:

- Operator direction;
- scope;
- constraints;
- state;
- dispositions;
- evidence;
- bindings;
- provenance;
- policy inputs; and
- mechanical metadata.

They do not possess authority.

A statement such as `No Git mutation this turn` is a constraint. A recorded `Approved` disposition is a record of an Operator Decision. A validation result is evidence. A hash linking a close action to a validation record is a basis/integrity check. None should be named or modeled as an authority source.

## 5. Infrastructure

MCP, Agent Runtime, Git, RepositoryService, ProjectStateService, CI, sandboxes, schemas, persistence, tests, validation engines, and tool brokers may enforce access, containment, policy, capabilities, integrity, state-machine legality, and other deterministic invariants.

They do not decide whether they possess authority. They do not create authority gates.

## 6. Error vocabulary

Errors should identify the actual failed boundary, for example:

- `SCOPE_VIOLATION`
- `CONSTRAINT_VIOLATION`
- `RESOURCE_SCOPE_VIOLATION`
- `WORKSPACE_ACCESS_DENIED`
- `POLICY_VIOLATION`
- `CAPABILITY_UNSUPPORTED`
- `GIT_CAPABILITY_UNAVAILABLE`
- `STATE_TRANSITION_INVALID`
- `STALE_SOURCE`
- `INTEGRITY_CHECK_FAILED`
- `OPERATION_OUTCOME_UNKNOWN`
- `OPERATOR_DECISION_REQUIRED`

Do not use `AUTHORITY_DENIED` as a generic technical failure.

## 7. Final rule

> **One authority: the Operator. Everything else is scope, constraints, policy, access, capability, state, evidence, identity, ownership, integrity, or mechanics.**
