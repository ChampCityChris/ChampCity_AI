# ISSUE_001 — No Independent Issue Resolution Workflow

## Issue

ChampCity A/I currently has no first-class workflow for resolving project issues discovered while another Development Workflow phase or Work Card is active when the issue is not causally owned by that active development work.

The existing Development Workflow can create Repair Cards from failed implementation or validation evidence, but that repair path is subordinate to the current Work Card. It assumes the defect being corrected belongs to the implementation currently under review.

That model does not represent an unrelated project-baseline issue that happens to be discovered during active development.

## Current Consequence

When an unrelated issue is discovered during an active Development Workflow, the Operator currently has no clean application-owned path to stop working on the development task, resolve the unrelated issue, and later return to the Development Workflow without distorting the evidence chain.

The practical alternatives have been undesirable:

- force the unrelated issue into the active Work Card's review or validation evidence;
- create a Repair Card whose parentage incorrectly implies the active Work Card caused the issue;
- insert unplanned corrective work into the Development phase sequence; or
- leave the application workflow and manage the corrective work through out-of-band repair artifacts.

These approaches create unnecessary friction and can introduce false causal relationships between planned development work and defects in the existing project baseline.

## Needed Capability

ChampCity A/I needs a separate top-level Issue Resolution Workflow that belongs directly to the selected project rather than to the current Development phase or Work Card.

An issue may record that it was discovered while Development was active, but discovery context must not become causal parentage.

The Development Workflow must be able to retain its existing state while the Operator enters Issue Resolution, and the Operator must be able to return to Development afterward without resetting, rewriting, closing, or manufacturing Development lifecycle state.

## Relationship to the New Workflow Hub

The planned Workflow Hub provides the correct top-level location for this capability:

```text
Selected Project
      ↓
Workflow Hub
   ├── Development
   └── Issue Resolution
```

Issue Resolution is therefore a peer workflow to Development, not a child step inserted into the Development loop.

## Status

Issue confirmed through current ChampCity A/I dogfooding experience.

The detailed Issue Resolution lifecycle, artifact structure, planning flow, and implementation contract remain to be designed separately.
