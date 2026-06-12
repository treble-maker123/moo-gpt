import type { GameState, EphemeralState } from "@/engine/types";
import type { AppLLM } from "@/agent/llm";
import type { LlmCallRecord } from "@/agent/llm/llmCallLog";

export interface RuntimeConfig {
  llm: AppLLM;
  threadId: string;
}

export type AgentEvent =
  | { type: "turn_started" }
  | { type: "message"; role: "assistant"; content: string }
  | {
      type: "state_update";
      gameState: GameState;
      ephemeralState: EphemeralState;
    }
  | { type: "turn_ended"; gameOver: boolean }
  | { type: "error"; message: string };

export interface RuntimeLogger {
  readonly entries: LlmCallRecord[];
  append(record: LlmCallRecord): void;
  clear(): void;
  subscribe(listener: () => void): () => void;
}

export interface AgentRuntime {
  configure(config: RuntimeConfig): void;
  startTurn(state: GameState): Promise<void>;
  sendMessage(text: string): Promise<void>;
  subscribe(listener: (event: AgentEvent) => void): () => void;
  readonly logger: RuntimeLogger;
}

export interface InternalRuntimeSnapshot {
  gameState: GameState;
  ephemeralState: EphemeralState;
}
