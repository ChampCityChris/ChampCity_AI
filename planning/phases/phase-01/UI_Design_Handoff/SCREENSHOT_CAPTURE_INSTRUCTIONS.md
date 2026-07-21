# Screenshot Capture Instructions

Screenshots were not captured during this Builder pass because the repo does not currently include lightweight screenshot tooling, and this pass must not add Playwright or another heavy screenshot dependency.

## How To Capture Current Screens Manually

1. From `<PROJECT_REPO>`, run:

```bash
npm start
```

2. Wait for the Electron app window titled `ChampCity A/I`.
3. Capture one screenshot for each navigation item listed below.
4. Save screenshots under this folder if you want them committed later:

```text
planning/phases/phase-01/UI_Design_Handoff/screenshots/
```

5. Suggested filenames:

- `01_ad_hoc_work_card_capture.png`
- `02_work_card_plan_review.png`
- `03_architect_prompt_composer.png`
- `04_risk_router.png`
- `05_builder_prompt_generator.png`
- `06_builder_report_capture.png`
- `07_human_validation.png`
- `08_phase_closeout.png`

## Required Screens To Capture

- Ad Hoc Work Card Capture
- Work Card Plan Review
- Architect Prompt Composer
- Risk Router
- Builder Prompt Generator
- Builder Report Capture
- Human Validation
- Phase Closeout

## Capture Notes

- Use the default app window size first.
- If possible, also capture a narrower window to show wrapping and density issues.
- Include visible warning, empty, or saved-success states if they are easy to produce.
- Do not include secrets, credentials, private tokens, or unrelated local files in screenshots.
- Do not claim screenshots exist unless image files have actually been saved.

## Document Disposition
Document.Status=Pending
