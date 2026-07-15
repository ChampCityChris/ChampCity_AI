# Role Gate Contract

## Ownership

ChampCity A/I uses four explicit workflow roles.

| Role | Governed responsibilities |
| --- | --- |
| Operator | Capture intent, review and approve project/phase planning, perform validation, approve closeout and over-budget packet export, and activate the next phase or record that no next phase exists. |
| Architect | Frame and plan, create Work Cards, review Implementer Reports, determine validation disposition, create repair Work Cards, authorize Operator validation, and update the roadmap after approved phase closeout. |
| Implementer | Execute approved Work Cards and create Implementer Reports. |
| Application | Enforce current state, artifact authority, role gates, evidence requirements, pair consistency, and transitions. |

## Enforcement Points

Role authorization is checked:

- when the routed action is projected;
- before a routed preview is generated;
- before a pair is written;
- before the registry is updated;
- before workflow state advances;
- before an over-budget context packet is exported.

The active screen must match the contract’s responsible role and expected output type. Support navigation does not grant permission to perform the screen’s governed action.

## Decision Boundaries

- The Implementer does not accept Work Cards, perform Operator validation, approve closeout, or determine validation disposition.
- The Operator reports validation evidence but does not make the Architect’s repair/continue disposition.
- The Architect does not claim Operator acceptance.
- Roadmap Update is an Architect decision; Next Phase Activation is an Operator decision.
- The application validates their evidence and enforces their transitions but does not make either human decision.
- The application does not infer human approval or candidate completion from file presence or prose.

## Failure Behavior

An unauthorized action returns a blocking result containing action ID, expected role, actual role, and correction owner. It does not write an output pair or change registry/workflow state.

## Evidence Requirement

Every transition declares its required source artifact IDs and expected output artifact. Authorization alone is insufficient: sources must be authoritative and synchronized, and the output pair plus registry update must succeed before state advancement.
