import { useState } from "react";
import type { GameState } from "@/agent/state/gameState";
import type { EphemeralState } from "@/agent/state/ephemeralState";

const TABS = ["Graph State"] as const;
type Tab = typeof TABS[number];

interface Props {
  gameState: GameState;
  ephemeralState: EphemeralState;
  gameStateSource: "new" | "loaded";
}

export function DebugPanel({ gameState, ephemeralState, gameStateSource }: Props) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("Graph State");

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
            </div>
          </div>
        </div>
      )}
    </>
  );
}
