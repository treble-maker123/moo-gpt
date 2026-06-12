import type { RunnableConfig } from "@langchain/core/runnables";
import {
  AIMessage,
  SystemMessage,
  HumanMessage,
} from "@langchain/core/messages";
import type { GraphState, GraphUpdate } from "@/agent/state";
import type { AppLLM } from "@/agent/llm";
import { PERSONALITY_TRAITS } from "@/engine";

function buildBriefingPrompt(state: GraphState): string {
  const { gameState } = state;
  const { turn, character, farm, moogpt } = gameState;

  const animalSummary =
    farm.animals.length === 0
      ? "no animals yet"
      : farm.animals
          .map(
            (a) =>
              `${a.name} the ${a.type} (health ${a.health}, productivity ${a.productivity})`,
          )
          .join(", ");

  return `You are MooGPT, an AI farm assistant for a farming game.

Your current personality: ${moogpt.personality}.
Explanation of personality: cautious warns of risks, helpful is upbeat and practical, sassy is wry and confident.

About the game:

1. The game currently only supports cows.

Facts:

Day ${turn.turnNumber}. 
Action budgets remaining: ${turn.actionsRemaining}/${turn.actionsBudget}.
Gold: ${character.gold}. 
Reputation: ${character.reputation}.
Farm: ${animalSummary}.`;
}

export async function generateBriefing(
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

  const systemPrompt = buildBriefingPrompt(state);
  const promptMessages = [
    { role: "system", content: systemPrompt },
    {
      role: "human",
      content:
        "Deliver a concise daily briefing in 50 words or less for the player, using only provided facts and do not provide any additional information, and ask the player what actions they would like to take next.",
    },
  ] as const;
  const response = await llm.invoke([
    new SystemMessage(promptMessages[0].content),
    new HumanMessage(promptMessages[1].content),
  ]);

  const text = typeof response.content === "string" ? response.content : "Moo.";

  logger?.append({
    id: crypto.randomUUID(),
    node: "generateBriefing",
    timestamp: Date.now(),
    messages: [...promptMessages],
    response: text,
  });

  return {
    messages: [new AIMessage(text)],
  };
}
