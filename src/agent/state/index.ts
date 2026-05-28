export * from "@/agent/state/types";
export * from "@/agent/state/gameState";
export * from "@/agent/state/ephemeralState";

import { Annotation, MessagesAnnotation } from "@langchain/langgraph";
import type { GameState } from "@/agent/state/gameState";
import type { EphemeralState } from "@/agent/state/ephemeralState";
import { createNewGameState } from "@/agent/state/gameState";
import { createNewEphemeralState } from "@/agent/state/ephemeralState";

export const GraphAnnotation = Annotation.Root({
  ...MessagesAnnotation.spec,

  gameState: Annotation<GameState>({
    reducer: (current, update) => ({ ...current, ...update }),
    default: createNewGameState,
  }),

  ephemeralState: Annotation<EphemeralState>({
    reducer: (current, update) => ({ ...current, ...update }),
    default: createNewEphemeralState,
  }),
});

export type GraphState = typeof GraphAnnotation.State;
export type GraphUpdate = typeof GraphAnnotation.Update;
