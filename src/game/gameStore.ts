import { create } from "zustand";
import { HumanMessage } from "@langchain/core/messages";
import { graph } from "@/agent/turn_graph";
import { createNewGameState, createNewEphemeralState } from "@/agent/state";
import type { GameState, EphemeralState } from "@/agent/state";
import { isMooMode } from "@/agent/llm";
import type { AppLLM } from "@/agent/llm";
import type { LlmCallRecord } from "@/agent/llm/llmCallLog";

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export type GamePhase = "user_turn" | "world_turn";

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

const GAME_STATE_KEY = "moogpt:gameState";

function loadSavedGameState(): GameState | null {
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

function initGameState(): { gameState: GameState; gameStateSource: "new" | "loaded" } {
  const saved = loadSavedGameState();
  return saved
    ? { gameState: saved, gameStateSource: "loaded" }
    : { gameState: createNewGameState(), gameStateSource: "new" };
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
  ephemeralState: EphemeralState;
  llmCallLog: LlmCallRecord[];
  isLoading: boolean;
  llm: AppLLM | null;
  threadId: string;
  gameStateSource: "new" | "loaded";

  setLlm: (llm: AppLLM) => void;
  startUserTurn: () => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
}

export const useGameStore = create<GameStore>((set, get) => ({
  phase: "user_turn",
  messages: [],
  ...initGameState(),
  ephemeralState: createNewEphemeralState(),
  llmCallLog: [],
  isLoading: false,
  llm: null,
  threadId: "",

  setLlm(llm) {
    set({ llm });
  },

  async startUserTurn() {
    const { llm, gameState } = get();
    if (!llm) return;

    const threadId = crypto.randomUUID();
    set({ threadId, messages: [], llmCallLog: [], isLoading: true });

    const logLlmCall = (record: LlmCallRecord) =>
      set(s => ({ llmCallLog: [...s.llmCallLog, record] }));

    try {
      const result = await graph.invoke(
        { gameState },
        { configurable: { thread_id: threadId, llm, logLlmCall } },
      );
      if (isMooMode(llm)) await sleep(800 + Math.random() * 700);
      set({
        messages: toDisplayMessages(result.messages ?? []),
        gameState: result.gameState ?? gameState,
        ephemeralState: result.ephemeralState ?? createNewEphemeralState(),
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

    const logLlmCall = (record: LlmCallRecord) =>
      set(s => ({ llmCallLog: [...s.llmCallLog, record] }));

    try {
      const config = { configurable: { thread_id: threadId, llm, logLlmCall } };
      // updateState appends the human message to the interrupted checkpoint,
      // then invoke(null) resumes from the interrupt point without restarting the graph.
      // Passing a non-null state update directly to invoke() causes LangGraph to
      // restart from START instead of resuming.
      await graph.updateState(config, { messages: [new HumanMessage(text)] });
      const result = await graph.invoke(null, config);

      if (isMooMode(llm)) await sleep(800 + Math.random() * 700);
      const finalGameState = result.gameState as GameState;
      set({
        messages: toDisplayMessages(result.messages ?? []),
        gameState: finalGameState,
        ephemeralState: result.ephemeralState ?? createNewEphemeralState(),
      });

      const graphState = await graph.getState(config);
      if (graphState.next.length === 0) {
        saveGameState(finalGameState);
        set({ phase: "world_turn" });

        setTimeout(() => {
          set({ phase: "user_turn" });
          get().startUserTurn();
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
