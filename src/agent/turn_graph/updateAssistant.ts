import type { GraphState, GraphUpdate } from "../state";

// Pure TS — no LLM. Runs only at end-of-turn as part of the parallel fan-out.
// Applies accumulated trust deltas from the day, applies trust drift, then
// re-derives moogpt.personality from the updated trust:
//   0–30 → cautious, 31–70 → helpful, 71–100 → sassy
export function updateAssistant(_state: GraphState): GraphUpdate {
  throw new Error("TODO: implement updateAssistant");
}
