import type { GraphState, GraphUpdate } from "../state";

// LLM call — free prose, in-character. Appends AIMessage to messages, then
// graph interrupts so the player can read and respond.
export async function generateBriefing(_state: GraphState): Promise<GraphUpdate> {
  throw new Error("TODO: implement generateBriefing");
}
