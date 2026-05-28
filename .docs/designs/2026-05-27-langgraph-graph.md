# LangGraph Graph Design — MooGPT

## Overview

MooGPT is a turn-based, chat-driven farming game. Each game turn (day) follows
the same two-phase structure:

1. **Daily briefing.** At the start of every game turn MooGPT opens with a spoken
   briefing — what the animals got up to overnight, how the market moved, any
   events that fired, and what decisions are pending. The player reads this
   before touching anything.
2. **Player actions.** The player then sends natural-language messages
   ("feed the cows", "sell my milk", "what should I do today?"). An **action**
   is defined as a successful game event — something that actually happened on
   the farm. Each successful action costs one or more slots from the turn's
   limited budget (determined by `turn.actionsRemaining`). Failed attempts
   (invalid requests, clarifications, queries) are not actions and do not cost
   budget. MooGPT interprets each message, validates it against game rules,
   mutates game state, and replies in character. When the action budget is
   exhausted the turn closes automatically.

The LangGraph graph drives both phases. It sits between the React UI (which
owns rendering and input) and the game state (which owns domain rules). One
graph run covers exactly one game turn (one day): it starts with the daily
briefing, interrupts repeatedly to wait for player input, and terminates when
the day ends. React starts a fresh graph run for the next day.

---

## Terminology

- **Game turn / Day:** The core game loop unit. One graph run covers exactly one game turn. The terms "game turn" and "day" are interchangeable throughout this document.
- **Conversation turn:** A single exchange — one player message and one MooGPT response. Multiple conversation turns happen within a single game turn (day).
- **Action:** A successful game event (something that happened on the farm). Only `GameAction` intents that pass validation and execute count against the daily action budget.
- **Conversation move:** A player message that does not change farm state (`query`, `clarify`). Never costs budget.
- **Decision:** A choice MooGPT surfaces to the player. Decisions are queued in `GameState.decisions` at end-of-turn by `surface_decisions` and presented in the next day's briefing. They do not need to be resolved in a fixed order. A decision may or may not map to a `GameAction` — if it does, resolving it costs a budget slot. By design, the number of pending decisions can exceed the day's action budget, forcing the player to prioritize.

---

## Graph State

See `src/agent/state.ts`.

---

## Nodes

See [.docs/graphs/graph.md](../graphs/graph.md) — auto-generated from the compiled graph via `npm run update:graph`. Do not edit manually.

## Graph Diagram

See [.docs/graphs/graph.md](../graphs/graph.md) — auto-generated from the compiled graph via `npm run update:graph`. Do not edit manually.

---

## LLM Calls Summary

| Node                    | Model call? | Prompt style                     |
|-------------------------|-------------|----------------------------------|
| `generate_briefing`     | Yes         | Free prose, in-character         |
| `parse_intent`          | Yes         | Tool-calling (structured output) |
| `resolve_decision`      | Yes         | Tool-calling (structured output) |
| `validate_action`       | No          | —                                |
| `execute_action`        | No          | —                                |
| `generate_narrative`    | Yes         | Free prose, in-character         |
| `generate_journal_entry`| Yes         | Narrative prose                  |
| `surface_decisions`     | No          | Rule-based thresholds            |
| `end_turn`              | No          | —                                |
| `update_assistant`      | No          | —                                |
| `reset_turn_state`      | No          | —                                |

All LLM calls target the player-configured Ollama endpoint. Because the models
are small (e.g. llama3, mistral), `parse_intent` uses tool-calling rather than
JSON mode — small models are more reliable when given an explicit tool schema
than when asked to emit raw JSON.

---

## Runtime & Persistence

**Graph runs in the browser.** LangGraph.js executes entirely client-side — no
server required. The game is a pure front-end app.

**Ollama endpoint.** Players configure a local Ollama endpoint (e.g.
`http://localhost:11434`) in app settings before starting. The LangGraph `ChatOllama`
client uses this base URL for all LLM calls. The endpoint is stored in
`localStorage` alongside game state.

**Persistence via `localStorage`.** When a turn's graph run terminates (at
`END`), React receives the final `{ gameState, messages }`, serializes them, and
writes to `localStorage`. On page load, React hydrates from `localStorage` and
starts a fresh graph run for the current turn.

**Per-turn checkpointing.** Within a single game turn, the graph uses an
in-memory `MemorySaver` checkpointer to support the interrupt/resume loop. This
is intentionally not persisted to `localStorage`. If the player reloads
mid-turn, the graph is reconstructed fresh and the turn restarts from the
briefing — `GameState` (gold, animals, `actionsRemaining`, etc.) is preserved,
but any unfinished action sequence is discarded. This is an acceptable
trade-off given the lightweight, client-side-only architecture.

**Short-term memory.** `JournalEntry` objects and the `Decision` history act as
short-term memory — they persist across days and give the LLM context for
briefings and narrative.

**Long-term memory (deferred).** A mechanism that periodically compresses
journal entries and decision history into a summarized narrative for the model
to reference is planned but excluded from the initial version.

---

## Moo Mode (No Endpoint Configured)

If the player has not provided an Ollama endpoint, the graph runs in **Moo
Mode**: all LLM nodes are bypassed and replaced with a deterministic mock that
imitates a cow who only speaks in moos.

Behavior per node:

| Node                    | Moo Mode behavior                                              |
|-------------------------|----------------------------------------------------------------|
| `parse_intent`          | Returns a random valid `GameAction` chosen uniformly at random |
| `generate_briefing`     | Returns a string of random moos with random punctuation        |
| `generate_narrative`    | Returns a string of random moos with random punctuation        |
| `generate_journal_entry`| Returns a string of random moos with random punctuation        |
| `surface_decisions`     | Unchanged — rule-based, no LLM                                 |
| `update_assistant`      | Unchanged — pure TypeScript, no LLM                            |

Moo strings are generated by sampling a random count (e.g. 3–12) of the word
"moo" separated by spaces, then inserting random punctuation (`.`, `,`, `!`,
`?`) at random positions. Example output: `"moo moo! moo moo, moo moo moo moo?"`

Moo Mode is a playful fallback for players who haven't set up Ollama yet.

---

## Integration with React

- The graph is compiled once on app load with an in-memory `MemorySaver`
  checkpointer. Each turn gets a new `thread_id`.
- At turn start, React calls `graph.invoke(turnStartSignal, { configurable: { thread_id } })`.
  Each subsequent player message resumes the same run via another `graph.invoke`
  with the same `thread_id`. The graph resumes from `interrupt()`, processes
  the message, and either interrupts again or terminates at `END`.
- When the graph terminates, React receives the final state, writes to
  `localStorage`, and starts a new turn with a fresh `thread_id`.
- No streaming on the first pass — the full response is returned together so
  the UI can animate the journal, decisions, and chat message in sequence.
