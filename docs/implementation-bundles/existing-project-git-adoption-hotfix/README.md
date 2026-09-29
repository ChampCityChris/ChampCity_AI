# Existing Project Git Adoption Hotfix

**Original implementation checkpoint:** `07ad7ccb88a0ea7878529235151870dbb0aeec74`  
**Forced-normalization checkpoint:** `6200d383d61ff890d86492cb5ed6e3e17b3856d9`  
**Repair02 acceptance checkpoint:** `2a897f96f60ef8d16606ade4c2b1dfb45fddde5a`  
**Repair03 implementation checkpoint:** `07d2e543e6c64ec4214fef7027bf853cefdfb1ab`  
**Repair04 implementation checkpoint:** `643ea5ed24552b34b9cafa3592b4965703fdb28c`  
**Repair04 / Repair01 acceptance checkpoint:** `f59d5d779f8192d14f47c1175d3a33b871b0c2e4`  
**Current status:** **QUALIFICATION RETRY AUTHORIZED**

## Controlling path

Read:

1. `Repair04/Repair01/EPGA_R04_R01_ARCHITECT_REVIEW_2026-09-29.md`
2. `Repair04/README.md`
3. `Repair04/Repair01/README.md`

Repair01's forced Git normalization remains the implementation baseline.

Repair02's managed-repository integration-policy provisioning is accepted.

Repair03's bounded source staging, ignored/local-state separation, and non-following link handling are accepted.

Repair04's Git-neutral workspace / RepositoryCheckout authority split, staged cutover, rollback, and Repair01 lifecycle correction are accepted.

## Workspace / Git authority contract

A registered Agent Harness workspace is a generic model-access directory.

It may have zero, one, or multiple RepositoryCheckouts.

The workspace itself does not infer or grant Git authority from a root `.git` entry.

Non-Git workspaces are permanently supported.

Model-facing Git/test/release access uses registered RepositoryCheckout authority.

ChampCity's application/source-control layer owns:

- Git discovery;
- conventional checkout provisioning;
- Existing Project adoption;
- repository normalization;
- managed repository metadata;
- Main/Dev/Workflow checkout lifecycle;
- registration and retirement of RepositoryCheckout identities.

The Operator-approved 2026-09-29 authority decision supersedes the older RCO-HF01 workspace-root Git authorization rule.

## Existing Project source-control contract

For a Git-backed Existing Project:

```text
select Project
→ register generic workspace
→ application provisions explicit conventional checkout when applicable
→ show one conversion warning
→ Accept and Convert / Cancel
→ on Accept:
     preserve canonical Project source
     preserve ignored/local working state separately
     generate current managed-repository integration policy
     build candidate managed repository in migration staging
     atomically retire/drain conventional RepositoryCheckout
     install canonical managed repository
     relocate conventional root Git only after candidate proof
     create canonical Main/Dev worktrees
     verify managed topology
     register exact Main/Dev RepositoryCheckouts
     register/open Current Project
     open Workflow Hub
```

The generic workspace remains available throughout this transition; Git authority moves between explicit checkout identities.

## Qualification state

The current real ChampCity_AI folder still contains the prior interrupted normalization evidence from the earlier EPERM failure.

That state has intentionally not been manually cleaned.

Repair04's recovery behavior is designed and proven against that state class.

## Next action

Run the current code/build, open the ChampCity_AI folder using **Open Existing Project**, and perform **Accept and Convert**.

If the real qualification attempt fails, preserve the exact error and migration state for review.

## Managed Repository configuration

Every newly managed Repository receives a current integration policy.

Repositories with the complete current validation-profile authority receive the current `integration-gate` policy.

Other repositories receive the generic application-owned source-integrity policy.

No project-specific Integration Repair scope is fabricated during bootstrap/adoption.

## Non-scope

This hotfix does not address:

- WRB04 workspace composition;
- mandatory Architect-per-WorkItem authority drift;
- WRB05/web migration;
- broader Workflow planning/execution behavior.
