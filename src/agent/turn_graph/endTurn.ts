import type { GraphState, GraphUpdate } from "@/agent/state";

// Pure TS — no LLM. Runs only at end-of-turn as part of the parallel fan-out.
// Increments turnNumber, resets actionsRemaining, advances season every 30
// turns, ticks animal ages, and applies passive productivity changes.
export function endTurn(_state: GraphState): GraphUpdate {
  throw new Error("TODO: implement endTurn");
}
