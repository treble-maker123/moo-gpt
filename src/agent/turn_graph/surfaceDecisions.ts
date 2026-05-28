import type { GraphState, GraphUpdate } from "../state";

// Rule-based — no LLM. Runs only at end-of-turn as part of the parallel
// fan-out. Checks thresholds (sick animal, low gold, season change) and appends
// 0–N new Decision objects to gameState.decisions.
export function surfaceDecisions(_state: GraphState): GraphUpdate {
  throw new Error("TODO: implement surfaceDecisions");
}
