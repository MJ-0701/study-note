// sprint-2026-W22-sprint-18 / layer C/slice-10 — quick-note 정리노트 빌더 + 패널 렌더러.
// 4 fn (1 renderer + 3 builder) + 2 interface + 1 Context type.
//
// invariant (AC9 7-layer security closure):
//   (a) user content escape — title / subtitle / sections.heading / body[] / primaryLabel.
//   (b) href escape (3-layer) — primaryHref + sanitizeExternalUrl + escapeHtml.
//   (c) trusted bounded — formatQuickNoteStatus 의 union literal label.
//   (d) callback boundary — builder 3 = pure (no Context, no global). title/subtitle
//       composition 은 sink 책임 (renderQuickNotePanel 의 escapeHtml).
//   (e) PII/log boundary — console / RUM / datadog import 0.
//   (f) auth/permission — N/A (pure render + pure builder).
//   (g) origin/subjectId mismatch + getQuickNote=undefined → empty string (silent fail-closed).

import {
  getConceptById,
  getKeywordById,
  getQuestionById,
  type Concept,
  type ExampleQuestion,
  type RequiredKeyword,
  type SubjectNote,
  type WeekNote
} from "@study-note/domain";
import { escapeHtml } from "../app/escape-html";
import { sanitizeExternalUrl } from "../app/safe-url";
import { subjectIntakePath, weekPath } from "../app/routes";
import { formatQuickNoteStatus } from "./subject-cards";

// ─── Public types ────────────────────────────────────────────────────────

export interface QuickNoteSection {
  heading: string;
  body: string[];
}

export interface QuickNote {
  origin: "subject" | "week" | "keyword";
  subjectId: string;
  title: string;
  subtitle: string;
  status: "ready" | "needs-fill";
  sections: QuickNoteSection[];
  primaryHref?: string;
  primaryLabel?: string;
}

export interface QuickNoteContext {
  getQuickNote: () => QuickNote | undefined;
}

// ─── Renderer ────────────────────────────────────────────────────────────

export function renderQuickNotePanel(
  ctx: QuickNoteContext,
  subject: SubjectNote,
  origins: QuickNote["origin"][]
): string {
  const quickNote = ctx.getQuickNote();
  if (!quickNote || quickNote.subjectId !== subject.id || !origins.includes(quickNote.origin)) {
    return "";
  }

  // sprint-W22-sprint-13 / slice-5 Gate 3 R3 finding lineage —
  // renderQuickNotePanel 은 summaries.ts 의 callback trust boundary 의 caller.
  // user content (quickNote.title / subtitle / sections.heading / body[] /
  // primaryLabel / primaryHref) escape 적용으로 callback boundary 보장.
  return `
    <section id="quick-note" class="quick-note-panel" aria-labelledby="quick-note-title">
      <div class="quick-note-header">
        <div>
          <p class="meta">정리노트 · ${formatQuickNoteStatus(quickNote.status)}</p>
          <h2 id="quick-note-title">${escapeHtml(quickNote.title)}</h2>
          <p>${escapeHtml(quickNote.subtitle)}</p>
        </div>
        <button class="secondary-action" type="button" data-action="clear-quick-note">
          닫기
        </button>
      </div>
      <div class="quick-note-body">
        ${quickNote.sections.map((section) => `
          <article class="quick-note-section">
            <h3>${escapeHtml(section.heading)}</h3>
            <ul>
              ${section.body.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
            </ul>
          </article>
        `).join("")}
      </div>
      ${(() => {
        // primaryHref protocol allowlist (sprint-13 Gate 3 R4 finding).
        const safeHref = sanitizeExternalUrl(quickNote.primaryHref);
        return safeHref && quickNote.primaryLabel
          ? `<a class="action-link" href="${escapeHtml(safeHref)}">${escapeHtml(quickNote.primaryLabel)}</a>`
          : "";
      })()}
    </section>
  `;
}

// ─── Builders (pure) ─────────────────────────────────────────────────────

export function buildSubjectQuickNote(subject: SubjectNote): QuickNote {
  const mustKnowConcepts = subject.summary.mustKnowConceptIds
    .map((conceptId) => getConceptById(subject, conceptId))
    .filter((concept): concept is Concept => Boolean(concept));
  const missingKeywords = subject.requiredKeywords
    .filter((keyword) => keyword.status === "missing")
    .map((keyword) => keyword.label);

  return {
    origin: "subject",
    subjectId: subject.id,
    title: `${subject.title} 10분 정리노트`,
    subtitle: `${subject.examLabel} ${subject.summary.weekRange} 범위를 시험 직전 순서로 압축했습니다.`,
    status: missingKeywords.length > 0 ? "needs-fill" : "ready",
    sections: [
      {
        heading: "시험 범위",
        body: [subject.summary.examScope, subject.summary.strategy]
      },
      {
        heading: "반드시 볼 개념",
        body: mustKnowConcepts.map((concept) => `${concept.title}: ${concept.summary}`)
      },
      {
        heading: "마지막 보강",
        body:
          missingKeywords.length > 0
            ? missingKeywords.map((label) => `${label}: 강의자료 기반 보강 필요`)
            : ["현재 missing 키워드는 없습니다."]
      }
    ],
    primaryHref: subjectIntakePath(subject),
    primaryLabel: "자료 보강하기"
  };
}

export function buildKeywordQuickNote(
  subject: SubjectNote,
  keyword: RequiredKeyword
): QuickNote {
  const concepts = keyword.conceptIds
    .map((conceptId) => getConceptById(subject, conceptId))
    .filter((concept): concept is Concept => Boolean(concept));
  const questions = concepts.flatMap((concept) =>
    concept.exampleQuestionIds
      .map((questionId) => getQuestionById(subject, questionId))
      .filter((question): question is ExampleQuestion => Boolean(question))
  );

  if (keyword.status === "missing" || concepts.length === 0) {
    return {
      origin: "keyword",
      subjectId: subject.id,
      title: `${keyword.label} 보강 템플릿`,
      subtitle: "아직 연결된 핵심 개념이 부족합니다. Claude JSON을 만들 때 아래 항목을 채우면 됩니다.",
      status: "needs-fill",
      sections: [
        {
          heading: "교수님 신호",
          body: [keyword.professorSignal]
        },
        {
          heading: "채워야 할 내용",
          body: [
            "개념 정의 1문장",
            "쉬운 설명 1문장",
            "교수님 PDF 출처 페이지",
            "기본 문제 1개와 해설"
          ]
        }
      ],
      primaryHref: subjectIntakePath(subject),
      primaryLabel: `${subject.title} 자료 넣기`
    };
  }

  return {
    origin: "keyword",
    subjectId: subject.id,
    title: `${keyword.label} 미니 정리노트`,
    subtitle: keyword.professorSignal,
    status: "ready",
    sections: [
      {
        heading: "핵심 정의",
        body: concepts.map((concept) => `${concept.title}: ${concept.summary}`)
      },
      {
        heading: "쉽게 이해",
        body: concepts.map((concept) => concept.easyExplanation)
      },
      {
        heading: "출처 힌트",
        body: concepts.flatMap((concept) => concept.sourceHints)
      },
      {
        heading: "바로 풀 문제",
        body:
          questions.length > 0
            ? questions.slice(0, 2).map((question) => `${question.prompt} / 답: ${question.answer}`)
            : ["아직 연결된 예제문제가 없습니다."]
      }
    ]
  };
}

export function buildWeekQuickNote(subject: SubjectNote, week: WeekNote): QuickNote {
  const keywords = week.requiredKeywordIds
    .map((keywordId) => getKeywordById(subject, keywordId))
    .filter((keyword): keyword is RequiredKeyword => Boolean(keyword));
  const concepts = week.conceptIds
    .map((conceptId) => getConceptById(subject, conceptId))
    .filter((concept): concept is Concept => Boolean(concept));
  const questions = week.exampleQuestionIds
    .map((questionId) => getQuestionById(subject, questionId))
    .filter((question): question is ExampleQuestion => Boolean(question));

  return {
    origin: "week",
    subjectId: subject.id,
    title: `${week.label} ${week.title} 정리노트`,
    subtitle: week.focus,
    status: week.reviewStatus === "ready" ? "ready" : "needs-fill",
    sections: [
      {
        heading: "키워드",
        body: keywords.map((keyword) => `${keyword.label}: ${keyword.professorSignal}`)
      },
      {
        heading: "개념 요약",
        body:
          concepts.length > 0
            ? concepts.map((concept) => `${concept.title}: ${concept.summary}`)
            : ["아직 연결된 개념이 없습니다."]
      },
      {
        heading: "확인 문제",
        body:
          questions.length > 0
            ? questions.map((question) => `${question.prompt} / 답: ${question.answer}`)
            : ["아직 연결된 예제문제가 없습니다."]
      }
    ],
    primaryHref: weekPath(subject, week),
    primaryLabel: "수업일 노트로 이동"
  };
}
