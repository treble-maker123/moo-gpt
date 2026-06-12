import type { GraphState, GraphUpdate } from "@/agent/state";
import { VALID_ANIMAL_TYPES, VALID_PRODUCT_TYPES } from "@/engine/types";

// Pure TS — no LLM. Checks that the parsed GameAction is legal given current
// game state. Sets ephemeralState.validationError on failure.
export function validateAction(state: GraphState): GraphUpdate {
  const { currentIntent } = state.ephemeralState;

  const fail = (validationError: string): GraphUpdate => ({
    ephemeralState: { ...state.ephemeralState, validationError },
  });
  const pass = (): GraphUpdate => ({
    ephemeralState: { ...state.ephemeralState, validationError: null },
  });

  // TODO: is this right?
  if (!currentIntent) {
    return fail("No action to validate.");
  }

  const { type } = currentIntent;

  // TODO: this shouldn't happen because of graph routing
  // leaving it here for now, will need to clean it up
  if (type === "query" || type === "clarify") {
    return pass();
  }

  if (state.gameState.turn.actionsRemaining <= 0) {
    return fail("No actions remaining this turn.");
  }

  if (type === "feed_animal") {
    const animalId = currentIntent.targets[0];
    if (!animalId) {
      return fail("feed_animal requires a target animal ID.");
    }
    const exists = state.gameState.farm.animals.some((a) => a.id === animalId);
    if (!exists) {
      return fail(`Animal "${animalId}" not found on your farm.`);
    }
    const hay = state.gameState.farm.items.find((it) => it.type === "hay");
    if (!hay || hay.quantity < 1) {
      return fail("You don't have any hay to feed with.");
    }
  }

  if (type === "sell_product") {
    const productType = currentIntent.targets[0];
    if (!productType || !VALID_PRODUCT_TYPES.includes(productType)) {
      return fail(
        `Invalid product type. Valid types: ${VALID_PRODUCT_TYPES.join(", ")}.`,
      );
    }
    if (currentIntent.quantity <= 0) {
      return fail("sell_product requires a positive quantity.");
    }
  }

  if (type === "buy_animal") {
    const animalType = currentIntent.targets[0];
    if (!animalType || !VALID_ANIMAL_TYPES.includes(animalType)) {
      return fail(
        `Invalid animal type. Valid types: ${VALID_ANIMAL_TYPES.join(", ")}.`,
      );
    }
    if (!currentIntent.name) {
      return fail("New animal needs a name!");
    }
    const currentCount = state.gameState.farm.animals.filter(
      (a) => a.type === animalType,
    ).length;
    const limit = state.gameState.farm.limits[animalType] ?? 0;
    if (currentCount >= limit) {
      return fail(`Farm is at capacity for ${animalType} (limit: ${limit}).`);
    }
  }

  return pass();
}
