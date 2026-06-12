import { useState } from "react";
import type { GameState, EphemeralState } from "@/engine/types";
import type { LlmCallRecord } from "@/agent/llm/llmCallLog";

const TABS = ["Graph State", "LLM Calls"] as const;
type Tab = typeof TABS[number];

interface Props {
  gameState: GameState;
  ephemeralState: EphemeralState;
  llmCallLog: LlmCallRecord[];
  gameStateSource: "new" | "loaded";
}

export function DebugPanel({ gameState, ephemeralState, llmCallLog, gameStateSource }: Props) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("Graph State");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <>
      <button
        type="button"
        className="debug-toggle-btn"
        onClick={() => setOpen(o => !o)}
      >
        🐛 Debug
      </button>

      {open && (
        <div className="debug-modal-overlay">
          <div className="debug-modal">
            <button
              type="button"
              className="debug-modal-close"
              onClick={() => setOpen(false)}
            >
              ✕
            </button>

            <div className="debug-tabs">
              {TABS.map(tab => (
                <button
                  key={tab}
                  type="button"
                  className={`debug-tab ${activeTab === tab ? "debug-tab-active" : ""}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                  {tab === "LLM Calls" && llmCallLog.length > 0 && (
                    <span className="debug-tab-badge">{llmCallLog.length}</span>
                  )}
                </button>
              ))}
            </div>

            <div className="debug-tab-content">
              {activeTab === "Graph State" && (
                <>
                  <div className="debug-attrs">
                    <div className="debug-attr">
                      <span className="debug-attr-label">State source</span>
                      <span className={`debug-attr-value debug-attr-value-${gameStateSource}`}>
                        {gameStateSource === "loaded" ? "💾 loaded from localStorage" : "✨ new game"}
                      </span>
                    </div>
                  </div>

                  <div className="debug-columns">
                    <div className="debug-column">
                      <div className="debug-column-header">Ephemeral State</div>
                      <pre className="debug-json">
                        {JSON.stringify(ephemeralState, null, 2)}
                      </pre>
                    </div>
                    <div className="debug-column">
                      <div className="debug-column-header">Game State</div>
                      <pre className="debug-json">
                        {JSON.stringify(gameState, null, 2)}
                      </pre>
                    </div>
                  </div>
                </>
              )}

              {activeTab === "LLM Calls" && (
                <div className="debug-llm-calls">
                  {llmCallLog.length === 0 ? (
                    <div className="debug-llm-empty">No LLM calls yet this turn.</div>
                  ) : (
                    llmCallLog.map((record, idx) => (
                      <div key={record.id} className="debug-llm-record">
                        <button
                          type="button"
                          className="debug-llm-header"
                          onClick={() => setExpandedId(expandedId === record.id ? null : record.id)}
                        >
                          <span className="debug-llm-index">#{idx + 1}</span>
                          <span className="debug-llm-node">{record.node}</span>
                          <span className="debug-llm-time">
                            {new Date(record.timestamp).toLocaleTimeString()}
                          </span>
                          <span className="debug-llm-chevron">
                            {expandedId === record.id ? "▲" : "▼"}
                          </span>
                        </button>

                        {expandedId === record.id && (
                          <div className="debug-llm-body">
                            <div className="debug-llm-section-label">Prompt</div>
                            {record.messages.map((msg, mi) => (
                              <div key={mi} className={`debug-llm-message debug-llm-message-${msg.role}`}>
                                <span className="debug-llm-role">{msg.role}</span>
                                <pre className="debug-llm-content">{msg.content}</pre>
                              </div>
                            ))}
                            <div className="debug-llm-section-label">Response</div>
                            <pre className="debug-llm-response">{record.response}</pre>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
