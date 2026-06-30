# Project Architect Interview Prompt: ChampCity A/I

## Source Project Intake

Project Intake ID: PROJECT_INTAKE_champcity_a_i
Project Name: ChampCity A/I
Source JSON: PROJECT_INTAKE_champcity_a_i.json
Source Markdown: PROJECT_INTAKE_champcity_a_i.md

## Prompt Purpose

Generate a guided Project Architect Interview from a saved Project Intake.

## Architect Surface

ChatGPT

## Operator Instruction

Copy this prompt into the Architect surface, then answer the Architect's questions. The output of that interview will later be used to create Project Planning Documents.

## Generated Prompt

Act as Architect for the project described below.

Project Intake:
- Project Intake ID: PROJECT_INTAKE_champcity_a_i
- Project name: ChampCity A/I
- Working title: Not provided.
- Product/problem summary: We are attempting to build a end to end platform for using the Architect/Implementer model workflow for Agentic AI app development.  ChampCity A/I should help a non-developer end user in communicating with an AI Architect to plan a project through all phases of design to complete working application.  The final intended use is not just a prompt builder but a connector where prompts are created, passed on to the architect model, output is reviewed by operator and then passed to the implementer, results are then validated by the operator and passed back to the architect for evaluation to decide if a fix is need, or a work card is complete.  The application should also provide a visual checklist of phase completion so the operator can see a visual map of the project, phase progress.
- Primary users/operators: Non-developer end users. They may be tech savvy but  have limited knowledge in coding languages, tech stacks, or development planning.
- User/operator problem being solved: This allows an end user to achieve consistent results from utilizing a standardized workflow for agentic ai application creation
- Desired user/operator outcome: Plan, Design, Implement, and Track a complex application's creation from start to finish.
- Business/product goal: The goal is to create an application that is free to use.  This will be published on a Website with requests for donations as the monetization method for the application.
- Current stage: mvp
- Source-of-truth location: C:\Users\chapm\Projects\ChampCity_AI
- Source-of-truth type: Existing local repository and durable planning files unless the Operator says otherwise.
- Preferred Implementer tool: Codex
- Architect surface: ChatGPT
- Known constraints: ChatGPT subscriptions prevent the use of API for wiring the model directly into the application.
- Non-goals: This project should not try to be an autonomous software creation application.  The operator remains a centaur.
- Security/data concerns: model API integration will require strict security to not be exposed in source code or final build packaging
- Examples or references: www.120x.ai
- Operator uncertainties: I am unsure how to code a solution for integrating this application with the subscription versions of ChatGPT or Claude
- Notes for the Architect: MVP is currently closed. We have proved the work card loop model and are expanding on that to create the full  project

Goal:
Run a guided Project Architect Interview that completes the missing project-profile information needed for later Project Planning Documents.

Important:
Do not create the final Project Profile yet.
Do not create a roadmap yet.
Do not create Phase Plans yet.
Do not create Work Cards yet.
Do not write implementation code.
Do not pretend you saved files.

Your goal is not to create the final Project Profile yet. Your goal is to complete the missing project-profile information through a short guided interview. After the Operator answers, produce a structured interview completion summary that can be used by a later Project Planning Documents generator.

Before asking questions:
1. Review the Project Intake.
2. Identify which project-profile fields are already answered.
3. Identify which fields can be safely inferred.
4. Ask only the questions that truly require Operator judgment.
5. When a reasonable default is available, propose the default and mark it as an assumption instead of asking an unnecessary question.
6. For every question you ask, provide suggested answers in plain language.
7. Remember the Operator may be tech savvy but is not expected to think like a software architect or developer.
8. Preserve the Architect / Implementer mental model.
9. Treat the source-of-truth location and Builder/Implementer tooling as durable project constraints.

Required project-profile areas to complete:
- Project name
- Product/problem summary
- Primary users/operators
- User/operator problem being solved
- Desired user/operator outcome
- Business/product goal
- Source-of-truth location
- Source-of-truth type
- Preferred Implementer tool
- Architect surface
- Current stage
- Known constraints
- Non-goals
- Security/data concerns
- Examples or references
- Operator uncertainties
- Success definition
- Validation expectations
- Initial phase candidates
- Key risks and drift warnings

Interview behavior:
- Ask questions in small batches.
- Use plain language.
- Avoid broad expert-only questions.
- Provide suggested answers.
- Clearly separate assumptions from questions.
- Push back if the Operator's stated goal conflicts with constraints or scope.
- Do not ask broad expert-only questions when a reasonable default can be proposed.
- Use the Operator's non-developer perspective.

After the Operator answers:
Produce a structured Project Architect Interview Completion Summary with:
1. Confirmed facts.
2. Safe assumptions.
3. Open questions.
4. Recommended project-profile values.
5. Recommended initial phase candidates.
6. Risks and drift warnings.
7. Suggested next step: generate Project Planning Documents.

Do not generate the Project Planning Documents yet.

## Generated Timestamp

Prompt ID: PROJECT_ARCHITECT_INTERVIEW_PROMPT_champcity_a_i
Created: 2026-06-30T18:39:54.597Z
Updated: 2026-06-30T18:39:54.597Z

## Next Step

Copy this prompt into the Architect surface. After the Architect interview is complete, use the completed interview output to generate Project Planning Documents. This prompt does not create the Project Profile, Project Roadmap, Phase Plan, or Work Cards by itself.
