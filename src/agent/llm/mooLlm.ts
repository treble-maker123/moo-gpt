import {
  BaseChatModel,
  type BaseChatModelParams,
} from "@langchain/core/language_models/chat_models";
import type { BaseLanguageModelCallOptions } from "@langchain/core/language_models/base";
import type { BaseMessage } from "@langchain/core/messages";
import { AIMessage } from "@langchain/core/messages";
import type { ChatResult } from "@langchain/core/outputs";

// Fake chat model used in Moo Mode (no Ollama endpoint configured).
// Every call returns "Moo." regardless of input.
export class MooLLM extends BaseChatModel<BaseLanguageModelCallOptions> {
  constructor(params?: BaseChatModelParams) {
    super(params ?? {});
  }

  _llmType() {
    return "moo";
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

export function isMooMode(llm: BaseChatModel): boolean {
  return llm._llmType() === "moo";
}
