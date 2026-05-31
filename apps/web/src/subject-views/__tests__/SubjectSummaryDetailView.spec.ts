// S4a SubjectSummaryDetailView 정적 소스 검증 spec (render 없음 — node:test 전용).
//
// AC5: pure-props leaf — useState/useEffect/store 구독 0.
// INV-8: dangerouslySetInnerHTML 0 + escapeHtml 미사용(JSX auto-escape).
// AC4: data-action="generate-week-note" / "clear-quick-note" 보존.
// quickNote null/non-null 분기 + sanitizeExternalUrl protocol allowlist 검증.
//
// 실행:
//   node --experimental-strip-types --no-warnings --test \
//     apps/web/src/subject-views/__tests__/SubjectSummaryDetailView.spec.ts

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const src = readFileSync(new URL("../SubjectSummaryDetailView.tsx", import.meta.url), "utf8");

describe("SubjectSummaryDetailView 정적 소스 검증", () => {
  it("AC5 — pure-props: no useState, useEffect, useSyncExternalStore", () => {
    assert.doesNotMatch(src, /\buseState\b/);
    assert.doesNotMatch(src, /\buseEffect\b/);
    assert.doesNotMatch(src, /\buseSyncExternalStore\b/);
  });

  it("AC5 — pure-props: no store subscriptions", () => {
    assert.doesNotMatch(src, /\buseStore\b/);
    assert.doesNotMatch(src, /from ["']zustand/);
  });

  it("INV-8 — no dangerouslySetInnerHTML", () => {
    assert.doesNotMatch(src, /dangerouslySetInnerHTML/);
  });

  it("INV-8 — no escapeHtml (JSX auto-escape)", () => {
    assert.doesNotMatch(src, /escapeHtml/);
  });

  it("SubjectSummaryDetailViewProps export 존재", () => {
    assert.match(src, /export interface SubjectSummaryDetailViewProps/);
  });

  it("SubjectSummaryDetailView function export 존재", () => {
    assert.match(src, /export function SubjectSummaryDetailView/);
  });

  it("AC4 — data-action='generate-week-note' 보존 (document 위임)", () => {
    assert.match(src, /data-action="generate-week-note"/);
  });

  it("AC4 — data-action='clear-quick-note' 보존 (document 위임)", () => {
    assert.match(src, /data-action="clear-quick-note"/);
  });

  it("event strategy — onClick handler 없음 (data-action 위임)", () => {
    assert.doesNotMatch(src, /onClick\s*=/);
  });

  it("QuickNoteData export 존재 (view-model serializable)", () => {
    assert.match(src, /export interface QuickNoteData/);
  });

  it("QuickNotePanel 컴포넌트 — quickNote null 분기 존재", () => {
    assert.match(src, /quickNote &&/, "quickNote null guard 존재");
    assert.match(src, /quick-note-panel/, "quick-note-panel class 존재");
  });

  it("sanitizeExternalUrl import 존재 (primaryHref protocol allowlist)", () => {
    assert.match(src, /sanitizeExternalUrl/, "sanitizeExternalUrl import 존재");
  });

  it("difficulty type — 'applied' 값 처리 (domain parity)", () => {
    assert.match(src, /"basic" \| "applied"/, "difficulty type = basic|applied");
  });

  it("parity — 4 주요 섹션 존재 (keyword/concept/question/source)", () => {
    assert.match(src, /week-summary-keywords-title/, "키워드 섹션 id 존재");
    assert.match(src, /week-summary-concepts-title/, "개념 섹션 id 존재");
    assert.match(src, /week-summary-practice-title/, "문제 섹션 id 존재");
    assert.match(src, /week-summary-sources-title/, "자료 섹션 id 존재");
  });

  it("parity — SummaryKeywordItem 에 professorSignal + status + conceptTitles 존재", () => {
    assert.match(src, /professorSignal/, "professorSignal 필드 존재");
    assert.match(src, /conceptTitles/, "conceptTitles 필드 존재");
    assert.match(src, /"covered" \| "missing"/, "status union 존재");
  });

  it("parity — data-action='generate-keyword-note' 보존", () => {
    assert.match(src, /data-action="generate-keyword-note"/);
  });

  it("parity — source-row 섹션 포함 (kindLabel + visibilityLabel)", () => {
    assert.match(src, /source-row/, "source-row class 존재");
    assert.match(src, /kindLabel/, "kindLabel prop 존재");
    assert.match(src, /visibilityLabel/, "visibilityLabel prop 존재");
  });

  it("hero 섹션 — data-subject-id + data-week-id 보존 (generate-week-note parity)", () => {
    assert.match(src, /data-subject-id=\{subjectId\}/, "data-subject-id 존재");
    assert.match(src, /data-week-id=\{weekId\}/, "data-week-id 존재");
  });
});
