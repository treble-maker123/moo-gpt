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
- `src/game/` owns game domain state, rules, and domain-specific helpers. (transitional — migrating to `src/engine/` and `src/store/`; see Target Architecture)
- `src/components/` owns reusable UI components.
- `src/lib/` is reserved for shared utilities that do not belong to one domain.

## Target Architecture

A four-layer model is planned. See `.docs/designs/2026-06-12-layered-architecture.md` for the full design.

```
UI (src/components/)
  └─ Store (src/store/)
       └─ Agent Runtime interface (src/agent/)
            └─ Game Engine (src/engine/)
```

- **Game Engine** (`src/engine/`): pure TypeScript, no LLM or React deps. Owns all game rules and domain types.
- **Agent Layer** (`src/agent/`): LangGraph implementation behind an `AgentRuntime` interface. Calls the engine; never touches React.
- **Store** (`src/store/`): orchestration layer. Holds live game state between turns, wires agent events back to React, exposes a command interface (`configure`, `startTurn`, `sendMessage`, `resetGame`) to the UI. No LangGraph imports.
- **UI** (`src/components/`): reads from the store and engine types only. Exception: `DebugPanel` may access `runtime.logger` directly to display LLM call logs — it is the only component permitted to reach into the agent layer.

Until the migration is complete, `src/game/gameStore.ts` still couples the store to LangGraph directly.

## Intended Structure

- Prefer a layered layout while the app is small:
  - `engine` for pure-TypeScript game rules and domain types.
  - `agent` for model-facing logic, prompts, and graph integration.
  - `store` for Zustand state bridging agent events to the UI.
  - `components` for reusable presentational UI.
  - `lib` for generic helpers.
- Keep `src/` imports using the `@` alias instead of deep relative paths.
- Keep the UI intentionally minimal until the product shape becomes clearer.
- Components must not import from `src/agent/` directly.

## Maintenance Notes

- When a new subsystem appears, add a short note here and update `AGENTS.md` if the new location matters for future agents.
- If the structure changes materially, reflect the change here before relying on memory or chat history.
