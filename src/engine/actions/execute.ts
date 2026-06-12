import type {
  Animal,
  AnimalType,
  EphemeralState,
  GameState,
  PlayerIntent,
  StateDelta,
} from "@/engine/types";

const ANIMAL_COST: Record<AnimalType, number> = { cow: 10 };

export interface ApplyActionResult {
  nextState: GameState;
  nextEphemeralState: EphemeralState;
  deltas: StateDelta[];
}

export function applyAction(
  state: GameState,
  intent: PlayerIntent,
  ephemeralState: EphemeralState,
): ApplyActionResult {
  if (intent.type === "query" || intent.type === "clarify") {
    throw new Error("applyAction called with non-executable intent");
  }

  const gs = state;
  const deltas = [...ephemeralState.appliedDeltas];
  let nextState = { ...gs };

  if (intent.type === "feed_animal") {
    const animalId = intent.targets[0];
    const animal = gs.farm.animals.find((a) => a.id === animalId)!;
    const healthAfter = Math.min(100, animal.health + 20);
    const moodAfter = Math.min(100, animal.mood + 10);
    nextState = {
      ...gs,
      farm: {
        ...gs.farm,
        animals: gs.farm.animals.map((a) =>
          a.id === animalId ? { ...a, health: healthAfter, mood: moodAfter } : a,
        ),
        items: gs.farm.items
          .map((it) => (it.type === "hay" ? { ...it, quantity: it.quantity - 1 } : it))
          .filter((it) => it.quantity > 0),
      },
    };
    deltas.push({
      type: "feed_animal",
      details: {
        animalId,
        animalName: animal.name,
        healthBefore: animal.health,
        healthAfter,
        moodBefore: animal.mood,
        moodAfter,
        hayUsed: 1,
      },
    });
  }

  if (intent.type === "sell_product") {
    const productType = intent.targets[0];
    const qty = intent.quantity;
    const pricePerUnit = gs.market[productType] ?? 0;
    const goldEarned = pricePerUnit * qty;
    nextState = {
      ...gs,
      character: { ...gs.character, gold: gs.character.gold + goldEarned },
      farm: {
        ...gs.farm,
        items: gs.farm.items
          .map((it) => (it.type === productType ? { ...it, quantity: it.quantity - qty } : it))
          .filter((it) => it.quantity > 0),
      },
    };
    deltas.push({
      type: "sell_product",
      details: { productType, quantity: qty, pricePerUnit, goldEarned },
    });
  }

  if (intent.type === "buy_animal") {
    const animalType = intent.targets[0];
    const cost = ANIMAL_COST[animalType] ?? 0;
    const newAnimal: Animal = {
      id: `${animalType}-${crypto.randomUUID().slice(0, 8)}`,
      name: intent.name,
      type: animalType,
      health: 80,
      productivity: 1,
      age: 1,
      mood: 70,
    };
    nextState = {
      ...gs,
      character: { ...gs.character, gold: gs.character.gold - cost },
      farm: { ...gs.farm, animals: [...gs.farm.animals, newAnimal] },
    };
    deltas.push({
      type: "buy_animal",
      details: {
        animalType,
        animalId: newAnimal.id,
        animalName: newAnimal.name,
        goldSpent: cost,
      },
    });
  }

  if (intent.type === "end_turn") {
    deltas.push({ type: "end_turn", details: {} });
  }

  const newActionsRemaining =
    intent.type === "end_turn" ? 0 : gs.turn.actionsRemaining - 1;
  const shouldEndTurn = newActionsRemaining <= 0;

  return {
    nextState: {
      ...nextState,
      turn: { ...gs.turn, actionsRemaining: newActionsRemaining },
    },
    nextEphemeralState: {
      ...ephemeralState,
      appliedDeltas: deltas,
      shouldEndTurn,
    },
    deltas,
  };
}
