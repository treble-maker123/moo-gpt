import { useState, useEffect, useRef } from "react";
import { OLLAMA_MODEL } from "@/agent/llm";

export interface SetupConfig {
  ollamaEndpoint: string;
  mooMode: boolean;
}

type CheckState = "idle" | "checking" | "ok" | "error";

interface StepProps {
  config: SetupConfig;
  onChange: (patch: Partial<SetupConfig>) => void;
  onReadyChange: (ready: boolean) => void;
}

interface Step {
  id: string;
  title: string;
  render: (props: StepProps) => React.ReactNode;
  // Return an error message string if the step is invalid, or null to advance.
  validate?: (config: SetupConfig) => Promise<string | null>;
}

async function pingOllama(endpoint: string): Promise<string | null> {
  try {
    const base = new URL(endpoint);
    const res = await fetch(new URL("/api/generate", base), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: `Please don't respond with anything besides "Moo, ahem... Ooof, pardon me, I'm here. Howdy!"`,
        stream: false,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const json = await res.json() as { response?: string };
    return json.response?.trim() ?? "(no response)";
  } catch {
    return null;
  }
}

function OllamaInstructions() {
  return (
    <ol className="setup-instructions">
      <li>
        <strong>Download Ollama</strong> from{" "}
        <a className="setup-link" href="https://ollama.com/download" target="_blank" rel="noopener noreferrer">
          ollama.com/download
        </a>
        {" "}and install it.
      </li>
      <li>
        <strong>Pull the model</strong> — open a terminal and run:
        <code className="setup-code">ollama run qwen2.5</code>
        Wait for the download to finish on first run.
      </li>
      <li>
        <strong>Enter the API URL</strong> below. The default is{" "}
        <code className="setup-code-inline">http://localhost:11434</code> — try
        that first and hit <em>Start Game</em> to verify it's reachable.
      </li>
    </ol>
  );
}

function OllamaStep({ config, onChange, onReadyChange }: StepProps) {
  const [checkState, setCheckState] = useState<CheckState>("idle");
  const [checkError, setCheckError] = useState<string | null>(null);
  const [modelReply, setModelReply] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onReadyChange(config.mooMode || checkState === "ok");
  }, [config.mooMode, checkState, onReadyChange]);

  useEffect(() => {
    const raw = config.ollamaEndpoint.trim();

    setCheckState("idle");
    setCheckError(null);
    setModelReply(null);

    if (!raw) return;

    try {
      new URL(raw);
    } catch {
      setCheckState("error");
      setCheckError("Not a valid URL.");
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setCheckState("checking");
      const reply = await pingOllama(raw);
      if (reply !== null) {
        setCheckState("ok");
        setCheckError(null);
        setModelReply(reply);
      } else {
        setCheckState("error");
        setCheckError(`Could not reach ${OLLAMA_MODEL} at that URL — is Ollama running?`);
        setModelReply(null);
      }
    }, 800);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [config.ollamaEndpoint]);

  const statusIcon =
    checkState === "checking" ? "⏳"
    : checkState === "ok" ? "✓"
    : checkState === "error" ? "✗"
    : null;

  const statusClass =
    checkState === "ok" ? "setup-check-ok"
    : checkState === "error" ? "setup-check-error"
    : "setup-check-pending";

  return (
    <div className="setup-step">
      <OllamaInstructions />
      <label className="setup-field">
        <span className="setup-label">Ollama endpoint</span>
        <div className="setup-input-row">
          <input
            className={`setup-input${checkState === "error" ? " setup-input-error" : ""}`}
            type="url"
            placeholder="http://localhost:11434"
            value={config.ollamaEndpoint}
            onChange={(e) => onChange({ ollamaEndpoint: e.target.value })}
            spellCheck={false}
            autoComplete="url"
            disabled={config.mooMode}
          />
          {statusIcon && (
            <span className={`setup-check-icon ${statusClass}`} aria-live="polite">
              {statusIcon}
            </span>
          )}
        </div>
        {checkError && (
          <span className="setup-field-error" role="alert">{checkError}</span>
        )}
        <span className="setup-model-reply" aria-live="polite">
          MooGPT: {modelReply ?? "Moo, moooooo."}
        </span>
      </label>
      <p className="setup-hint-lg">
        Alternatively, click the checkbox below to enter Moo Mode, where MooGPT speaks only in moo's and anything goes.
      </p>
      <label className="setup-moo-mode-label">
        <input
          type="checkbox"
          checked={config.mooMode}
          onChange={(e) => onChange({ mooMode: e.target.checked, ollamaEndpoint: e.target.checked ? "" : config.ollamaEndpoint })}
        />
        Enter Moo Mode
      </label>
    </div>
  );
}

async function validateOllamaStep(config: SetupConfig): Promise<string | null> {
  if (config.mooMode) return null;

  const raw = config.ollamaEndpoint.trim();
  if (!raw) return "Enter an Ollama endpoint URL, or check the Moo Mode box to continue.";

  try {
    new URL(raw);
  } catch {
    return "Enter a valid URL, or check the Moo Mode box to continue.";
  }

  const reply = await pingOllama(raw);
  if (reply === null) return `Could not reach ${OLLAMA_MODEL} at that URL. Check Ollama is running, or enable Moo Mode.`;

  return null;
}

const STEPS: Step[] = [
  {
    id: "ollama",
    title: "Connect to Ollama",
    render: (props) => <OllamaStep {...props} />,
    validate: validateOllamaStep,
  },
];

interface SetupModalProps {
  initialConfig: SetupConfig;
  onComplete: (config: SetupConfig) => void;
}

export function SetupModal({ initialConfig, onComplete }: SetupModalProps) {
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState<SetupConfig>(initialConfig);
  const [stepError, setStepError] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const [stepReady, setStepReady] = useState(false);

  function patch(update: Partial<SetupConfig>) {
    setConfig((prev) => ({ ...prev, ...update }));
    setStepError(null);
  }

  const current = STEPS[step];
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;

  async function handleAdvance() {
    if (advancing) return;
    setAdvancing(true);
    setStepError(null);

    const error = current.validate ? await current.validate(config) : null;

    if (error) {
      setStepError(error);
      setAdvancing(false);
      return;
    }

    setAdvancing(false);
    if (isLast) {
      onComplete(config);
    } else {
      setStep((s) => s + 1);
    }
  }

  return (
    <div className="setup-overlay" role="dialog" aria-modal="true" aria-labelledby="setup-title">
      <div className="setup-modal">
        <div className="setup-header">
          <span className="setup-step-indicator">
            {STEPS.length > 1 ? `${step + 1} / ${STEPS.length}` : "Setup"}
          </span>
          <h2 id="setup-title" className="setup-title">
            {current.title}
          </h2>
        </div>

        <div className="setup-body">{current.render({ config, onChange: patch, onReadyChange: setStepReady })}</div>

        {stepError && (
          <p className="setup-step-error" role="alert">{stepError}</p>
        )}

        <div className="setup-footer">
          {!isFirst && (
            <button className="setup-btn setup-btn-secondary" onClick={() => setStep((s) => s - 1)}>
              ← Back
            </button>
          )}
          <span className="setup-dots" aria-hidden="true">
            {STEPS.map((s, i) => (
              <span key={s.id} className={`setup-dot${i === step ? " setup-dot-active" : ""}`} />
            ))}
          </span>
          <button
            className="setup-btn setup-btn-primary"
            onClick={handleAdvance}
            disabled={advancing || !stepReady}
          >
            {advancing ? "Checking…" : isLast ? "Start Game ▶" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}
