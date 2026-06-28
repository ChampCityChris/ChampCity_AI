# Release Policy

## Git Commit Rules

- Use local Git history for meaningful work checkpoints.
- Commit only files created or modified for the approved pass.
- Do not include secrets, local `.env` files, dependency folders, build output, logs, or unrelated changes.

## Tag Naming Rules

- Use annotated local tags for MVP release milestones.
- Do not move or recreate an existing tag without explicit operator approval.

## GitHub Push Rules

- Push commits and tags only when a remote is configured and credentials are already available.
- Do not print, request, or store credentials.
- If no remote is configured, record the remote URL decision in `planning/project/OPEN_QUESTIONS.md`.

## MVP Release Tag Plan

- `v0.1.0-foundation`: project memory, planning scaffold, Electron + TypeScript shell, and design document updates.
- `v0.2.0-work-card-schema`: Work Card schema, Markdown renderer, and file path rules.
- `v0.3.0-capture-frame-review`: capture form, framing workflow, save, and review.
- `v0.4.0-builder-prompt-flow`: risk router, Builder prompt generator, and plan capture.
- `v0.5.0-validation-repair-closeout`: Builder report capture, validation, repair, closeout, and project-memory update.
- `v1.0.0-mvp`: complete MVP done definition.
