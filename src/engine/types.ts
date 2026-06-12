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

export type ConversationMove = "query" | "clarify";

export interface ActionDef {
  type: GameAction | ConversationMove;
  description: string;
  targets: string;
  quantity?: string;
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

export type PlayerIntent =
  | { type: "buy_animal"; targets: [AnimalType]; name: string; rawText: string }
  | { type: "feed_animal"; targets: [string]; rawText: string }
  | { type: "sell_product"; targets: [ProductType]; quantity: number; rawText: string }
  | { type: "end_turn"; targets: []; rawText: string }
  | { type: "query"; targets: []; rawText: string }
  | { type: "clarify"; targets: []; rawText: string };

export interface StateDelta {
  type: GameAction;
  details: Record<string, unknown>;
}

export type ValidationResult =
  | {
      valid: true;
    }
  | {
      valid: false;
      reason: string;
    };

export interface Turn {
  turnNumber: number;
  actionsRemaining: number;
  actionsBudget: number;
}

export interface Character {
  gold: number;
  reputation: number;
}

export interface MooGPT {
  trust: number;
  personality: Personality;
  specializations: Specialization[];
}

export interface FarmItem {
  type: ProductType;
  quantity: number;
}

export interface Animal {
  id: string;
  name: string;
  type: AnimalType;
  health: number;
  productivity: number;
  age: number;
  mood: number;
}

export interface Farm {
  animals: Animal[];
  limits: Record<AnimalType, number>;
  items: FarmItem[];
}

export interface JournalEntry {
  turn: number;
  season: Season;
  title: string;
  body: string;
  mood: Mood;
}

export interface Decision {
  id: string;
  turn: number;
  expiresOnTurn: number | null;
  title: string;
  description: string;
  urgent: boolean;
  options: DecisionOption[];
  resolution: DecisionResolution | null;
}

export interface DecisionOption {
  id: string;
  label: string;
  cost?: { gold?: number; actions?: number };
  moogptOpinion?: string;
}

export interface DecisionResolution {
  chosenOptionId: string;
  outcome: string;
  deltas: DecisionDelta;
}

export interface DecisionDelta {
  trust: number;
  gold: number;
  reputation: number;
}

export interface GameState {
  season: Season;
  turn: Turn;
  character: Character;
  moogpt: MooGPT;
  farm: Farm;
  market: Record<ProductType, number>;
  journalEntries: JournalEntry[];
  decisions: Decision[];
}

export interface EphemeralState {
  currentIntent: PlayerIntent | null;
  validationError: string | null;
  appliedDeltas: StateDelta[];
  pendingDecisionId: string | null;
  shouldEndTurn: boolean;
  pendingTrustDelta: number;
}

export function createEmptyGameState(): GameState {
  return {
    season: "spring",
    turn: {
      turnNumber: 1,
      actionsRemaining: 3,
      actionsBudget: 3,
    },
    character: {
      gold: 25,
      reputation: 60,
    },
    moogpt: {
      trust: 90,
      personality: "sassy",
      specializations: [],
    },
    farm: {
      animals: (() => {
        const names = ["Cairne", "Baine", "Hamuul", "Magatha"];
        const name = names[Math.floor(Math.random() * names.length)];
        return [
          {
            id: "cow-1",
            name,
            type: "cow" as const,
            health: 80,
            productivity: 1,
            age: 1,
            mood: 80,
          },
        ];
      })(),
      limits: { cow: 3 },
      items: [{ type: "hay", quantity: 3 }],
    },
    market: {
      milk: 2,
      hay: 2,
    },
    journalEntries: [],
    decisions: [],
  };
}

export function createNewGameState(): GameState {
  return createEmptyGameState();
}

export function createEmptyEphemeralState(): EphemeralState {
  return {
    currentIntent: null,
    validationError: null,
    appliedDeltas: [],
    pendingDecisionId: null,
    shouldEndTurn: false,
    pendingTrustDelta: 0,
  };
}

export function createNewEphemeralState(): EphemeralState {
  return createEmptyEphemeralState();
}

export function buildActionList(): string {
  return ACTION_DEFS.map((d) => {
    const quantityNote = d.quantity ? `, quantity = ${d.quantity}` : "";
    const nameNote = d.name ? `, name = ${d.name}` : "";
    return `- ${d.type.padEnd(12)} — ${d.description}; targets = ${d.targets}${quantityNote}${nameNote}`;
  }).join("\n");
}
