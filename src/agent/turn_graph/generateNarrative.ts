import type { GraphState, GraphUpdate } from "../state";

// LLM call — free prose, in-character. Writes MooGPT's response using
// appliedDeltas (success path) or validationError (refusal path). May set
// pendingDecisionId when presenting a decision. Appends AIMessage to messages,
// then graph interrupts.
export async function generateNarrative(_state: GraphState): Promise<GraphUpdate> {
  throw new Error("TODO: implement generateNarrative");
}
