import type { AnimalType, Mood, Personality, ProductType, Season, Specialization } from "./types";

export interface GameState {
  // meta
  season: Season;

  turn: Turn;
  character: Character;
  moogpt: MooGPT;

  farm: Farm;
  market: Record<ProductType, number>;

  journalEntries: JournalEntry[];
  decisions: Decision[];
}

export interface Turn {
  turnNumber: number;
  actionsRemaining: number;
  actionsBudget: number; // number of actions allowed per turn
}

export interface Character {
  gold: number;
  reputation: number;
}

export interface MooGPT {
  trust: number; // how much MooGPT trusts the player, changes personality
  // 0-30 cautious, 31-70 helpful, 71-100 sassy
  personality: Personality;
  specializations: Specialization[];
}

export interface Farm {
  animals: Animal[];
}

export interface Animal {
  id: string;
  name: string;
  type: AnimalType;

  health: number; // < 20 sick, > 80 increased productivity

  productivity: number; // num outputs per day
  age: number; // days

  mood: number; // hidden - affects productivity
}

export interface JournalEntry {
  turn: number;
  season: Season;
  title: string;
  body: string; // MooGPT's narrative prose
  mood: Mood;
}

export interface Decision {
  id: string;
  turn: number;
  expiresOnTurn: number | null;

  title: string;
  description: string;
  urgent: boolean; // renders a warning

  options: DecisionOption[]; // options to be chosen
  resolution: DecisionResolution; // chosen decision + outcome
}

export interface DecisionOption {
  id: string;
  label: string; // presented to user
  cost?: { gold?: number; actions?: number };
  moogptOpinion?: string;
}

export interface DecisionResolution {
  chosenOptionId: string;
  outcome: string;
  deltas: DecisionDelta;
}

export interface DecisionDelta {
  trust: number; // if player ignores MooGPT and outcome goes badly, MooGPT trust drops
  gold: number;
  reputation: number;
}

export function createNewGameState(): GameState {
  return {
    season: "spring",
    turn: {
      turnNumber: 1,
      actionsRemaining: 3,
      actionsBudget: 3,
    },
    character: {
      gold: 25,
      reputation: 0,
    },
    moogpt: {
      trust: 50,
      personality: "helpful",
      specializations: [],
    },
    farm: {
      animals: [],
    },
    market: {
      milk: 0,
      hay: 0,
    },
    journalEntries: [],
    decisions: [],
  };
}
