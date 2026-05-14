// slice-4: onboarding-mcp page.
// React entry — /onboarding-mcp.html 에 mount.
// §4.3 copy text verbatim.
//
// sprint-7 slice-2 추가:
//   - S1/S2/S3 secret-handling 카피 (plan §3 AC2-amend2 / §4.1 lock) — JSON snippet
//     인접 영역에 명시.
//   - `id="trouble"` anchor — MCPDisconnectedCard 의 `/onboarding-mcp.html#trouble`
//     deep-link target.
import { StrictMode, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "../styles.css";
import "./styles.css";
import {
  S1_LOCAL_ONLY,
  S2_DO_NOT_COMMIT,
  S3_LEAST_PRIVILEGE
} from "./secret-handling-copy";

const JSON_SNIPPET = `{
  "mcpServers": {
    "study-note": {
      "command": "node",
      "args": ["/path/to/study-note/apps/mcp/dist/index.js"],
      "env": {
        "STUDY_NOTE_AUTH_DEV_ENABLED": "true",
        "STUDY_NOTE_MCP_OWNER_STUDENT_NUMBER": "<YOUR_STUDENT_NUMBER>",
        "DATABASE_URL": "<YOUR_DATABASE_URL>"
      }
    }
  }
}`;

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1000);
    });
  }

  return (
    <button
      type="button"
      className={`copy-button${copied ? " copied" : ""}`}
      aria-label="코드 복사"
      onClick={handleCopy}
    >
      {copied ? "복사됨" : "복사"}
    </button>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="code-block-wrapper">
      <pre>
        <code>{code}</code>
      </pre>
      <CopyButton text={code} />
    </div>
  );
}

function OnboardingPage() {
  // sprint-7 slice-2 — `/onboarding-mcp.html#trouble` deep-link 시 트러블슈팅 섹션으로
  // 스크롤. React StrictMode 의 double-render + 브라우저 hash anchor 가 race 할 수 있어
  // useEffect 로 명시.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return;
    const target = document.getElementById(hash);
    if (target) {
      target.scrollIntoView({ behavior: "auto", block: "start" });
    }
  }, []);

  return (
    <div className="onboarding-page">
      <div className="onboarding-inner">
        {/* ── 제목 + 인트로 (spec §4.3) ── */}
        <header className="onboarding-header">
          <h1>MCP 연동 설정 가이드</h1>
          <p className="onboarding-subtitle">Claude Desktop · Cursor 에서 study-note 호출하기</p>
          <p className="onboarding-intro">
            본 페이지는 study-note 의 강의 자료 + 페르소나 prompt 를 본인 구독 client (Claude
            Desktop / Cursor) 에서 호출하도록 설정하는 1회 설정 가이드입니다. 모든 호출은 본인
            구독으로 진행됩니다 — study-note 는 본인 자격증명/구독을 보지 않습니다.
          </p>
        </header>

        {/* ── 1. 소개 ── */}
        <section className="onboarding-section" aria-labelledby="section-intro">
          <h2 id="section-intro">소개</h2>
          <p>
            study-note 는 MCP (Model Context Protocol) 를 통해 본인 Claude Desktop / Cursor 에
            강의 자료 corpus 와 디공이 페르소나 prompt 를 노출합니다.
          </p>
          <p>
            연결 후 본인 AI client 에서 "디공이로 디지털 회로 강의 1주차 요약해줘" 와 같이 직접
            질문할 수 있습니다.
          </p>
          <p>
            모든 LLM 호출은 <strong>본인 구독</strong>으로 실행됩니다. study-note 는 본인
            자격증명/구독을 저장하거나 보지 않습니다.
          </p>
          <p>
            Bedrock / API key 직접 등록 방식은 본 sprint 미지원입니다 (이중 과금 회피).
          </p>
        </section>

        {/* ── 2. 사전 준비 ── */}
        <section className="onboarding-section" aria-labelledby="section-prereq">
          <h2 id="section-prereq">사전 준비</h2>
          <ul className="prereq-list" aria-label="사전 준비 사항">
            <li>
              <strong>Step 1.</strong> Claude Desktop 또는 Cursor 를 설치합니다.
            </li>
            <li>
              <strong>Step 2.</strong> 설치한 클라이언트에 본인 계정으로 로그인합니다.
            </li>
            <li>
              <strong>Step 3.</strong> study-note 에서 sign-in 한 학번을 확인합니다. 이후 단계에서
              그 학번 그대로 입력합니다.
            </li>
          </ul>
        </section>

        {/* ── 3. Claude Desktop 설정 ── */}
        <section className="onboarding-section" aria-labelledby="section-claude-desktop">
          <h2 id="section-claude-desktop">Claude Desktop 설정</h2>
          <h3 id="section-claude-desktop-steps">설정 단계</h3>
          <ol className="step-list" aria-labelledby="section-claude-desktop-steps">
            <li>Claude Desktop 메뉴 → 설정 → Developer 탭을 엽니다.</li>
            <li>
              <code>claude_desktop_config.json</code> 열기 버튼을 클릭합니다.
            </li>
            <li>
              아래 JSON 스니펫을 <code>mcpServers</code> 항목에 추가합니다.
              경로와 env 값을 본인 환경에 맞게 채워야 합니다.
              <ul style={{ marginTop: 8, paddingLeft: 20, color: "var(--ds-fg-soft)", fontSize: "var(--ds-fs-meta)" }}>
                <li><code>&lt;YOUR_STUDENT_NUMBER&gt;</code> = study-note 에서 sign-in 한 8자리 학번</li>
                <li><code>&lt;YOUR_DATABASE_URL&gt;</code> = 로컬 DB 연결 문자열</li>
              </ul>
            </li>
          </ol>
          <CodeBlock code={JSON_SNIPPET} />

          {/* sprint-7 slice-2 — secret-handling 안내 (plan §3 AC2-amend2 / §4.1 S1/S2/S3 lock).
              JSON snippet 인접 노출 — 사용자가 DATABASE_URL 채우기 직전/직후에 본다. */}
          <aside
            className="secret-handling-notice"
            role="note"
            aria-label="비밀 정보 취급 안내"
            data-secret-handling-notice="true"
            style={{
              marginTop: 12,
              padding: 12,
              border: "1px solid #fed7aa",
              borderRadius: 8,
              background: "#fff7ed",
              color: "#7c2d12",
              fontSize: 13,
              lineHeight: 1.65
            }}
          >
            <strong style={{ display: "block", marginBottom: 6 }}>
              ⚠ 비밀 정보 취급 안내
            </strong>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li data-secret-handling-id="S1">{S1_LOCAL_ONLY}</li>
              <li data-secret-handling-id="S2" style={{ marginTop: 4 }}>
                {S2_DO_NOT_COMMIT}
              </li>
              <li data-secret-handling-id="S3" style={{ marginTop: 4 }}>
                {S3_LEAST_PRIVILEGE}
              </li>
            </ul>
          </aside>

          <ol className="step-list" start={4} style={{ marginTop: "var(--ds-space-sm)" }} aria-label="Claude Desktop 추가 단계">
            <li>Claude Desktop 을 재시작합니다.</li>
            <li>
              새 채팅에서 "디공이 페르소나 호출" 을 시도합니다.
              예: "디공이로 디지털 회로 강의 1주차 요약해줘"
            </li>
          </ol>
        </section>

        {/* ── 4. Cursor 설정 ── */}
        <section className="onboarding-section" aria-labelledby="section-cursor">
          <h2 id="section-cursor">Cursor 설정</h2>
          <h3 id="section-cursor-steps">설정 단계</h3>
          <ol className="step-list" aria-labelledby="section-cursor-steps">
            <li>
              Cursor Settings → MCP Servers 를 열거나,{" "}
              <code>~/.cursor/mcp.json</code> 파일을 직접 엽니다.
            </li>
            <li>
              Claude Desktop 과 동일한 JSON 스니펫을 추가합니다 (위 스니펫 동일).
              경로와 env 값을 채우는 방식도 동일합니다.
            </li>
            <li>Cursor 를 재시작합니다.</li>
            <li>
              채팅창에서 study-note MCP 서버가 활성화됐는지 확인한 뒤, 페르소나를 호출합니다.
            </li>
          </ol>
        </section>

        {/* ── 5. 트러블슈팅 ── */}
        {/* sprint-7 slice-2 — `id="trouble"` = MCPDisconnectedCard 의 deep-link target.
            `section-trouble` 도 backward-compat 유지 (aria-labelledby 가 h2 의 id 참조). */}
        <section
          id="trouble"
          className="onboarding-section"
          aria-labelledby="section-trouble"
        >
          <h2 id="section-trouble">트러블슈팅</h2>
          <ul className="trouble-list">
            <li>
              <strong>tools/list 가 비어 있다</strong>
              <code>STUDY_NOTE_MCP_OWNER_STUDENT_NUMBER</code> 가 본인 학번인지, study-note 에서
              sign-in 한 학번과 일치하는지 확인합니다.
            </li>
            <li>
              <strong>owner not authorized (stderr)</strong>
              본인 학번이 맞는지, study-note 에서 해당 학번으로 sign-in 했는지 확인합니다.
            </li>
            <li>
              <strong>AUTH_DEV_DISABLED</strong>
              환경 변수 <code>STUDY_NOTE_AUTH_DEV_ENABLED=false</code> 가 설정돼 있는지 확인합니다.
              로컬 dev 환경에서는 <code>true</code> 로 설정해야 합니다.
            </li>
            <li>
              <strong>MCP server start 실패</strong>
              터미널에서 <code>node apps/mcp/dist/index.js</code> 를 직접 실행한 뒤 stderr 메시지를
              확인합니다.
            </li>
          </ul>
        </section>

        {/* ── 6. 미지원 카피 (spec §4.4) ── */}
        <div className="unsupported-note" role="note" aria-label="미지원 항목 안내">
          <p>Bedrock + 자체 API key 등록은 본 sprint 의 미지원 항목입니다.</p>
          <p>
            study-note 는 본인 구독 client 의 MCP 호출 path 만 지원합니다. 자체 API key / Bedrock
            자격증명을 받지 않는 이유는: (1) 이중 과금 회피, (2) 자격증명 저장 책임 회피. 본인
            구독을 그대로 사용하시면 됩니다.
          </p>
        </div>

        {/* ── 7. 돌아가기 ── */}
        <footer className="onboarding-footer">
          <a href="/persona-turn.html" className="back-link">
            ← 페르소나 호출 화면으로 돌아가기
          </a>
        </footer>
      </div>
    </div>
  );
}

const rootEl = document.getElementById("onboarding-mcp-root");
if (!rootEl) {
  throw new Error("onboarding-mcp-root element missing in onboarding-mcp.html");
}

createRoot(rootEl).render(
  <StrictMode>
    <OnboardingPage />
  </StrictMode>
);
