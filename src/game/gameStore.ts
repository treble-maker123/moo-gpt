import { create } from "zustand";
import { HumanMessage } from "@langchain/core/messages";
import { graph } from "@/agent/turn_graph";
import { createNewGameState } from "@/agent/state";
import type { GameState } from "@/agent/state";
import { isMooMode } from "@/agent/llm";
import type { AppLLM } from "@/agent/llm";

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export type GamePhase = "user_turn" | "world_turn";

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

const GAME_STATE_KEY = "moogpt:gameState";

export function loadSavedGameState(): GameState | null {
  try {
    const raw = localStorage.getItem(GAME_STATE_KEY);
    if (raw) return JSON.parse(raw) as GameState;
  } catch (e) {
    console.warn("[gameStore] failed to load game state:", e);
  }
  return null;
}

function saveGameState(state: GameState) {
  try {
    localStorage.setItem(GAME_STATE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("[gameStore] failed to save game state:", e);
  }
}

function toDisplayMessages(rawMessages: unknown[]): ChatMessage[] {
  return (rawMessages as any[]) // eslint-disable-line @typescript-eslint/no-explicit-any
    .filter(m => m._getType() === "ai" || m._getType() === "human")
    .map(m => ({
      role: (m._getType() === "ai" ? "assistant" : "user") as ChatMessage["role"],
      text: typeof m.content === "string" ? m.content : "",
    }));
}

interface GameStore {
  phase: GamePhase;
  messages: ChatMessage[];
  gameState: GameState;
  isLoading: boolean;
  llm: AppLLM | null;
  threadId: string;

  setLlm: (llm: AppLLM) => void;
  startUserTurn: (initialGameState: GameState) => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
}

export const useGameStore = create<GameStore>((set, get) => ({
  phase: "user_turn",
  messages: [],
  gameState: createNewGameState(),
  isLoading: false,
  llm: null,
  threadId: "",

  setLlm(llm) {
    set({ llm });
  },

  async startUserTurn(initialGameState) {
    const { llm } = get();
    if (!llm) return;

    const threadId = crypto.randomUUID();
    set({ threadId, messages: [], gameState: initialGameState, isLoading: true });

    try {
      const result = await graph.invoke(
        { gameState: initialGameState },
        { configurable: { thread_id: threadId, llm } },
      );
      if (isMooMode(llm)) await sleep(800 + Math.random() * 700);
      set({
        messages: toDisplayMessages(result.messages ?? []),
        gameState: result.gameState ?? initialGameState,
      });
    } catch (err) {
      console.error("[gameStore] startUserTurn error:", err);
      set({ messages: [{ role: "assistant", text: "Moo. (Something went wrong starting the turn.)" }] });
    } finally {
      set({ isLoading: false });
    }
  },

  async sendMessage(text) {
    const { llm, threadId, isLoading } = get();
    if (!text.trim() || isLoading || !llm) return;

    set(s => ({ messages: [...s.messages, { role: "user", text }], isLoading: true }));

    try {
      const config = { configurable: { thread_id: threadId, llm } };
      const result = await graph.invoke({ messages: [new HumanMessage(text)] }, config);

      if (isMooMode(llm)) await sleep(800 + Math.random() * 700);
      const finalGameState = result.gameState as GameState;
      set({
        messages: toDisplayMessages(result.messages ?? []),
        gameState: finalGameState,
      });

      // Detect if the graph reached END (turn is over)
      const graphState = await graph.getState(config);
      if (graphState.next.length === 0) {
        saveGameState(finalGameState);
        set({ phase: "world_turn" });

        // World turn placeholder — transitions back immediately for now
        setTimeout(() => {
          set({ phase: "user_turn" });
          get().startUserTurn(finalGameState);
        }, 500);
      }
    } catch (err) {
      console.error("[gameStore] sendMessage error:", err);
      set(s => ({
        messages: [...s.messages, { role: "assistant", text: "Moo. (Something went wrong.)" }],
      }));
    } finally {
      set({ isLoading: false });
    }
  },
}));
