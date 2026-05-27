export type Personality = "helpful" | "cautious" | "sassy";
export type Specialization = "market_analyst" | "meteorologist" | "vet";
export type AnimalType = "cow";
export type ProductType = "milk" | "hay";
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
