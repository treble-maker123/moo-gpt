import { ChatOllama } from "@langchain/ollama";
import {
  BaseChatModel,
  type BaseChatModelParams,
} from "@langchain/core/language_models/chat_models";
import type { BaseLanguageModelCallOptions } from "@langchain/core/language_models/base";
import type { BaseMessage } from "@langchain/core/messages";
import { AIMessage } from "@langchain/core/messages";
import type {
  ChatResult,
} from "@langchain/core/outputs";
import type { SetupConfig } from "@/components/SetupModal";

// Fake chat model used in Moo Mode (no Ollama endpoint configured).
// Every call returns "Moo." regardless of input.
class MooLLM extends BaseChatModel<BaseLanguageModelCallOptions> {
  constructor(params?: BaseChatModelParams) {
    super(params ?? {});
  }

  _llmType() {
    return "moo";
  }

  async _generate(_messages: BaseMessage[]): Promise<ChatResult> {
    return {
      generations: [
        {
          text: "Moo.",
          message: new AIMessage("Moo."),
        },
      ],
    };
  }
}

export type AppLLM = ChatOllama | MooLLM;

export const OLLAMA_MODEL = "qwen2.5";

export function createLlm(config: SetupConfig): AppLLM {
  if (!config.ollamaEndpoint) {
    return new MooLLM();
  }
  return new ChatOllama({
    baseUrl: config.ollamaEndpoint,
    model: OLLAMA_MODEL,
  });
}

export function isMooMode(llm: AppLLM): boolean {
  return llm._llmType() === "moo";
}
