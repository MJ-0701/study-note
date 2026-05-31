// S4a React island leaf — subject-mcp 뷰 순수 프레젠테이션 컴포넌트(props only, hook 0).
// hook 구독 0, effect-setState 0. data-action="generate-subject-note" = document 위임 보존.
// JSX 자동 escape, innerHTML 주입 없음 (INV-8).

import { sanitizeExternalUrl } from "../app/safe-url.ts";

// ─── public types ────────────────────────────────────────────────────────────

export interface SubjectMcpPersona {
  nick: string;
  active: boolean;
}

export interface SubjectMcpQuestion {
  difficulty: "basic" | "applied";
  prompt: string;
  answer: string;
  explanation: string;
}

export interface SubjectMcpViewProps {
  subjectId: string;
  subjectTitle: string;
  examLabel: string;
  weekRange: string;
  summaryPath: string;
  personaCallHref: string | null;  // null = 준비 중
  persona: SubjectMcpPersona | null;
  weakSpots: string;
  keywordsLabel: string;
  questions: SubjectMcpQuestion[];
}

// ─── sub-components ──────────────────────────────────────────────────────────

function QuestionRow({ q }: { q: SubjectMcpQuestion }): React.ReactElement {
  const difficultyLabel = q.difficulty === "basic" ? "기본" : "응용";
  return (
    <details className="question-row">
      <summary>
        <span className="question-difficulty">{difficultyLabel}</span>
        <span>{q.prompt}</span>
      </summary>
      <div className="answer-panel">
        <strong>정답</strong>
        <p>{q.answer}</p>
        <strong>해설</strong>
        <p>{q.explanation}</p>
      </div>
    </details>
  );
}

// ─── leaf component ───────────────────────────────────────────────────────────

export function SubjectMcpView(props: SubjectMcpViewProps): React.ReactElement {
  const {
    subjectId,
    subjectTitle,
    examLabel,
    weekRange,
    summaryPath,
    personaCallHref,
    persona,
    weakSpots,
    keywordsLabel,
    questions,
  } = props;

  const safePersonaCallHref = personaCallHref ? sanitizeExternalUrl(personaCallHref) : null;
  const nickOrTitle = persona?.nick ?? subjectTitle;

  return (
    <>
      <section className="subject-page-hero">
        <p className="meta">{examLabel} · {weekRange}</p>
        <h1>{subjectTitle} MCP 호출</h1>
        <p className="lede">요약본을 만들다가 막히는 개념을 과목 교수님 페르소나에게 물어보기 전, 질문할 키워드와 예제 문제를 정리합니다.</p>
        <div className="hero-actions">
          {safePersonaCallHref && persona?.active ? (
            <a className="action-button" href={safePersonaCallHref}>{persona.nick} 호출</a>
          ) : (
            <button className="action-button is-disabled" type="button" aria-disabled="true">{nickOrTitle} 준비 중</button>
          )}
          <a className="secondary-link" href={summaryPath}>요약본으로 돌아가기</a>
        </div>
      </section>

      <section aria-labelledby="mcp-title" className="subject-mcp-panel">
        <p className="meta">교수님 페르소나</p>
        <h2 id="mcp-title">교수님 페르소나에게 질문하기</h2>
        <p className="lede">요약본을 만들다가 설명이 막히는 개념은 과목별 교수님 페르소나에게 이어서 질문합니다.</p>
        <div className="subject-mcp-callout">
          <div>
            <strong>{nickOrTitle} {persona?.active ? "호출 가능" : "호출 준비 중"}</strong>
            <p>{persona?.active
              ? "현재 요약본과 키워드를 보면서 모르는 부분을 바로 질문할 수 있습니다."
              : "이 과목 페르소나는 아직 준비 중입니다. 먼저 요약본을 만들고 질문거리를 정리하세요."}</p>
          </div>
          {safePersonaCallHref && persona?.active ? (
            <a className="action-button" href={safePersonaCallHref}>{persona.nick} 호출</a>
          ) : (
            <button className="secondary-action" type="button" data-action="generate-subject-note" data-subject-id={subjectId}>질문거리 정리</button>
          )}
        </div>
      </section>

      <section aria-labelledby="mcp-question-title">
        <p className="meta">질문거리 점검</p>
        <h2 id="mcp-question-title">막히기 쉬운 포인트</h2>
        <div className="summary-grid">
          <article className="summary-block">
            <p className="meta">취약 포인트</p>
            <p>{weakSpots}</p>
          </article>
          <article className="summary-block">
            <p className="meta">교수님 키워드</p>
            <p>{keywordsLabel}</p>
          </article>
          <article className="summary-block">
            <p className="meta">질문 전 확인</p>
            <p>PDF 원문과 내 요약본을 먼저 열어 근거 페이지를 확인합니다.</p>
          </article>
        </div>
      </section>

      <section aria-labelledby="mcp-examples-title">
        <p className="meta">예제 문제</p>
        <h2 id="mcp-examples-title">질문으로 바꿔볼 문제</h2>
        <div className="question-list">
          {questions.length > 0
            ? questions.map((q, i) => <QuestionRow key={i} q={q} />)
            : <p className="empty-note">아직 연결된 예제문제가 없습니다.</p>}
        </div>
      </section>
    </>
  );
}
