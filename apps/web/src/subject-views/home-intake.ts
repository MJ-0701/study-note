// sprint-2026-W22-sprint-11 / layer C/slice-3 — home + intake pure renderers.
// main.ts 의 4 fn (renderHome / renderIntakeGuide / renderSubjectIntakeGuide /
// getSubjectSamplePayload) 단일 module 분리. bottom-up + 0 Context.
//
// invariant (AC9 5-layer security closure):
//   (a) user content escape — subject.title / studyNotebook.title 등.
//   (b) attribute escape — subject.id in data-* / `<code>` / JSON example.
//   (c) href escape + **protocol allowlist** — sourceWorkspaceUrl 의
//       `javascript:` / `data:` / `mailto:` scheme 차단 (sanitizeExternalUrl).
//   (d) PII / logging boundary — console / RUM / datadog import 0.
//   (e) callback trust boundary — renderIntakeFeedback callback inject (caller
//       responsibility, main.ts 의 callback 자체에 escape 적용됨).

import {
  intakePath,
  subjectClassPath,
  weekPath
} from "../app/routes";
import { escapeHtml } from "../app/escape-html";
import { sanitizeExternalUrl } from "../app/safe-url";
import { scheduleRangeLabel } from "../data/classSchedule";
import { localIntakeGuide } from "../data/intakeGuide";
import {
  getIntegrityWarnings,
  getNotebookCoverage,
  type StudyNotebook,
  type SubjectNote
} from "@study-note/domain";
import {
  renderMetric,
  renderSubjectCard,
  renderSubjectImportCard
} from "./subject-cards";

// ─── Public renderers ────────────────────────────────────────────────────

export function renderHome(studyNotebook: StudyNotebook): string {
  const coverage = getNotebookCoverage(studyNotebook);
  const warnings = getIntegrityWarnings(studyNotebook);
  const firstSubject = studyNotebook.subjects[0];
  const totalSessions = studyNotebook.subjects.reduce(
    (sum, subject) => sum + subject.weekNotes.length,
    0
  );
  const needsFillSessions = studyNotebook.subjects.flatMap((subject) =>
    subject.weekNotes
      .filter((week) => week.reviewStatus === "needs-fill")
      .map((week) => ({ subject, week }))
  );
  const safeWorkspaceUrl = sanitizeExternalUrl(studyNotebook.sourceWorkspaceUrl);

  return `
    <section class="home-hero">
      <div>
        <p class="meta">${escapeHtml(studyNotebook.term)} · 기말고사 홈</p>
        <h1>${escapeHtml(studyNotebook.title)}</h1>
        <p class="lede">
          홈은 전체 현황을 보고 과목으로 들어가는 시작 화면입니다.
          과목별 총정리와 날짜별 노트는 각 과목 페이지 안에서 따로 봅니다.
        </p>
        <div class="hero-actions">
          ${
            firstSubject
              ? `<a class="action-link" href="${escapeHtml(subjectClassPath(firstSubject))}">첫 과목 공부하기</a>`
              : ""
          }
          <a class="secondary-link" href="${escapeHtml(intakePath())}">자료 투입 가이드</a>
        </div>
      </div>
      <img src="/coverage-map.svg" alt="비공개 PDF, 필수 키워드, 핵심 개념, 예제문제 흐름" />
    </section>

    <section class="metric-grid" aria-label="학습 노트 현황">
      ${renderMetric("과목", `${studyNotebook.subjects.length}과목`, "과목별 독립 페이지")}
      ${renderMetric("수업일", `${totalSessions}개 노트`, "날짜별 노트")}
      ${renderMetric("키워드 반영률", `${coverage.coverageRate}%`, `${coverage.covered}/${coverage.total} 필수 키워드 반영`)}
      ${renderMetric("일정", scheduleRangeLabel, "목요일/토요일 수업")}
    </section>

    <section aria-labelledby="home-subjects-title">
      <p class="meta">§1 — 과목 선택</p>
      <h2 id="home-subjects-title">과목을 선택하세요.</h2>
      <div class="subject-grid">
        ${studyNotebook.subjects.map(renderSubjectCard).join("")}
      </div>
    </section>

    <section class="home-split" aria-labelledby="home-review-title">
      <div>
        <p class="meta">§2 — 보강 필요</p>
        <h2 id="home-review-title">보강이 필요한 수업일</h2>
        ${
          needsFillSessions.length === 0
            ? '<p class="status-good">현재 보강 표시된 수업일이 없습니다.</p>'
            : `<div class="compact-list">
                ${needsFillSessions.map(({ subject, week }) => `
                  <a href="${escapeHtml(weekPath(subject, week))}">
                    <span>${escapeHtml(subject.title)}</span>
                    <strong>${escapeHtml(week.label)} · ${escapeHtml(week.title)}</strong>
                  </a>
                `).join("")}
              </div>`
        }
      </div>
      <div>
        <p class="meta">§3 — 공유 원칙</p>
        <h2>공유 원칙</h2>
        <div class="policy-block is-standalone">
          <strong>원문 PDF는 홈이나 과목 페이지에서 공개하지 않습니다.</strong>
          <p>${escapeHtml(studyNotebook.sharePolicy.rawSourceRule)}</p>
          <p>${escapeHtml(studyNotebook.sharePolicy.noteRule)}</p>
          <p>${escapeHtml(studyNotebook.sharePolicy.disclaimer)}</p>
          ${
            safeWorkspaceUrl
              ? `<p><a href="${escapeHtml(safeWorkspaceUrl)}" target="_blank" rel="noreferrer">기존 Notion 원본 보기</a></p>`
              : ""
          }
        </div>
      </div>
    </section>

    <section class="integrity-section" aria-labelledby="integrity-title">
      <p class="meta">§4 — 데이터 연결 확인</p>
      <h2 id="integrity-title">샘플 데이터 연결 상태</h2>
      ${
        warnings.length === 0
          ? '<p class="status-good">샘플 과목, 수업일, 키워드, 개념, 문제, 자료가 모두 연결되어 있습니다.</p>'
          : `<ul>${warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")}</ul>`
      }
    </section>
  `;
}

export function renderIntakeGuide(studyNotebook: StudyNotebook): string {
  return `
    <section class="subject-page-hero">
      <p class="meta">로컬 자료 흐름 · 서버 업로드 없음</p>
      <h1>${escapeHtml(localIntakeGuide.title)}</h1>
      <p class="lede">${escapeHtml(localIntakeGuide.summary)}</p>
    </section>

    <section aria-labelledby="subject-import-title">
      <p class="meta">§1 — 과목 선택</p>
      <h2 id="subject-import-title">어느 과목 자료인지 먼저 선택하세요.</h2>
      <p class="lede">
        실제 JSON 파일은 과목별 자료 투입 화면에서만 받습니다.
        선택한 과목과 JSON의 subjectId가 다르면 반영하지 않습니다.
      </p>
      <div class="subject-grid">
        ${studyNotebook.subjects.map((subject) => renderSubjectImportCard(subject)).join("")}
      </div>
    </section>

    <section aria-labelledby="intake-roles-title">
      <p class="meta">§2 — 파일 역할</p>
      <h2 id="intake-roles-title">파일별 보관 위치</h2>
      <div class="file-role-grid">
        ${localIntakeGuide.roles.map((role) => `
          <article class="file-role-card">
            <p class="meta">${escapeHtml(role.label)}</p>
            <h3><code>${escapeHtml(role.location)}</code></h3>
            <p>${escapeHtml(role.rule)}</p>
          </article>
        `).join("")}
      </div>
    </section>

    <section aria-labelledby="intake-flow-title">
      <p class="meta">§3 — 운영 순서</p>
      <h2 id="intake-flow-title">PDF를 앱 데이터로 넣는 순서</h2>
      <div class="intake-flow">
        ${localIntakeGuide.steps.map((step) => `
          <article class="intake-step">
            <h3>${escapeHtml(step.title)}</h3>
            <p>${escapeHtml(step.description)}</p>
            <span>${escapeHtml(step.detail)}</span>
          </article>
        `).join("")}
      </div>
    </section>

    <section class="intake-split" aria-labelledby="intake-checklist-title">
      <div>
        <p class="meta">§4 — 로컬 폴더</p>
        <h2>권장 로컬 폴더</h2>
        <pre class="code-block"><code>${escapeHtml(localIntakeGuide.folderTree.join("\n"))}</code></pre>
      </div>
      <div>
        <p class="meta">§5 — Claude 요청 체크리스트</p>
        <h2 id="intake-checklist-title">요청에 반드시 넣을 것</h2>
        <ul class="check-list">
          ${localIntakeGuide.promptChecklist.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
        </ul>
      </div>
    </section>

    <section aria-labelledby="intake-contract-title">
      <p class="meta">§6 — 앱 반영 규칙</p>
      <h2 id="intake-contract-title">앱에 넣기 전 확인</h2>
      <div class="contract-list">
        ${localIntakeGuide.insertionContract.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}
      </div>
      <div class="policy-block is-standalone">
        <strong>현재 prototype의 import는 브라우저 로컬 전용입니다.</strong>
        <p>원문 PDF는 로컬에만 두고, 검수한 강의노트 JSON만 reader에 반영합니다.</p>
      </div>
    </section>

    <section aria-labelledby="json-schema-title">
      <p class="meta">§7 — JSON 구조</p>
      <h2 id="json-schema-title">Claude에 요구할 JSON 예시</h2>
      <pre class="code-block code-block-large"><code>${escapeHtml(JSON.stringify(localIntakeGuide.samplePayload, null, 2))}</code></pre>
    </section>
  `;
}

export function renderSubjectIntakeGuide(
  subject: SubjectNote,
  renderIntakeFeedback: () => string
): string {
  const safeSubjectId = escapeHtml(subject.id);
  const safeSubjectTitle = escapeHtml(subject.title);
  // inputId = id attribute value. Must be escapeHtml-safe (subject.id raw 가
  // attribute value 에 그대로 들어가면 attribute breakout XSS — sprint-11 R2 finding).
  const inputId = `note-json-file-${safeSubjectId}`;

  return `
    <section class="subject-page-hero">
      <p class="meta">${safeSubjectTitle} · 브라우저 로컬 import</p>
      <h1>${safeSubjectTitle} 자료 투입</h1>
      <p class="lede">
        이 화면은 ${safeSubjectTitle} 전용입니다.
        JSON의 <code>subjectId</code>가 <code>${safeSubjectId}</code>일 때만 반영합니다.
      </p>
      <p><a href="${escapeHtml(subjectClassPath(subject))}">← ${safeSubjectTitle} 수업으로 돌아가기</a></p>
    </section>

    <section class="upload-section" aria-labelledby="json-upload-title">
      <div>
        <p class="meta">§1 — 브라우저 import</p>
        <h2 id="json-upload-title">Claude JSON 파일 넣기</h2>
        <p class="lede">
          선택한 파일은 서버로 전송하지 않고 현재 브라우저에서만 읽습니다.
          통과한 노트는 localStorage에 저장되어 이 과목의 수업일별 노트로 바로 반영됩니다.
        </p>
      </div>
      <div class="upload-panel">
        <input
          id="${inputId}"
          class="file-input"
          type="file"
          accept="application/json,.json"
          data-action="import-week-note"
          data-subject-id="${safeSubjectId}"
        />
        <label class="file-drop" for="${inputId}">
          <strong>${safeSubjectTitle} JSON 선택</strong>
          <span>schemaVersion이 study-note.week-note.v1인 파일만 반영합니다.</span>
        </label>
        <p class="example-file">예제 파일: <code>${escapeHtml(localIntakeGuide.exampleFile)}</code> 구조 샘플</p>
        ${renderIntakeFeedback()}
        <button class="secondary-action" type="button" data-action="reset-local-data">
          로컬 import 초기화
        </button>
      </div>
    </section>

    <section aria-labelledby="subject-json-contract-title">
      <p class="meta">§2 — 과목 규칙</p>
      <h2 id="subject-json-contract-title">이 과목 JSON에서 확인할 값</h2>
      <div class="contract-list">
        <p><code>subjectId</code>는 <code>${safeSubjectId}</code>여야 합니다.</p>
        <p><code>weekNote.id</code>는 ${safeSubjectTitle} 안에서 유일해야 합니다.</p>
        <p>같은 id의 keyword, concept, question, 수업일 노트는 새 파일 내용으로 교체됩니다.</p>
      </div>
    </section>

    <section aria-labelledby="json-schema-title">
      <p class="meta">§3 — JSON 구조</p>
      <h2 id="json-schema-title">Claude에 요구할 JSON 예시</h2>
      <pre class="code-block code-block-large"><code>${escapeHtml(JSON.stringify(getSubjectSamplePayload(subject), null, 2))}</code></pre>
    </section>
  `;
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
