import { useState } from "react";
import { createEmptyGameState } from "@/agent/state";
import { FarmScene } from "@/components/FarmScene";

export default function App() {
  const [state] = useState(createEmptyGameState);

  return (
    <main className="app-shell">
      {/* ── Game world ─────────────────────────────────────────── */}
      <section className="game-scene" aria-label="Game world">
        <FarmScene state={state} />

        <div className="hud" aria-hidden="true">
          <div className="hud-group">
            <div className="hud-chip">☀ {state.season}</div>
            <div className="hud-chip">Day {state.turn.turnNumber}</div>
          </div>
          <div className="hud-group">
            <div className="hud-chip">★ {state.character.gold}G</div>
            <div className="hud-chip">🐄 ×{state.farm.animals.length}</div>
          </div>
        </div>
      </section>

      {/* ── MooGPT chat panel ──────────────────────────────────── */}
      <aside className="chat-panel" aria-label="MooGPT chat">
        <div className="chat-header">MooGPT</div>

        <div className="chat-messages" aria-live="polite">
          {/* messages will render here */}
        </div>

        <div className="chat-input-row">
          <input
            type="text"
            className="chat-input"
            placeholder="Ask MooGPT..."
            aria-label="Message MooGPT"
          />
          <button type="button" className="chat-send">▶</button>
        </div>

        <button type="button" className="settings-btn">
          ⚙ Settings
        </button>
      </aside>
    </main>
  );
}
