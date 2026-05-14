// sprint-7 slice-1 — MCP first-time onboarding gate modal (3 버튼 + dismiss state machine).
//
// sprint-1 slice-4 의 단일 localStorage flag 모델을 plan §3 AC2 lock 대로 재설계:
//   - "이미 설정 완료" → localStorage 영구 dismiss
//   - "나중에" / Escape / X / 배경 클릭 → sessionStorage 임시 dismiss (새 탭/세션 재표시)
//   - "지금 안내 보기" → /onboarding-mcp.html#trouble 이동, storage 미변경
//
// invariant: gate 의 영구 dismiss 는 "이미 설정 완료" 명시 클릭만 가능.
// MCP 설정 미완료 사용자가 안내 페이지 클릭만으로 gate 를 영구 숨길 수 없다.
//
// a11y: role="dialog" + aria-modal + aria-labelledby + Escape 닫기 + 첫 focus = 첫 button.
import { useCallback, useEffect, useRef, useState } from "react";
import {
  applyDismiss,
  isGateDismissed,
  type GateStores,
  type StorageLike
} from "./gate-state";

const BACKEND_BASE =
  (import.meta.env.VITE_BACKEND_BASE as string | undefined) ?? "";

type AuthBootState = "loading" | "ready" | "unauthenticated" | "error";

function safeStorage(kind: "local" | "session"): StorageLike {
  // SSR / iframe / privacy mode 에서 storage 차단 시 in-memory fallback.
  // 차단된 환경의 gate 는 매 새로고침 마다 표시되지만, 사용자 명시 "완료"
  // 클릭이 같은 페이지 라이프사이클 내에서는 효과 있다.
  const fallback = new Map<string, string>();
  try {
    const target = kind === "local" ? window.localStorage : window.sessionStorage;
    // probe — Safari private mode 등은 setItem 시 throw.
    const probeKey = `__study_note_probe_${kind}__`;
    target.setItem(probeKey, "1");
    target.removeItem(probeKey);
    return target;
  } catch {
    return {
      getItem: (k) => (fallback.has(k) ? fallback.get(k)! : null),
      setItem: (k, v) => {
        fallback.set(k, v);
      },
      removeItem: (k) => {
        fallback.delete(k);
      }
    };
  }
}

export function MCPOnboardingGate() {
  const [authBoot, setAuthBoot] = useState<AuthBootState>("loading");
  const [open, setOpen] = useState(false);
  const firstButtonRef = useRef<HTMLButtonElement>(null);
  const storesRef = useRef<GateStores | null>(null);

  if (storesRef.current === null) {
    storesRef.current = {
      local: safeStorage("local"),
      session: safeStorage("session")
    };
  }

  // /me 호출로 sign-in 상태 확인 + dismiss state 평가.
  useEffect(() => {
    const stores = storesRef.current!;
    if (isGateDismissed(stores)) {
      setAuthBoot("unauthenticated"); // skip — 이미 dismiss 상태
      return;
    }
    let cancelled = false;
    fetch(`${BACKEND_BASE}/api/v1/auth/me`, { credentials: "include" })
      .then((res) => {
        if (cancelled) return;
        if (res.ok) {
          setAuthBoot("ready");
          setOpen(true);
        } else {
          setAuthBoot("unauthenticated");
        }
      })
      .catch(() => {
        if (!cancelled) setAuthBoot("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (open && firstButtonRef.current) {
      firstButtonRef.current.focus();
    }
  }, [open]);

  const handleExternalClose = useCallback(() => {
    const stores = storesRef.current;
    if (stores) applyDismiss(stores, "external-close");
    setOpen(false);
  }, []);

  const handleDeferred = useCallback(() => {
    const stores = storesRef.current;
    if (stores) applyDismiss(stores, "deferred");
    setOpen(false);
  }, []);

  const handleCompleted = useCallback(() => {
    const stores = storesRef.current;
    if (stores) applyDismiss(stores, "completed");
    setOpen(false);
  }, []);

  const handleGoToGuide = useCallback(() => {
    const stores = storesRef.current;
    if (stores) applyDismiss(stores, "guide");
    setOpen(false);
    window.location.href = "/onboarding-mcp.html#trouble";
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        handleExternalClose();
      }
    },
    [open, handleExternalClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!open || authBoot !== "ready") return null;

  return (
    <>
      {/* 배경 오버레이 */}
      <div
        aria-hidden="true"
        onClick={handleExternalClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.40)",
          zIndex: 999
        }}
      />

      {/* 모달 본체 */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mcp-gate-title"
        data-mcp-onboarding-gate="true"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 1000,
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          boxShadow: "0 20px 48px rgba(0,0,0,0.18)",
          maxWidth: 480,
          width: "calc(100vw - 32px)",
          padding: "28px 28px 24px"
        }}
      >
        {/* 닫기 버튼 (X) — 외부 close 와 동일 액션 */}
        <button
          ref={firstButtonRef}
          type="button"
          aria-label="모달 닫기"
          onClick={handleExternalClose}
          data-mcp-gate-action="external-close"
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            background: "transparent",
            border: 0,
            borderRadius: 6,
            color: "#6b7280",
            cursor: "pointer",
            font: "inherit",
            fontSize: 20,
            lineHeight: 1,
            minHeight: 32,
            minWidth: 32,
            padding: 4
          }}
        >
          ×
        </button>

        <h2
          id="mcp-gate-title"
          style={{ fontSize: 18, fontWeight: 700, margin: "0 0 12px", color: "#111827" }}
        >
          🎓 더 똑똑한 페르소나 호출을 위해
        </h2>

        <p style={{ margin: "0 0 12px", color: "#374151", fontSize: 14, lineHeight: 1.65 }}>
          study-note 의 강의 자료 + 페르소나 prompt 를 본인 Claude Desktop / Cursor 에 연결할 수
          있어요.
        </p>

        <ul
          style={{
            margin: "0 0 16px",
            padding: 0,
            listStyle: "none",
            display: "grid",
            gap: 6,
            color: "#374151",
            fontSize: 14,
            lineHeight: 1.65
          }}
        >
          <li>✓ 본인 구독 client 의 익숙한 UI 그대로 사용</li>
          <li>✓ study-note 의 corpus + 디공이 페르소나 그대로 호출</li>
          <li>✓ Bedrock / API key 등록 X (이중 과금 회피)</li>
        </ul>

        <p style={{ margin: "0 0 20px", color: "#374151", fontSize: 14, lineHeight: 1.65 }}>
          5~10분이면 끝나요. 아래에서 선택해주세요.
        </p>

        {/* 3 버튼 — plan §3 AC2 lock */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={handleGoToGuide}
            data-mcp-gate-action="guide"
            style={{
              background: "#3b6ef5",
              border: "1px solid #3b6ef5",
              borderRadius: 8,
              color: "#fff",
              cursor: "pointer",
              font: "inherit",
              fontSize: 14,
              fontWeight: 600,
              minHeight: 44,
              padding: "10px 16px",
              flex: "1 1 100%"
            }}
          >
            지금 안내 보기
          </button>
          <button
            type="button"
            onClick={handleCompleted}
            data-mcp-gate-action="completed"
            style={{
              background: "#ffffff",
              border: "1px solid #c7d2fe",
              borderRadius: 8,
              color: "#3730a3",
              cursor: "pointer",
              font: "inherit",
              fontSize: 14,
              fontWeight: 500,
              minHeight: 44,
              padding: "10px 14px",
              flex: "1 1 calc(50% - 5px)"
            }}
          >
            이미 설정 완료
          </button>
          <button
            type="button"
            onClick={handleDeferred}
            data-mcp-gate-action="deferred"
            style={{
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              color: "#374151",
              cursor: "pointer",
              font: "inherit",
              fontSize: 14,
              fontWeight: 500,
              minHeight: 44,
              padding: "10px 14px",
              flex: "1 1 calc(50% - 5px)"
            }}
          >
            나중에
          </button>
        </div>
      </div>
    </>
  );
}
