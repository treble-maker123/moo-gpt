export {
  ACTION_DEFS,
  PERSONALITY_TRAITS,
  VALID_ACTION_TYPES,
  VALID_ANIMAL_TYPES,
  VALID_PRODUCT_TYPES,
  buildActionList,
  createEmptyEphemeralState,
  createEmptyGameState,
  createNewEphemeralState,
  createNewGameState,
} from "@/engine/types";
export type {
  ActionDef,
  Animal,
  AnimalType,
  Character,
  ConversationMove,
  Decision,
  DecisionDelta,
  DecisionOption,
  DecisionResolution,
  EphemeralState,
  Farm,
  FarmItem,
  GameAction,
  GameState,
  JournalEntry,
  Mood,
  MooGPT,
  Personality,
  PlayerIntent,
  ProductType,
  Season,
  Specialization,
  StateDelta,
  Turn,
  ValidationResult,
} from "@/engine/types";
export { applyAction } from "@/engine/actions/execute";
export { validateAction } from "@/engine/actions/validate";
export { advanceTurn } from "@/engine/turn";

import { applyAction as applyActionRule } from "@/engine/actions/execute";
import { validateAction as validateActionRule } from "@/engine/actions/validate";
import { advanceTurn as advanceTurnRule } from "@/engine/turn";
import { createEmptyGameState } from "@/engine/types";
import type { EphemeralState, GameState, PlayerIntent, ValidationResult } from "@/engine/types";

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
    return advanceTurnRule(state);
  }
}

export const gameEngine = new GameEngine();
