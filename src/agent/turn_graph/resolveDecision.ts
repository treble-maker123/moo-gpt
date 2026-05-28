import type { GraphState, GraphUpdate } from "@/agent/state";

// LLM call — structured output. Reached only when pendingDecisionId is set.
// Matches the player's response to a decision option, clears pendingDecisionId,
// and applies the trust delta from the chosen option.
export async function resolveDecision(_state: GraphState): Promise<GraphUpdate> {
  throw new Error("TODO: implement resolveDecision");
}
