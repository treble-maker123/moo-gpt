import { HumanMessage } from "@langchain/core/messages";
import { graph } from "@/agent/turn_graph";
import { isMooMode } from "@/agent/llm";
import type { AppLLM } from "@/agent/llm";
import type { LlmCallRecord } from "@/agent/llm/llmCallLog";
import type {
  AgentEvent,
  AgentRuntime,
  RuntimeConfig,
  RuntimeLogger,
} from "@/agent/runtime";
import { createEmptyEphemeralState } from "@/engine/types";
import type { EphemeralState, GameState } from "@/engine/types";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

class InMemoryRuntimeLogger implements RuntimeLogger {
  #entries: LlmCallRecord[] = [];
  #listeners = new Set<() => void>();

  get entries(): LlmCallRecord[] {
    return this.#entries;
  }

  append(record: LlmCallRecord): void {
    this.#entries = [...this.#entries, record];
    this.#listeners.forEach((listener) => listener());
  }

  clear(): void {
    this.#entries = [];
    this.#listeners.forEach((listener) => listener());
  }

  subscribe(listener: () => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }
}

function toMessages(rawMessages: unknown[]): Array<{ role: "user" | "assistant"; text: string }> {
  return (rawMessages as any[]) // eslint-disable-line @typescript-eslint/no-explicit-any
    .filter((m) => m._getType() === "ai" || m._getType() === "human")
    .map((m) => ({
      role: (m._getType() === "ai" ? "assistant" : "user") as "user" | "assistant",
      text: typeof m.content === "string" ? m.content : "",
    }));
}

function latestAssistantText(rawMessages: unknown[]): string | null {
  const messages = toMessages(rawMessages);
  const assistant = [...messages].reverse().find((m) => m.role === "assistant");
  return assistant?.text ?? null;
}

export class LangGraphRuntime implements AgentRuntime {
  readonly logger = new InMemoryRuntimeLogger();
  #llm: AppLLM | null = null;
  #threadId = "";
  #listeners = new Set<(event: AgentEvent) => void>();

  configure(config: RuntimeConfig): void {
    this.#llm = config.llm;
    this.#threadId = config.threadId;
    this.logger.clear();
  }

  subscribe(listener: (event: AgentEvent) => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  #emit(event: AgentEvent): void {
    this.#listeners.forEach((listener) => listener(event));
  }

  async startTurn(state: GameState): Promise<void> {
    if (!this.#llm || !this.#threadId) {
      const message = "Runtime is not configured.";
      this.#emit({ type: "error", message });
      throw new Error(message);
    }

    this.logger.clear();
    this.#emit({ type: "turn_started" });

    try {
      const result = await graph.invoke(
        { gameState: state },
        {
          configurable: {
            thread_id: this.#threadId,
            llm: this.#llm,
            logger: this.logger,
          },
        },
      );

      if (isMooMode(this.#llm)) {
        await sleep(800 + Math.random() * 700);
      }

      const assistantText = latestAssistantText(result.messages ?? []);
      if (assistantText) {
        this.#emit({
          type: "message",
          role: "assistant",
          content: assistantText,
        });
      }

      this.#emit({
        type: "state_update",
        gameState: (result.gameState ?? state) as GameState,
        ephemeralState: (result.ephemeralState ?? createEmptyEphemeralState()) as EphemeralState,
      });

      this.#emit({ type: "turn_ended", gameOver: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown runtime error";
      this.#emit({ type: "error", message });
      throw error;
    }
  }

  async sendMessage(text: string): Promise<void> {
    if (!this.#llm || !this.#threadId) {
      const message = "Runtime is not configured.";
      this.#emit({ type: "error", message });
      throw new Error(message);
    }

    if (!text.trim()) {
      return;
    }

    try {
      this.#emit({ type: "turn_started" });

      const config = {
        configurable: {
          thread_id: this.#threadId,
          llm: this.#llm,
          logger: this.logger,
        },
      };

      await graph.updateState(config, { messages: [new HumanMessage(text)] });
      const result = await graph.invoke(null, config);

      if (isMooMode(this.#llm)) {
        await sleep(800 + Math.random() * 700);
      }

      const assistantText = latestAssistantText(result.messages ?? []);
      if (assistantText) {
        this.#emit({
          type: "message",
          role: "assistant",
          content: assistantText,
        });
      }

      const nextState = (result.gameState ?? null) as GameState | null;
      if (nextState) {
        this.#emit({
          type: "state_update",
          gameState: nextState,
          ephemeralState: (result.ephemeralState ?? createEmptyEphemeralState()) as EphemeralState,
        });
      }

      const graphState = await graph.getState(config);
      this.#emit({ type: "turn_ended", gameOver: graphState.next.length === 0 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown runtime error";
      this.#emit({ type: "error", message });
      throw error;
    }
  }
}
