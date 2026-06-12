import type { StateCreator } from "zustand";
import { createEmptyEphemeralState, createEmptyGameState } from "@/engine";
import type { GameSlice, GameStore } from "@/store/types";

export const createGameSlice: StateCreator<GameStore, [], [], GameSlice> = () => ({
  messages: [],
  gameState: createEmptyGameState(),
  ephemeralState: createEmptyEphemeralState(),
  gameStateSource: "new",
});
