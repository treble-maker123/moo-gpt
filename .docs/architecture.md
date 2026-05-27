# Architecture

This repository is a lightweight Vite/React app with supporting docs and reusable agent workflows.

## Doc Map

- `AGENTS.md` is the entry point for future agents.
- `DEVELOPMENT.md` explains local setup and environment details.
- `.docs/conventions/README.md` captures coding and development conventions.
- `.docs/architecture.md` describes the repository shape and how the major parts fit together.
- `.agents/` holds shared agent skills.
- `.claude/skills/` contains Claude-facing wrappers when a shared skill needs one.

## Current Source Layout

- `src/main.tsx` is the Vite entry point that mounts React.
- `src/App.tsx` is the top-level application shell for now.
- `src/agent/` owns LangGraph and other agent-facing integration code.
- `src/game/` owns game domain state, rules, and domain-specific helpers.
- `src/components/` owns reusable UI components.
- `src/lib/` is reserved for shared utilities that do not belong to one domain.

## Intended Structure

- Prefer a layered layout while the app is small:
  - `app` for bootstrapping and top-level composition if routing or app wiring expands.
  - `components` for reusable presentational UI.
  - `game` for domain types, state, and gameplay logic.
  - `agent` for model-facing logic, prompts, and graph integration.
  - `lib` for generic helpers.
- Keep `src/` imports using the `@` alias instead of deep relative paths.
- Keep the UI intentionally minimal until the product shape becomes clearer.

## Maintenance Notes

- When a new subsystem appears, add a short note here and update `AGENTS.md` if the new location matters for future agents.
- If the structure changes materially, reflect the change here before relying on memory or chat history.
