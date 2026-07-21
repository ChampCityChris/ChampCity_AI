# Architect Interview Workspace Definition

Status: confirmed by Operator
Project: ChampCity A/I
Lifecycle location: Project / Intake

## Purpose

The Architect Interview workspace conducts the Architect-led project interview and produces the durable interview document that the Operator reviews before Project Intake can complete.

## Handoff Model

The Project Intake Capture workspace saves the Architect Interview Prompt in the repository.

ChampCity MCP then makes that saved prompt available to the embedded browser session and attaches it to the Architect chat. The Architect uses the prompt, the saved Project Intake document, and repository review access when reconciliation is required.

The embedded chat conducts the interview. The chat itself is not the durable project record.

## Workspace Layout

The workspace uses a dual-pane layout:

```text
Architect Interview Workspace
├── Embedded Architect chat
└── Repo-backed interview document preview and disposition
```

The chat pane supports the live interview between the Operator and the LLM Architect.

The document pane shows the current saved Architect Interview document from the repository. It refreshes as the Architect creates or revises that document through ChampCity MCP.

## Review and Revision

When the Architect indicates that the interview document is ready:

- the Operator reviews the document without leaving the workspace;
- the Operator may approve, reject, or request revision;
- a revision request returns the document to the Architect chat for correction;
- the revised repository document is shown again in the preview pane;
- the Operator may repeat review and revision until satisfied.

The document disposition is written to the interview document. No separate approval artifact or hidden approval state is created.

## Completion Rule

Project Intake is complete only when:

1. the Project Intake document has been captured;
2. the Architect Interview Prompt has been saved;
3. the Architect Interview has been conducted;
4. the final Architect Interview document exists in the repository;
5. the Operator has marked that interview document `Approved`.

After approval, control advances to Project / Planning and the Project Plan and Roadmap Review workspace.

## Reconciliation Behavior

When Project Intake indicates that existing source code or planning documents are present, the attached Architect Interview Prompt requires the Architect to review the repository before finalizing the interview document.

The resulting interview document incorporates the current-state findings needed to produce the Project Profile and Project Roadmap. A separate reconciliation workspace or reconciliation artifact is not required by default.

## Authority Boundary

- The embedded browser hosts the Architect conversation.
- ChampCity MCP provides the saved prompt, repository access, and durable document writes.
- The repository-backed interview document is the reviewable record.
- `Document.Status` on that document is the visible disposition.
- The chat session, browser state, or MCP transport does not independently authorize progression.

## Document Disposition

Document.Status=Approved
