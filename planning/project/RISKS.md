<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/project/supporting_document/RISKS",
  "artifactType": "supporting_document",
  "createdAt": "2026-07-14T00:00:00.000Z",
  "jsonPath": "planning/project/RISKS.json",
  "markdownPath": "planning/project/RISKS.md",
  "payload": {
    "kind": "supporting_document",
    "title": "Risks"
  },
  "payloadHash": "sha256:8d32ce3f67a0d9ce6a583a614b46e099bd8930e74745c67a36414b4510c80463",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [],
    "sources": [],
    "supersedes": []
  },
  "revision": 2,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-14T00:00:00.000Z"
}
-->

# Risks

## Known Risks And Drift Warnings

- WC08 artifact authority risk: draft next-phase planning artifacts can be mistaken for active phase scope unless Project Roadmap, Phase Map, Phase Planning Documents, Work Card Plans, Formal Work Cards, Implementer Execution Packets, reports, validation, and closeout each show their distinct authority.
- WC08 activation risk: a Work Card Plan can look executable unless it is clearly labeled Pending Review / Not Active and Formal Work Cards require a separate Operator approval step.
- WC08 review-surface risk: proposed Work Card Plan entries can be mistaken for formal Work Cards unless Work Card Plan Review labels them Proposed / Not Executable and keeps materialization actions disabled until a separate Operator-approved workflow exists.
- WC08 ad hoc authority risk: Ad Hoc Work Card Capture can conflict with header-selected Work Card context unless the UI states that local manual/ad hoc fields are authoritative for new drafts.
- The largest technical/product risk is MCP boundary design. Because ChampCity MCP is integral, the project must be precise about what ChatGPT can read, what it can write, where files are saved, and how the Operator sees or approves those changes.
- Subscription integration risk should be reframed. The primary concern is not whether ChatGPT can use an API. The intended Alpha path is ChatGPT subscription plus MCP-mediated repo access. The risk is whether this can be made understandable, safe, reliable, and repeatable for non-developer users.
- The project should guard against treating MCP as invisible magic. The user needs simple status indicators and plain-language explanations of what is connected, what files are being touched, and what action comes next.
- The project should guard against over-reliance on chat context. MCP should be used to ground Architect decisions in durable repo artifacts: project profile, phase state, work cards, Implementer Reports, validation reports, and closeout records.
- The project must avoid scope drift into autonomy. The app should help the Operator drive the AI workflow; it should not silently become an autonomous coding agent.
- WC07 phase planning risk: the app must not treat existing phase folders as the only selectable future phases. The Phase Map is the selectable phase authority, while generated phase artifacts are context.
- The workflow must avoid developer-first language where possible. “Capture,” “Frame,” “Plan,” “Build,” and “Prove” are better user-facing concepts than “requirements elicitation,” “architecture decomposition,” “implementation orchestration,” and “acceptance validation.”
- The project must avoid duplicate planning work. Since Phase 1 and Phase 2 already implemented core pieces, the next generator must inventory existing Implementer Reports before proposing new work. Otherwise it will create redundant phase plans.
- The project must avoid state fragmentation. The app must keep durable profile, phase, work-card, prompt, handoff, validation, repair, closeout, and decision artifacts tied together. Raw chats alone are not sufficient.
- Security boundaries must remain explicit. API keys, subscription sessions, local repo access, MCP permissions, generated prompts, and build artifacts need separate treatment. The documents should not collapse those into one generic “AI integration” bucket.
- Architect / Implementer role separation must remain clear. The Architect frames, evaluates, decides repair/complete, and generates handoffs. The Implementer executes scoped build work and reports results. The Operator approves, validates, and controls movement between states.
- Phase 1 includes Implementer Reports for work-card schema/rendering, work-card capture, Architect framing prompt composer, risk router, Implementer execution packet generation, Implementer Report capture, human validation and repair loop, phase closeout/status management, Figma UI handoff, and UI/terminology alignment.
- Security concerns:
- Basic security safeguards for local repo access and API-key handling.
- ### G. MCP Integration, Repo-Bridge Workflow, and Security Boundary Design
- This phase should define the repo bridge, MCP status model, read/write boundaries, Operator visibility, safe artifact writes, fallback behavior, and security posture.
- ## 7. Risks and Drift Warnings
- Security or data concern: model API integration will require strict security to not be exposed in source code or final build packaging
- Known constraint: ChatGPT subscriptions prevent the use of API for wiring the model directly into the application.

## Risk Handling Notes

- Keep renderer filesystem access mediated through Electron main/preload IPC.
- Do not add provider SDKs, auth, databases, cloud services, MCP, or connector integrations without a dedicated approved Work Card.
- Operator manual validation remains required for acceptance and closeout decisions.
