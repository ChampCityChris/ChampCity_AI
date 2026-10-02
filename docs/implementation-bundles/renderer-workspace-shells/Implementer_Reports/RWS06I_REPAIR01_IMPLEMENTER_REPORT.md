# RWS06I-REPAIR01 Implementer Report

## Summary

- Card: RWS06I-REPAIR01 — Restore Valid UTF-8 Close / Advance Renderer Sources.
- Repository root verified as the active `Dev` checkout; branch `dev` has no upstream tracking ref shown by `git branch -vv`.
- Root cause confirmed: malformed bytes decoded as U+FFFD in presentation separators in the two Close / Advance TSX files.
- Normalized the loading text to `...`, metadata fields to ` | `, the next destination separator to ` - `, and criterion fields to ` | `.
- No lifecycle code, callbacks, identity handling, tests, or service contracts changed.

## Files changed

- `src/renderer/app/CloseAdvanceShell.tsx`
- `src/renderer/app/CloseAdvanceWorkspace.tsx`
- This report.

Existing test files were reused unchanged. No new permanent tests were added; the existing renderer shell and SQL lifecycle owners cover the behavior.

## Proof and validation

- Strict byte decoding with `TextDecoder("utf-8", {fatal: true})` succeeded for both repaired production files; explicit decoded-text search confirmed neither contains U+FFFD.
- `node --test --test-name-pattern="Close Advance shell renders exact SQL eligibility" test/renderer/workflow-hub-shell.test.cjs` — normal Windows lane, **1 passed**.
- `node --test --test-name-pattern="SQL Close Advance traverses WorkItems, dependent Phases and Project closure without closeout files" test/phase-planning/phase-planning-service.test.cjs` — normal Windows lane, **1 passed**; existing RWS06I lifecycle proof ran unchanged.
- `npm run build` — restricted lane reached Vite then returned `spawn EPERM`; rerun once in the normal Windows lane, passed TypeScript and Vite production build. Vite reported its existing large-chunk advisory. No build behavior change was made.
- `npm run validate:plan -- --profile repair --changes tmp/changes-rws06i-repair01.json` — blocked before planning because the repository validation catalog does not exactly cover executable tests; it includes the already removed `test/renderer/architect-interview-refresh-state.test.cjs` as an unowned test.
- `npm run test:repair -- --changes tmp/changes-rws06i-repair01.json` — same catalog mismatch; profile did not execute.
- `git diff --check` — passed; Git emitted line-ending advisories for pre-existing dirty files.

## Safety and Git

- The two changed source files were inspected directly. No secrets or local machine paths were added. No dependencies, generated build output, or unrelated files are part of this repair's intended scope.
- Required checkpoint commit: `RWS06I-R01 restore close advance UTF-8 source integrity` (hash to be recorded after commit).
- Focused renderer and SQL lifecycle proofs pass. The composed repair profile remains blocked by the unrelated validation catalog mismatch described above.

## Handoff

After this bounded repair, return to the existing RWS06 bundle/J qualification workflow. No additional operator validation is required for this textual source-integrity repair.
