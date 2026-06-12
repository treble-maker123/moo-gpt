# Design Doc Conventions

Design docs live in `.docs/designs/` and capture the reasoning behind significant architectural or product decisions.

## When to Write One

Write a design doc when a change:
- Restructures a layer or module boundary
- Introduces a new framework or external dependency
- Defines a public API or interface that other layers will depend on
- Would be hard to explain from the diff alone

For small bug fixes, refactors within a single file, or changes fully described by a PR description, skip it.

## File Naming

```
YYYY-MM-DD-short-kebab-slug.md
```

Use today's date and a slug that names the decision, not the outcome. Example: `2026-06-12-layered-architecture.md`. The date in the filename is the canonical date — do not repeat it in the doc body.

## Required Sections

```markdown
# Title

## Problem
What is broken or missing? Why does it matter now?

## Goals
What this design achieves. Keep to 3–5 bullets.

## Proposed [Design / Approach / Solution]
The actual content. Use diagrams, interface sketches, file trees.

## Migration Plan (if applicable)
Ordered steps. Each step should leave the app in a runnable state.

## Open Questions
Unresolved decisions that need an answer before or during implementation.
```

## Managing Open Questions

Remove a question from the doc once it is resolved — update the relevant section of the design instead of annotating it as "resolved." This keeps the Open Questions section actionable. If a question is punted to a later design, note that briefly and leave it until the follow-up doc exists.

## What to Leave Out

- **No date field.** The filename carries the date.
- **No authorship fields.** Design docs are repo artifacts, not personal documents. Git history captures who wrote what.
- **No status field.** Track status in the linked GitHub issue, not in the doc body.
- **No implementation checklists.** Those belong in GitHub issues or PR descriptions, not the design doc.

## Linking to GitHub

Each design doc should have a corresponding GitHub issue. Link them to each other:

- The doc includes a `**GitHub Issue:**` line near the top pointing to the issue URL.
- The issue links back to the doc file in its description.

The issue is the canonical status tracker — open means in progress, closed means done or abandoned. Break implementation down into sub-issues (one per migration step). Do not track status inside the doc itself.
