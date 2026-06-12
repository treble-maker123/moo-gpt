import type { AgentRuntime } from "@/agent/runtime";
import type { AppLLM } from "@/agent/llm";
import type { EphemeralState, GameState } from "@/engine";

export type GamePhase = "user_turn" | "world_turn" | "game_over";

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

export interface GameSlice {
  messages: ChatMessage[];
  gameState: GameState;
  ephemeralState: EphemeralState;
  gameStateSource: "new" | "loaded";
}

export interface UiSlice {
  phase: GamePhase;
  isLoading: boolean;
  gameOver: boolean;
}

export interface AgentSlice {
  runtime: AgentRuntime;
  llm: AppLLM | null;
  configure: (config: { llm: AppLLM }) => void;
  startTurn: () => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  resetGame: () => void;
}

export type GameStore = GameSlice & UiSlice & AgentSlice;
