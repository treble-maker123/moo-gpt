import type { GraphState, GraphUpdate } from "@/agent/state";
import { createNewEphemeralState } from "@/engine/types";

export function resetTurnState(_state: GraphState): GraphUpdate {
  return { ephemeralState: createNewEphemeralState() };
}
