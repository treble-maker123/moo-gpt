export * from "./types";
export * from "./gameState";
export * from "./ephemeralState";

import { Annotation, MessagesAnnotation } from "@langchain/langgraph";
import type { GameState } from "./gameState";
import type { EphemeralState } from "./ephemeralState";
import { createNewGameState } from "./gameState";
import { createNewEphemeralState } from "./ephemeralState";

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
