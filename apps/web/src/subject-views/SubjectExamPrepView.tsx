// Exam-prep 산출물을 study-note 과목 하위 화면으로 품는 순수 프레젠테이션 뷰.
// props only, hook 0. HTML 답안집은 Vite public 정적 파일로 제공한다.

import { sanitizeExternalUrl } from "../app/safe-url.ts";

export interface SubjectExamPrepArtifact {
  subjectId: string;
  artifactSlug: string;
  title: string;
  sourceLabel: string;
  workbookHref: string;
  markdownHref: string;
  note: string;
}

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

const EXAM_PREP_ARTIFACTS: Record<string, SubjectExamPrepArtifact> = {
  "information-communication": {
    subjectId: "information-communication",
    artifactSlug: "information-communication",
    title: "정보통신개론 레포트2 시험직결 답안집",
    sourceLabel: "6, 7, 8, 9장 + 별도 PDF + 레포트2",
    workbookHref: "/exam-prep/information-communication/workbook.html",
    markdownHref: "/exam-prep/information-communication/workbook.md",
    note: "레포트에서 그대로 낸다고 한 문항을 기준으로 선행개념과 답안 흐름을 길게 풀어둔 버전입니다.",
  },
  "digital-engineering": {
    subjectId: "digital-engineering",
    artifactSlug: "digital-engineering",
    title: "디지털공학개론 기말 답안집",
    sourceLabel: "6, 7, 8장 + 별도 PDF",
    workbookHref: "/exam-prep/digital-engineering/workbook.html",
    markdownHref: "/exam-prep/digital-engineering/workbook.md",
    note: "힌트 퀴즈와 별도 PDF 풀이를 먼저 확인하도록 구성한 시험 대비 산출물입니다.",
  },
  "c-language": {
    subjectId: "c-language",
    artifactSlug: "c-language",
    title: "C언어 기말 참고자료 풀이",
    sourceLabel: "별도 PDF",
    workbookHref: "/exam-prep/c-language/workbook.html",
    markdownHref: "/exam-prep/c-language/workbook.md",
    note: "C언어 과목이 study-note에 추가되면 같은 하위 탭에서 바로 열 수 있는 산출물입니다.",
  },
};

export function getSubjectExamPrepArtifact(subjectId: string): SubjectExamPrepArtifact | null {
  return EXAM_PREP_ARTIFACTS[subjectId] ?? null;
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
              <a className="secondary-action" href={workbookHref} target="_blank" rel="noreferrer">새 탭</a>
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
