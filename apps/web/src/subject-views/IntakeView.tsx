// S3 React island leaf — intake/subject-intake 뷰 순수 프레젠테이션 컴포넌트(props only, hook 0).
import type { SubjectNote } from "@study-note/domain";
import { subjectClassPath, subjectIntakePath } from "../app/routes.ts";
import { localIntakeGuide } from "../data/intakeGuide.ts";
import type { IntakeFeedback } from "../stores/notebookStore.ts";

// ─── props ───────────────────────────────────────────────────────────────────

export interface IntakeViewGeneralProps {
  variant: "general";
  subjects: SubjectNote[];
  subjectCoverageRates: Record<string, number>;
}

export interface IntakeViewSubjectProps {
  variant: "subject";
  subject: SubjectNote;
  intakeFeedback: IntakeFeedback;
  pendingPdfRetry: boolean;
  samplePayloadJson: string;
  exampleFile: string;
}

export type IntakeViewProps = IntakeViewGeneralProps | IntakeViewSubjectProps;

// ─── sub-components (pure, no hooks) ─────────────────────────────────────────

function SubjectImportCard({ subject, coverageRate }: { subject: SubjectNote; coverageRate: number }): React.ReactElement {
  return (
    <article className="subject-card">
      <p className="meta">{subject.examLabel} · {subject.summary.weekRange}</p>
      <h3>{subject.title}</h3>
      <p>이 과목의 수업일별 Claude JSON만 가져옵니다.</p>
      <div className="subject-card-footer">
        <span>{coverageRate}% 키워드 반영</span>
        <a href={subjectIntakePath(subject)}>자료 넣기</a>
      </div>
    </article>
  );
}

function IntakeFeedbackBanner({
  intakeFeedback,
  pendingPdfRetry,
}: {
  intakeFeedback: IntakeFeedback;
  pendingPdfRetry: boolean;
}): React.ReactElement {
  if (!intakeFeedback) {
    return <div className="import-feedback">아직 반영한 JSON 파일이 없습니다.</div>;
  }

  // showRetry guard 가 retrySubjectId non-null 을 보장 → data-subject-id 에 직접 사용.
  // AC2 parity: 원본 renderIntakeFeedback 과 동일하게 intakeFeedback.retrySubjectId 사용.
  // (subjectId = 현재 route subject.id 와 다를 수 있음 — PDF 업로드 실패 대상 subject 가 SSoT)
  const showRetry =
    intakeFeedback.kind === "error" &&
    intakeFeedback.retrySubjectId != null &&
    pendingPdfRetry;

  return (
    <div className={`import-feedback is-${intakeFeedback.kind}`}>
      <strong>{intakeFeedback.title}</strong>
      <p>{intakeFeedback.detail}</p>
      {intakeFeedback.href && (
        <a href={intakeFeedback.href}>반영된 수업일 노트 보기</a>
      )}
      {showRetry && (
        <button
          className="secondary-action"
          type="button"
          data-action="retry-pdf-upload"
          data-subject-id={intakeFeedback.retrySubjectId}
        >
          재시도
        </button>
      )}
    </div>
  );
}

// ─── leaf component ───────────────────────────────────────────────────────────

export function IntakeView(props: IntakeViewProps): React.ReactElement {
  if (props.variant === "general") {
    return <GeneralIntakeView {...props} />;
  }
  return <SubjectIntakeView {...props} />;
}

function GeneralIntakeView({ subjects, subjectCoverageRates }: IntakeViewGeneralProps): React.ReactElement {
  return (
    <>
      <section className="subject-page-hero">
        <p className="meta">로컬 자료 흐름 · 서버 업로드 없음</p>
        <h1>{localIntakeGuide.title}</h1>
        <p className="lede">{localIntakeGuide.summary}</p>
      </section>

      <section aria-labelledby="subject-import-title">
        <p className="meta">§1 — 과목 선택</p>
        <h2 id="subject-import-title">어느 과목 자료인지 먼저 선택하세요.</h2>
        <p className="lede">
          실제 JSON 파일은 과목별 자료 투입 화면에서만 받습니다.
          선택한 과목과 JSON의 subjectId가 다르면 반영하지 않습니다.
        </p>
        <div className="subject-grid">
          {subjects.map((subject) => (
            <SubjectImportCard
              key={subject.id}
              subject={subject}
              coverageRate={subjectCoverageRates[subject.id] ?? 0}
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="intake-roles-title">
        <p className="meta">§2 — 파일 역할</p>
        <h2 id="intake-roles-title">파일별 보관 위치</h2>
        <div className="file-role-grid">
          {localIntakeGuide.roles.map((role) => (
            <article key={role.label} className="file-role-card">
              <p className="meta">{role.label}</p>
              <h3><code>{role.location}</code></h3>
              <p>{role.rule}</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="intake-flow-title">
        <p className="meta">§3 — 운영 순서</p>
        <h2 id="intake-flow-title">PDF를 앱 데이터로 넣는 순서</h2>
        <div className="intake-flow">
          {localIntakeGuide.steps.map((step) => (
            <article key={step.title} className="intake-step">
              <h3>{step.title}</h3>
              <p>{step.description}</p>
              <span>{step.detail}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="intake-split" aria-labelledby="intake-checklist-title">
        <div>
          <p className="meta">§4 — 로컬 폴더</p>
          <h2>권장 로컬 폴더</h2>
          <pre className="code-block"><code>{localIntakeGuide.folderTree.join("\n")}</code></pre>
        </div>
        <div>
          <p className="meta">§5 — Claude 요청 체크리스트</p>
          <h2 id="intake-checklist-title">요청에 반드시 넣을 것</h2>
          <ul className="check-list">
            {localIntakeGuide.promptChecklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="intake-contract-title">
        <p className="meta">§6 — 앱 반영 규칙</p>
        <h2 id="intake-contract-title">앱에 넣기 전 확인</h2>
        <div className="contract-list">
          {localIntakeGuide.insertionContract.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </div>
        <div className="policy-block is-standalone">
          <strong>현재 prototype의 import는 브라우저 로컬 전용입니다.</strong>
          <p>원문 PDF는 로컬에만 두고, 검수한 강의노트 JSON만 reader에 반영합니다.</p>
        </div>
      </section>

      <section aria-labelledby="json-schema-title">
        <p className="meta">§7 — JSON 구조</p>
        <h2 id="json-schema-title">Claude에 요구할 JSON 예시</h2>
        <pre className="code-block code-block-large"><code>{JSON.stringify(localIntakeGuide.samplePayload, null, 2)}</code></pre>
      </section>
    </>
  );
}

function SubjectIntakeView({
  subject,
  intakeFeedback,
  pendingPdfRetry,
  samplePayloadJson,
  exampleFile,
}: IntakeViewSubjectProps): React.ReactElement {
  // inputId = id attribute value. subject.id 는 JSX attribute → React 가 escaping.
  const inputId = `note-json-file-${subject.id}`;

  return (
    <>
      <section className="subject-page-hero">
        <p className="meta">{subject.title} · 브라우저 로컬 import</p>
        <h1>{subject.title} 자료 투입</h1>
        <p className="lede">
          이 화면은 {subject.title} 전용입니다.
          JSON의 <code>subjectId</code>가 <code>{subject.id}</code>일 때만 반영합니다.
        </p>
        <p><a href={subjectClassPath(subject)}>← {subject.title} 수업으로 돌아가기</a></p>
      </section>

      <section className="upload-section" aria-labelledby="json-upload-title">
        <div>
          <p className="meta">§1 — 브라우저 import</p>
          <h2 id="json-upload-title">Claude JSON 파일 넣기</h2>
          <p className="lede">
            선택한 파일은 서버로 전송하지 않고 현재 브라우저에서만 읽습니다.
            통과한 노트는 localStorage에 저장되어 이 과목의 수업일별 노트로 바로 반영됩니다.
          </p>
        </div>
        <div className="upload-panel">
          <input
            id={inputId}
            className="file-input"
            type="file"
            accept="application/json,.json"
            data-action="import-week-note"
            data-subject-id={subject.id}
          />
          <label className="file-drop" htmlFor={inputId}>
            <strong>{subject.title} JSON 선택</strong>
            <span>schemaVersion이 study-note.week-note.v1인 파일만 반영합니다.</span>
          </label>
          <p className="example-file">예제 파일: <code>{exampleFile}</code> 구조 샘플</p>
          <IntakeFeedbackBanner
            intakeFeedback={intakeFeedback}
            pendingPdfRetry={pendingPdfRetry}
          />
          <button
            className="secondary-action"
            type="button"
            data-action="reset-local-data"
          >
            로컬 import 초기화
          </button>
        </div>
      </section>

      <section aria-labelledby="subject-json-contract-title">
        <p className="meta">§2 — 과목 규칙</p>
        <h2 id="subject-json-contract-title">이 과목 JSON에서 확인할 값</h2>
        <div className="contract-list">
          <p><code>subjectId</code>는 <code>{subject.id}</code>여야 합니다.</p>
          <p><code>weekNote.id</code>는 {subject.title} 안에서 유일해야 합니다.</p>
          <p>같은 id의 keyword, concept, question, 수업일 노트는 새 파일 내용으로 교체됩니다.</p>
        </div>
      </section>

      <section aria-labelledby="json-schema-title">
        <p className="meta">§3 — JSON 구조</p>
        <h2 id="json-schema-title">Claude에 요구할 JSON 예시</h2>
        <pre className="code-block code-block-large"><code>{samplePayloadJson}</code></pre>
      </section>
    </>
  );
}
