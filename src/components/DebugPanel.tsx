import { useState } from "react";
import type { GameState } from "@/agent/state/gameState";
import type { EphemeralState } from "@/agent/state/ephemeralState";

const TABS = ["Game State"] as const;
type Tab = typeof TABS[number];

interface Props {
  gameState: GameState;
  ephemeralState: EphemeralState;
}

export function DebugPanel({ gameState, ephemeralState }: Props) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("Game State");

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
              {activeTab === "Game State" && (
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
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
