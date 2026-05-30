// sprint-2026-W22-sprint-11 / layer C/slice-3 — home + intake pure renderers.
// main.ts 의 4 fn (renderHome / renderIntakeGuide / renderSubjectIntakeGuide /
// getSubjectSamplePayload) 단일 module 분리. bottom-up + 0 Context.
//
// S3 (React island 마이그레이션): renderHome / renderIntakeGuide /
// renderSubjectIntakeGuide 는 content 대신 slot placeholder 만 반환.
// 실 content = HomeIslandPortal / IntakeIslandPortal (createPortal) 이 담당.
//
// invariant (AC9 5-layer security closure):
//   (a) user content escape — JSX leaf 가 자동 escape (dangerouslySetInnerHTML 0).
//   (b) attribute escape — slot placeholder = no user content.
//   (c) href escape + **protocol allowlist** — sanitizeExternalUrl 은 HomeView.tsx 에서 유지.
//   (d) PII / logging boundary — console / RUM / datadog import 0.
//   (e) callback trust boundary — renderIntakeFeedback 은 IntakeView.tsx props 로 이관.

import type {
  StudyNotebook,
  SubjectNote
} from "@study-note/domain";

// ─── Public renderers ────────────────────────────────────────────────────
//
// S3: 각 함수는 React island slot placeholder 만 반환.
// 실제 뷰 content 는 HomeIslandPortal / IntakeIslandPortal 이 createPortal 로 렌더.
// stable id 필수 — morphdom getNodeKey(appShell.ts:62) = node.id.

export function renderHome(_studyNotebook: StudyNotebook): string {
  return `<div id="home-island" data-react-island="home" style="display:contents"></div>`;
}

export function renderIntakeGuide(_studyNotebook: StudyNotebook): string {
  return `<div id="intake-island" data-react-island="intake" style="display:contents"></div>`;
}

export function renderSubjectIntakeGuide(
  _subject: SubjectNote,
  _renderIntakeFeedback: () => string
): string {
  return `<div id="intake-island" data-react-island="intake" style="display:contents"></div>`;
}

export function getSubjectSamplePayload(subject: SubjectNote): unknown {
  const safeSubjectId = subject.id;
  const sourceId = `${safeSubjectId}-pdf-session`;
  const keywordId = `${safeSubjectId}-kw-required`;
  const conceptId = `${safeSubjectId}-concept-core`;
  const questionId = `${safeSubjectId}-q-core`;

  return {
    schemaVersion: "study-note.week-note.v1",
    subjectId: safeSubjectId,
    sourceMaterials: [
      {
        id: sourceId,
        title: `${subject.title} 수업일 교수님 PDF`,
        kind: "professor-pdf",
        visibility: "private-source",
        pages: "p.1-p.30",
        note: "원문은 local-materials에만 보관하고 reader에는 메타데이터만 둔다."
      }
    ],
    requiredKeywords: [
      {
        id: keywordId,
        label: "교수님 강조 키워드",
        status: "covered",
        professorSignal: "수업 중 시험 가능성 언급",
        conceptIds: [conceptId]
      }
    ],
    concepts: [
      {
        id: conceptId,
        title: "핵심 개념명",
        priority: "must-know",
        summary: "시험에 필요한 핵심 정의를 한 문장으로 정리한다.",
        easyExplanation: "처음 보는 사람도 이해할 수 있게 쉬운 말로 다시 설명한다.",
        sourceHints: ["교수님 PDF p.10-p.15"],
        relatedKeywordIds: [keywordId],
        exampleQuestionIds: [questionId]
      }
    ],
    exampleQuestions: [
      {
        id: questionId,
        conceptId,
        difficulty: "basic",
        prompt: "핵심 개념을 설명하라.",
        answer: "정답 요지를 적는다.",
        explanation: "왜 이 답이 되는지 시험 답안 기준으로 설명한다."
      }
    ],
    weekNote: {
      id: `${safeSubjectId}-session-20260509`,
      label: "5월 9일(토)",
      title: "수업일 제목",
      focus: "이 수업일에서 반드시 이해할 내용을 적는다.",
      sourceMaterialIds: [sourceId],
      requiredKeywordIds: [keywordId],
      conceptIds: [conceptId],
      exampleQuestionIds: [questionId],
      reviewStatus: "ready"
    }
  };
}
