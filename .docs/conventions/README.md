# Conventions

These conventions keep agent work predictable and easy to hand off.

## Working Style

- Make the smallest change that satisfies the request.
- Preserve user edits unless they directly block the task.
- Prefer clear, direct documentation over long explanations.
- Update repo docs when a task reveals a new rule, behavior, or recurring pattern.

## File Placement

- Put agent skills in `.agents/<skill-name>/SKILL.md`.
- Put shared guidance and project conventions in `.docs/`.
- Keep repo entry-point guidance in `AGENTS.md`.
- Keep local development setup notes in `DEVELOPMENT.md`.

## Editing Conventions

- Use ASCII by default unless an existing file clearly requires otherwise.
- Keep Markdown short and scannable.
- Use absolute file paths in agent-facing references when possible.
- Prefer additive changes over broad rewrites.

## Verification

- Verify behavior when the change affects code or tooling.
- If there is no runnable test suite yet, document the best available manual check.
- Capture any missing checks in the session reflection so the next agent can improve them.
