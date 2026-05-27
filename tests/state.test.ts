import { describe, expect, it } from "vitest";
import { createEmptyGameState } from "@/agent/state";

describe("createEmptyGameState", () => {
  it("returns the default starting state", () => {
    const state = createEmptyGameState();

    expect(state).toEqual({
      season: "spring",
      turn: {
        turnNumber: 1,
        actionsRemaining: 3,
        actionsBudget: 3,
      },
      character: {
        gold: 25,
        reputation: 0,
      },
      moogpt: {
        trust: 50,
        personality: "helpful",
        specializations: [],
      },
      farm: {
        animals: [],
      },
      market: {
        milk: 0,
        hay: 0,
      },
      journalEntries: [],
      decisions: [],
    });
  });
});
