# Risks

## Known Risks And Drift Warnings

- The largest technical/product risk is MCP boundary design. Because ChampCity MCP is integral, the project must be precise about what ChatGPT can read, what it can write, where files are saved, and how the Operator sees or approves those changes.
- Subscription integration risk should be reframed. The primary concern is not whether ChatGPT can use an API. The intended Alpha path is ChatGPT subscription plus MCP-mediated repo access. The risk is whether this can be made understandable, safe, reliable, and repeatable for non-developer users.
- The project should guard against treating MCP as invisible magic. The user needs simple status indicators and plain-language explanations of what is connected, what files are being touched, and what action comes next.
- The project should guard against over-reliance on chat context. MCP should be used to ground Architect decisions in durable repo artifacts: project profile, phase state, work cards, Builder Reports, validation reports, and closeout records.
- The project must avoid scope drift into autonomy. The app should help the Operator drive the AI workflow; it should not silently become an autonomous coding agent.
- The workflow must avoid developer-first language where possible. “Capture,” “Frame,” “Plan,” “Build,” and “Prove” are better user-facing concepts than “requirements elicitation,” “architecture decomposition,” “implementation orchestration,” and “acceptance validation.”
- The project must avoid duplicate planning work. Since Phase 1 and Phase 2 already implemented core pieces, the next generator must inventory existing Builder Reports before proposing new work. Otherwise it will create redundant phase plans.
- The project must avoid state fragmentation. The app must keep durable profile, phase, work-card, prompt, handoff, validation, repair, closeout, and decision artifacts tied together. Raw chats alone are not sufficient.
- Security boundaries must remain explicit. API keys, subscription sessions, local repo access, MCP permissions, generated prompts, and build artifacts need separate treatment. The documents should not collapse those into one generic “AI integration” bucket.
- Architect / Implementer role separation must remain clear. The Architect frames, evaluates, decides repair/complete, and generates handoffs. The Implementer executes scoped build work and reports results. The Operator approves, validates, and controls movement between states.
- Phase 1 includes Builder Reports for work-card schema/rendering, work-card capture, Architect framing prompt composer, risk router, Builder prompt generation, Builder Report capture, human validation and repair loop, phase closeout/status management, Figma UI handoff, and UI/terminology alignment.
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
