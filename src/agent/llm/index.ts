import { ChatOllama } from "@langchain/ollama";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { SetupConfig } from "@/components/SetupModal";
import { MooLLM } from "./mooLlm";

export type AppLLM = BaseChatModel;

export { isMooMode } from "./mooLlm";

export const OLLAMA_MODEL = "qwen2.5";

export function createLlm(config: SetupConfig): AppLLM {
  if (config.mooMode || !config.ollamaEndpoint) {
    return new MooLLM();
  }
  return new ChatOllama({
    baseUrl: config.ollamaEndpoint,
    model: OLLAMA_MODEL,
  });
}
