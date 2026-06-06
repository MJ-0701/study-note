export interface SubjectExamPrepArtifact {
  subjectId: string;
  artifactSlug: string;
  title: string;
  sourceLabel: string;
  workbookHref: string;
  markdownHref: string;
  note: string;
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

export function hasSubjectExamPrepArtifact(subjectId: string): boolean {
  return getSubjectExamPrepArtifact(subjectId) !== null;
}
