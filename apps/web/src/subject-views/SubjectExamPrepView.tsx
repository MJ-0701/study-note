// Exam-prep 산출물을 study-note 과목 하위 화면으로 품는 순수 프레젠테이션 뷰.
// props only, hook 0. HTML 답안집은 Vite public 정적 파일로 제공한다.

import { sanitizeExternalUrl } from "../app/safe-url.ts";
import type { SubjectExamPrepArtifact } from "./subject-exam-prep-artifacts";

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

  const workbookHref = sanitizeExternalUrl(artifact?.workbookHref);
  const markdownHref = sanitizeExternalUrl(artifact?.markdownHref);

  return (
    <>
      <section className="subject-page-hero">
        <p className="meta">{examLabel} · {weekRange}</p>
        <h1>{subjectTitle} 시험 대비</h1>
        <p className="lede">별도 PDF와 시험 직결 자료로 만든 답안집을 과목 안에서 바로 확인합니다.</p>
        <div className="hero-actions">
          <a className="action-button" href={summaryPath}>요약본 보기</a>
          <a className="secondary-link" href={memorizePath}>필수 암기노트</a>
          <a className="secondary-link" href={pdfWorkspacePath}>PDF 작업공간</a>
        </div>
      </section>

      {artifact && workbookHref ? (
        <section className="exam-prep-panel" aria-labelledby="exam-prep-title">
          <div className="exam-prep-toolbar">
            <div>
              <p className="meta">{artifact.sourceLabel}</p>
              <h2 id="exam-prep-title">{artifact.title}</h2>
              <p className="lede">{artifact.note}</p>
            </div>
            <div className="exam-prep-toolbar__actions">
              {markdownHref && <a className="secondary-link" href={markdownHref} target="_blank" rel="noreferrer">Markdown</a>}
            </div>
          </div>
          <iframe
            className="exam-prep-frame"
            sandbox=""
            src={workbookHref}
            title={`${subjectTitle} 시험 대비 답안집`}
          />
        </section>
      ) : (
        <section className="exam-prep-empty" aria-labelledby="exam-prep-empty-title">
          <p className="meta">시험 대비</p>
          <h2 id="exam-prep-empty-title">아직 연결된 답안집이 없습니다</h2>
          <p className="lede">이 과목의 별도 PDF 산출물이 준비되면 같은 하위 화면에서 바로 열립니다.</p>
        </section>
      )}
    </>
  );
}
