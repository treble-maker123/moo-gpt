import type { GraphState, GraphUpdate } from "../state";

// LLM call — narrative prose. Runs only at end-of-turn as part of the parallel
// fan-out. Produces a JournalEntry (title, body, mood) summarising the day.
export async function generateJournalEntry(_state: GraphState): Promise<GraphUpdate> {
  throw new Error("TODO: implement generateJournalEntry");
}
