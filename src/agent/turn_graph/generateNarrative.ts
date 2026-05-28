import type { RunnableConfig } from "@langchain/core/runnables";
import {
  AIMessage,
  SystemMessage,
  HumanMessage,
} from "@langchain/core/messages";
import type { GraphState, GraphUpdate } from "@/agent/state";
import type { AppLLM } from "@/agent/llm";
import type { LogLlmCall } from "@/agent/llm/llmCallLog";

// LLM call — free prose, in-character. Handles four paths:
//   1. query       — player asked a question; answer it from game state
//   2. clarify     — player's message was ambiguous; ask a follow-up
//   3. validationError — action was invalid; warm refusal
//   4. appliedDeltas   — action succeeded; narrate what happened
// Appends an AIMessage to messages, then the graph interrupts.

function buildSystemPrompt(state: GraphState): string {
  const { turn, character, farm, moogpt } = state.gameState;
  const { currentIntent, appliedDeltas, validationError } =
    state.ephemeralState;

  const animalSummary =
    farm.animals.length === 0
      ? "no animals yet"
      : farm.animals
          .map(
            (a) =>
              `${a.name} the ${a.type} (health ${a.health}, productivity ${a.productivity})`,
          )
          .join(", ");

  const context = `You are MooGPT, an AI farm assistant for a farming game.

Your current personality: ${moogpt.personality}.
Personality guide: cautious warns of risks, helpful is upbeat and practical, sassy is wry and confident.

Current state — Day ${turn.turnNumber}, actions remaining: ${turn.actionsRemaining}/${turn.actionsBudget}, gold: ${character.gold}, reputation: ${character.reputation}.
Farm: ${animalSummary}.`;

  if (validationError) {
    return `${context}

The player attempted an action that is not allowed: ${validationError}
Refuse warmly in 1-2 sentences, staying in character. Do not suggest workarounds.`;
  }

  if (appliedDeltas.length > 0) {
    const deltaLines = appliedDeltas
      .map((d) => `${d.type}: ${JSON.stringify(d.details)}`)
      .join("\n");
    return `${context}

The following actions were just applied to the farm:
${deltaLines}

Narrate what happened in 1-2 sentences, in character. Mention concrete outcomes (names, numbers) where available.`;
  }

  if (currentIntent?.type === "query") {
    return `${context}

The player has asked a question about the farm. Answer it directly using only the facts above. Keep the response concise (2-3 sentences max).`;
  }

  if (currentIntent?.type === "clarify") {
    return `${context}

The player's message was ambiguous. Ask a single clarifying follow-up question in character to figure out what they want to do.`;
  }

  // fallback — no specific context
  return `${context}

Respond helpfully to the player's message in character. Keep it concise.`;
}

export async function generateNarrative(
  state: GraphState,
  config: RunnableConfig,
): Promise<GraphUpdate> {
  const llm = config?.configurable?.llm as AppLLM | undefined;
  if (!llm)
    throw new Error(
      "No LLM in configurable — pass { configurable: { llm } } when invoking the graph.",
    );
  const logLlmCall = config?.configurable?.logLlmCall as LogLlmCall | undefined;

  const systemContent = buildSystemPrompt(state);
  const rawText = state.ephemeralState.currentIntent?.rawText ?? "(no message)";

  const response = await llm.invoke([
    new SystemMessage(systemContent),
    new HumanMessage(rawText),
  ]);

  const text = typeof response.content === "string" ? response.content : "Moo.";

  logLlmCall?.({
    id: crypto.randomUUID(),
    node: "generateNarrative",
    timestamp: Date.now(),
    messages: [
      { role: "system", content: systemContent },
      { role: "human", content: rawText },
    ],
    response: text,
  });

  return {
    messages: [new AIMessage(text)],
  };
}
