export interface LlmCallRecord {
  id: string;
  node: string;
  timestamp: number;
  messages: Array<{ role: string; content: string }>;
  response: string;
}

export type LogLlmCall = (record: LlmCallRecord) => void;
