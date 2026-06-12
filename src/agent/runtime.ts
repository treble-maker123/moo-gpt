import type { GameState, EphemeralState } from "@/engine";
import type { AppLLM } from "@/agent/llm";
import type { LlmCallRecord } from "@/agent/llm/llmCallLog";

export interface AgentMessage {
  role: "user" | "assistant";
  text: string;
}

export interface RuntimeConfig {
  llm: AppLLM;
}

export interface RuntimeResult {
  messages: AgentMessage[];
  gameState: GameState;
  ephemeralState: EphemeralState;
  gameOver: boolean;
}

export interface RuntimeLogger {
  readonly entries: LlmCallRecord[];
  append(record: LlmCallRecord): void;
  clear(): void;
  subscribe(listener: () => void): () => void;
}

export interface AgentRuntime {
  configure(config: RuntimeConfig): void;
  startTurn(state: GameState): Promise<RuntimeResult>;
  sendMessage(text: string): Promise<RuntimeResult>;
  readonly logger: RuntimeLogger;
  readonly threadId: string;
}
