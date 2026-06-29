# Current UI Inventory

## Shared Shell

The renderer uses a single React entry point with top navigation for seven screens. The app title comes from preload as `ChampCity A/I`. Most screens use a two-column pattern: a selector or capture panel on the left and a preview, review, or editor panel on the right.

Current visual risks:

- Navigation labels are long and wrap under tighter widths.
- Most workflows feel like forms plus raw Markdown preview.
- Warning, notice, error, and saved states are readable but utilitarian.
- The current light palette does not match the requested dark, consumer-friendly direction.

## New Work Card

What it does:

- Captures Operator intent and creates a draft Work Card.
- Generates a Markdown preview before save.
- Saves paired JSON and Markdown artifacts for app workflows and durable planning records.

Main inputs:

- Work Card ID.
- Title.
- Phase.
- Risk Level.
- Problem.
- Importance.
- User outcome.
- Included scope.
- Out of scope.
- Known files, screens, or systems.
- Evidence or examples.
- Risks.
- Operator notes.

Main outputs:

- Markdown preview.
- Saved JSON path.
- Saved Markdown path.
- Status message.

Saved artifact folder:

- `planning/phases/<phase-folder>/Work_Cards/`

Important validation and warning behavior:

- Required fields block preview/save when missing.
- Work Card ID and phase are constrained to safe values in shared/main logic.
- Draft status is `ready_for_architect`.
- Existing generated files are not silently overwritten.

UI pain points or clutter risks:

- Many text areas appear at once.
- Preview uses raw Markdown as the main right-side experience.
- The distinction between intent capture and Builder-ready work could be more emotionally clear.

Must remain functionally accessible:

- All current fields.
- Preview Markdown.
- Save paired JSON and Markdown.
- Saved path feedback.
- `ready_for_architect` status visibility.

## Architect Prompt Composer

What it does:

- Lists saved Work Card JSON files.
- Generates an Architect framing prompt for a selected Work Card.
- Supports copying and saving the prompt.

Main inputs:

- Phase.
- Saved Work Card JSON file.

Main outputs:

- Selected Work Card summary.
- Architect prompt preview.
- Copy result message.
- Saved Markdown path.

Saved artifact folder:

- `planning/phases/<phase-folder>/Architect_Prompts/`

Important validation and warning behavior:

- Only JSON Work Card artifacts are selectable.
- Invalid or skipped Work Card files are shown.
- Empty Work Card list shows a clear empty state.
- A warning appears when selected Work Card status is not `ready_for_architect`.
- Save is blocked until a Work Card is selected.

UI pain points or clutter risks:

- Long selector labels mix ID, title, status, and phase.
- Prompt preview is raw Markdown/text and can dominate the screen.
- Status warnings are correct but could feel more graceful.

Must remain functionally accessible:

- Phase selection.
- Saved Work Card JSON selection.
- Invalid file warnings.
- Work Card summary.
- Copy prompt.
- Save prompt.

## Risk Router

What it does:

- Runs deterministic risk routing against a selected Work Card.
- Shows assessed risk, flagged categories, matched terms, scope-creep signals, and Architect review questions.
- Saves a Risk Review Markdown artifact.

Main inputs:

- Phase.
- Saved Work Card JSON file.

Main outputs:

- Selected Work Card summary.
- Risk review details.
- Saved Markdown path.

Saved artifact folder:

- `planning/phases/<phase-folder>/Risk_Reviews/`

Important validation and warning behavior:

- Empty Work Card list is handled.
- Invalid or skipped Work Card files are shown.
- High-risk assessments show a warning not to send directly to Builder until Architect review.
- Low-risk assessments still state normal Architect review is required.
- Risk Review does not modify or approve a Work Card.

UI pain points or clutter risks:

- Flagged category details can become dense.
- Matched terms and Architect questions are useful but visually noisy.
- Risk level needs stronger hierarchy than a small badge.

Must remain functionally accessible:

- Work Card selection.
- Assessed risk.
- Flagged categories and matched terms.
- Scope-creep signals.
- Architect review questions.
- Save Risk Review.

## Builder Prompt Generator

What it does:

- Generates a Builder-ready prompt from a selected Work Card and optional supporting artifacts.
- Lets the Operator include Work Card Markdown, Architect Prompt, Risk Review, and prior Builder Report context.
- Supports copy and save.

Main inputs:

- Phase.
- Saved Work Card JSON file.
- Optional Work Card Markdown artifact.
- Optional Architect Prompt artifact.
- Optional Risk Review artifact.
- Optional prior Builder Report artifact.

Main outputs:

- Missing supporting artifact notes.
- Selected Work Card summary.
- Generated Builder prompt preview.
- High-risk or missing-risk-review warnings.
- Copy result message.
- Saved Markdown path.

Saved artifact folder:

- `planning/phases/<phase-folder>/Builder_Prompts/`

Important validation and warning behavior:

- Invalid supporting files are shown.
- Missing matching artifacts produce notes but do not block generation.
- Missing Risk Review context produces warning language.
- High-risk context produces warning language.
- Save is blocked until a Work Card is selected.

UI pain points or clutter risks:

- Four artifact selectors make this screen feel technical.
- Generated prompt can be long and raw.
- Missing-artifact and high-risk warnings compete for attention.

Must remain functionally accessible:

- Artifact selector defaults and manual override.
- Warning states.
- Copy prompt.
- Save Builder Prompt.
- Generated prompt preview with enough functional labels for Codex.

## Builder Report Capture

What it does:

- Captures Builder Report text by paste or `.md`/`.txt` import.
- Validates report structure lightly.
- Generates a Builder Report filename.
- Saves the report under the phase Builder Reports folder.

Main inputs:

- Phase.
- Report type: Work Card, Fix, Repair, or Other.
- Optional saved Work Card JSON file.
- Topic.
- Imported or pasted Builder Report Markdown.

Main outputs:

- Generated filename.
- Detection summary for commit hash, validation results, blocking questions, and recommended next task.
- Validation warnings.
- Saved Markdown path.

Saved artifact folder:

- `planning/phases/<phase-folder>/Builder_Reports/`

Important validation and warning behavior:

- Work Card report type expects a saved Work Card JSON artifact.
- Empty report text cannot be saved.
- Imperfect non-empty reports may still save with warnings.
- Existing report files are not silently overwritten.
- Invalid Work Card files are shown.

UI pain points or clutter risks:

- Large paste field feels like a utility screen.
- Detection summary is useful but visually administrative.
- File import and report type fields need cleaner grouping.

Must remain functionally accessible:

- Report type selection.
- Topic.
- Paste/import report text.
- Validation warnings.
- Generated filename.
- Save Builder Report.

## Human Validation

What it does:

- Captures Operator validation results for a Work Card after Builder work.
- Optionally links a Builder Report.
- Extracts manual validation checklist text from the selected Builder Report.
- Saves validation JSON and Markdown.
- Generates and saves a Repair Prompt when validation result or Operator decision requires repair.

Main inputs:

- Phase.
- Saved Work Card JSON file.
- Optional Builder Report Markdown file.
- Validation result.
- Tested items.
- Passed items.
- Failed items.
- Evidence references.
- Screenshot or file references.
- Commands run.
- Observed errors.
- Additional observations.
- Operator decision.
- Recommended next action.

Main outputs:

- Builder Report warning when none is selected.
- Manual validation checklist preview.
- Validation Markdown preview.
- Repair Prompt preview when applicable.
- Saved validation JSON path.
- Saved validation Markdown path.
- Saved Repair Prompt path when generated.

Saved artifact folders:

- `planning/phases/<phase-folder>/Validation_Reports/`
- `planning/phases/<phase-folder>/Repair_Prompts/`

Important validation and warning behavior:

- Requires a saved Work Card JSON artifact.
- Missing Builder Report warns that the evidence chain is incomplete but does not block saving.
- Different-problem decisions guide the Operator to open a new Work Card.
- Repair Prompt generation follows deterministic result/decision rules.
- Validation records are non-mutating.

UI pain points or clutter risks:

- This is the densest form in the app.
- Repair prompt preview can make the screen feel busy.
- Evidence fields need hierarchy so the Operator knows what matters most.

Must remain functionally accessible:

- Builder Report association.
- Manual checklist extraction.
- All validation/evidence fields.
- Repair Prompt generation state.
- Validation save.
- Repair Prompt save when generated.

## Phase Closeout

What it does:

- Summarizes Phase 1 artifacts.
- Shows artifact counts, file names, Work Card JSON/Markdown pairing status, warning observations, and deterministic recommendation.
- Captures an Operator phase closeout decision.
- Saves closeout JSON and Markdown.

Main inputs:

- Phase.
- Closeout decision.
- Closeout summary.
- Completed items.
- Remaining items.
- Known risks.
- Operator notes.
- Recommended next action.

Main outputs:

- Artifact counts.
- Artifact filenames.
- Work Card pairing status.
- Missing or warning observations.
- Deterministic recommendation.
- Closeout Markdown preview.
- Saved JSON path.
- Saved Markdown path.

Saved artifact folder:

- `planning/phases/<phase-folder>/Closeout_Reports/`

Important validation and warning behavior:

- Phase folders are constrained.
- Artifact reads are limited to approved phase artifact folders and expected extensions.
- Warnings are not treated as hard blockers.
- Closeout record is non-mutating.
- Existing closeout reports are not silently overwritten.

UI pain points or clutter risks:

- Artifact inventory can overwhelm the decision form.
- Counts, filenames, pair status, warnings, and recommendation need clearer hierarchy.
- Closeout should feel like a confident checkpoint, not an audit spreadsheet.

Must remain functionally accessible:

- Artifact summary.
- Work Card pairing.
- Missing/warning observations.
- Deterministic recommendation.
- Decision fields.
- Closeout preview.
- Save closeout JSON and Markdown.
