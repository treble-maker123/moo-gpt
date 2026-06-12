import type { StateCreator } from "zustand";
import { LangGraphRuntime } from "@/agent/LangGraphRuntime";
import type { AgentEvent, RuntimeConfig } from "@/agent/runtime";
import type { AgentSlice, GameStore } from "@/store/types";
import { createEmptyEphemeralState, createEmptyGameState } from "@/engine";

let runtimeSubscription: (() => void) | null = null;
let nextThreadId = 1;

function createRuntimeConfig(llm: RuntimeConfig["llm"]): RuntimeConfig {
  return {
    llm,
    threadId: `thread-${nextThreadId++}`,
  };
}

function applyRuntimeEvent(set: Parameters<StateCreator<GameStore>>[0], event: AgentEvent) {
  switch (event.type) {
    case "turn_started":
      set((state) => ({
        phase: "world_turn",
        isLoading: true,
        gameOver: false,
        messages: state.messages.length === 0 ? [] : state.messages,
      }));
      return;
    case "message":
      set((state) => ({
        messages: [...state.messages, { role: "assistant", text: event.content }],
      }));
      return;
    case "state_update":
      set({
        gameState: event.gameState,
        ephemeralState: event.ephemeralState,
      });
      return;
    case "turn_ended":
      set({
        phase: event.gameOver ? "game_over" : "user_turn",
        isLoading: false,
        gameOver: event.gameOver,
      });
      return;
    case "error":
      set((state) => ({
        messages: [...state.messages, { role: "assistant", text: "Moo. (Something went wrong.)" }],
        phase: "user_turn",
        isLoading: false,
        gameOver: false,
      }));
      return;
  }
}

function attachRuntime(runtime: LangGraphRuntime, set: Parameters<StateCreator<GameStore>>[0]) {
  runtimeSubscription?.();
  runtimeSubscription = runtime.subscribe((event) => applyRuntimeEvent(set, event));
}

export const createAgentSlice: StateCreator<GameStore, [], [], AgentSlice> = (set, get) => ({
  runtime: new LangGraphRuntime(),
  llm: null,

  configure({ llm }) {
    const runtime = new LangGraphRuntime();
    runtime.configure(createRuntimeConfig(llm));
    attachRuntime(runtime, set);
    set({ runtime, llm, gameOver: false, phase: "user_turn", isLoading: false });
  },

  async startTurn() {
    const { runtime, llm } = get();
    if (!llm) return;

    try {
      await runtime.startTurn(get().gameState);
    } catch (error) {
      console.error("[store] startTurn error:", error);
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
      await runtime.sendMessage(text);
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
    const { llm } = get();
    const runtime = new LangGraphRuntime();

    if (llm) {
      runtime.configure(createRuntimeConfig(llm));
    }

    attachRuntime(runtime, set);
    set({
      runtime,
      phase: "user_turn",
      messages: [],
      gameState: createEmptyGameState(),
      ephemeralState: createEmptyEphemeralState(),
      gameStateSource: "new",
      isLoading: false,
      gameOver: false,
    });
  },
});
