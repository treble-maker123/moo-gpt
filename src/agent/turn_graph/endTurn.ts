import type { GraphState, GraphUpdate } from "@/agent/state";
import type { Season } from "@/engine/types";

const SEASONS: Season[] = ["spring", "summer", "autumn", "winter"];

// Pure TS — no LLM. Runs only at end-of-turn as part of the parallel fan-out.
// Increments turnNumber, resets actionsRemaining, advances season every 30
// turns, ticks animal ages, and applies passive productivity changes.
export function endTurn(state: GraphState): GraphUpdate {
  const gs = state.gameState;
  const nextTurnNumber = gs.turn.turnNumber + 1;

  const currentSeasonIndex = SEASONS.indexOf(gs.season);
  const nextSeason: Season =
    nextTurnNumber % 30 === 0
      ? SEASONS[(currentSeasonIndex + 1) % SEASONS.length]
      : gs.season;

  const animals = gs.farm.animals.map((a) => ({
    ...a,
    age: a.age + 1,
    productivity: Math.max(0, a.productivity + (a.health > 80 ? 0.1 : a.health < 20 ? -0.1 : 0)),
  }));

  return {
    gameState: {
      ...gs,
      season: nextSeason,
      turn: {
        ...gs.turn,
        turnNumber: nextTurnNumber,
        actionsRemaining: gs.turn.actionsBudget,
      },
      farm: { ...gs.farm, animals },
    },
  };
}
