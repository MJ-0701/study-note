// Exam-prep 산출물을 study-note 과목 하위 화면으로 품는 순수 프레젠테이션 뷰.
// props only, hook 0. 별도 PDF/워크북 내용은 앱 네이티브 템플릿으로 렌더링한다.

import { sanitizeExternalUrl } from "../app/safe-url.ts";
import type {
  ExamPrepConcept,
  ExamPrepQuestion,
  ExamPrepTerm,
  SubjectExamPrepArtifact
} from "./subject-exam-prep-artifacts";

export type { SubjectExamPrepArtifact } from "./subject-exam-prep-artifacts";
export { getSubjectExamPrepArtifact, hasSubjectExamPrepArtifact } from "./subject-exam-prep-artifacts";

export interface SubjectExamPrepViewProps {
  subjectId: string;
  subjectTitle: string;
  examLabel: string;
  weekRange: string;
  summaryPath: string;
  memorizePath: string;
  pdfWorkspacePath: string;
  artifact: SubjectExamPrepArtifact | null;
}

function ConceptCard({ concept }: { concept: ExamPrepConcept }): React.ReactElement {
  return (
    <article className="exam-prep-card">
      <h3>{concept.title}</h3>
      <ul>
        {concept.points.map((point, index) => <li key={index}>{point}</li>)}
      </ul>
    </article>
  );
}

function QuestionCard({ question, index }: { question: ExamPrepQuestion; index: number }): React.ReactElement {
  return (
    <details className={`exam-prep-question exam-prep-question--${question.priority}`}>
      <summary>
        <span className="exam-prep-question__number">{index + 1}</span>
        <span className="exam-prep-question__main">
          <span className="exam-prep-question__meta">
            <strong>{question.priority}</strong>
            {question.tags.map((tag) => <em key={tag}>{tag}</em>)}
          </span>
          <span className="exam-prep-question__title">{question.title}</span>
        </span>
      </summary>
      <div className="exam-prep-answer">
        <section>
          <h4>시험 답안</h4>
          <ul>
            {question.answer.map((line, lineIndex) => <li key={lineIndex}>{line}</li>)}
          </ul>
        </section>
        {question.code && (
          <pre className="exam-prep-code"><code>{question.code}</code></pre>
        )}
        <section>
          <h4>해설</h4>
          <ul>
            {question.explanation.map((line, lineIndex) => <li key={lineIndex}>{line}</li>)}
          </ul>
        </section>
      </div>
    </details>
  );
}

function TermGrid({ terms }: { terms: ExamPrepTerm[] }): React.ReactElement | null {
  if (terms.length === 0) return null;

  return (
    <section className="exam-prep-section exam-prep-section--terms" aria-labelledby="exam-prep-terms-title">
      <p className="meta">용어 정의</p>
      <h2 id="exam-prep-terms-title">단답식으로 바로 쓸 정의</h2>
      <div className="exam-prep-term-grid">
        {terms.map((term) => (
          <article className="exam-prep-term" key={term.term}>
            <strong>{term.term}</strong>
            <p>{term.definition}</p>
            <span>{term.note}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

export function SubjectExamPrepView(props: SubjectExamPrepViewProps): React.ReactElement {
  const {
    subjectTitle,
    examLabel,
    weekRange,
    summaryPath,
    memorizePath,
    pdfWorkspacePath,
    artifact,
  } = props;

  const markdownHref = sanitizeExternalUrl(artifact?.markdownHref);

  return (
    <div className="exam-prep-view">
      <section className="subject-page-hero exam-prep-hero">
        <p className="meta">{examLabel} · {weekRange}</p>
        <h1>{subjectTitle} 시험 대비</h1>
        <p className="lede">별도 PDF와 시험 직결 자료로 만든 답안집을 과목 안에서 바로 확인합니다.</p>
        <div className="hero-actions">
          <a className="action-button" href={summaryPath}>요약본 보기</a>
          <a className="secondary-link" href={memorizePath}>필수 암기노트</a>
          <a className="secondary-link" href={pdfWorkspacePath}>PDF 작업공간</a>
        </div>
      </section>

      {artifact ? (
        <>
        <section className="exam-prep-overview" aria-labelledby="exam-prep-title">
          <div className="exam-prep-overview__copy">
            <p className="meta">{artifact.sourceLabel}</p>
            <h2 id="exam-prep-title">{artifact.title}</h2>
            <p className="lede">{artifact.note}</p>
          </div>
          <div className="exam-prep-toolbar__actions">
            {markdownHref && <a className="secondary-link" href={markdownHref} target="_blank" rel="noreferrer">원본 Markdown</a>}
          </div>
        </section>

        <div className="exam-prep-template">
            <section className="exam-prep-section exam-prep-section--order" aria-labelledby="exam-prep-order-title">
              <p className="meta">공부 순서</p>
              <h3 id="exam-prep-order-title">시험 전 반복 루틴</h3>
              <ol className="exam-prep-order">
                {artifact.studyOrder.map((step) => <li key={step}>{step}</li>)}
              </ol>
            </section>

            <section className="exam-prep-section exam-prep-section--chapters" aria-labelledby="exam-prep-chapters-title">
              <p className="meta">시험 기준 챕터</p>
              <h3 id="exam-prep-chapters-title">범위별로 먼저 볼 것</h3>
              <div className="exam-prep-chapter-grid">
                {artifact.chapters.map((chapter) => (
                  <article className="exam-prep-chapter" key={`${chapter.label}-${chapter.title}`}>
                    <span>{chapter.label}</span>
                    <h4>{chapter.title}</h4>
                    <p>{chapter.focus}</p>
                    <small>{chapter.sourceHint}</small>
                  </article>
                ))}
              </div>
            </section>

            <section className="exam-prep-section exam-prep-section--concepts" aria-labelledby="exam-prep-concepts-title">
              <p className="meta">선행개념</p>
              <h3 id="exam-prep-concepts-title">문제 풀기 전에 고정할 개념</h3>
              <div className="exam-prep-card-grid">
                {artifact.concepts.map((concept) => <ConceptCard key={concept.title} concept={concept} />)}
              </div>
            </section>

            <section className="exam-prep-section exam-prep-section--questions" aria-labelledby="exam-prep-questions-title">
              <p className="meta">문항별 답안</p>
              <h3 id="exam-prep-questions-title">제목만 보고 먼저 말해보기</h3>
              <div className="exam-prep-question-list">
                {artifact.questions.map((question, index) => (
                  <QuestionCard key={question.id} question={question} index={index} />
                ))}
              </div>
            </section>
        </div>

        <div className={`exam-prep-bottom-grid${artifact.terms.length === 0 ? " exam-prep-bottom-grid--single" : ""}`}>
          <TermGrid terms={artifact.terms} />
          <section className="exam-prep-section exam-prep-section--checklist" aria-labelledby="exam-prep-checklist-title">
            <p className="meta">시험 직전</p>
            <h2 id="exam-prep-checklist-title">마지막 체크리스트</h2>
            <ul className="exam-prep-checklist">
              {artifact.checklist.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </section>
        </div>
        </>
      ) : (
        <section className="exam-prep-empty" aria-labelledby="exam-prep-empty-title">
          <p className="meta">시험 대비</p>
          <h2 id="exam-prep-empty-title">아직 연결된 답안집이 없습니다</h2>
          <p className="lede">이 과목의 별도 PDF 산출물이 준비되면 같은 하위 화면에서 바로 열립니다.</p>
        </section>
      )}
    </div>
  );
}
