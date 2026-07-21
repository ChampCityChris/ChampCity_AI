# Project Planning Workspace Definition

Status: confirmed by Operator
Project: ChampCity A/I
Lifecycle location: Project / Planning
Confirmed: 2026-07-21

## Purpose

Project Planning creates the two project-level planning documents:

```text
Project_Profile
Project_Roadmap
```

These documents are drafted by the LLM Architect from the approved Project Intake outputs.

## Required Inputs

The Project Planning workspace provides the Architect with:

- the approved Project Intake document;
- the approved Architect Interview document;
- repository review findings when the Project Intake reconciliation question was answered Yes;
- the saved Project Planning prompt.

The repository-backed artifacts are the durable source inputs. The chat session does not replace them.

## Workspace Experience

The workspace uses the embedded browser for the LLM Architect session.

The high-level layout must provide:

```text
Embedded Architect browser
+
Independent review views for Project_Profile and Project_Roadmap
+
One shared Project Planning disposition control
```

The Architect receives the Project Planning prompt and prior approved intake artifacts through the MCP integration, then drafts both planning documents into the repository.

The Operator must be able to review each repository-backed document independently from the same workspace without leaving the Project Planning context.

## Document Outputs

The workspace produces:

```text
planning/project/PROJECT_PROFILE.*
planning/project/Project_Roadmap/PROJECT_ROADMAP_<project>.*
```

Exact paths and naming remain subject to the existing project artifact conventions.

## Review and Shared Disposition

`Project_Profile` and `Project_Roadmap` are separate documents and must be separately readable and reviewable.

They are not separately approved. Project Planning uses one shared disposition decision applied to both documents as one planning bundle.

The workspace must support:

- independent preview of each document;
- clear indication that both documents have been reviewed;
- one shared approval, rejection, or revision-request action;
- revision notes that may identify problems in either or both documents;
- refreshed previews after the Architect revises one or both documents.

Applying a Project Planning disposition must write the same explicit disposition to both documents as one coordinated operation. The workspace must not leave one document approved while the other remains pending, rejected, or revision requested.

## Revision Behavior

A revision request applies to the Project Planning bundle.

The Operator may identify a problem in one document, but the Architect may determine that maintaining consistency requires revisions to both `Project_Profile` and `Project_Roadmap`.

The Architect is therefore authorized to revise either or both documents in response to the shared revision request. After revision, both documents return for Operator review together.

The durable repository documents, not the browser conversation, carry the shared disposition.

## Completion Boundary

Project Planning is complete only when:

- the Operator has reviewed both `Project_Profile` and `Project_Roadmap`; and
- the shared Project Planning disposition is `Approved` on both documents.

Approval of only one document is not a valid Project Planning state and cannot advance the lifecycle.

No separate bundle-approval artifact or hidden completion record is created. Completion is derived directly from the matching explicit dispositions on the two planning documents.

No implementation Work Card is created by this definition alone.

## Authority Boundary

This workspace does not introduce:

- a separate planning approval artifact;
- a hidden completion state;
- browser-chat authority over repository documents;
- independent approval authority for either planning document;
- approval queues, route tokens, role gates, or execution-run authority.

The two planning documents and their synchronized explicit dispositions remain the visible workflow evidence.

## Document Disposition

Document.Status=Approved
