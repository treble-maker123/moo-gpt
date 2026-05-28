import { useState, useMemo, useEffect, useRef } from "react";
import { FarmScene } from "@/components/FarmScene";
import { SetupModal } from "@/components/SetupModal";
import type { SetupConfig } from "@/components/SetupModal";
import { createLlm, isMooMode } from "@/agent/llm";
import { useGameStore } from "@/game/gameStore";
import { DEBUG_MODE } from "@/utils/debugMode";
import { DebugPanel } from "@/components/DebugPanel";

function TypingDots() {
  const [count, setCount] = useState(1);
  useEffect(() => {
    const id = setInterval(() => setCount(c => (c % 3) + 1), 400);
    return () => clearInterval(id);
  }, []);
  return <span>{".".repeat(count)}</span>;
}

const CONFIG_KEY = "moogpt:config";

function loadConfig(): SetupConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) return JSON.parse(raw) as SetupConfig;
  } catch {}
  return { ollamaEndpoint: "", mooMode: false };
}

export default function App() {
  const [showSetup, setShowSetup] = useState(true);
  const [config, setConfig] = useState<SetupConfig>(loadConfig);
  const [input, setInput] = useState("");

  const llm = useMemo(() => createLlm(config), [config]);

  const { phase, messages, gameState, ephemeralState, isLoading, gameStateSource, setLlm, startUserTurn, sendMessage } =
    useGameStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Keep the store's llm in sync with config changes
  useEffect(() => {
    setLlm(llm);
  }, [llm, setLlm]);

  function handleSetupComplete(newConfig: SetupConfig) {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(newConfig));
    setConfig(newConfig);
    setShowSetup(false);
  }

  // Start the first user turn once setup is dismissed
  useEffect(() => {
    if (!showSetup) startUserTurn();
  }, [showSetup, startUserTurn]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    await sendMessage(text);
  }

  const inputDisabled = isLoading || phase === "world_turn";

  return (
    <>
      {showSetup && (
        <SetupModal initialConfig={config} onComplete={handleSetupComplete} />
      )}
      <main className="app-shell">
        {/* ── Game world ─────────────────────────────────────────── */}
        <section className="game-scene" aria-label="Game world">
          <FarmScene state={gameState} />

          {DEBUG_MODE && <DebugPanel gameState={gameState} ephemeralState={ephemeralState} gameStateSource={gameStateSource} />}

          <div className="hud" aria-hidden="true">
            <div className="hud-group">
              <div className="hud-chip">☀ {gameState.season}</div>
              <div className="hud-chip">Day {gameState.turn.turnNumber}</div>
              {isMooMode(llm) && <div className="hud-chip hud-chip-moo">Moo Mode</div>}
              {phase === "world_turn" && <div className="hud-chip">World turn…</div>}
            </div>
            <div className="hud-group">
              <div className="hud-chip">💰 {gameState.character.gold}G</div>
              <div className="hud-chip">💪🏻 {gameState.turn.actionsRemaining}/{gameState.turn.actionsBudget}</div>
              <div className="hud-chip">🐄 {gameState.farm.animals.filter(a => a.type === "cow").length}/{gameState.farm.limits.cow}</div>
            </div>
          </div>
        </section>

        {/* ── MooGPT chat panel ──────────────────────────────────── */}
        <aside className="chat-panel" aria-label="MooGPT chat">
          <div className="chat-header">MooGPT</div>

          <div className="chat-messages" aria-live="polite">
            {messages.map((msg, i) => (
              <div key={i} className={`chat-message-row chat-message-row-${msg.role}`}>
                <span className="chat-avatar">
                  {msg.role === "assistant" ? "🐄" : "🧑‍🌾"}
                </span>
                <div className={`chat-message chat-message-${msg.role}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="chat-message-row chat-message-row-assistant">
                <span className="chat-avatar">🐄</span>
                <div className="chat-message chat-message-assistant chat-message-loading">
                  <TypingDots />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-row">
            <input
              type="text"
              className="chat-input"
              placeholder={isLoading ? "MooGPT is thinking…" : "Ask MooGPT…"}
              aria-label="Message MooGPT"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !inputDisabled && handleSend()}
              disabled={inputDisabled}
            />
            <button
              type="button"
              className="chat-send"
              onClick={handleSend}
              disabled={inputDisabled}
            >
              ▶
            </button>
          </div>

          <button
            type="button"
            className="settings-btn"
            onClick={() => setShowSetup(true)}
          >
            ⚙ Settings
          </button>
        </aside>
      </main>
    </>
  );
}
