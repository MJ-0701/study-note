import { useCallback, useEffect, useRef, useState } from "react";
import { TurnForm, type TurnFormSubmitInput } from "./components/TurnForm";
import { ResponsePanel } from "./components/ResponsePanel";
import { SourcesPanel } from "./components/SourcesPanel";
import { ModeToggle, type Mode } from "./components/ModeToggle";
import { ConsentBanner } from "./components/ConsentBanner";
import { MCPOnboardingGate } from "./components/MCPOnboardingGate";
import { MCPDisconnectedCard, isMcpDisconnectedError } from "./components/MCPDisconnectedCard";
import { PersonaSidebar } from "./components/PersonaSidebar";
import {
  appendConversationTurn,
  createConversation,
  fetchConversation,
  listConversations,
  PersonaTurnApiError,
  type Agent,
  type ConversationListItem,
  type PersonaTurnResult
} from "./api/personaTurns";
import {
  buildConversationRoute,
  parseConversationRoute
} from "./conversation-route";

const CONSENT_DELAY_MS = 1000;
const CONVERSATION_STORAGE_KEY = "study-note.personaTurn.conversationId";
const BACKEND_BASE =
  (import.meta.env.VITE_BACKEND_BASE as string | undefined) ?? "";

type ChatTurn = PersonaTurnResult & {
  conversationId: string;
  turnId: string;
  createdAt: string;
};

type UserRole = "master" | "admin" | "reviewer" | "normal";

interface AuthUser {
  userId: string;
  studentNumber: string;
  name: string;
  role: UserRole;
}

type AuthState = "checking" | "signed-in" | "signed-out";

function isUserRole(r: string): r is UserRole {
  return r === "master" || r === "admin" || r === "reviewer" || r === "normal";
}

// sprint-8 slice-3 — URL 우선 + localStorage mirror. URL 이 source of truth.
function readInitialConversationId(): string | null {
  if (typeof window === "undefined") return null;
  const fromHash = parseConversationRoute(window.location.hash).conversationId;
  if (fromHash) return fromHash;
  return window.localStorage.getItem(CONVERSATION_STORAGE_KEY);
}

export function App() {
  const [mode, setMode] = useState<Mode>("fixture");
  const [agent, setAgent] = useState<Agent>("gemini-cli");
  const [consentDelayActive, setConsentDelayActive] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(
    readInitialConversationId
  );
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [error, setError] = useState<string | null>(null);
  // plan §3 AC2-amend — persona-turn API 의 503 AUTH_DEV_DISABLED 매핑.
  const [mcpDisconnected, setMcpDisconnected] = useState(false);
  // sprint-8 slice-3 — sidebar "최근 대화" 의 data source.
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  // sprint-8 slice-3 AC3 — URL 의 stale conversationId (backend 404) 안내 카드.
  const [conversationNotFound, setConversationNotFound] = useState(false);
  // PR #8 P1 fix — handleSubmit 가 in-flight 인 동안 사용자가 sidebar 로 다른
  // conversation 으로 전환하면 late response 가 잘못된 conversation 의 UI 에
  // append 될 race. ref 로 live activeId 추적 → response 도착 시점에 일치 안 하면
  // discard. ref 사용 이유: state closure 가 handleSubmit 의 try 안에서 stale.
  const liveConversationIdRef = useRef<string | null>(conversationId);
  useEffect(() => {
    liveConversationIdRef.current = conversationId;
  }, [conversationId]);

  // Auth state
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authFormName, setAuthFormName] = useState("");
  const [authFormStudentNumber, setAuthFormStudentNumber] = useState("");
  const [authFormSubmitting, setAuthFormSubmitting] = useState(false);
  const [authFormError, setAuthFormError] = useState<string | null>(null);

  // Boot: fetch /me to check auth
  useEffect(() => {
    let cancelled = false;
    fetch(`${BACKEND_BASE}/api/v1/auth/me`, { credentials: "include" })
      .then(async (res) => {
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json() as { userId: string; studentNumber: string; name: string; role: string };
          if (
            typeof data.userId === "string" &&
            typeof data.studentNumber === "string" &&
            typeof data.name === "string" &&
            isUserRole(data.role)
          ) {
            setAuthUser({ userId: data.userId, studentNumber: data.studentNumber, name: data.name, role: data.role });
            setAuthState("signed-in");
          } else {
            setAuthState("signed-out");
          }
        } else {
          // 401 = no cookie, 503 = auth disabled
          setAuthState("signed-out");
        }
      })
      .catch(() => {
        if (!cancelled) setAuthState("signed-out");
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

  // mode 변경 시 stale error / mcpDisconnected clear. 대화 history 는 mode 전환과 독립이다.
  useEffect(() => {
    setError(null);
    setMcpDisconnected(false);
  }, [mode]);

  // sprint-8 slice-3 — hashchange 리스너 (back/forward 또는 sidebar 클릭).
  useEffect(() => {
    function onHashChange() {
      const next = parseConversationRoute(window.location.hash).conversationId;
      setConversationId(next);
      setConversationNotFound(false);
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // sprint-8 slice-3 — conversationId 변경 시 URL + localStorage 동기.
  // URL 이 source of truth, localStorage 는 mirror (재방문 / cross-tab 폴백).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const expectedHash = buildConversationRoute(conversationId);
    if (window.location.hash !== expectedHash) {
      // hashchange 무한 루프 방지 — 동일 값일 때만 skip.
      window.history.replaceState(null, "", expectedHash);
    }
    if (conversationId) {
      window.localStorage.setItem(CONVERSATION_STORAGE_KEY, conversationId);
    } else {
      window.localStorage.removeItem(CONVERSATION_STORAGE_KEY);
    }
  }, [conversationId]);

  // sprint-8 slice-3 AC2 — sign-in 후 또는 conversationId 변동 후 list 재fetch.
  // sidebar "최근 대화" group 의 data source. cookie 부재 / 인증 미완료 시 빈 list 유지.
  useEffect(() => {
    if (authState !== "signed-in") return;
    let cancelled = false;
    listConversations()
      .then((items) => {
        if (!cancelled) setConversations(items);
      })
      .catch(() => {
        // silent fallback — list 가 비면 sidebar placeholder ("아직 대화 없음") 노출.
        if (!cancelled) setConversations([]);
      });
    return () => {
      cancelled = true;
    };
  }, [authState, conversationId]);

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
        setMessages([]);
        // sprint-8 slice-3 AC3 — URL 의 stale conversationId (taken or deleted) →
        // 404 안내 카드. activeId clear + storage clear, error 카드 와 분리.
        if (err instanceof PersonaTurnApiError) {
          if (err.status === 404 || err.errorCode === "CONVERSATION_NOT_FOUND") {
            setConversationNotFound(true);
            setConversationId(null);
          } else {
            setConversationId(null);
            setError(`${err.errorCode}: 이전 대화를 불러오지 못했습니다.`);
          }
        } else if (err instanceof TypeError) {
          setConversationId(null);
          setError("네트워크 오류 — backend 가 떠있는지 확인 (npm run dev:backend).");
        } else {
          setConversationId(null);
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

  // form input change (subject/query/k) 시 stale error / mcpDisconnected / notFound clear.
  const handleFormChange = useCallback(() => {
    setError(null);
    setMcpDisconnected(false);
    setConversationNotFound(false);
  }, []);

  async function handleSubmit(input: TurnFormSubmitInput) {
    setError(null);
    setMcpDisconnected(false);
    setConversationNotFound(false);
    setIsSubmitting(true);
    try {
      let activeConversationId = conversationId;
      if (!activeConversationId) {
        const created = await createConversation(input.subject);
        activeConversationId = created.id;
        // sprint-8 slice-3 — setConversationId 가 URL/localStorage 동기 useEffect 트리거.
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
      // PR #8 P1 fix — turn 이 in-flight 인 동안 사용자가 sidebar 클릭으로 다른
      // conversation 으로 전환했으면 본 응답은 더 이상 활성 화면에 해당 X. discard.
      // backend 가 응답에 conversationId 를 실어 보내므로 그것을 진실의 단일 source
      // 로 사용 — closure 의 activeConversationId 도, ref 도 동시 비교.
      if (
        next.conversationId !== liveConversationIdRef.current &&
        next.conversationId !== activeConversationId
      ) {
        // 활성 화면이 바뀌었음. 새 화면은 자체 useEffect 가 history 를 다시 load 함.
        return;
      }
      setMessages((prev) => [...prev, next as ChatTurn]);
      // sprint-8 slice-3 — 새 conversation 생성 직후 sidebar list 갱신.
      try {
        const items = await listConversations();
        setConversations(items);
      } catch {
        // silent — sidebar 는 다음 갱신 시점에 회복.
      }
    } catch (err) {
      if (err instanceof PersonaTurnApiError) {
        // plan §3 AC2-amend — 503 AUTH_DEV_DISABLED 만 MCP 미연결 카드로 매핑.
        // 그 외 4xx/5xx (401 SESSION_REQUIRED 포함) 는 기존 일반 오류 카드 유지.
        if (isMcpDisconnectedError({ status: err.status, errorCode: err.errorCode })) {
          setMcpDisconnected(true);
        } else {
          setError(`${err.errorCode}: ${err.message}`);
        }
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
    // sprint-8 slice-3 — setConversationId(null) → URL/localStorage 동기 useEffect 트리거.
    setConversationId(null);
    setMessages([]);
    setError(null);
    setConversationNotFound(false);
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setAuthFormError(null);
    setAuthFormSubmitting(true);
    try {
      const res = await fetch(`${BACKEND_BASE}/api/v1/auth/sign-in`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: authFormName.trim(), studentNumber: authFormStudentNumber.trim() })
      });
      if (res.ok) {
        const data = await res.json() as { userId: string; studentNumber: string; name: string; role: string };
        if (isUserRole(data.role)) {
          setAuthUser({ userId: data.userId, studentNumber: data.studentNumber, name: data.name, role: data.role });
          setAuthState("signed-in");
          setAuthFormName("");
          setAuthFormStudentNumber("");
        } else {
          setAuthFormError("서버 응답 형식 오류 — role 값이 유효하지 않습니다.");
        }
      } else {
        const body = await res.json().catch(() => ({})) as { errorCode?: string; errorMessage?: string };
        setAuthFormError(body.errorMessage ?? `오류 ${res.status}`);
      }
    } catch {
      setAuthFormError("네트워크 오류 — backend 가 떠있는지 확인하세요.");
    } finally {
      setAuthFormSubmitting(false);
    }
  }

  // Auth loading
  if (authState === "checking") {
    return (
      <div className="login-screen">
        <div className="login-panel">
          <p style={{ color: "#6b7280", fontSize: 14, textAlign: "center", margin: 0 }}>
            인증 확인 중...
          </p>
        </div>
      </div>
    );
  }

  // Not signed in — sign-in form only; sign-up redirects to home
  if (authState === "signed-out") {
    return (
      <div className="login-screen">
        <div className="login-panel">
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px", color: "#111827" }}>
            study-note
          </h1>
          <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 20px" }}>
            페르소나 대화 · 강의 자료 기반
          </p>

          {/* Sign-in form */}
          <form
            className="login-form"
            onSubmit={handleSignIn}
          >
            <label>
              <span>학번 (8자리)</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="username"
                placeholder="20XXXXXX"
                value={authFormStudentNumber}
                onChange={(e) => setAuthFormStudentNumber(e.target.value)}
                required
                disabled={authFormSubmitting}
                aria-label="학번"
              />
            </label>
            <label>
              <span>이름</span>
              <input
                type="text"
                autoComplete="name"
                placeholder="홍길동"
                value={authFormName}
                onChange={(e) => setAuthFormName(e.target.value)}
                required
                disabled={authFormSubmitting}
                aria-label="이름"
              />
            </label>

            {authFormError && (
              <div
                className="login-feedback is-error"
                role="alert"
                aria-live="polite"
                style={{ fontSize: 13 }}
              >
                {authFormError}
              </div>
            )}

            <button
              type="submit"
              disabled={authFormSubmitting}
              className="inline-action"
              style={{ marginTop: 4 }}
            >
              {authFormSubmitting ? "로그인 중..." : "로그인"}
            </button>
          </form>

          {/* Sign-up redirect — slice-3: sign-up is handled at home (/) */}
          <p style={{ fontSize: 13, color: "#6b7280", margin: "16px 0 0", textAlign: "center" }}>
            회원가입은 홈(/) 에서 진행하세요.{" "}
            <a href="/" style={{ color: "#3b6ef5", textDecoration: "underline" }}>
              홈으로 이동
            </a>
          </p>
        </div>
      </div>
    );
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
    <div className="app-shell">
    <MCPOnboardingGate />
    <PersonaSidebar
      activeSubjectId="digital-engineering"
      role={authUser?.role}
      conversations={conversations}
      activeConversationId={conversationId}
    />
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
        {authUser && (
          <p style={{ margin: "6px 0 0", color: "#9ca3af", fontSize: 13 }}>
            {authUser.name} ({authUser.studentNumber}) · {authUser.role}
          </p>
        )}
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

      {mcpDisconnected && <MCPDisconnectedCard />}

      {conversationNotFound && (
        <section
          role="alert"
          data-conversation-not-found="true"
          style={{
            marginTop: 24,
            padding: 16,
            border: "1px solid #fde68a",
            borderRadius: 8,
            background: "#fffbeb",
            color: "#92400e",
            fontSize: 14
          }}
        >
          <strong>대화를 찾지 못했어요</strong>
          <p style={{ margin: "4px 0 0" }}>
            요청한 대화가 삭제됐거나 본인 계정의 대화가 아닙니다. 사이드바에서
            다른 대화를 선택하거나 "새 대화 시작" 을 눌러주세요.
          </p>
        </section>
      )}

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

      <footer style={{ marginTop: 32, paddingTop: 12, borderTop: "1px solid #e5e7eb", fontSize: 12, color: "#6b7280" }}>
        Bedrock + 자체 API key 등록은 본 sprint 미지원 (이중 과금 회피). 자세히 보기 →{" "}
        <a
          href="/onboarding-mcp.html"
          aria-label="MCP 연동 설정 가이드 보기"
          style={{ color: "#6b7280", textDecoration: "underline" }}
        >
          MCP 연동 설정 가이드
        </a>
      </footer>
    </main>
    </div>
  );
}
