# WIR-UX05B — Rebuild Routed Review, Repair, Close, and Acceptance Workspaces

**Status:** IMPLEMENTER_READY  
**Depends on:** WIR-UX05A  
**Type:** Generic Plan execution UX repair — second half

## Objective

Complete the routed Work Item loop using the established Review & Validation, Repair, Close/Next, and validation/acceptance interaction patterns.

## Governing invariant

Report review, Operator validation, Repair planning, closeout, and Phase/Plan acceptance are distinct user tasks with explicit evidence and disposition. They are not buttons appended below the Implement console.

## Exact implementation

### 1. Routed Review & Validation

Create `RoutedReviewValidationWorkspace.tsx`.

Reuse `OperatorValidationPresentation` and the evidence hierarchy from `WorkCardReportReviewWorkspace`.

Documents:

- Approved Work Card / Repair Work Card;
- Implementer Report.

Support existing advisory Architect review handoff, but keep it advisory.

Actions:

- review report disposition as required by current service;
- Validate Passed;
- Request Repair with defect text.

Embedded ChatGPT may be shown for advisory review using the established browser host; do not create another browser.

### 2. Routed Repair

Create `RoutedRepairWorkspace.tsx`.

Reuse `WorkCardRepairPresentation` interaction architecture:

- governing validation/report evidence;
- Repair Work Card document;
- embedded Architect;
- Prepare Handoff;
- Copy Handoff;
- Refresh;
- Repair Work Card disposition.

Use the existing routed repair draft owner. Do not introduce a second repair artifact model.

### 3. Close / Next

Create `RoutedCloseWorkspace.tsx`.

Model on `WorkCardCloseWorkspace`:

- current Work Item identity;
- close eligibility/reason;
- current checkpoint/evidence summary;
- Close Work Item;
- return to Work Item Map / next eligible Work Item.

Do not expose Close as an inline button on Review or Implement.

### 4. Acceptance Workspace

Create `RoutedAcceptanceWorkspace.tsx`.

Replace nested `AcceptancePanel`.

Requirements:

- clearly identify Plan versus Phase boundary;
- show acceptance criteria and existing evidence;
- capture criterion status/evidence paths;
- save evidence;
- explicit Approve / Request Revision after artifact exists;
- return to Work Item Map or Integration according to authoritative execution projection.

Use validation/closeout hierarchy; keep raw fingerprint hidden except optional detail.

### 5. Remove remaining execution monolith stages

After this card, `RoutedExecutionPanel` may contain only temporary Integration rendering pending WIR-UX06. It must not render Work Item lifecycle stages.

## Bounded continuation

Continue adapting read-only routed projections needed by the workspaces. Do not recreate Development document models in renderer state.

Do not stop because routed evidence has different domain IDs than legacy Work Cards; adapt presentation props.

## Validation

Extend routed workspace tests to prove:

- Review uses evidence/document selection and explicit validation;
- Repair mounts Architect and is a separate step;
- Close has its own workspace;
- eligible Phase/Plan acceptance opens Acceptance instead of inline criteria;
- close returns to map/next item;
- no lifecycle future-stage controls leak into the current Workspace.

Run existing OperatorValidationPresentation, Work Card Repair presentation, and close presentation tests affected by shared reuse.
