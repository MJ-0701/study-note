// slice-4: MCP first-time onboarding gate modal.
// 조건: localStorage "study-note.mcp.onboarding-shown" === null + 본인 sign-in 완료.
// 본인 sign-in 여부는 GET /api/v1/auth/me (credentials: "include") 로 자체 확인.
// 닫기 (X / "나중에" / "이미 완료" / "지금 설정 안내 보기") 모두 localStorage flag set.
// a11y: role="dialog" + aria-modal + aria-labelledby + Escape 닫기 + 첫 focus = 첫 button.
import { useCallback, useEffect, useRef, useState } from "react";

const LS_KEY = "study-note.mcp.onboarding-shown";
const BACKEND_BASE =
  (import.meta.env.VITE_BACKEND_BASE as string | undefined) ?? "";

type AuthBootState = "loading" | "ready" | "unauthenticated" | "error";

function isAlreadyShown(): boolean {
  try {
    return localStorage.getItem(LS_KEY) !== null;
  } catch {
    return true; // storage blocked → skip modal
  }
}

function markShown(): void {
  try {
    localStorage.setItem(LS_KEY, "true");
  } catch {
    // storage blocked — ignore
  }
}

export function MCPOnboardingGate() {
  const [authBoot, setAuthBoot] = useState<AuthBootState>("loading");
  const [open, setOpen] = useState(false);
  const firstButtonRef = useRef<HTMLButtonElement>(null);

  // /me 호출로 sign-in 상태 확인
  useEffect(() => {
    if (isAlreadyShown()) {
      setAuthBoot("unauthenticated"); // skip — 이미 표시됨
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

  // 첫 버튼에 focus
  useEffect(() => {
    if (open && firstButtonRef.current) {
      firstButtonRef.current.focus();
    }
  }, [open]);

  // Escape 키로 닫기
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        handleClose();
      }
    },
    [open] // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  function handleClose() {
    markShown();
    setOpen(false);
  }

  function handleGoToGuide() {
    markShown();
    setOpen(false);
    window.location.href = "/onboarding-mcp.html";
  }

  if (!open || authBoot !== "ready") return null;

  return (
    <>
      {/* 배경 오버레이 */}
      <div
        aria-hidden="true"
        onClick={handleClose}
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
        {/* 닫기 버튼 (X) */}
        <button
          ref={firstButtonRef}
          type="button"
          aria-label="모달 닫기"
          onClick={handleClose}
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

        {/* 제목 (spec §4.2) */}
        <h2
          id="mcp-gate-title"
          style={{ fontSize: 18, fontWeight: 700, margin: "0 0 12px", color: "#111827" }}
        >
          🎓 더 똑똑한 페르소나 호출을 위해
        </h2>

        {/* 본문 (spec §4.2 verbatim) */}
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
          5~10분이면 끝나요. 가이드를 따라가시면 됩니다.
        </p>

        {/* 버튼 영역 */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={handleGoToGuide}
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
              flex: "1 1 auto"
            }}
          >
            지금 설정 안내 보기
          </button>
          <button
            type="button"
            onClick={handleClose}
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
              padding: "10px 14px"
            }}
          >
            나중에
          </button>
        </div>
      </div>
    </>
  );
}
