import type { GraphState, GraphUpdate } from "../state";

// Pure TS — no LLM. Runs after all end-of-turn nodes converge. Clears all
// turn-scoped ephemeralState fields so the graph can terminate cleanly. React
// writes the resulting gameState to localStorage and starts a fresh graph run.
export function resetTurnState(_state: GraphState): GraphUpdate {
  throw new Error("TODO: implement resetTurnState");
}
