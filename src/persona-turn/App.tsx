import { useEffect, useState } from "react";
import { TurnForm, type TurnFormSubmitInput } from "./components/TurnForm";
import { ResponsePanel } from "./components/ResponsePanel";
import { SourcesPanel } from "./components/SourcesPanel";
import { ModeToggle, type Mode } from "./components/ModeToggle";
import { ConsentBanner } from "./components/ConsentBanner";
import {
  PersonaTurnApiError,
  submitPersonaTurn,
  type PersonaTurnResult
} from "./api/personaTurns";

// sprint-5 S5 — mode toggle + consent banner UI + real opt-in. backend 의 D-S5-3 (b)
// `resolveProviderMode(env, requestMode?)` priority lock 발동 (HTTP body `mode` 필드 전달).

const CONSENT_DELAY_MS = 1000;

export function App() {
  const [mode, setMode] = useState<Mode>("fixture");
  const [consentDelayActive, setConsentDelayActive] = useState(false);
  const [result, setResult] = useState<PersonaTurnResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // mode → real 변경 시 1초 consent delay 발동 (CLI stderr banner 1초 delay 와 동일 invariant).
  useEffect(() => {
    if (mode !== "real") {
      setConsentDelayActive(false);
      return;
    }
    setConsentDelayActive(true);
    const t = setTimeout(() => setConsentDelayActive(false), CONSENT_DELAY_MS);
    return () => clearTimeout(t);
  }, [mode]);

  async function handleSubmit(input: TurnFormSubmitInput) {
    setError(null);
    setResult(null);
    try {
      const next = await submitPersonaTurn({
        subject: input.subject,
        query: input.query,
        k: input.k,
        mode
      });
      setResult(next);
    } catch (err) {
      if (err instanceof PersonaTurnApiError) {
        setError(`${err.errorCode}: ${err.message}`);
      } else if (err instanceof TypeError) {
        setError("네트워크 오류 — backend 가 떠있는지 확인 (npm run dev:backend).");
      } else {
        setError(String(err));
      }
    }
  }

  return (
    <main
      style={{
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        maxWidth: 720,
        margin: "40px auto",
        padding: "0 20px",
        color: "#1f2937",
        background: "#fefefe",
        lineHeight: 1.6
      }}
    >
      <header style={{ borderBottom: "1px solid #e5e7eb", paddingBottom: 16, marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>디공이 turn</h1>
        <p style={{ margin: "8px 0 0", color: "#6b7280", fontSize: 14 }}>
          sprint-5 S5 — mode toggle + consent banner + real opt-in. real 모드 켜면
          Claude CLI 호출 (Anthropic 송신 발생).
        </p>
      </header>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
        <ModeToggle mode={mode} onChange={setMode} />
        <ConsentBanner visible={mode === "real"} delayActive={consentDelayActive} />
      </div>

      <TurnForm
        onSubmit={handleSubmit}
        externalDisabled={consentDelayActive}
        externalDisabledLabel="consent delay..."
      />

      {error && (
        <section
          role="alert"
          style={{
            marginTop: 24,
            padding: 16,
            border: "1px solid #fecaca",
            borderRadius: 8,
            background: "#fef2f2",
            color: "#991b1b",
            fontSize: 14
          }}
        >
          <strong>오류</strong>
          <p style={{ margin: "4px 0 0" }}>{error}</p>
        </section>
      )}

      {result && (
        <>
          <ResponsePanel responseText={result.response} />
          <SourcesPanel sources={result.sources} />
        </>
      )}
    </main>
  );
}
