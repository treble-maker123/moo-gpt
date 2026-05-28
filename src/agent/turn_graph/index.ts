import { END, MemorySaver, START, StateGraph } from "@langchain/langgraph";
import { GraphAnnotation } from "@/agent/state";
import type { GraphState } from "@/agent/state";
import { generateBriefing } from "@/agent/turn_graph/generateBriefing";
import { parseIntent } from "@/agent/turn_graph/parse_intent";
import { validateAction } from "@/agent/turn_graph/validateAction";
import { executeAction } from "@/agent/turn_graph/executeAction";
import { generateNarrative } from "@/agent/turn_graph/generateNarrative";
import { resolveDecision } from "@/agent/turn_graph/resolveDecision";
import { generateJournalEntry } from "@/agent/turn_graph/generateJournalEntry";
import { surfaceDecisions } from "@/agent/turn_graph/surfaceDecisions";
import { endTurn } from "@/agent/turn_graph/endTurn";
import { updateAssistant } from "@/agent/turn_graph/updateAssistant";
import { resetTurnState } from "@/agent/turn_graph/resetTurnState";

// --- Routing helpers ---

function routeAfterInterrupt(
  state: GraphState,
): "resolve_decision" | "parse_intent" {
  return state.ephemeralState.pendingDecisionId
    ? "resolve_decision"
    : "parse_intent";
}

function routeAfterParseIntent(
  state: GraphState,
): "generate_narrative" | "validate_action" {
  const intent = state.ephemeralState.currentIntent;
  if (!intent || intent.type === "query" || intent.type === "clarify") {
    return "generate_narrative";
  }
  return "validate_action";
}

function routeAfterValidateAction(
  state: GraphState,
): "generate_narrative" | "execute_action" {
  return state.ephemeralState.validationError
    ? "generate_narrative"
    : "execute_action";
}

function routeAfterExecuteAction(
  state: GraphState,
): "generate_narrative" | "end_turn" {
  return state.ephemeralState.shouldEndTurn ? "end_turn" : "generate_narrative";
}

function routeAfterResolveDecision(
  state: GraphState,
): "parse_intent" | "generate_narrative" {
  return state.ephemeralState.currentIntent
    ? "parse_intent"
    : "generate_narrative";
}

// --- Graph definition ---

const workflow = new StateGraph(GraphAnnotation)
  .addNode("generate_briefing", generateBriefing, {
    metadata: {
      isLlm: true,
      purpose: "MooGPT delivers the daily briefing at the start of each turn.",
      characteristics:
        "LLM call. Summarizes what changed since the last turn: passive animal productivity ticks, market price shifts, any new Decision objects, and the current action budget. Tone follows moogpt.personality — concise, one or two paragraphs max. Appends the briefing as an AIMessage to messages. Graph interrupts after so the player can read and respond.",
      inputs: "gameState, messages",
      outputs: "messages (briefing AIMessage appended)",
    },
  })
  .addNode("parse_intent", parseIntent, {
    metadata: {
      isLlm: true,
      purpose:
        "Convert the latest player message into a structured PlayerIntent.",
      characteristics:
        "LLM call using tool-calling / structured output. Reads available GameAction types and current game state so the model knows what animals and products exist. Emits intent.type = 'clarify' when the message is ambiguous, or 'query' for questions that don't change farm state. Never mutates gameState — read-only.",
      inputs: "messages, gameState",
      outputs: "ephemeralState.currentIntent",
    },
  })
  .addNode("validate_action", validateAction, {
    metadata: {
      isLlm: false,
      purpose:
        "Check whether the parsed GameAction is legal given current game state.",
      characteristics:
        "Pure TypeScript — no LLM. Only reached when intent.type is a GameAction; ConversationMoves short-circuit to generate_narrative before this node. Checks: sufficient gold, sufficient actionsRemaining, target animal/product exists, market price > 0, etc. A failed validation does not cost a budget slot.",
      inputs: "ephemeralState.currentIntent, gameState",
      outputs: "ephemeralState.validationError (null on success)",
    },
  })
  .addNode("execute_action", executeAction, {
    metadata: {
      isLlm: false,
      purpose: "Apply the validated GameAction to gameState.",
      characteristics:
        "Pure TypeScript domain logic (src/game/actions.ts). Decrements actionsRemaining, modifies animals/market/gold/reputation. Appends a StateDelta to appliedDeltas for generate_narrative and generate_journal_entry to reference. Sets shouldEndTurn = true when actionsRemaining hits 0.",
      inputs: "ephemeralState.currentIntent, gameState",
      outputs:
        "gameState (mutated), ephemeralState.appliedDeltas (appended), ephemeralState.shouldEndTurn",
    },
  })
  .addNode("generate_narrative", generateNarrative, {
    metadata: {
      isLlm: true,
      purpose: "MooGPT writes an in-character response to the player.",
      characteristics:
        "LLM call. Tone follows moogpt.personality. Handles four paths: (1) query — answers the player's question from game state; (2) clarify — asks a follow-up when intent was ambiguous; (3) validationError — warm refusal when an action was illegal; (4) appliedDeltas — narrates what just happened after a successful action. Appends an AIMessage to messages. Graph interrupts after.",
      inputs:
        "gameState, ephemeralState.currentIntent, ephemeralState.appliedDeltas, ephemeralState.validationError",
      outputs:
        "messages (response AIMessage appended)",
    },
  })
  .addNode("resolve_decision", resolveDecision, {
    metadata: {
      isLlm: true,
      purpose:
        "Interpret the player's response in the context of a presented decision.",
      characteristics:
        "LLM call (or simple lookup). Only reached when pendingDecisionId is set. Matches the player's message against the decision options to determine which choice was made. Clears pendingDecisionId. Accumulates the trust delta from the chosen option into ephemeralState for update_assistant to apply at end-of-turn. Routes directly to parse_intent if the chosen option maps to a GameAction, or to generate_narrative if the choice has no associated action.",
      inputs: "messages, gameState, ephemeralState.pendingDecisionId",
      outputs:
        "ephemeralState.currentIntent (if action follows), ephemeralState.pendingTrustDelta (accumulated)",
    },
  })
  .addNode("generate_journal_entry", generateJournalEntry, {
    metadata: {
      isLlm: true,
      purpose: "Write the turn's JournalEntry at end-of-turn.",
      characteristics:
        "LLM call — narrative prose. Runs only at end-of-turn as part of the parallel fan-out after end_turn. Produces title, body, and mood summarising what happened across the whole turn.",
      inputs: "gameState, ephemeralState.appliedDeltas",
      outputs: "gameState.journalEntries (new entry appended)",
    },
  })
  .addNode("surface_decisions", surfaceDecisions, {
    metadata: {
      isLlm: false,
      purpose:
        "Generate new pending Decision objects based on current game state.",
      characteristics:
        "Rule-based — no LLM. Runs only at end-of-turn as part of the parallel fan-out after end_turn. Checks thresholds and narrative triggers: sick animal → vet decision, low gold → market suggestion, season change → crop-planting event. Returns 0–N new Decision objects.",
      inputs: "gameState",
      outputs: "gameState.decisions (new decisions appended)",
    },
  })
  .addNode("end_turn", endTurn, {
    metadata: {
      isLlm: false,
      purpose:
        "Advance the turn counter and commit end-of-day state mutations.",
      characteristics:
        "Pure TypeScript — no LLM. Increments turnNumber, resets actionsRemaining to actionsBudget, advances season every 30 turns, ticks animal ages, and applies passive productivity changes. Runs before the parallel fan-out so downstream nodes (generate_journal_entry, surface_decisions, update_assistant) all see the updated state.",
      inputs: "gameState",
      outputs:
        "gameState (turnNumber, actionsRemaining, season, animal ages mutated)",
    },
  })
  .addNode("update_assistant", updateAssistant, {
    metadata: {
      isLlm: false,
      purpose:
        "Apply accumulated trust deltas and re-derive MooGPT's personality.",
      characteristics:
        "Pure TypeScript — no LLM. Runs only at end-of-turn as part of the parallel fan-out after end_turn. Applies the trust deltas accumulated across the day (from resolve_decision calls and deferred decisions), applies end-of-turn trust drift, then re-derives moogpt.personality from the updated trust score: 0–30 → cautious, 31–70 → helpful, 71–100 → sassy.",
      inputs:
        "gameState, ephemeralState.appliedDeltas, ephemeralState.pendingTrustDelta",
      outputs:
        "gameState.moogpt.trust (updated), gameState.moogpt.personality (re-derived)",
    },
  })
  .addNode("reset_turn_state", resetTurnState, {
    metadata: {
      isLlm: false,
      purpose:
        "Clear all turn-scoped state so the graph can terminate cleanly.",
      characteristics:
        "Pure TypeScript — no LLM. Runs after all end-of-turn nodes converge at this node. Clears ephemeralState fields (appliedDeltas, validationError, currentIntent, shouldEndTurn, pendingDecisionId, pendingTrustDelta). After this node the graph terminates at END — React writes the cleaned gameState to localStorage and starts a fresh graph run for the next turn.",
      inputs: "ephemeralState, gameState",
      outputs: "ephemeralState (all fields reset)",
    },
  })

  // entry
  .addEdge(START, "generate_briefing")

  // after briefing interrupt: route based on pendingDecisionId
  .addConditionalEdges("generate_briefing", routeAfterInterrupt, {
    resolve_decision: "resolve_decision",
    parse_intent: "parse_intent",
  })

  // intent → validate or short-circuit to narrative
  .addConditionalEdges("parse_intent", routeAfterParseIntent, {
    generate_narrative: "generate_narrative",
    validate_action: "validate_action",
  })

  // validation → execute or warm refusal
  .addConditionalEdges("validate_action", routeAfterValidateAction, {
    generate_narrative: "generate_narrative",
    execute_action: "execute_action",
  })

  // execute → narrative (actions left) or end_turn (turn over)
  .addConditionalEdges("execute_action", routeAfterExecuteAction, {
    generate_narrative: "generate_narrative",
    end_turn: "end_turn",
  })

  // end_turn mutates canonical state first (turn number, season, animal ages),
  // then fans out in parallel to the three "next-day prep" nodes.
  .addEdge("end_turn", "generate_journal_entry")
  .addEdge("end_turn", "surface_decisions")
  .addEdge("end_turn", "update_assistant")

  // all three converge at reset_turn_state
  .addEdge("generate_journal_entry", "reset_turn_state")
  .addEdge("surface_decisions", "reset_turn_state")

  // resolve_decision routes directly — trust delta is accumulated in ephemeralState
  // and applied by update_assistant at end-of-turn only
  .addConditionalEdges("resolve_decision", routeAfterResolveDecision, {
    parse_intent: "parse_intent",
    generate_narrative: "generate_narrative",
  })

  // update_assistant runs only at end-of-turn, always converges to reset_turn_state
  .addEdge("update_assistant", "reset_turn_state")

  // narrative → interrupt → route based on pendingDecisionId
  .addConditionalEdges("generate_narrative", routeAfterInterrupt, {
    resolve_decision: "resolve_decision",
    parse_intent: "parse_intent",
  })

  // turn complete
  .addEdge("reset_turn_state", END);

// Compiled once at app load; each turn gets its own thread_id.
// interruptAfter pauses the graph after these nodes so React can display
// MooGPT's message and collect the next player input before resuming.
const checkpointer = new MemorySaver();

export const graph = workflow.compile({
  checkpointer,
  interruptAfter: ["generate_briefing", "generate_narrative"],
});
