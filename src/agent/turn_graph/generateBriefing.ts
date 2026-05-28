import type { RunnableConfig } from "@langchain/core/runnables";
import {
  AIMessage,
  SystemMessage,
  HumanMessage,
} from "@langchain/core/messages";
import type { GraphState, GraphUpdate } from "@/agent/state";
import type { AppLLM } from "@/agent/llm";

function buildBriefingPrompt(state: GraphState): string {
  const { gameState } = state;
  const { season, turn, character, farm, moogpt } = gameState;

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

Day ${turn.turnNumber}, ${season}. 
Action budgets remaining: ${turn.actionsRemaining}/${turn.actionsBudget}.
Gold: ${character.gold}. 
Reputation: ${character.reputation}.
Farm: ${animalSummary}.

Deliver a concise daily briefing in 50 words or less, using only provided facts and do not provide any additional information.`;
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

  const systemPrompt = buildBriefingPrompt(state);
  const response = await llm.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage("Give me today's briefing."),
  ]);

  const text = typeof response.content === "string" ? response.content : "Moo.";

  return {
    messages: [new AIMessage(text)],
  };
}
