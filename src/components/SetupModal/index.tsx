import { useState } from "react";
import type { Step, SetupConfig } from "./step";
import { OllamaStep, validateOllamaStep } from "./ollamaStep";

export type { SetupConfig } from "./step";

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
  const [config, setConfig] = useState(initialConfig);
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
