import type { GameState, PlayerIntent, ValidationResult } from "@/engine/types";
import { VALID_ANIMAL_TYPES, VALID_PRODUCT_TYPES } from "@/engine/types";

export function validateAction(state: GameState, intent: PlayerIntent | null): ValidationResult {
  if (!intent) {
    return { valid: false, reason: "No action to validate." };
  }

  const { type } = intent;

  if (type === "query" || type === "clarify") {
    return { valid: true };
  }

  if (state.turn.actionsRemaining <= 0) {
    return { valid: false, reason: "No actions remaining this turn." };
  }

  if (type === "feed_animal") {
    const animalId = intent.targets[0];
    if (!animalId) {
      return { valid: false, reason: "feed_animal requires a target animal ID." };
    }
    const exists = state.farm.animals.some((a) => a.id === animalId);
    if (!exists) {
      return { valid: false, reason: `Animal "${animalId}" not found on your farm.` };
    }
    const hay = state.farm.items.find((it) => it.type === "hay");
    if (!hay || hay.quantity < 1) {
      return { valid: false, reason: "You don't have any hay to feed with." };
    }
  }

  if (type === "sell_product") {
    const productType = intent.targets[0];
    if (!productType || !VALID_PRODUCT_TYPES.includes(productType)) {
      return { valid: false, reason: `Invalid product type. Valid types: ${VALID_PRODUCT_TYPES.join(", ")}.` };
    }
    if (intent.quantity <= 0) {
      return { valid: false, reason: "sell_product requires a positive quantity." };
    }
  }

  if (type === "buy_animal") {
    const animalType = intent.targets[0];
    if (!animalType || !VALID_ANIMAL_TYPES.includes(animalType)) {
      return { valid: false, reason: `Invalid animal type. Valid types: ${VALID_ANIMAL_TYPES.join(", ")}.` };
    }
    if (!intent.name) {
      return { valid: false, reason: "New animal needs a name!" };
    }
    const currentCount = state.farm.animals.filter((a) => a.type === animalType).length;
    const limit = state.farm.limits[animalType] ?? 0;
    if (currentCount >= limit) {
      return { valid: false, reason: `Farm is at capacity for ${animalType} (limit: ${limit}).` };
    }
  }

  return { valid: true };
}
