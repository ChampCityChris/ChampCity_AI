# Architect Review Addendum — WC16 Browser State and Viewport Clipping

This addendum corrects and supplements `ARCHITECT_REVIEW_WC16_final_product_convergence.md`.

## Corrected Finding 1 — Sign-In State Remains Simulated

The continuation did not remove simulated readiness. It replaced automatic readiness after page load with an Operator-controlled label.

`confirmArchitectSignedIn()` unconditionally sets:

```text
operator-confirmed-signed-in
```

The action verifies neither authentication nor usable ChatGPT access. It must not be treated as browser readiness, handoff readiness, MCP readiness, or acceptance evidence.

Because the application cannot safely inspect provider authentication state, it should report only observable technical states such as detached, loading, loaded, and load-failed. Human confirmation may be recorded as an observation, but it must not become workflow authority or a readiness gate.

## Corrected Finding 2 — Embedded ChatGPT View Is Vertically Clipped

The current renderer layout can place the browser host below a substantial header, workflow banner, action panel, and document controls. The host has a minimum height of 420 pixels without constraining the complete application shell to the Electron viewport.

The main process sets `WebContentsView` bounds directly from the host DOM rectangle. When `y + height` exceeds the Electron content area, the native view is clipped by the window. The embedded page still behaves as though it owns the full assigned height, so the visible viewport can omit the lower ChatGPT interface, including the composer.

Bounds are updated through `ResizeObserver` and window resize events, but not renderer scroll events. If the renderer document scrolls, the native view can cease to align with its DOM host.

Observed product result: the Operator cannot reliably reach the bottom of ChatGPT and therefore cannot use the embedded chat normally.

## Required Correction

The browser region must be fully contained within the visible Electron content area at all supported window sizes.

The implementation must:

- constrain the application shell to the viewport;
- allocate the remaining visible height to the workspace body;
- keep navigation/header regions outside that bounded body;
- give the local pane and Architect pane independent internal scrolling;
- ensure the browser host rectangle never extends below the Electron content area;
- update native bounds after resize, layout change, pane collapse/expansion, and any relevant scroll movement;
- verify that the ChatGPT composer and bottom controls are reachable in the running application.

A process-alive smoke, DOM host existence, or `ResizeObserver` registration does not prove this requirement.

## Disposition Effect

These are release-blocking WC16 defects. They reinforce the existing `RevisionRequested` disposition and further prohibit Operator validation.

## Document Disposition

Document.Status=Approved
