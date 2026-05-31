// S4a React island leaf — subject-summary-detail 뷰 순수 프레젠테이션 컴포넌트(props only, hook 0).
// hook 구독 0, effect-setState 0. data-action="generate-week-note" = document 위임 보존.
// JSX 자동 escape, innerHTML 주입 없음 (INV-8).

import { sanitizeExternalUrl } from "../app/safe-url.ts";

// ─── public types ────────────────────────────────────────────────────────────

export interface SummaryKeywordItem {
  id: string;
  label: string;
  professorSignal: string;
  status: "covered" | "missing";
  conceptTitles: string[];
}

export interface SummaryConceptItem {
  id: string;
  title: string;
  summary: string;
  easyExplanation: string;
  sourceHints: string[];
  priority: "must-know" | "high" | "review";
}

export interface SummaryQuestionItem {
  id: string;
  difficulty: "basic" | "applied";
  prompt: string;
  answer: string;
  explanation: string;
}

export interface SummarySourceItem {
  id: string;
  kind: string;
  kindLabel: string;
  visibility: string;
  visibilityLabel: string;
  title: string;
  note: string;
  pages: string | null;
}

export interface QuickNoteSection {
  heading: string;
  body: string[];
}

export interface QuickNoteData {
  status: "ready" | "needs-fill";
  title: string;
  subtitle: string;
  statusLabel: string;
  sections: QuickNoteSection[];
  primaryHref: string | null;
  primaryLabel: string | null;
}

export interface SubjectSummaryDetailViewProps {
  subjectId: string;
  subjectTitle: string;
  weekId: string;
  weekLabel: string;
  weekTitle: string;
  weekFocus: string;
  classPath: string;
  summaryListPath: string;
  keywords: SummaryKeywordItem[];
  concepts: SummaryConceptItem[];
  questions: SummaryQuestionItem[];
  sources: SummarySourceItem[];
  quickNote: QuickNoteData | null;
}

// ─── sub-components ──────────────────────────────────────────────────────────

function ConceptRow({ concept }: { concept: SummaryConceptItem }): React.ReactElement {
  const priorityLabel = concept.priority === "must-know" ? "필수 개념"
    : concept.priority === "high" ? "중요 개념" : "복습 개념";
  return (
    <article className="concept-row" id={concept.id}>
      <div className="concept-main">
        <p className="meta">{priorityLabel}</p>
        <h3>{concept.title}</h3>
        <p>{concept.summary}</p>
        <p className="plain-explanation">{concept.easyExplanation}</p>
      </div>
      <aside className="concept-side">
        <strong>출처 힌트</strong>
        <ul>
          {concept.sourceHints.map((hint, i) => <li key={i}>{hint}</li>)}
        </ul>
      </aside>
    </article>
  );
}

function QuestionRow({ q }: { q: SummaryQuestionItem }): React.ReactElement {
  const diffLabel = q.difficulty === "basic" ? "기본" : "응용";
  return (
    <details className="question-row">
      <summary>
        <span className="question-difficulty">{diffLabel}</span>
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

function SourceRow({ source }: { source: SummarySourceItem }): React.ReactElement {
  return (
    <article className="source-row">
      <p className="meta">{source.kindLabel} · {source.visibilityLabel}</p>
      <h3>{source.title}</h3>
      <p>{source.note}</p>
      {source.pages && <p className="source-pages">{source.pages}</p>}
    </article>
  );
}

function QuickNotePanel({ note }: { note: QuickNoteData }): React.ReactElement {
  const safeHref = note.primaryHref ? sanitizeExternalUrl(note.primaryHref) : null;
  return (
    <section id="quick-note" className="quick-note-panel" aria-labelledby="quick-note-title">
      <div className="quick-note-header">
        <div>
          <p className="meta">정리노트 · {note.statusLabel}</p>
          <h2 id="quick-note-title">{note.title}</h2>
          <p>{note.subtitle}</p>
        </div>
        <button className="secondary-action" type="button" data-action="clear-quick-note">
          닫기
        </button>
      </div>
      <div className="quick-note-body">
        {note.sections.map((section, i) => (
          <article key={i} className="quick-note-section">
            <h3>{section.heading}</h3>
            <ul>
              {section.body.map((item, j) => <li key={j}>{item}</li>)}
            </ul>
          </article>
        ))}
      </div>
      {safeHref && note.primaryLabel && (
        <a className="action-link" href={safeHref}>{note.primaryLabel}</a>
      )}
    </section>
  );
}

// ─── leaf component ───────────────────────────────────────────────────────────

export function SubjectSummaryDetailView(props: SubjectSummaryDetailViewProps): React.ReactElement {
  const {
    subjectId,
    subjectTitle,
    weekLabel,
    weekTitle,
    weekFocus,
    weekId,
    classPath,
    summaryListPath,
    keywords,
    concepts,
    questions,
    sources,
    quickNote,
  } = props;

  const keywordsLabel = keywords.length > 0
    ? keywords.map((kw) => kw.label).join(", ")
    : "아직 연결된 키워드가 없습니다.";
  const conceptsLabel = concepts.length > 0
    ? concepts.map((c) => c.title).join(", ")
    : "아직 연결된 개념이 없습니다.";
  const sourcesLabel = sources.length > 0
    ? sources.map((s) => s.title).join(", ")
    : "아직 연결된 자료가 없습니다.";

  return (
    <>
      <section className="subject-page-hero">
        <p className="meta">{subjectTitle} · {weekLabel} · 요약본</p>
        <h1>{weekTitle} 요약</h1>
        <p className="lede">{weekFocus}</p>
        <div className="hero-actions">
          <button
            className="action-button"
            type="button"
            data-action="generate-week-note"
            data-subject-id={subjectId}
            data-week-id={weekId}
          >
            이 날짜 요약 만들기
          </button>
          <a className="secondary-link" href={classPath}>수업 상세</a>
          <a className="secondary-link" href={summaryListPath}>요약 목록</a>
        </div>
      </section>

      <section className="summary-grid" aria-label={`${weekLabel} 요약 상태`}>
        <article className="summary-block">
          <p className="meta">키워드</p>
          <p>{keywordsLabel}</p>
        </article>
        <article className="summary-block">
          <p className="meta">개념</p>
          <p>{conceptsLabel}</p>
        </article>
        <article className="summary-block">
          <p className="meta">자료</p>
          <p>{sourcesLabel}</p>
        </article>
      </section>

      {quickNote && <QuickNotePanel note={quickNote} />}

      <section aria-labelledby="week-summary-keywords-title">
        <p className="meta">교수님 키워드</p>
        <h2 id="week-summary-keywords-title">이 날짜에 반영할 키워드</h2>
        <div className="keyword-grid">
              {keywords.length > 0
            ? keywords.map((kw) => (
                <article key={kw.id} className={`keyword-card ${kw.status === "covered" ? "is-covered" : "is-missing"}`}>
                  <div className="keyword-card-header">
                    <h3>{kw.label}</h3>
                    <span>{kw.status === "covered" ? "반영됨" : "보강 필요"}</span>
                  </div>
                  <p>{kw.professorSignal}</p>
                  <div className="linked-concepts">
                    {kw.conceptTitles.length > 0
                      ? kw.conceptTitles.map((t, i) => <span key={i}>{t}</span>)
                      : <span>추가 개념 정리 필요</span>}
                  </div>
                  <div className="keyword-actions">
                    <button
                      className="inline-action"
                      type="button"
                      data-action="generate-keyword-note"
                      data-subject-id={subjectId}
                      data-keyword-id={kw.id}
                    >
                      {kw.status === "covered" ? "정리노트 만들기" : "보강 템플릿 만들기"}
                    </button>
                  </div>
                </article>
              ))
            : <p className="empty-note">아직 연결된 키워드가 없습니다.</p>}
        </div>
      </section>

      <section aria-labelledby="week-summary-concepts-title">
        <p className="meta">요약 상세</p>
        <h2 id="week-summary-concepts-title">개념 설명</h2>
        <div className="concept-list">
          {concepts.length > 0
            ? concepts.map((c) => <ConceptRow key={c.id} concept={c} />)
            : <p className="empty-note">아직 연결된 개념이 없습니다.</p>}
        </div>
      </section>

      <section aria-labelledby="week-summary-practice-title">
        <p className="meta">문제화</p>
        <h2 id="week-summary-practice-title">시험 전에 바꿔볼 질문</h2>
        <div className="question-list">
          {questions.length > 0
            ? questions.map((q) => <QuestionRow key={q.id} q={q} />)
            : <p className="empty-note">아직 연결된 예제문제가 없습니다.</p>}
        </div>
      </section>

      <section aria-labelledby="week-summary-sources-title">
        <p className="meta">근거 자료</p>
        <h2 id="week-summary-sources-title">요약 근거</h2>
        <div className="source-grid">
          {sources.length > 0
            ? sources.map((s) => <SourceRow key={s.id} source={s} />)
            : <p className="empty-note">아직 연결된 자료가 없습니다.</p>}
        </div>
      </section>
    </>
  );
}
