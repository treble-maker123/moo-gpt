import { HumanMessage } from "@langchain/core/messages";
import { graph } from "@/agent/turn_graph";
import { isMooMode } from "@/agent/llm";
import type { AppLLM } from "@/agent/llm";
import type { LlmCallRecord } from "@/agent/llm/llmCallLog";
import type { AgentMessage, AgentRuntime, RuntimeConfig, RuntimeLogger, RuntimeResult } from "@/agent/runtime";
import { createEmptyEphemeralState } from "@/engine";
import type { EphemeralState, GameState } from "@/engine";

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

function toDisplayMessages(rawMessages: unknown[]): AgentMessage[] {
  return (rawMessages as any[]) // eslint-disable-line @typescript-eslint/no-explicit-any
    .filter((m) => m._getType() === "ai" || m._getType() === "human")
    .map((m) => ({
      role: (m._getType() === "ai" ? "assistant" : "user") as AgentMessage["role"],
      text: typeof m.content === "string" ? m.content : "",
    }));
}

export class LangGraphRuntime implements AgentRuntime {
  readonly logger = new InMemoryRuntimeLogger();
  #llm: AppLLM | null = null;
  #threadId = "";

  get threadId(): string {
    return this.#threadId;
  }

  configure(config: RuntimeConfig): void {
    this.#llm = config.llm;
  }

  async startTurn(state: GameState): Promise<RuntimeResult> {
    if (!this.#llm) {
      throw new Error("Runtime is not configured.");
    }

    this.logger.clear();
    this.#threadId = crypto.randomUUID();

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

    return {
      messages: toDisplayMessages(result.messages ?? []),
      gameState: (result.gameState ?? state) as GameState,
      ephemeralState: (result.ephemeralState ?? createEmptyEphemeralState()) as EphemeralState,
      gameOver: false,
    };
  }

  async sendMessage(text: string): Promise<RuntimeResult> {
    if (!this.#llm) {
      throw new Error("Runtime is not configured.");
    }

    if (!text.trim()) {
      throw new Error("Empty message");
    }

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

    const graphState = await graph.getState(config);
    const gameOver = graphState.next.length === 0;

    return {
      messages: toDisplayMessages(result.messages ?? []),
      gameState: result.gameState as GameState,
      ephemeralState: (result.ephemeralState ?? createEmptyEphemeralState()) as EphemeralState,
      gameOver,
    };
  }
}
