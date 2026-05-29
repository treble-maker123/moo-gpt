import type { GraphState, GraphUpdate } from "@/agent/state";
import type { Animal } from "@/agent/state/gameState";
import type { AnimalType, ProductType } from "@/agent/state/types";

const ANIMAL_COST: Record<AnimalType, number> = { cow: 10 };

const COW_NAMES = [
  "Thrall", "Rexxar", "Nazgrel", "Drek'Thar", "Vol'jin",
  "Rokhan", "Chen", "Eitrigg", "Saurfang", "Gazlowe",
];

function pickCowName(existing: Animal[]): string {
  const used = new Set(existing.map((a) => a.name));
  const available = COW_NAMES.filter((n) => !used.has(n));
  const pool = available.length > 0 ? available : COW_NAMES;
  return pool[Math.floor(Math.random() * pool.length)];
}

// Pure TS — no LLM. Applies the validated GameAction to gameState, appends to
// appliedDeltas, decrements actionsRemaining, and sets shouldEndTurn when it
// hits 0.
export function executeAction(state: GraphState): GraphUpdate {
  const { currentIntent } = state.ephemeralState;
  if (!currentIntent || currentIntent.type === "query" || currentIntent.type === "clarify") {
    throw new Error("executeAction called with no executable intent");
  }

  const { type, targets, quantity } = currentIntent;
  const gs = state.gameState;
  const appliedDeltas = [...state.ephemeralState.appliedDeltas];

  let nextGs = { ...gs };

  if (type === "feed_animal") {
    const animalId = targets[0];
    const animal = gs.farm.animals.find((a) => a.id === animalId)!;
    const healthAfter = Math.min(100, animal.health + 20);
    const moodAfter = Math.min(100, animal.mood + 10);
    nextGs = {
      ...gs,
      farm: {
        ...gs.farm,
        animals: gs.farm.animals.map((a) =>
          a.id === animalId ? { ...a, health: healthAfter, mood: moodAfter } : a
        ),
      },
    };
    appliedDeltas.push({
      type: "feed_animal",
      details: {
        animalId,
        animalName: animal.name,
        healthBefore: animal.health,
        healthAfter,
        moodBefore: animal.mood,
        moodAfter,
      },
    });
  }

  if (type === "sell_product") {
    const productType = targets[0] as ProductType;
    const qty = quantity ?? 1;
    const pricePerUnit = gs.market[productType] ?? 0;
    const goldEarned = pricePerUnit * qty;
    nextGs = {
      ...gs,
      character: { ...gs.character, gold: gs.character.gold + goldEarned },
      farm: {
        ...gs.farm,
        items: gs.farm.items
          .map((it) => it.type === productType ? { ...it, quantity: it.quantity - qty } : it)
          .filter((it) => it.quantity > 0),
      },
    };
    appliedDeltas.push({
      type: "sell_product",
      details: { productType, quantity: qty, pricePerUnit, goldEarned },
    });
  }

  if (type === "buy_animal") {
    const animalType = targets[0] as AnimalType;
    const cost = ANIMAL_COST[animalType] ?? 0;
    const newAnimal: Animal = {
      id: `${animalType}-${crypto.randomUUID().slice(0, 8)}`,
      name: pickCowName(gs.farm.animals),
      type: animalType,
      health: 80,
      productivity: 1,
      age: 1,
      mood: 70,
    };
    nextGs = {
      ...gs,
      character: { ...gs.character, gold: gs.character.gold - cost },
      farm: { ...gs.farm, animals: [...gs.farm.animals, newAnimal] },
    };
    appliedDeltas.push({
      type: "buy_animal",
      details: { animalType, animalId: newAnimal.id, animalName: newAnimal.name, goldSpent: cost },
    });
  }

  if (type === "end_turn") {
    appliedDeltas.push({ type: "end_turn", details: {} });
  }

  const newActionsRemaining = type === "end_turn" ? 0 : gs.turn.actionsRemaining - 1;
  const shouldEndTurn = newActionsRemaining <= 0;

  return {
    gameState: {
      ...nextGs,
      turn: { ...gs.turn, actionsRemaining: newActionsRemaining },
    },
    ephemeralState: {
      ...state.ephemeralState,
      appliedDeltas,
      shouldEndTurn,
    },
  };
}
