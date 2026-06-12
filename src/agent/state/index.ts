import { Annotation, MessagesAnnotation } from "@langchain/langgraph";
import { createNewEphemeralState, createNewGameState } from "@/engine/types";
import type { EphemeralState, GameState } from "@/engine/types";

export type { EphemeralState, GameState } from "@/engine/types";

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
