import { useState, useEffect, useRef } from "react";
import { OLLAMA_MODEL } from "@/agent/llm";
import type { SetupConfig, StepProps } from "./step";

type CheckState = "idle" | "checking" | "ok" | "error";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button type="button" className="setup-copy-btn" onClick={handleCopy} title="Copy">
      {copied ? "✓" : "⎘"}
    </button>
  );
}

export async function pingOllama(endpoint: string): Promise<string | null> {
  try {
    const base = new URL(endpoint);
    const res = await fetch(new URL("/api/generate", base), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: `Please don't respond with anything besides "Moo, ahem... I mean, howdy!"`,
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

export function OllamaInstructions() {
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
        <strong>Enable cross-origin access</strong> so this page can talk to Ollama:
        <ul className="setup-instructions-sub">
          <li>
            <details>
              <summary><strong>Mac</strong></summary>
              Run in a terminal, then restart Ollama:
              <div className="setup-code-row">
                <code className="setup-code">launchctl setenv OLLAMA_ORIGINS "https://treble-maker123.github.io"</code>
                <CopyButton text={`launchctl setenv OLLAMA_ORIGINS "https://treble-maker123.github.io"`} />
              </div>
            </details>
          </li>
          <li>
            <details>
              <summary><strong>Windows</strong></summary>
              Open <em>System Properties → Environment Variables</em> and add:
              <div className="setup-code-row">
                <code className="setup-code">OLLAMA_ORIGINS = https://treble-maker123.github.io</code>
                <CopyButton text="OLLAMA_ORIGINS = https://treble-maker123.github.io" />
              </div>
              Then restart Ollama.
            </details>
          </li>
          <li>
            <details>
              <summary><strong>Linux</strong></summary>
              Run <code className="setup-code-inline">sudo systemctl edit ollama.service</code> and add under <code className="setup-code-inline">[Service]</code>:
              <div className="setup-code-row">
                <code className="setup-code">{`Environment="OLLAMA_ORIGINS=https://treble-maker123.github.io"`}</code>
                <CopyButton text={`Environment="OLLAMA_ORIGINS=https://treble-maker123.github.io"`} />
              </div>
              Then run <code className="setup-code-inline">sudo service ollama restart</code>.
            </details>
          </li>
        </ul>
      </li>
      <li>
        <strong>Pull the model</strong> — open a terminal and run:
        <div className="setup-code-row">
          <code className="setup-code">ollama run qwen2.5</code>
          <CopyButton text="ollama run qwen2.5" />
        </div>
        Wait for the download to finish on first run.
      </li>
      <li>
        <strong>Update the API URL</strong> below if Ollama is set up differently.
      </li>
      <li>
        <strong>Allow browser access</strong> — if your browser asks whether this page can access other apps and services on this device (Ollama is one such service), click <strong>Allow</strong>.
      </li>
    </ol>
  );
}

export function OllamaStep({ config, onChange, onReadyChange }: StepProps) {
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

export async function validateOllamaStep(config: SetupConfig): Promise<string | null> {
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
