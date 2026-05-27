export * from "./types";
export * from "./gameState";
export * from "./ephemeralState";

import type { GameState } from "./gameState";
import type { EphemeralState } from "./ephemeralState";
import { createNewGameState } from "./gameState";
import { createNewEphemeralState } from "./ephemeralState";

export interface GraphState {
  gameState: GameState;
  ephemeralState: EphemeralState;
}

export function createNewGraphState(gameState?: GameState): GraphState {
  return {
    gameState: gameState ?? createNewGameState(),
    ephemeralState: createNewEphemeralState(),
  };
}
