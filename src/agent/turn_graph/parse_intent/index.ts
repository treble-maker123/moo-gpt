import type { RunnableConfig } from "@langchain/core/runnables";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import type { GraphState, GraphUpdate } from "@/agent/state";
import type { AppLLM } from "@/agent/llm";
import { isMooMode } from "@/agent/llm";
import type { PlayerIntent, AnimalType, ProductType } from "@/engine";
import { VALID_ACTION_TYPES, buildActionList } from "@/engine";

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

Reply with ONLY a JSON object matching the action type, no markdown fences, no explanation.
For buy_animal, set "name" to the exact name the player stated, or "" if they did not provide one. Do NOT invent a name.
Examples:
  buy_animal (name given):    {"type":"buy_animal","targets":["cow"],"name":"Bessie","rawText":"..."}
  buy_animal (no name given): {"type":"buy_animal","targets":["cow"],"name":"","rawText":"..."}
  feed_animal:  {"type":"feed_animal","targets":["<animalId>"],"rawText":"..."}
  sell_product: {"type":"sell_product","targets":["milk"],"quantity":3,"rawText":"..."}
  end_turn:     {"type":"end_turn","targets":[],"rawText":"..."}
  query:        {"type":"query","targets":[],"rawText":"..."}
  clarify:      {"type":"clarify","targets":[],"rawText":"..."}`;
}

function parseResponse(raw: string, rawText: string): PlayerIntent {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("no JSON");
    const parsed = JSON.parse(match[0]);
    const type = VALID_ACTION_TYPES.includes(parsed.type) ? parsed.type : "query";
    const targets = Array.isArray(parsed.targets) ? parsed.targets.map(String) : [];

    if (type === "buy_animal") {
      return { type, targets: [targets[0] as AnimalType], name: parsed.name ?? "", rawText };
    }
    if (type === "feed_animal") {
      return { type, targets: [targets[0] ?? ""], rawText };
    }
    if (type === "sell_product") {
      return { type, targets: [targets[0] as ProductType], quantity: typeof parsed.quantity === "number" ? parsed.quantity : 0, rawText };
    }
    if (type === "end_turn") {
      return { type, targets: [], rawText };
    }
    return { type: type as "query" | "clarify", targets: [], rawText };
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
  const logger = config?.configurable?.logger as
    | {
        append: (record: {
          id: string;
          node: string;
          timestamp: number;
          messages: Array<{ role: string; content: string }>;
          response: string;
        }) => void;
      }
    | undefined;

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

  logger?.append({
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
