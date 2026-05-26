// sprint-2026-W22-sprint-15 / layer C/slice-7 — subject-mcp cluster.
// 2 fn + 1 const = renderSubjectMcpPage + renderSubjectMcpPanel + PERSONA_BY_SUBJECT.
// pure leaves. Context 0.
//
// invariant (AC9 5-layer security closure):
//   (a) user content escape — subject.title / examLabel / weekRange /
//       weakSpots / keyword.label / persona.nick.
//   (b) attribute escape — subject.id in data-subject-id.
//   (c) href escape — subjectSummaryPath + persona-turn.html?subject=... URL param
//       (encodeURIComponent + escapeHtml).
//   (d) trusted data hardening — PERSONA_BY_SUBJECT 는 Object.freeze (outer + each
//       persona entry) 로 deep-freeze. mutation attempt 차단.
//   (e) PII/log boundary — console / RUM / datadog import 0.
//
// Security N/A (pure renderer): auth/session, secret/token, permission scope,
// side effect.

import type { ExampleQuestion, SubjectNote } from "@study-note/domain";
import { getQuestionById } from "@study-note/domain";
import { escapeHtml } from "../app/escape-html";
import { sanitizeExternalUrl } from "../app/safe-url";
import { subjectSummaryPath } from "../app/routes";
import {
  renderQuestion,
  renderSummaryBlock
} from "./subject-cards";

// ─── Persona config (frozen) ─────────────────────────────────────────────

interface PersonaEntry {
  readonly nick: string;
  readonly active: boolean;
}

// Deep freeze: outer record + each entry. JS const 은 binding 만 freeze
// 하므로 mutation hardening 위해 Object.freeze 명시 (sprint-15 Gate 3 R3 finding).
export const PERSONA_BY_SUBJECT: Readonly<Record<string, Readonly<PersonaEntry>>> =
  Object.freeze({
    "digital-engineering": Object.freeze({ nick: "디공이", active: true }),
    "information-communication": Object.freeze({ nick: "정통이", active: false }),
    "c-language": Object.freeze({ nick: "씨랭이", active: false }),
    "computer-introduction": Object.freeze({ nick: "컴론이", active: false })
  });

// ─── Public renderers ────────────────────────────────────────────────────

export function renderSubjectMcpPage(subject: SubjectNote): string {
  const persona = PERSONA_BY_SUBJECT[subject.id];
  const questions = subject.weekNotes
    .flatMap((week) => week.exampleQuestionIds)
    .map((questionId) => getQuestionById(subject, questionId))
    .filter((question): question is ExampleQuestion => Boolean(question));
  const safeTitle = escapeHtml(subject.title);

  return `
    <section class="subject-page-hero">
      <p class="meta">${escapeHtml(subject.examLabel)} · ${escapeHtml(subject.summary.weekRange)}</p>
      <h1>${safeTitle} MCP 호출</h1>
      <p class="lede">요약본을 만들다가 막히는 개념을 과목 교수님 페르소나에게 물어보기 전, 질문할 키워드와 예제 문제를 정리합니다.</p>
      <div class="hero-actions">
        ${persona?.active
          ? `<a class="action-button" href="/persona-turn.html?subject=${escapeHtml(encodeURIComponent(subject.id))}">${escapeHtml(persona.nick)} 호출</a>`
          : `<button class="action-button is-disabled" type="button" aria-disabled="true">${escapeHtml(persona?.nick ?? "교수님")} 준비 중</button>`}
        <a class="secondary-link" href="${escapeHtml(sanitizeExternalUrl(subjectSummaryPath(subject)))}">요약본으로 돌아가기</a>
      </div>
    </section>

    ${renderSubjectMcpPanel(subject)}

    <section aria-labelledby="mcp-question-title">
      <p class="meta">질문거리 점검</p>
      <h2 id="mcp-question-title">막히기 쉬운 포인트</h2>
      <div class="summary-grid">
        ${renderSummaryBlock("취약 포인트", escapeHtml(subject.summary.weakSpots.join(", ")))}
        ${renderSummaryBlock("교수님 키워드", escapeHtml(subject.requiredKeywords.map((keyword) => keyword.label).join(", ")))}
        ${renderSummaryBlock("질문 전 확인", "PDF 원문과 내 요약본을 먼저 열어 근거 페이지를 확인합니다.")}
      </div>
    </section>

    <section aria-labelledby="mcp-examples-title">
      <p class="meta">예제 문제</p>
      <h2 id="mcp-examples-title">질문으로 바꿔볼 문제</h2>
      <div class="question-list">
        ${questions.map(renderQuestion).join("") || '<p class="empty-note">아직 연결된 예제문제가 없습니다.</p>'}
      </div>
    </section>
  `;
}

export function renderSubjectMcpPanel(subject: SubjectNote): string {
  const persona = PERSONA_BY_SUBJECT[subject.id];
  const safeNickOrTitle = escapeHtml(persona?.nick ?? subject.title);

  return `
    <section aria-labelledby="mcp-title" class="subject-mcp-panel">
      <p class="meta">교수님 페르소나</p>
      <h2 id="mcp-title">교수님 페르소나에게 질문하기</h2>
      <p class="lede">요약본을 만들다가 설명이 막히는 개념은 과목별 교수님 페르소나에게 이어서 질문합니다.</p>
      <div class="subject-mcp-callout">
        <div>
          <strong>${safeNickOrTitle} ${persona?.active ? "호출 가능" : "호출 준비 중"}</strong>
          <p>${persona?.active
            ? "현재 요약본과 키워드를 보면서 모르는 부분을 바로 질문할 수 있습니다."
            : "이 과목 페르소나는 아직 준비 중입니다. 먼저 요약본을 만들고 질문거리를 정리하세요."}</p>
        </div>
        ${persona?.active
          ? `<a class="action-button" href="/persona-turn.html?subject=${escapeHtml(encodeURIComponent(subject.id))}">${escapeHtml(persona.nick)} 호출</a>`
          : `<button class="secondary-action" type="button" data-action="generate-subject-note" data-subject-id="${escapeHtml(subject.id)}">질문거리 정리</button>`}
      </div>
    </section>
  `;
}
