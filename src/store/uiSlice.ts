import type { StateCreator } from "zustand";
import type { UiSlice, GameStore } from "@/store/types";

export const createUiSlice: StateCreator<GameStore, [], [], UiSlice> = () => ({
  phase: "user_turn",
  isLoading: false,
  gameOver: false,
});
