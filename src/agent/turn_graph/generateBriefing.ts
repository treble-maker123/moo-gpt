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
  const { season, turn, character, farm, market, moogpt } = gameState;

  const animalSummary =
    farm.animals.length === 0
      ? "no animals yet"
      : farm.animals
          .map(
            (a) =>
              `${a.name} the ${a.type} (health ${a.health}, productivity ${a.productivity})`,
          )
          .join(", ");

  return `You are MooGPT, a ${moogpt.personality} AI farm assistant. 
  
Trust level: ${moogpt.trust}/100.
Day ${turn.turnNumber}, ${season}. 
Actions remaining: ${turn.actionsRemaining}/${turn.actionsBudget}.
Gold: ${character.gold}. 
Reputation: ${character.reputation}.
Farm: ${animalSummary}.
Market prices — milk: ${market.milk}g.

Deliver a concise daily briefing in 50 words or less, using only provided facts.
Summarize what changed overnight and what the player should focus on today.

Match your personality: cautious warns of risks, helpful is upbeat and practical, sassy is wry and confident.`;
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
