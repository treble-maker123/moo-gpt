import { describe, expect, it } from "vitest";
import { createNewGameState } from "@/engine/types";

describe("createNewGameState", () => {
  it("returns the default starting state", () => {
    const state = createNewGameState();

    expect(state).toEqual({
      season: "spring",
      turn: {
        turnNumber: 1,
        actionsRemaining: 3,
        actionsBudget: 3,
      },
      character: {
        gold: 25,
        reputation: 60,
      },
      moogpt: {
        trust: 90,
        personality: "sassy",
        specializations: [],
      },
      farm: {
        animals: [
          expect.objectContaining({
            id: "cow-1",
            type: "cow",
            health: 80,
            productivity: 1,
            age: 1,
            mood: 80,
          }),
        ],
        limits: {
          cow: 3,
        },
        items: [
          {
            type: "hay",
            quantity: 3,
          },
        ],
      },
      market: {
        milk: 2,
        hay: 2,
      },
      journalEntries: [],
      decisions: [],
    });
  });
});
