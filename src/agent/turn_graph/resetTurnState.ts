import type { GraphState, GraphUpdate } from "@/agent/state";
import { createNewEphemeralState } from "@/agent/state";

export function resetTurnState(_state: GraphState): GraphUpdate {
  return { ephemeralState: createNewEphemeralState() };
}
