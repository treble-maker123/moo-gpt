import { useState, useMemo } from "react";
import { createNewGameState } from "@/agent/state";
import { FarmScene } from "@/components/FarmScene";
import { SetupModal } from "@/components/SetupModal";
import type { SetupConfig } from "@/components/SetupModal";
import { createLlm, isMooMode } from "@/agent/llm";

const STORAGE_KEY = "moogpt:config";

function loadConfig(): SetupConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as SetupConfig;
  // eslint-disable-next-line no-empty
  } catch {}
  return { ollamaEndpoint: "", mooMode: false };
}

export default function App() {
  const [state] = useState(createNewGameState);
  const [showSetup, setShowSetup] = useState(true);
  const [config, setConfig] = useState<SetupConfig>(loadConfig);

  const llm = useMemo(() => createLlm(config), [config]);

  function handleSetupComplete(newConfig: SetupConfig) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
    setConfig(newConfig);
    setShowSetup(false);
  }

  return (
    <>
    {showSetup && (
      <SetupModal initialConfig={config} onComplete={handleSetupComplete} />
    )}
    <main className="app-shell">
      {/* ── Game world ─────────────────────────────────────────── */}
      <section className="game-scene" aria-label="Game world">
        <FarmScene state={state} />

        <div className="hud" aria-hidden="true">
          <div className="hud-group">
            <div className="hud-chip">☀ {state.season}</div>
            <div className="hud-chip">Day {state.turn.turnNumber}</div>
            {isMooMode(llm) && <div className="hud-chip hud-chip-moo">Moo Mode</div>}
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
    </>
  );
}
