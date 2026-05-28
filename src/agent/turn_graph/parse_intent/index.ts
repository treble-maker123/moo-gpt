import type { RunnableConfig } from "@langchain/core/runnables";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import type { GraphState, GraphUpdate } from "@/agent/state";
import type { AppLLM } from "@/agent/llm";
import { isMooMode } from "@/agent/llm";
import type { LogLlmCall } from "@/agent/llm/llmCallLog";
import type { PlayerIntent } from "@/agent/state/ephemeralState";
import { VALID_ACTION_TYPES, buildActionList } from "@/agent/state/types";

function buildPrompt(state: GraphState): string {
  const { farm, market } = state.gameState;

  const animals =
    farm.animals.length === 0
      ? "none"
      : farm.animals
          .map((a) => `id=${a.id} name="${a.name}" type=${a.type}`)
          .join(", ");

  const products = Object.entries(market)
    .map(([k, v]) => `${k} (price: ${v}g)`)
    .join(", ");

  return `You convert a farm game player's message into a JSON PlayerIntent object.

Available actions:
${buildActionList()}

Current animals: ${animals}
Available products: ${products}

Reply with ONLY a JSON object, no markdown fences, no explanation:
{"type":"<type>","targets":["..."],"quantity":<number or null>,"rawText":"<player exact message>"}`;
}

function parseResponse(raw: string, rawText: string): PlayerIntent {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("no JSON");
    const parsed = JSON.parse(match[0]);
    const type = VALID_ACTION_TYPES.includes(parsed.type) ? parsed.type : "query";
    return {
      type,
      targets: Array.isArray(parsed.targets) ? parsed.targets.map(String) : [],
      quantity: typeof parsed.quantity === "number" ? parsed.quantity : undefined,
      rawText,
    };
  } catch {
    return { type: "query", targets: [], rawText };
  }
}

export async function parseIntent(
  state: GraphState,
  config: RunnableConfig,
): Promise<GraphUpdate> {
  const llm = config?.configurable?.llm as AppLLM | undefined;
  if (!llm)
    throw new Error(
      "No LLM in configurable — pass { configurable: { llm } } when invoking the graph.",
    );
  const logLlmCall = config?.configurable?.logLlmCall as LogLlmCall | undefined;

  const lastHuman = [...state.messages]
    .reverse()
    .find((m) => m._getType() === "human");
  const rawText =
    typeof lastHuman?.content === "string" ? lastHuman.content : "";

  // In moo mode the fake LLM can't classify — default to query
  if (isMooMode(llm)) {
    return {
      ephemeralState: {
        ...state.ephemeralState,
        currentIntent: { type: "query", targets: [], rawText },
      },
    };
  }

  const systemContent = buildPrompt(state);
  const humanContent = rawText || "(empty message)";

  const response = await llm.invoke([
    new SystemMessage(systemContent),
    new HumanMessage(humanContent),
  ]);

  const responseText =
    typeof response.content === "string" ? response.content : "";

  logLlmCall?.({
    id: crypto.randomUUID(),
    node: "parseIntent",
    timestamp: Date.now(),
    messages: [
      { role: "system", content: systemContent },
      { role: "human", content: humanContent },
    ],
    response: responseText,
  });

  const currentIntent = parseResponse(responseText, rawText);

  return { ephemeralState: { ...state.ephemeralState, currentIntent } };
}
