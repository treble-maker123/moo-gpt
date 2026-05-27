---
name: reflect
description: Summarize a working session and propose documentation updates that preserve rules, behaviors, conventions, and project knowledge for future agents.
---

# Reflect

Use this skill after the agent has completed a meaningful chunk of work, at the end of a task, or when the user asks for a session recap.

## Goal

Produce a concise reflection that helps the next agent continue with less context loss.

## What To Include

- What the user asked for
- What was changed
- What was verified
- Any open risks or follow-up work
- Documentation updates that would make the repo easier for future agents to work in

## Documentation Targets

When proposing or applying docs updates, look here first:

- `AGENTS.md` for the agent entry point and doc map
- `DEVELOPMENT.md` for local setup and environment notes
- `.docs/conventions/README.md` for coding and development conventions
- `.docs/architecture.md` for the high-level project layout
- `.agents/<skill>/SKILL.md` for new or updated agent skills

## Reflection Workflow

1. Read the recent changes, relevant diffs, and task context.
2. Summarize the session in plain language.
3. Identify rules, behaviors, or conventions that future agents should know.
4. Propose concrete doc changes with exact file paths.
5. If the repo already has enough documentation, say so and keep the reflection brief.

## Output Shape

Use three sections:

- `Session Summary`
- `Documentation Updates`
- `Follow-up Ideas`

Keep the write-up specific. Prefer file paths and concrete changes over general advice.
