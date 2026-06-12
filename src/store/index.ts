import { create } from "zustand";
import type { GameStore } from "@/store/types";
import { createGameSlice } from "@/store/gameSlice";
import { createUiSlice } from "@/store/uiSlice";
import { createAgentSlice } from "@/store/agentSlice";

export type { ChatMessage, GamePhase } from "@/store/types";
export { createGameSlice, createUiSlice, createAgentSlice };

export const useGameStore = create<GameStore>()((...args) => ({
  ...createGameSlice(...args),
  ...createUiSlice(...args),
  ...createAgentSlice(...args),
}));
