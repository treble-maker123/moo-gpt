# Layered Architecture Redesign

**GitHub Issue:** https://github.com/treble-maker123/moo-gpt/issues/1

---

## Problem

The current codebase conflates three distinct concerns in a single boundary:

1. **Game rules** (what is legal, what changes when you act) live inside LangGraph nodes (`validateAction.ts`, `executeAction.ts`, `endTurn.ts`). They are not reachable without invoking the graph.
2. **Agent orchestration** (LangGraph graph, prompt routing, LLM calls) is directly coupled to the Zustand store. The store calls `graph.invoke()`, `graph.updateState()`, and `graph.getState()` at the LangGraph API level — swapping the framework would require rewriting the store.
3. **UI state and interaction** is served by the same store that manages graph lifecycle and LLM config.

Consequences:
- Game logic cannot be unit-tested without standing up a graph and mocking an LLM.
- The agent framework (LangGraph) cannot be swapped or mocked without rewriting `gameStore.ts`.
- Components import types from `src/agent/state/` — the agent layer bleeds into the UI layer.

---

## Goals

- A **game engine** that owns all domain rules and is usable as a plain TypeScript module.
- An **agent runtime** interface that hides the orchestration framework; LangGraph is one implementation.
- A **store** that bridges the runtime to React without knowing about LangGraph internals.
- A **UI layer** that only imports from the store and shared types.

Non-goals for this pass:
- Changing gameplay mechanics or adding new features.
- Replacing LangGraph with another framework (this design makes that possible; it is not the immediate objective).
- Persistence / save-game infrastructure.

---

## Proposed Layer Model

```
┌───────────────────────────────────────────────────────┐
│                    UI Layer                            │
│  src/components/  ·  src/App.tsx                      │
│  React components, Pixi scene, setup wizard           │
│  imports: store hooks, shared types only              │
└───────────────────────────┬───────────────────────────┘
                            │ useGameStore / useAgentStore
┌───────────────────────────▼───────────────────────────┐
│                   Store Layer                          │
│  src/store/                                           │
│  Zustand slices for UI state + agent event bridging   │
│  imports: AgentRuntime interface, engine types        │
└───────────────────────────┬───────────────────────────┘
                            │ AgentRuntime interface
┌───────────────────────────▼───────────────────────────┐
│                  Agent Layer                           │
│  src/agent/                                           │
│  LangGraph graph, LLM calls, prompt nodes             │
│  implements: AgentRuntime                             │
│  imports: engine API, LLM abstraction                 │
└───────────────────────────┬───────────────────────────┘
                            │ GameEngine API
┌───────────────────────────▼───────────────────────────┐
│                 Game Engine Layer                      │
│  src/engine/                                          │
│  Pure TypeScript. Zero LLM / graph / React deps.      │
│  exports: GameEngine class, all domain types          │
└───────────────────────────────────────────────────────┘
```

---

## Layer 1 — Game Engine (`src/engine/`)

The engine is a pure TypeScript module. No LLM, no LangGraph, no React. It encodes the complete rules of the game and is independently testable with `vitest` and no mocks.

### Public API

```typescript
// src/engine/index.ts

export class GameEngine {
  getInitialState(): GameState;

  validateAction(state: GameState, action: PlayerAction): ValidationResult;

  applyAction(
    state: GameState,
    action: PlayerAction
  ): { nextState: GameState; deltas: StateDelta[] };

  advanceTurn(state: GameState): GameState;
}

export type ValidationResult =
  | { valid: true }
  | { valid: false; reason: string };
```

### File Layout

```
src/engine/
  index.ts          # re-exports GameEngine + all types
  types.ts          # GameState, Animal, PlayerAction, StateDelta, …
  actions/
    validate.ts     # validateAction implementation
    execute.ts      # applyAction implementation
  turn.ts           # advanceTurn (season advance, animal aging)
  initialState.ts   # getInitialState factory
```

### Migration Source

| Today                                      | Moves to                        |
|--------------------------------------------|---------------------------------|
| `agent/state/types.ts`                     | `engine/types.ts`               |
| `agent/state/gameState.ts`                 | `engine/types.ts` (merged)      |
| `agent/state/ephemeralState.ts`            | `engine/types.ts` (merged)      |
| `agent/turn_graph/validateAction.ts`       | `engine/actions/validate.ts`    |
| `agent/turn_graph/executeAction.ts`        | `engine/actions/execute.ts`     |
| `agent/turn_graph/endTurn.ts`              | `engine/turn.ts`                |

`EphemeralState` belongs in the engine. It is per-turn transient state (current intent, validation error, pending deltas, etc.) that exists regardless of whether an agent is driving the turn. The agent layer reads and writes it through the graph state schema but does not own its definition.

---

## Layer 2 — Agent Layer (`src/agent/`)

Owns LangGraph, LLM wiring, prompts, and turn orchestration. Implements the `AgentRuntime` interface so callers never import LangGraph types.

### `AgentRuntime` Interface

```typescript
// src/agent/runtime.ts

export type AgentEvent =
  | { type: "message"; role: "assistant"; content: string }
  | { type: "state_update"; gameState: GameState }
  | { type: "turn_started" }
  | { type: "turn_ended" }
  | { type: "error"; message: string };

export interface AgentRuntime {
  /** Called once per game session to hand the runtime its LLM config. */
  configure(config: RuntimeConfig): void;

  /**
   * Begin a new turn. The engine owns canonical game state; the runtime
   * receives it as input, operates on it, and emits mutations back as
   * AgentEvents. The store is the keeper of current state between turns.
   */
  startTurn(state: GameState): Promise<void>;

  /** Resume the graph after a player message. */
  sendMessage(text: string): Promise<void>;

  /** Subscribe to events emitted by the runtime. Returns an unsubscribe fn. */
  subscribe(listener: (event: AgentEvent) => void): () => void;

  /** Companion logger; read by DebugPanel directly. */
  readonly logger: RuntimeLogger;
}

export interface RuntimeConfig {
  llm: AppLLM;
  threadId: string;
}

export interface LlmCallEntry {
  id: string;
  node: string;
  timestamp: number;
  messages: unknown[];
  response: unknown;
}

export interface RuntimeLogger {
  readonly entries: LlmCallEntry[];
  subscribe(listener: () => void): () => void;
}
```

### Internal Changes

Graph nodes call the engine instead of implementing rules inline:

```typescript
// agent/turn_graph/validateAction.ts  (after refactor)
import { engine } from "@/engine";

export async function validateActionNode(state: GraphState) {
  const result = engine.validateAction(state.gameState, state.ephemeralState.currentIntent);
  if (!result.valid) {
    return { ephemeralState: { ...state.ephemeralState, validationError: result.reason } };
  }
  return {};
}
```

The `GraphAnnotation` state schema stays in `src/agent/state/` — it is an agent concern (LangGraph needs it to merge partial updates).

### LangGraph Implementation

`LangGraphRuntime` implements `AgentRuntime`. It holds the compiled graph and MemorySaver internally and emits `AgentEvent`s from the stream:

```typescript
// src/agent/LangGraphRuntime.ts
export class LangGraphRuntime implements AgentRuntime { ... }
```

---

## Layer 3 — Store (`src/store/`)

The store is the orchestration layer. It sits between the UI, the agent runtime, and the engine — receiving commands from the UI, delegating to the runtime, and applying `AgentEvent`s back onto game state.

### Public Interface

```typescript
type GamePhase = "user_turn" | "world_turn";

interface GameStore {
  // State (read by UI)
  phase: GamePhase;
  gameState: GameState;
  ephemeralState: EphemeralState;
  messages: ChatMessage[];

  // Commands (called by UI)

  /** One-time setup on game load (or when LLM config changes in setup modal).
   *  Creates the runtime instance and subscribes to AgentEvents. */
  configure(config: RuntimeConfig): void;

  /** Called at the start of each player turn. Passes current gameState to the
   *  runtime, which runs the briefing node then waits at the first interrupt
   *  for player input. Sets phase to "world_turn" until the interrupt fires. */
  startTurn(): Promise<void>;

  /** Called when the player submits a chat message. Resumes the runtime from
   *  its current interrupt point with the player's text, then waits for the
   *  next interrupt or turn end. */
  sendMessage(text: string): Promise<void>;

  /** Resets all state to a fresh game. Re-seeds gameState from
   *  engine.getInitialState() and clears messages and phase. */
  resetGame(): void;

}
```

`GamePhase` is a store-level type — it describes the interaction loop, not the game world. It is driven by `AgentEvent`s: `turn_started` sets `world_turn`, `turn_ended` sets `user_turn`.

The `runtime` reference and event subscription are internal to the store — the UI never touches them directly. `DebugPanel` is the only component that reaches past the store (to `runtime.logger`).

### Orchestration Flow

```
configure()   →  create runtime, subscribe to AgentEvents
startTurn()   →  runtime.startTurn(gameState)
sendMessage() →  runtime.sendMessage(text)

on AgentEvent "message"       →  append to messages[]
on AgentEvent "state_update"  →  replace gameState
on AgentEvent "turn_started"  →  set phase = "world_turn"
on AgentEvent "turn_ended"    →  set phase = "user_turn"
```

### Slices

```
src/store/
  index.ts          # combines slices, single useGameStore export
  gameSlice.ts      # gameState, ephemeralState, phase, messages
  agentSlice.ts     # runtime reference, configure/startTurn/sendMessage
  uiSlice.ts        # debug panel open, setup modal state
```

### Before / After

**Before (today):**
```typescript
// gameStore.ts — store knows LangGraph internals
const result = await graph.invoke({ gameState }, config);
const snap = await graph.getState(config);
await graph.updateState(config, { messages: [new HumanMessage(text)] });
```

**After:**
```typescript
// agentSlice.ts — store knows only the interface
await runtime.startTurn(get().gameState);
await runtime.sendMessage(text);
// events flow back via subscribe()
```

---

## Layer 4 — UI (`src/components/`, `src/App.tsx`)

No structural change. The constraint is import discipline:

- Components may import from `@/store` and `@/engine/types` (shared domain types).
- Components must **not** import from `@/agent/` directly.
- `FarmScene`, `DebugPanel`, `SetupModal` are already close to this — minor cleanup only.

---

## Migration Plan

This is designed to be done in discrete, non-breaking steps. Each step leaves the app runnable.

### Step 1 — Extract the Game Engine

Move `validateAction`, `executeAction`, `endTurn`, and the state types into `src/engine/`. Update the graph nodes to import from `@/engine` instead of their current relative paths. No interface changes yet — this is purely a file relocation + thin wrapper.

**Definition of done:** `src/engine/` exports `GameEngine`; graph nodes import from it; app behaves identically.

### Step 2 — Define `AgentRuntime` and wrap LangGraph

Introduce `src/agent/runtime.ts` with the interface. Move `gameStore.ts` graph invocation code into `LangGraphRuntime`. Store gets a `runtime: AgentRuntime` reference and calls the interface methods.

**Definition of done:** `gameStore.ts` has zero LangGraph imports; `LangGraphRuntime` compiles and passes current smoke tests.

### Step 3 — Split the store

Break `gameStore.ts` into `gameSlice`, `agentSlice`, `uiSlice`. Wire them together in `store/index.ts`. Public hook signatures stay the same so component code does not change.

**Definition of done:** Store file is split; all existing component imports resolve without change.

### Step 4 — Enforce import boundaries

Add an ESLint rule (or path alias restriction) that prevents `src/components/` from importing `src/agent/`. Fix any violations found (expected to be minimal — mostly type imports that move to `src/engine/types`).

**Definition of done:** `eslint --rule 'no-restricted-imports'` passes in CI.

---

## Open Questions

1. **Debug panel access** — resolved. The debug panel is a cross-cutting dev tool, not a game UI component, so it is a deliberate exception to the "components only import from store" rule. A `RuntimeLogger` companion object lives alongside the runtime, is created with it, and maintains LLM call history. `AgentRuntime` exposes it via `runtime.logger`. The debug panel reads game state from the store and LLM logs directly from `runtime.logger`. The store no longer accumulates `llmCallLog` — that becomes the logger's responsibility. This needs to be wired up as part of Step 2.

2. **Test harness** — a `MockRuntime` implementing `AgentRuntime` would unlock unit tests for store slices without an LLM. Punted to a separate design.
