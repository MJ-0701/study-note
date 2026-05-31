// S4b-1 React island leaf — week 뷰 순수 프레젠테이션 컴포넌트(props only, hook 0).
// hook 구독 0, effect-setState 0. data-action 위임 보존. JSX 자동 escape.
// userNotes = uncontrolled textarea (defaultValue). key=userNotesToken 으로
// fetchUserNoteIfMissing 완료 후 re-hydrate 보장 (typing 중 renderApp 미호출 →
// 동일 token → 재마운트 없음).

// ─── public types ────────────────────────────────────────────────────────────

export interface WeekViewPdfMaterial {
  materialKey: string;
  subjectTitle: string;
  classDateLabel: string;
  fileName: string;
  fileSize: string;
  pageCount: number;
  statusLabel: string;
  ownerLabel: string;
  classDateIsUnconfirmed: boolean;
}

export interface WeekViewConceptItem {
  id: string;
  priority: string;
  title: string;
  summary: string;
  easyExplanation: string;
  sourceHints: string[];
  linkedQuestionCount: number;
}

export interface WeekViewQuestionItem {
  difficulty: string;
  prompt: string;
  answer: string;
  explanation: string;
}

export interface WeekViewQuickNote {
  statusLabel: string;
  title: string;
  subtitle: string;
  sections: Array<{ heading: string; body: string[] }>;
  primaryHref: string | null;
  primaryLabel: string | null;
}

export interface WeekViewProps {
  // hero
  subjectId: string;
  subjectTitle: string;
  weekId: string;
  weekLabel: string;
  weekTitle: string;
  weekFocus: string;
  reviewStatusLabel: string;
  classPath: string;
  // §1 overview
  keywordLabels: string[];
  conceptTitles: string[];
  sourceTitles: string[];
  // §2 concepts
  concepts: WeekViewConceptItem[];
  // §3 questions
  questions: WeekViewQuestionItem[];
  // userNotes
  userNotes: string;
  userNotesToken: string;
  // mapped PDF
  materials: WeekViewPdfMaterial[];
  // quickNote (null = panel 숨김)
  quickNote: WeekViewQuickNote | null;
}

// ─── sub-components ──────────────────────────────────────────────────────────

function WeekColumnList({ label, values }: { label: string; values: string[] }): React.ReactElement {
  return (
    <div className="week-column">
      <p className="meta">{label}</p>
      {values.length > 0
        ? <ul>{values.map((v, i) => <li key={i}>{v}</li>)}</ul>
        : <p className="empty-note">추가 정리 필요</p>}
    </div>
  );
}

function ConceptRow({ concept }: { concept: WeekViewConceptItem }): React.ReactElement {
  return (
    <article className="concept-row" id={concept.id}>
      <div className="concept-main">
        <p className="meta">{concept.priority}</p>
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

function QuestionRow({ question }: { question: WeekViewQuestionItem }): React.ReactElement {
  return (
    <details className="question-row">
      <summary>
        <span className="question-difficulty">{question.difficulty}</span>
        <span>{question.prompt}</span>
      </summary>
      <div className="answer-panel">
        <strong>정답</strong>
        <p>{question.answer}</p>
        <strong>해설</strong>
        <p>{question.explanation}</p>
      </div>
    </details>
  );
}

function PdfMaterialCard({ material, subjectId }: { material: WeekViewPdfMaterial; subjectId: string }): React.ReactElement {
  return (
    <article className="pdf-material-card is-compact">
      <div className="pdf-material-card__body">
        <p className="meta">{material.subjectTitle} · {material.classDateLabel}</p>
        <h4>{material.fileName}</h4>
        <p>{material.fileSize} · {material.pageCount}페이지 · {material.statusLabel}</p>
        <div className="pdf-material-card__badges">
          <span>{material.ownerLabel}</span>
          {material.classDateIsUnconfirmed && <span>나중에 수정</span>}
        </div>
      </div>
      <div className="pdf-material-card__actions">
        <button
          className="action-button"
          type="button"
          data-action="open-pdf-material"
          data-subject-id={subjectId}
          data-material-id={material.materialKey}
        >열기</button>
      </div>
    </article>
  );
}

function QuickNotePanel({ quickNote }: { quickNote: WeekViewQuickNote }): React.ReactElement {
  return (
    <section id="quick-note" className="quick-note-panel" aria-labelledby="quick-note-title">
      <div className="quick-note-header">
        <div>
          <p className="meta">정리노트 · {quickNote.statusLabel}</p>
          <h2 id="quick-note-title">{quickNote.title}</h2>
          <p>{quickNote.subtitle}</p>
        </div>
        <button className="secondary-action" type="button" data-action="clear-quick-note">
          닫기
        </button>
      </div>
      <div className="quick-note-body">
        {quickNote.sections.map((section, i) => (
          <article key={i} className="quick-note-section">
            <h3>{section.heading}</h3>
            <ul>
              {section.body.map((item, j) => <li key={j}>{item}</li>)}
            </ul>
          </article>
        ))}
      </div>
      {quickNote.primaryHref && quickNote.primaryLabel && (
        <a className="action-link" href={quickNote.primaryHref}>{quickNote.primaryLabel}</a>
      )}
    </section>
  );
}

// ─── leaf component ───────────────────────────────────────────────────────────

export function WeekView(props: WeekViewProps): React.ReactElement {
  const {
    subjectId,
    subjectTitle,
    weekId,
    weekLabel,
    weekTitle,
    weekFocus,
    reviewStatusLabel,
    classPath,
    keywordLabels,
    conceptTitles,
    sourceTitles,
    concepts,
    questions,
    userNotes,
    userNotesToken,
    materials,
    quickNote,
  } = props;

  return (
    <>
      <section className="subject-page-hero">
        <p className="meta">{subjectTitle} · {weekLabel} · {reviewStatusLabel}</p>
        <h1>{weekTitle}</h1>
        <p className="lede">{weekFocus}</p>
        <div className="hero-actions">
          <button
            className="action-button"
            type="button"
            data-action="generate-week-note"
            data-subject-id={subjectId}
            data-week-id={weekId}
          >
            이 수업일 정리노트 만들기
          </button>
          <a className="action-link" href={classPath}>수업으로 돌아가기</a>
        </div>
      </section>

      <section className="pdf-material-browser" aria-labelledby="week-pdf-title">
        <div className="pdf-material-browser__header">
          <div>
            <p className="meta">연결된 PDF</p>
            <h2 id="week-pdf-title">{weekLabel} 수업자료</h2>
          </div>
          <a className="secondary-link" href={classPath}>PDF 수업일 매핑</a>
        </div>
        {materials.length > 0
          ? (
            <div className="pdf-material-slider is-compact" aria-label={`${weekLabel} 연결 PDF`}>
              {materials.map((material) => (
                <PdfMaterialCard key={material.materialKey} material={material} subjectId={subjectId} />
              ))}
            </div>
          )
          : <p className="empty-note">아직 이 수업일에 연결된 PDF가 없습니다. 수업 화면에서 PDF 수업일을 지정하세요.</p>}
      </section>

      <section className="week-user-notes" aria-labelledby="week-user-notes-title">
        <p className="meta">내 필기</p>
        <h2 id="week-user-notes-title">자유 메모</h2>
        <p className="lede">이 수업일에 대한 자유 형식 메모입니다. 입력 즉시 브라우저에 저장됩니다.</p>
        <textarea
          key={userNotesToken}
          className="week-user-notes__textarea"
          data-action="update-week-user-notes"
          data-subject-id={subjectId}
          data-week-id={weekId}
          aria-labelledby="week-user-notes-title"
          placeholder="강의 중 떠오른 키워드, 질문, 정리 메모를 자유롭게 적으세요."
          rows={8}
          defaultValue={userNotes}
        />
      </section>

      {quickNote && <QuickNotePanel quickNote={quickNote} />}

      <section aria-labelledby="week-overview-title">
        <p className="meta">§1 — 수업일 개요</p>
        <h2 id="week-overview-title">이 수업일에서 볼 것</h2>
        <div className="week-note-grid">
          <WeekColumnList label="키워드" values={keywordLabels} />
          <WeekColumnList label="개념" values={conceptTitles} />
          <WeekColumnList label="자료" values={sourceTitles} />
        </div>
      </section>

      <section aria-labelledby="week-concepts-title">
        <p className="meta">§2 — 개념</p>
        <h2 id="week-concepts-title">개념 설명</h2>
        <div className="concept-list">
          {concepts.length > 0
            ? concepts.map((concept) => <ConceptRow key={concept.id} concept={concept} />)
            : <p className="empty-note">아직 연결된 개념이 없습니다.</p>}
        </div>
      </section>

      <section aria-labelledby="week-practice-title">
        <p className="meta">§3 — 문제 풀이</p>
        <h2 id="week-practice-title">예제문제</h2>
        <div className="question-list">
          {questions.length > 0
            ? questions.map((q, i) => <QuestionRow key={i} question={q} />)
            : <p className="empty-note">아직 연결된 예제문제가 없습니다.</p>}
        </div>
      </section>
    </>
  );
}
