import type { GameState, Season } from "@/engine/types";

const SEASONS: Season[] = ["spring", "summer", "autumn", "winter"];

export function advanceTurn(state: GameState): GameState {
  const nextTurnNumber = state.turn.turnNumber + 1;

  const currentSeasonIndex = SEASONS.indexOf(state.season);
  const nextSeason: Season =
    nextTurnNumber % 30 === 0
      ? SEASONS[(currentSeasonIndex + 1) % SEASONS.length]
      : state.season;

  const animals = state.farm.animals.map((a) => ({
    ...a,
    age: a.age + 1,
    productivity: Math.max(
      0,
      a.productivity + (a.health > 80 ? 0.1 : a.health < 20 ? -0.1 : 0),
    ),
  }));

  return {
    ...state,
    season: nextSeason,
    turn: {
      ...state.turn,
      turnNumber: nextTurnNumber,
      actionsRemaining: state.turn.actionsBudget,
    },
    farm: { ...state.farm, animals },
  };
}
