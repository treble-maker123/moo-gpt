export * from "@/engine";

import { Annotation, MessagesAnnotation } from "@langchain/langgraph";
import type { GameState, EphemeralState } from "@/engine";
import { createNewGameState, createNewEphemeralState } from "@/engine";

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
