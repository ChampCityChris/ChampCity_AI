# RMCP-REPAIR03A — Repair Forgejo Connection and Authentication Settings

**Classification:** Renderer / provider configuration defect  
**Priority:** High  
**Parent:** RMCP project-independent Forgejo tooling  
**Status:** Ready for Implementer  
**Scope:** Forgejo application Settings configuration/authentication only

## Objective

Make the existing Forgejo provider configuration and credential-storage implementation actually usable through ChampCity A/I Settings.

Do not redesign Forgejo hosting, Git authentication, repository management, or the MCP provider architecture.

The underlying provider adapter, secure credential store, Git HTTP credential projection, and `integration_toolbox` Forgejo implementation already exist and must be reused.

## Observed failure

The Operator attempted to configure the Forgejo provider through the current ChampCity Settings UI.

The current screen renders approximately as:

`Provider IDForgejo API base URLhttps://... Namespacechampcitychris ... Save connection`

with no visible input boundaries.

The token row displays:

`Forgejo API token`

with no visible entry control.

Attempting to save produces:

`Connection could not be saved. Refresh settings and check the fields.`

Authentication remains disabled.

## Root Cause 1 — Forgejo controls are not styled as Settings controls

`ApplicationSettingsWorkspace.tsx` correctly mounts:

`<ForgejoProviderSettings />`

However, `ForgejoProviderSettings.tsx` renders a bare:

`<form>`

and bare `<label><input ... /></label>` controls.

Existing settings input styling is scoped primarily to:

`.agent-harness-settings-form input`  
`.agent-harness-settings-form select`  
`.agent-harness-settings-form button`

The Forgejo form does not use that class.

Consequently the browser falls back to nearly unstyled controls inside the dark panel.

This makes:

- text inputs visually merge with labels;
- empty inputs effectively invisible;
- `Save connection` visually resemble plain text;
- optional fields indistinguishable from values;
- disabled token input appear absent.

## Root Cause 2 — Provider ID validation and UI behavior disagree

The Forgejo validator currently requires:

`^[a-z][a-z0-9_-]{0,63}$`

The UI allows arbitrary typed case and only calls `.trim()` before saving.

Therefore a value such as:

`Forgejo`

is sent unchanged and rejected.

There is no field-level indication that the provider ID must be lowercase.

The provider ID is an internal canonical identifier and the existing implementation already only permits lowercase identifiers, so the UI should canonicalize it rather than require the Operator to discover that constraint.

## Root Cause 3 — API URL requirements are hidden

`validateForgejoHostingConfiguration()` requires a credential-free URL whose path ends in Forgejo's API route, e.g.:

`https://forgejo.example.com/api/v1`

A normal server root such as:

`https://forgejo.example.com`

is rejected.

The UI provides no helper text explaining this requirement and no field-specific validation response.

Do not silently append `/api/v1`, because valid installations may use a URL subpath.

Instead, display the required format explicitly and surface the validation failure against that field.

## Root Cause 4 — Renderer destroys useful errors

`ForgejoProviderSettings.save()` currently catches every save failure and emits only:

`Connection could not be saved. Refresh settings and check the fields.`

Likewise authentication/status failures collapse into:

`Authentication or connection verification could not complete...`

This prevents the Operator from distinguishing:

- invalid provider ID;
- malformed API URL;
- insecure HTTP policy failure;
- invalid namespace;
- stale configuration CAS;
- missing credential;
- authentication failure;
- unreachable provider.

The application already has typed application errors. The Settings path must preserve a safe, user-actionable representation of them.

## Required Repair

### 1. Give Forgejo Settings a dedicated form layout

Do not reuse a six-column application-wide form blindly.

Add a scoped class, for example:

`repository-hosting-form`

Render the connection form as a clean responsive grid.

Recommended desktop structure:

- Provider ID
- API base URL
- Namespace
- Namespace type
- Preferred Git transport
- Expected SSH host
- Expected SSH port
- HTTP API policy
- HTTP Git policy
- Save connection

At narrow widths collapse to one column.

All fields must have visible:

- border;
- background;
- padding;
- focus state;
- disabled state;
- label separation.

### 2. Correct label markup

Do not render:

`<label>Provider ID<input ... /></label>`

Use explicit structured labels equivalent to:

`<label><span>Provider ID</span><input ... /></label>`

Apply the same structure to every Forgejo field.

This should visually produce:

Provider ID  
[ forgejo ]

rather than:

`Provider IDforgejo`

### 3. Make Save connection unmistakable

`Save connection` must use the normal Settings button styling.

It must:

- be visually recognizable as a button;
- show disabled state clearly;
- show pending state while saving;
- not be concatenated onto checkbox text.

### 4. Canonicalize provider ID

At the application configuration boundary, normalize provider ID by:

- trimming;
- converting to lowercase.

Example:

`Forgejo` → `forgejo`

The canonical value returned by the save operation becomes the renderer value.

Still reject characters outside the existing bounded identifier grammar.

Do not silently alter owner/namespace casing unless existing provider semantics explicitly require it.

### 5. Improve API URL UX

Label the field:

`Forgejo API base URL`

Provide helper text such as:

`Use the Forgejo API endpoint, for example https://forgejo.example.com/api/v1`

Do not automatically guess installation subpaths.

Validate before or during save and show a specific message if the API path is invalid.

### 6. Make token input visibly present

The authentication area must contain an obvious password input.

Equivalent layout:

Forgejo API token  
[ ••••••••••••••••••• ]

The field may remain disabled until a connection has been successfully persisted, but when disabled it must remain visibly an input.

When disabled, provide explicit explanatory text:

`Save the connection before adding authentication.`

Do not make the field visually disappear.

### 7. Correct authentication-state flow

After a successful connection save:

- update `settings`;
- update `editingId`;
- update canonical `draft`;
- recompute `savedSelection`;
- enable the token input;
- retain a clear status such as `Connection saved — authentication required`.

After token entry:

- enable `Save authentication`.

After successful credential save:

- clear token from renderer memory;
- call provider status;
- display authenticated identity/readiness.

Expected sequence:

`New connection`
→ `Save connection`
→ `Authentication required`
→ enter token
→ `Save authentication`
→ `Check connection`
→ `Ready / authenticated as <login>`

### 8. Surface bounded application errors

Do not expose stack traces, filesystem paths, secrets, or raw IPC internals.

But preserve safe application error meaning.

Examples:

- `Provider ID must contain lowercase letters, numbers, _ or -.`
- `Forgejo API URL must identify an /api/v1 endpoint.`
- `HTTP API requires explicit insecure-HTTP permission.`
- `Namespace is invalid.`
- `Connection settings changed. Refresh before saving.`
- `Authentication token is required.`
- `Authentication failed or does not match the configured namespace.`
- `Forgejo could not be reached.`

Prefer a small typed error/result contract over parsing arbitrary Electron exception strings in the renderer.

### 9. Preserve credential security

Do not change the current credential architecture.

The token must continue to:

- travel only from Settings renderer → preload IPC → credential handler;
- be written to `WindowsRepositoryHostingCredentialStore`;
- never be persisted in `providers.json`;
- never be exposed through MCP;
- never be embedded in Git remote URLs;
- never appear in application logs/status/error text;
- be cleared from renderer state after save attempt.

### 10. Preserve configuration CAS

Continue requiring:

`expectedConfigurationId`

for connection/credential mutations.

Do not remove stale-write protection to make the UI easier to use.

If stale state occurs, tell the Operator to refresh and retry.

## Specific Current Configuration Qualification

Use the following **non-secret** values during manual qualification:

- Provider ID: `forgejo`
- API base URL: `https://forgejo.atomic-forge.net/api/v1`
- Namespace: `champcitychris`
- Namespace type: `user`
- Preferred Git transport: `https`
- Allow HTTP API: false
- Allow HTTP Git transport: false

Do not put the real Forgejo token in source, fixtures, screenshots, reports, logs, or work-card evidence.

The Operator will enter the real token manually after the UI is fixed.

## Acceptance Criteria

1. Forgejo Settings displays every input with visible control chrome.
2. Labels and values do not run together.
3. The panel remains usable at normal desktop width and narrow-width layout.
4. `Save connection` is an obvious button.
5. `Forgejo` entered as provider ID is canonicalized to `forgejo`.
6. Invalid provider-ID characters produce a specific field/actionable error.
7. A server root missing `/api/v1` produces a specific API URL error.
8. A correct API URL saves successfully.
9. Successful save persists provider metadata.
10. Persisted metadata contains no token.
11. After save, the API-token password field becomes enabled and remains visibly recognizable.
12. Empty token keeps `Save authentication` disabled with an explicit reason.
13. Entering a token enables `Save authentication`.
14. Successful authentication clears the token field immediately.
15. Token is stored only in secure credential storage.
16. `Check connection` reports the authenticated Forgejo identity.
17. `integration_toolbox.provider_status({providerId:"forgejo"})` reports `ready` after configuration/authentication.
18. A bad token produces an authentication-specific error rather than generic save failure.
19. Namespace/account mismatch produces a bounded specific error.
20. Configuration CAS conflict produces a refresh/retry message.
21. No token appears in renderer messages, provider status, application logs, persisted JSON, MCP output, or test snapshots.
22. Existing GitHub Settings remain unchanged.
23. Existing Agent Harness Settings styles remain unchanged except for intentionally shared control tokens/classes.
24. Existing Forgejo API/Git authentication tests remain green.

## Required Tests

Extend existing renderer/provider tests rather than creating another sprawling suite.

Test:

- Forgejo form renders all visible controls.
- password field exists and is styled.
- Save connection is a button.
- canonical lowercase provider ID.
- valid `/api/v1` save.
- invalid API URL message.
- invalid provider ID message.
- stale configuration error.
- authentication control enable/disable transition.
- credential save IPC call.
- token renderer-state clearing.
- credential never persisted in provider settings.
- provider status after successful authentication.
- invalid token response.
- responsive form class exists and uses one-column fallback.
- existing GitHub settings regression.

Add a rendered Settings assertion that specifically prevents the original regression: Forgejo inputs must receive a settings-control class or be covered by the scoped repository-hosting form selectors.

## Manual Acceptance

Build and run the repaired desktop.

Navigate to Settings → Forgejo repository hosting.

Confirm visually:

- every field has an obvious input/select;
- no text runs together;
- Save connection is a visible button.

Enter:

`forgejo`  
`https://forgejo.atomic-forge.net/api/v1`  
`champcitychris`  
`user`  
`https`

Save connection.

Expected:

`Connection saved — authentication required.`

Paste the Operator's real token into the visible password field.

Click:

`Save authentication`

Then:

`Check connection`

Expected:

- readiness `ready`;
- authenticated identity shown;
- password field cleared;
- token never redisplayed.

Finally verify through MCP:

`integration_toolbox.provider_status({providerId:"forgejo"})`

must report configured + ready.

Do not perform a repository mutation as part of UI acceptance.

## Non-Goals

Do not:

- redesign Forgejo provider architecture;
- add tokens to MCP;
- add plaintext credential storage;
- bypass configuration CAS;
- register projects/workspaces;
- change Git remote ownership;
- implement release/build orchestration;
- alter GitHub provider behavior;
- hardcode Atomic Forge into product code.

## Implementer Report

Return:

- exact RCA;
- files changed;
- UI before/after behavior;
- validation normalization changes;
- safe error-contract changes;
- tests run/results;
- proof that no credential persisted outside secure storage;
- checkpoint commit.

Do not include the real Forgejo token.

## Stop Condition

Checkpoint this repair only and return for Architect review.
