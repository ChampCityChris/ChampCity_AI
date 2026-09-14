# ChampCity A/I Desktop User Manual

ChampCity A/I Desktop organizes software work as repository-backed workflows. The human **Operator** chooses the work, approves plans, decides validation outcomes, and closes each lifecycle. The **Architect** helps frame and review work through embedded ChatGPT; the **Implementer** executes an approved card through Codex.

## Launch and choose a project

Open **ChampCity A/I** from its shortcut or Start Menu entry. The first page, **Choose where to begin**, offers two actions:

- **Open Existing Project** — select a project that already contains a ChampCity workflow and continue at its **Workflow Hub**.
- **Start New Project** — select a writable directory and begin with **Project Intake**.

ChampCity validates the selected directory. If selection fails, resolve the displayed path, access, or workflow error and choose again. Selecting a project gives the foreground workflow access to that directory; it does not automatically register the project for MCP clients.

## Use the Workflow Hub

The Workflow Hub currently provides:

- **Development** — “Plan, implement, review, and validate planned software development.” Select **Continue Development**.
- **Issue Resolution** — “Investigate and resolve problems in the current project baseline.” Select **Open Issue Resolution**.

Use the project name in the shell to confirm that the intended project remains selected. Use the Settings control to open **Settings → Agent Harness** without discarding the current workflow location; **Return** takes you back.

## Understand the Development workflow

The top project rail shows:

```text
Project Intake -> Architect Interview -> Project Planning -> Phase Map
  -> Phases -> Project Validation -> Project Close
```

The colored state and label beneath each step show whether it is available, in progress, completed, or needs attention. ChampCity derives the current required step from repository evidence; opening a later visual step does not bypass a missing prerequisite.

### Start a project

1. In **Project Intake**, complete the project questionnaire and choose the project repository when asked.
2. Submit the intake and review the resulting canonical document.
3. Continue to **Architect Interview**. Use the embedded ChatGPT pane to work with the Architect and confirm the interview summary.
4. Use the final-draft handoff controls when the interview is ready for formal output.
5. In **Project Planning**, review the project plan and roadmap drafts. Apply **Approved** only when the documents express the intended product and boundaries; use **Request Revision** with clear notes when they do not.
6. Review **Phase Map** to understand the ordered phases before entering the phase loop.

### Work through a phase

The **Phase Loop** uses **Phase Intake**, **Planning**, **Work Cards**, **Validation**, **Close**, and **Next Phase**.

Phase Intake and Planning frame the phase and its Work Card map. Review each generated document in the document panel, confirm its repository-relative path and effective disposition, and apply the appropriate review decision. **Next Phase** returns to the Phase Map after an accepted close.

### Work through a Work Card

The **Work Card Map** exposes only candidates eligible under current repository evidence. Select the required candidate, then follow:

1. **Planning** — prepare the Architect handoff, copy it into embedded ChatGPT, wait for the MCP-created draft, refresh, and review the formal Work Card. Approve it or request revision.
2. **Implement** — review the exact approved contract and Implementer Report target. Choose **Model** and **Reasoning** from the live Codex catalog. Resolve any environment preflight blocker, then start implementation.
3. Respond to any Codex approval request based on the plain-language impact and exact command or action shown. Do not approve work outside the card.
4. When execution finishes, complete the reserved Implementer Report if it is not already review-ready.
5. **Review & Validation** — inspect the Work Card, Implementer Report, validation evidence, and optional Architect advisory review. The Operator selects **Validate Passed** or enters a bounded defect and selects **Request Repair**.
6. **Repair** — prepare a repair handoff from the failed evidence, review the Repair Card, and run the current repair implementation through the same review boundary.
7. **Close / Next** — close only after the current validation record is approved. Return to the Work Card Map, where the next eligible card becomes available.

An Implementer completion state is not Operator acceptance. The repository's validation and close records are the durable state and evidence.

## Work with the Architect

Architect workspaces pair a document/evidence view with embedded ChatGPT. The normal sequence is:

1. Select **Prepare Handoff**.
2. Select **Copy Handoff**.
3. Paste and send the copied prompt in embedded ChatGPT.
4. If prompted, sign in to ChatGPT in the embedded page.
5. Let the authorized MCP tools create the temporary draft at the requested repository-relative path.
6. Select **Refresh**, review the draft and its source context, then apply **Approved** or **Request Revision**.

Do not paste secrets into the Architect conversation. Direct final Architect-output import is retired; a ChatGPT answer shown in the browser is not a canonical project document until the governed MCP draft and review path completes.

Use **Reload ChatGPT** for a page-load or sign-in problem and **Retry Browser** for a failed embedded-surface attachment. Browser sign-in and MCP OAuth authorization are separate states.

## Work with the Implementer

The Implementer uses the managed Codex runtime and exact selected project context. Before **Start** is available:

- the current Work Card or Fix Card must be approved;
- the Implementer Report path must be reserved;
- the managed runtime and model catalog must be available;
- an explicit **Model** and **Reasoning** selection must be saved;
- required development-environment preflight must be ready.

The execution view reports runtime state, working directory identity, model/reasoning, policy, approvals, tool activity, failure, cancellation, and completion. **Environment Resolution** is a separate run; finishing it does not mean the Work Card implementation has run.

## Use Issue Resolution

Issue Resolution keeps defect work separate from the Development lifecycle.

### Create an Issue

1. Open **Issue Resolution** and remain on **Intake**.
2. Enter the Issue title, problem, current consequence, needed capability, and discovery context.
3. Optional: paste screenshot evidence anywhere in the form. The **Screenshot Evidence** panel accepts PNG, JPEG, or WebP images, shows pending previews, and allows removal before submission. The maximum is four screenshots; there is no arbitrary file-upload control.
4. Select the create action. Wait for completion before pasting additional screenshots.
5. Select the new Issue from the inventory and continue to its current stage.

### Plan, fix, validate, and close

The parent rail is:

```text
Intake -> Architect Planning -> Issue Planning -> Fix Cards -> Issue Validation -> Issue Close
```

1. In **Architect Planning**, prepare/copy the investigation handoff, review the MCP-created draft, and apply the Architect review disposition.
2. In **Issue Planning**, review the Issue Resolution Plan and Fix Card Plan.
3. In **Fix Cards**, follow **Fix Card Map → Planning → Implement → Review & Validation → Repair → Close / Next** for each eligible card.
4. In **Issue Validation**, decide the aggregate Issue outcome. A remaining bounded defect returns to corrective Issue Planning; a resolved outcome enables **Issue Close**.
5. In **Issue Close**, record the final Operator decision. Completion returns to the Workflow Hub.

## Settings and Background Agent controls

Open **Settings → Agent Harness** for operational controls.

The top controls are:

- **Start MCP Runtime**, **Stop MCP Runtime**, and **Restart MCP Runtime** — control MCP inside the existing Background Agent.
- **Start Background Agent** or **Exit Background Agent** — start or terminate the entire background service for this Windows user.
- **Restart Background Agent** — replace the Service Host and worker, including when a different build generation is running.
- **Start Background Agent for my Windows user at sign-in** — save the user's startup preference.
- **Refresh** — re-read lifecycle, endpoint, registration, workspace, OAuth authorization, and recent-activity state.

**Exit Background Agent** is broader than **Stop MCP Runtime**. Stop MCP leaves the Service Host and tray available so MCP can be started again. Exit removes the tray and records an intentional stop until the user starts the agent or launches the foreground app again.

The configuration form also exposes **Start MCP Runtime when Background Agent starts**, **Host**, **Port**, **Public Base URL**, and **Authentication**. Keep the default loopback host and **OAuth required** unless a known local integration requires a different supported setting. **Local unauthenticated** cannot be combined with a public base URL.

Under **Registered MCP Projects**, select **Add Project** to register MCP access for a project. Use **Remove** to revoke that registration. MCP callers must use the exact displayed `workspaceId`.

## Interpret common states

- **Ready** — Service Host and worker are healthy.
- **Stopped** or MCP `stopped` — the agent may be present, but the MCP HTTP runtime is not serving; select **Start MCP Runtime**.
- **Stopped by user** — select **Start Background Agent** to clear the intentional stop.
- **Recovering** — wait briefly, then select **Refresh**; the Service Host is reconciling the worker.
- **Degraded** or **Unavailable** — read the error and Diagnostics, then use the bounded recovery in [Troubleshooting](TROUBLESHOOTING.md).
- **Background Agent update required** or **restart-required** — select **Restart Background Agent** before MCP-dependent handoffs.
- Registered project **unavailable** — reconnect the project at its original location or remove and add the correct project again.

## Close the window and uninstall

Closing the ChampCity window exits the foreground application but deliberately leaves a healthy Background Agent running. Use the tray's **Exit Background Agent** when you also want to stop background operation.

Uninstall removes the program and applicable sign-in registration but preserves per-user ChampCity application data, credentials, registered projects, and project repository files. See [Installation and Uninstall](INSTALLATION_AND_UNINSTALL.md) before removing or changing install scope.
