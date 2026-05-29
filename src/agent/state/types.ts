export type Personality = "helpful" | "cautious" | "sassy";

export const PERSONALITY_TRAITS: Record<Personality, string> = {
  cautious: "warns of risks and urges careful decisions",
  helpful: "upbeat and practical, focuses on what to do next",
  sassy: "wry and confident, not above a little teasing",
};
export type Specialization = "market_analyst" | "meteorologist" | "vet";
export type AnimalType = "cow";
export const VALID_ANIMAL_TYPES: AnimalType[] = ["cow"];

export type ProductType = "milk" | "hay";
export const VALID_PRODUCT_TYPES: ProductType[] = ["milk", "hay"];
export type Season = "spring" | "summer" | "autumn" | "winter";
export type Mood = "optimistic" | "concerned" | "neutral" | "excited" | "grim";

export type GameAction =
  | "feed_animal"
  | "sell_product"
  | "buy_animal"
  | "end_turn";

export type ConversationMove =
  | "query" // question about farm state, costs no budget
  | "clarify"; // ambiguous input, MooGPT asks a follow-up

export interface ActionDef {
  type: GameAction | ConversationMove;
  description: string;
  // Human-readable description of what targets should contain
  targets: string;
  // Present only when quantity is meaningful for this action
  quantity?: string;
  // Present only when a player-chosen name is required
  name?: string;
}

export const ACTION_DEFS: ActionDef[] = [
  {
    type: "feed_animal",
    description: "feed an animal on the farm",
    targets: "[animalId]",
  },
  {
    type: "sell_product",
    description: "sell a product at market",
    targets: "[productType]",
    quantity: "number of units to sell",
  },
  {
    type: "buy_animal",
    description: "buy a new animal",
    targets: '[animalType, e.g. "cow"]',
    name: "player-chosen name for the animal",
  },
  {
    type: "end_turn",
    description: "end the current day",
    targets: "[]",
  },
  {
    type: "query",
    description: "player asks a question about farm state — no game state change",
    targets: "[]",
  },
  {
    type: "clarify",
    description: "player's message is ambiguous — MooGPT will ask a follow-up",
    targets: "[]",
  },
];

export const VALID_ACTION_TYPES: Array<GameAction | ConversationMove> =
  ACTION_DEFS.map((d) => d.type);

/**
 * Returns a formatted action list for LLM prompts. Example:
 *
 * ```
 * - feed_animal  — feed an animal on the farm; targets = [animalId]
 * - sell_product — sell a product at market; targets = [productType], quantity = number of units to sell
 * - buy_animal   — buy a new animal; targets = [animalType, e.g. "cow"]
 * - end_turn     — end the current day; targets = []
 * - query        — player asks a question about farm state — no game state change; targets = []
 * - clarify      — player's message is ambiguous — MooGPT will ask a follow-up; targets = []
 * ```
 */
export function buildActionList(): string {
  return ACTION_DEFS.map((d) => {
    const quantityNote = d.quantity ? `, quantity = ${d.quantity}` : "";
    const nameNote = d.name ? `, name = ${d.name}` : "";
    return `- ${d.type.padEnd(12)} — ${d.description}; targets = ${d.targets}${quantityNote}${nameNote}`;
  }).join("\n");
}
