import { useCallback, useEffect, useState } from "react";
import { TurnForm, type TurnFormSubmitInput } from "./components/TurnForm";
import { ResponsePanel } from "./components/ResponsePanel";
import { SourcesPanel } from "./components/SourcesPanel";
import { ModeToggle, type Mode } from "./components/ModeToggle";
import { ConsentBanner } from "./components/ConsentBanner";
import {
  appendConversationTurn,
  createConversation,
  fetchConversation,
  PersonaTurnApiError,
  type Agent,
  type PersonaTurnResult
} from "./api/personaTurns";

const CONSENT_DELAY_MS = 1000;
const CONVERSATION_STORAGE_KEY = "study-note.personaTurn.conversationId";

type ChatTurn = PersonaTurnResult & {
  conversationId: string;
  turnId: string;
  createdAt: string;
};

export function App() {
  const [mode, setMode] = useState<Mode>("fixture");
  const [agent, setAgent] = useState<Agent>("gemini-cli");
  const [consentDelayActive, setConsentDelayActive] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(() =>
    window.localStorage.getItem(CONVERSATION_STORAGE_KEY)
  );
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [messages, setMessages] = useState<ChatTurn[]>([]);
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

  // mode 변경 시 stale error 만 clear. 대화 history 는 mode 전환과 독립이다.
  useEffect(() => {
    setError(null);
  }, [mode]);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    setHistoryLoading(true);
    setError(null);
    fetchConversation(conversationId)
      .then((history) => {
        if (cancelled) return;
        setMessages(
          history.turns.map((t) => ({
            personaName: history.personaName,
            subject: t.subject,
            query: t.query,
            k: t.k,
            response: t.response,
            sources: t.sources,
            provider: t.provider,
            modelName: t.modelName,
            retrievalCount: t.retrievalCount,
            isFallback: t.isFallback,
            conversationId: t.conversationId,
            turnId: t.turnId,
            createdAt: t.createdAt
          }))
        );
      })
      .catch((err) => {
        if (cancelled) return;
        window.localStorage.removeItem(CONVERSATION_STORAGE_KEY);
        setConversationId(null);
        setMessages([]);
        if (err instanceof PersonaTurnApiError) {
          setError(`${err.errorCode}: 이전 대화를 불러오지 못했습니다.`);
        } else if (err instanceof TypeError) {
          setError("네트워크 오류 — backend 가 떠있는지 확인 (npm run dev:backend).");
        } else {
          setError("이전 대화를 불러오지 못했습니다.");
        }
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  // form input change (subject/query/k) 시 stale error clear.
  const handleFormChange = useCallback(() => {
    setError(null);
  }, []);

  async function handleSubmit(input: TurnFormSubmitInput) {
    setError(null);
    setIsSubmitting(true);
    try {
      let activeConversationId = conversationId;
      if (!activeConversationId) {
        const created = await createConversation(input.subject);
        activeConversationId = created.id;
        window.localStorage.setItem(CONVERSATION_STORAGE_KEY, created.id);
        setConversationId(created.id);
      }
      const next = await appendConversationTurn({
        conversationId: activeConversationId,
        query: input.query,
        k: input.k,
        mode,
        agent
      });
      if (!next.conversationId || !next.turnId || !next.createdAt) {
        throw new Error("대화 응답 metadata 누락");
      }
      setMessages((prev) => [...prev, next as ChatTurn]);
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

  function handleNewConversation() {
    window.localStorage.removeItem(CONVERSATION_STORAGE_KEY);
    setConversationId(null);
    setMessages([]);
    setError(null);
  }

  const externalDisabled = consentDelayActive || isSubmitting || historyLoading;
  const agentLabel = agent === "gemini-cli" ? "Gemini CLI" : "Claude CLI";
  const externalDisabledLabel = isSubmitting
    ? mode === "real"
      ? "응답 생성 중... (~30초)"
      : "응답 생성 중..."
    : historyLoading
      ? "대화 불러오는 중..."
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
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>디공이 대화</h1>
        <p style={{ margin: "8px 0 0", color: "#6b7280", fontSize: 14 }}>
          디지털공학개론 페르소나와 이어서 질문하고 답할 수 있습니다. 응답은 강의자료
          출처를 바탕으로 시험 우선순위부터 짚어줍니다.
        </p>
      </header>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
        <ModeToggle mode={mode} onChange={setMode} disabled={isSubmitting} />
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <label htmlFor="agent" style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
            Real agent
          </label>
          <select
            id="agent"
            value={agent}
            onChange={(e) => {
              setAgent(e.target.value as Agent);
              setError(null);
            }}
            disabled={isSubmitting || mode !== "real"}
            style={{
              padding: "6px 10px",
              fontSize: 13,
              color: mode === "real" ? "#1f2937" : "#9ca3af",
              background: "#ffffff",
              border: "1px solid #d1d5db",
              borderRadius: 6
            }}
          >
            <option value="gemini-cli">Gemini CLI</option>
            <option value="claude-cli">Claude CLI</option>
          </select>
        </div>
        <ConsentBanner visible={mode === "real"} delayActive={consentDelayActive} agent={agent} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, color: "#6b7280" }}>
            {conversationId ? `현재 대화 ${conversationId.slice(0, 8)}...` : "새 대화 준비"}
          </span>
          <button
            type="button"
            onClick={handleNewConversation}
            disabled={isSubmitting || historyLoading || (!conversationId && messages.length === 0)}
            style={{
              padding: "6px 10px",
              fontSize: 13,
              color: "#374151",
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: 6,
              cursor: isSubmitting || historyLoading ? "not-allowed" : "pointer"
            }}
          >
            새 대화 시작
          </button>
        </div>
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
            ? `${agentLabel} 응답 생성 중... 보통 30~60초 걸려요.`
            : "응답 생성 중..."}
        </section>
      )}

      {!historyLoading && messages.length === 0 && !isSubmitting && (
        <section
          aria-label="대화 비어 있음"
          style={{
            marginTop: 24,
            padding: 16,
            border: "1px dashed #d1d5db",
            borderRadius: 8,
            background: "#f9fafb",
            color: "#6b7280",
            fontSize: 14
          }}
        >
          첫 질문을 보내면 대화가 시작됩니다.
        </section>
      )}

      {messages.map((turn, idx) => (
        <section key={turn.turnId} aria-label={`대화 turn ${idx + 1}`} style={{ marginTop: 24 }}>
          <div
            style={{
              padding: 16,
              border: "1px solid #dbeafe",
              borderRadius: 8,
              background: "#eff6ff",
              color: "#1e3a8a",
              fontSize: 14
            }}
          >
            <strong>나</strong>
            <p style={{ margin: "6px 0 0" }}>{turn.query}</p>
          </div>
          <ResponsePanel responseText={turn.response} />
          <SourcesPanel sources={turn.sources} />
        </section>
      ))}
    </main>
  );
}
