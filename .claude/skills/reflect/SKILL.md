---
name: reflect
description: Claude-facing reflection skill that reuses the repository's agent reflection guidance and points to the shared .agents/reflect workflow.
---

# Reflect

Use this when Claude should summarize a working session after a meaningful chunk of work and suggest documentation updates for future agents.

## Source Of Truth

Follow the shared workflow in [.agents/reflect/SKILL.md](/Users/zguan/workspace/moo-gpt/.agents/reflect/SKILL.md).

## What To Do

- Summarize the session clearly.
- Note what changed and what was verified.
- Propose concrete documentation updates for rules, behaviors, conventions, and project knowledge.
- Keep the output concise and specific.

## Relevant Docs

- [AGENTS.md](/Users/zguan/workspace/moo-gpt/AGENTS.md)
- [DEVELOPMENT.md](/Users/zguan/workspace/moo-gpt/DEVELOPMENT.md)
- [.docs/conventions/README.md](/Users/zguan/workspace/moo-gpt/.docs/conventions/README.md)
- [.docs/architecture.md](/Users/zguan/workspace/moo-gpt/.docs/architecture.md)
