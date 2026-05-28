import type { GraphState, GraphUpdate } from "../state";

// LLM call — tool-calling / structured output. Converts the latest HumanMessage
// into a PlayerIntent (GameAction or ConversationMove). Never mutates gameState.
export async function parseIntent(_state: GraphState): Promise<GraphUpdate> {
  throw new Error("TODO: implement parseIntent");
}
