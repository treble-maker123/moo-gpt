# Conventions

These conventions keep agent work predictable and easy to hand off.

## Working Style

- Make the smallest change that satisfies the request.
- Preserve user edits unless they directly block the task.
- Prefer clear, direct documentation over long explanations.
- Update repo docs when a task reveals a new rule, behavior, or recurring pattern.

## File Placement

- Put the shared agent skill in `.agents/<skill-name>/SKILL.md`.
- If Claude needs the same skill, add a pointer file in `.claude/skills/<skill-name>/SKILL.md` that points back to the shared `.agents` skill.
- Put shared guidance and project conventions in `.docs/`.
- Keep repo entry-point guidance in `AGENTS.md`.
- Keep local development setup notes in `DEVELOPMENT.md`.

## Editing Conventions

- Use ASCII by default unless an existing file clearly requires otherwise.
- Keep Markdown short and scannable.
- Use absolute file paths in agent-facing references when possible.
- Prefer additive changes over broad rewrites.
- Prefer absolute imports with the `@` alias for files under `src/`.
- Commit messages and PR descriptions must not include co-author information or agent attribution.
- Repeat: do not add co-author trailers, agent signatures, or generated-by attribution in commit messages or PR descriptions.

## Verification

- Verify behavior when the change affects code or tooling.
- If there is no runnable test suite yet, document the best available manual check.
- Capture any missing checks in the session reflection so the next agent can improve them.
