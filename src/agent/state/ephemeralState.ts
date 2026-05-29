import type { AnimalType, GameAction, ProductType } from "@/agent/state/types";

export type PlayerIntent =
  | { type: "buy_animal"; targets: [AnimalType]; name: string; rawText: string }
  | { type: "feed_animal"; targets: [string]; rawText: string }
  | { type: "sell_product"; targets: [ProductType]; quantity: number; rawText: string }
  | { type: "end_turn"; targets: []; rawText: string }
  | { type: "query"; targets: []; rawText: string }
  | { type: "clarify"; targets: []; rawText: string };

export interface StateDelta {
  type: GameAction;
  details: Record<string, unknown>;
}

export interface EphemeralState {
  // set by parse_intent, consumed by validate_action and generate_narrative; cleared by reset_turn_state
  currentIntent: PlayerIntent | null;
  // set by validate_action on failure, consumed by generate_narrative to produce a refusal; cleared by reset_turn_state
  validationError: string | null;
  // appended by execute_action; consumed by generate_narrative and generate_journal_entry; cleared by reset_turn_state
  appliedDeltas: StateDelta[];
  // pointer into GameState.decisions; set by generate_narrative when it presents a decision, cleared by resolve_decision
  pendingDecisionId: string | null;
  // set by execute_action when actionsRemaining hits 0, or when player explicitly ends turn; triggers end-of-turn fan-out
  shouldEndTurn: boolean;
  // accumulated across resolve_decision calls; applied and reset by update_assistant at end-of-turn
  pendingTrustDelta: number;
}

export function createNewEphemeralState(): EphemeralState {
  return {
    currentIntent: null,
    validationError: null,
    appliedDeltas: [],
    pendingDecisionId: null,
    shouldEndTurn: false,
    pendingTrustDelta: 0,
  };
}
