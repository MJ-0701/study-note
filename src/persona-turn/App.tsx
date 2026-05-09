import { useCallback, useEffect, useState } from "react";
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

const CONSENT_DELAY_MS = 1000;

export function App() {
  const [mode, setMode] = useState<Mode>("fixture");
  const [consentDelayActive, setConsentDelayActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<PersonaTurnResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // mode → real 변경 시 1초 consent delay (CLI stderr banner 와 동일 invariant).
  useEffect(() => {
    if (mode !== "real") {
      setConsentDelayActive(false);
      return;
    }
    setConsentDelayActive(true);
    const t = setTimeout(() => setConsentDelayActive(false), CONSENT_DELAY_MS);
    return () => clearTimeout(t);
  }, [mode]);

  // mode 변경 시 stale result/error clear (Gate 6 round 1 finding 1).
  useEffect(() => {
    setResult(null);
    setError(null);
  }, [mode]);

  // form input change (subject/query/k) 시 stale result/error clear.
  const handleFormChange = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  async function handleSubmit(input: TurnFormSubmitInput) {
    setError(null);
    setResult(null);
    setIsSubmitting(true);
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
    } finally {
      setIsSubmitting(false);
    }
  }

  const externalDisabled = consentDelayActive || isSubmitting;
  const externalDisabledLabel = isSubmitting
    ? mode === "real"
      ? "응답 생성 중... (~30초)"
      : "응답 생성 중..."
    : "1초 후 진행...";

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
          디지털공학개론 페르소나 (디공이) 와 1 turn 대화. 응답은 강의자료 PDF chunk 를
          인용해 시험 우선순위로 짚어줍니다.
        </p>
      </header>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
        <ModeToggle mode={mode} onChange={setMode} disabled={isSubmitting} />
        <ConsentBanner visible={mode === "real"} delayActive={consentDelayActive} />
      </div>

      <TurnForm
        onSubmit={handleSubmit}
        onFormChange={handleFormChange}
        submitting={isSubmitting}
        externalDisabled={externalDisabled}
        externalDisabledLabel={externalDisabledLabel}
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

      {isSubmitting && (
        <section
          aria-label="응답 생성 중"
          aria-live="polite"
          style={{
            marginTop: 24,
            padding: 24,
            border: "1px dashed #d1d5db",
            borderRadius: 8,
            background: "#f9fafb",
            color: "#6b7280",
            fontSize: 14,
            textAlign: "center"
          }}
        >
          {mode === "real"
            ? "Claude 응답 생성 중... 보통 30~60초 걸려요."
            : "응답 생성 중..."}
        </section>
      )}

      {result && !isSubmitting && (
        <>
          <ResponsePanel responseText={result.response} />
          <SourcesPanel sources={result.sources} />
        </>
      )}
    </main>
  );
}
