import type { GraphState, GraphUpdate } from "@/agent/state";

// LLM call — narrative prose. Runs only at end-of-turn as part of the parallel
// fan-out. Produces a JournalEntry (title, body, mood) summarizing the day.
export async function generateJournalEntry(
  _state: GraphState,
): Promise<GraphUpdate> {
  throw new Error("TODO: implement generateJournalEntry");
}
