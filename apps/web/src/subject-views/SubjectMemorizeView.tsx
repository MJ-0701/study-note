// S4a React island leaf — subject-memorize 뷰 순수 프레젠테이션 컴포넌트(props only, hook 0).
// hook 구독 0, effect-setState 0. JSX 자동 escape, innerHTML 주입 없음 (INV-8).

// ─── public types ────────────────────────────────────────────────────────────

export interface MemorizeWeekItem {
  id: string;
  label: string;
  title: string;
  href: string;
}

export interface MemorizeExamGroup {
  title: string;
  weeks: MemorizeWeekItem[];
}

export interface MemorizeConcept {
  id: string;
  priority: "must-know" | "high" | "review";
  title: string;
  summary: string;
  easyExplanation: string;
  sourceHints: string[];
  linkedQuestionCount: number;
}

export interface MemorizeKeyword {
  id: string;
  subjectId: string;
  label: string;
  professorSignal: string;
  status: "covered" | "missing";
  conceptTitles: string[];
}

export interface MemorizeQuestion {
  difficulty: "basic" | "applied";
  prompt: string;
  answer: string;
  explanation: string;
}

export interface SubjectMemorizeViewProps {
  subjectId: string;
  subjectTitle: string;
  examLabel: string;
  summaryPath: string;
  mcpPath: string;
  examScope: string;
  strategy: string;
  weakSpots: string;
  midtermGroup: MemorizeExamGroup;
  finalGroup: MemorizeExamGroup;
  mustKnowConcepts: MemorizeConcept[];
  keywords: MemorizeKeyword[];  // missingKeywords if any, else all keywords
  examQuestions: MemorizeQuestion[];  // first 5
}

// ─── sub-components ──────────────────────────────────────────────────────────

function SummaryBlock({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <article className="summary-block">
      <p className="meta">{label}</p>
      <p>{value}</p>
    </article>
  );
}

function ExamGroupSection({ group }: { group: MemorizeExamGroup }): React.ReactElement {
  if (group.weeks.length === 0) {
    return (
      <div className="memorize-exam-group memorize-exam-group--empty">
        <h3>{group.title}</h3>
        <p className="empty-note">{group.title} 구간의 수업일이 없습니다.</p>
      </div>
    );
  }
  return (
    <div className="memorize-exam-group">
      <h3>{group.title} <span className="memorize-exam-group__count">{group.weeks.length}회</span></h3>
      <ul className="memorize-exam-group__list">
        {group.weeks.map((week) => (
          <li key={week.id}>
            <a href={week.href}>
              <span className="memorize-exam-group__label">{week.label}</span>
              <span className="memorize-exam-group__title">{week.title}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ConceptRow({ concept }: { concept: MemorizeConcept }): React.ReactElement {
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
        <strong>연결 문제</strong>
        <p>{concept.linkedQuestionCount}개</p>
      </aside>
    </article>
  );
}

function KeywordCard({ keyword }: { keyword: MemorizeKeyword }): React.ReactElement {
  const statusLabel = keyword.status === "covered" ? "반영됨" : "보강 필요";
  const buttonLabel = keyword.status === "covered" ? "정리노트 만들기" : "보강 템플릿 만들기";
  return (
    <article className={`keyword-card ${keyword.status === "covered" ? "is-covered" : "is-missing"}`}>
      <div className="keyword-card-header">
        <h3>{keyword.label}</h3>
        <span>{statusLabel}</span>
      </div>
      <p>{keyword.professorSignal}</p>
      <div className="linked-concepts">
        {keyword.conceptTitles.length > 0
          ? keyword.conceptTitles.map((t, i) => <span key={i}>{t}</span>)
          : <span>추가 개념 정리 필요</span>}
      </div>
      <div className="keyword-actions">
        <button
          className="inline-action"
          type="button"
          data-action="generate-keyword-note"
          data-subject-id={keyword.subjectId}
          data-keyword-id={keyword.id}
        >
          {buttonLabel}
        </button>
      </div>
    </article>
  );
}

function QuestionRow({ q }: { q: MemorizeQuestion }): React.ReactElement {
  const diffLabel = q.difficulty === "basic" ? "기본" : "응용"; // "applied" → "응용" (parity with formatQuestionDifficulty)
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

// ─── leaf component ───────────────────────────────────────────────────────────

export function SubjectMemorizeView(props: SubjectMemorizeViewProps): React.ReactElement {
  const {
    subjectTitle,
    examLabel,
    summaryPath,
    mcpPath,
    examScope,
    strategy,
    weakSpots,
    midtermGroup,
    finalGroup,
    mustKnowConcepts,
    keywords,
    examQuestions,
  } = props;

  return (
    <>
      <section className="subject-page-hero">
        <p className="meta">{examLabel} · 시험 직전</p>
        <h1>{subjectTitle} 필수 암기노트</h1>
        <p className="lede">날짜별 요약을 다 본 뒤 마지막으로 암기할 범위, 약한 포인트, 필수 개념만 압축해서 확인합니다.</p>
        <div className="hero-actions">
          <a className="action-button" href={summaryPath}>날짜별 요약 보기</a>
          <a className="secondary-link" href={mcpPath}>MCP 호출 준비</a>
        </div>
      </section>

      <section className="summary-grid" aria-label={`${subjectTitle} 암기 전략`}>
        <SummaryBlock label="시험 범위" value={examScope} />
        <SummaryBlock label="복습 전략" value={strategy} />
        <SummaryBlock label="취약 포인트" value={weakSpots} />
      </section>

      <section aria-labelledby="memorize-by-exam-title">
        <p className="meta">시험 구간별 수업일</p>
        <h2 id="memorize-by-exam-title">중간고사 / 기말고사 묶음</h2>
        <p className="lede">현재 학기의 수업일을 시험 구간으로 나눕니다. 수업일자 오름차순.</p>
        <ExamGroupSection group={midtermGroup} />
        <ExamGroupSection group={finalGroup} />
      </section>

      <section aria-labelledby="memorize-concepts-title">
        <p className="meta">필수 개념</p>
        <h2 id="memorize-concepts-title">반드시 외울 개념</h2>
        <div className="concept-list">
          {mustKnowConcepts.length > 0
            ? mustKnowConcepts.map((c) => <ConceptRow key={c.id} concept={c} />)
            : <p className="empty-note">아직 필수 개념이 없습니다.</p>}
        </div>
      </section>

      <section aria-labelledby="memorize-keywords-title">
        <p className="meta">빈칸 점검</p>
        <h2 id="memorize-keywords-title">보강할 교수님 키워드</h2>
        <div className="keyword-grid">
          {keywords.map((kw) => <KeywordCard key={kw.id} keyword={kw} />)}
        </div>
      </section>

      <section aria-labelledby="memorize-questions-title">
        <p className="meta">직전 점검</p>
        <h2 id="memorize-questions-title">말로 풀어볼 질문</h2>
        <div className="question-list">
          {examQuestions.length > 0
            ? examQuestions.map((q, i) => <QuestionRow key={i} q={q} />)
            : <p className="empty-note">아직 연결된 예제문제가 없습니다.</p>}
        </div>
      </section>
    </>
  );
}
