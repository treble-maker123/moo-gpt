export * from "@/engine/types";
export { createEmptyGameState, createEmptyEphemeralState } from "@/engine/types";
export { createNewGameState, createNewEphemeralState } from "@/engine/types";
export { validateAction } from "@/engine/actions/validate";
export { applyAction } from "@/engine/actions/execute";
export { advanceTurn } from "@/engine/turn";

import { advanceTurn } from "@/engine/turn";
import { applyAction as applyActionRule } from "@/engine/actions/execute";
import { validateAction as validateActionRule } from "@/engine/actions/validate";
import type { GameState, PlayerIntent } from "@/engine/types";
import type { ValidationResult } from "@/engine/types";
import { createEmptyGameState } from "@/engine/types";
import type { EphemeralState } from "@/engine/types";

export class GameEngine {
  getInitialState(): GameState {
    return createEmptyGameState();
  }

  validateAction(state: GameState, action: PlayerIntent | null): ValidationResult {
    return validateActionRule(state, action);
  }

  applyAction(state: GameState, action: PlayerIntent, ephemeralState: EphemeralState) {
    return applyActionRule(state, action, ephemeralState);
  }

  advanceTurn(state: GameState): GameState {
    return advanceTurn(state);
  }
}

export const gameEngine = new GameEngine();
