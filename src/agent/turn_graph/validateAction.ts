import type { GraphState, GraphUpdate } from "@/agent/state";

// Pure TS — no LLM. Checks that the parsed GameAction is legal given current
// game state. Sets ephemeralState.validationError on failure.
export function validateAction(_state: GraphState): GraphUpdate {
  throw new Error("TODO: implement validateAction");
}
