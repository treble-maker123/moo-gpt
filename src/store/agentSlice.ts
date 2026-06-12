import type { StateCreator } from "zustand";
import { LangGraphRuntime } from "@/agent/LangGraphRuntime";
import type { AgentSlice, GameStore } from "@/store/types";
import { createEmptyEphemeralState, createEmptyGameState } from "@/engine";

export const createAgentSlice: StateCreator<GameStore, [], [], AgentSlice> = (set, get) => ({
  runtime: new LangGraphRuntime(),
  llm: null,
  threadId: "",

  setLlm(llm) {
    const runtime = get().runtime;
    runtime.configure({ llm });
    set({ llm });
  },

  async startUserTurn() {
    const { runtime, gameState, llm } = get();
    if (!llm) return;

    set({ phase: "world_turn", isLoading: true, threadId: "" });

    try {
      const result = await runtime.startTurn(gameState);
      set({
        threadId: runtime.threadId,
        messages: result.messages,
        gameState: result.gameState,
        ephemeralState: result.ephemeralState,
        phase: "user_turn",
      });
    } catch (error) {
      console.error("[store] startUserTurn error:", error);
      set({
        messages: [{ role: "assistant", text: "Moo. (Something went wrong starting the turn.)" }],
      });
    } finally {
      set({ isLoading: false });
    }
  },

  async sendMessage(text) {
    const { runtime, isLoading, llm } = get();
    if (!text.trim() || isLoading || !llm) return;

    set((state) => ({
      messages: [...state.messages, { role: "user", text }],
      isLoading: true,
    }));

    try {
      const result = await runtime.sendMessage(text);
      set({
        messages: result.messages,
        gameState: result.gameState,
        ephemeralState: result.ephemeralState,
        phase: result.gameOver ? "game_over" : "user_turn",
      });
    } catch (error) {
      console.error("[store] sendMessage error:", error);
      set((state) => ({
        messages: [...state.messages, { role: "assistant", text: "Moo. (Something went wrong.)" }],
      }));
    } finally {
      set({ isLoading: false });
    }
  },

  resetGame() {
    const runtime = new LangGraphRuntime();
    const { llm } = get();
    if (llm) runtime.configure({ llm });
    set({
      runtime,
      phase: "user_turn",
      messages: [],
      gameState: createEmptyGameState(),
      ephemeralState: createEmptyEphemeralState(),
      gameStateSource: "new",
      threadId: "",
      isLoading: false,
    });
  },
});
