import type { GraphState, GraphUpdate } from "@/agent/state";

// Pure TS — no LLM. Applies the validated GameAction to gameState, appends to
// appliedDeltas, decrements actionsRemaining, and sets shouldEndTurn when it
// hits 0.
export function executeAction(_state: GraphState): GraphUpdate {
  throw new Error("TODO: implement executeAction");
}
