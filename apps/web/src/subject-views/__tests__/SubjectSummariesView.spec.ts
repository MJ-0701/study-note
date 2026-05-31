// S4a SubjectSummariesView 정적 소스 검증 spec (render 없음 — node:test 전용).
//
// AC5: pure-props leaf — useState/useEffect/store 구독 0.
// INV-8: dangerouslySetInnerHTML 0 + escapeHtml 미사용(JSX auto-escape).
// AC4: data-action="generate-subject-note" 보존(document 위임).
// parity: hero/metric/day-grid/summary-grid 4 섹션 구조 검증.
//
// 실행:
//   node --experimental-strip-types --no-warnings --test \
//     apps/web/src/subject-views/__tests__/SubjectSummariesView.spec.ts

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const src = readFileSync(new URL("../SubjectSummariesView.tsx", import.meta.url), "utf8");

describe("SubjectSummariesView 정적 소스 검증", () => {
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

  it("SubjectSummariesViewProps export 존재", () => {
    assert.match(src, /export interface SubjectSummariesViewProps/);
  });

  it("SubjectSummariesView function export 존재", () => {
    assert.match(src, /export function SubjectSummariesView/);
  });

  it("AC4 — data-action='generate-subject-note' 보존 (document 위임)", () => {
    assert.match(src, /data-action="generate-subject-note"/);
  });

  it("event strategy — onClick handler 없음 (data-action 위임)", () => {
    assert.doesNotMatch(src, /onClick\s*=/);
  });

  it("parity — hero 섹션 구조 (subject-page-hero class 존재)", () => {
    assert.match(src, /subject-page-hero/, "hero class 존재");
    assert.match(src, /요약본/, "요약본 타이틀 존재");
  });

  it("parity — metric-grid 섹션 존재 (3 metric-card)", () => {
    assert.match(src, /metric-grid/, "metric-grid class 존재");
    assert.match(src, /metric-card/, "metric-card 존재");
    assert.match(src, /키워드 반영률/, "키워드 반영률 metric 존재");
    assert.match(src, /수업일/, "수업일 metric 존재");
    assert.match(src, /시험 범위/, "시험 범위 metric 존재");
  });

  it("parity — summary-list 섹션 (class-day-grid + SummaryDayCard)", () => {
    assert.match(src, /summary-list-title/, "summary-list-title h2 id 존재");
    assert.match(src, /class-day-grid/, "class-day-grid class 존재");
    assert.match(src, /SummaryDayCard/, "SummaryDayCard 컴포넌트 존재");
  });

  it("parity — summary-course 섹션 (전체 요약 방향)", () => {
    assert.match(src, /summary-course-title/, "summary-course-title id 존재");
    assert.match(src, /summary-grid/, "summary-grid class 존재");
    assert.match(src, /복습 전략/, "복습 전략 block 존재");
    assert.match(src, /취약 포인트/, "취약 포인트 block 존재");
  });

  it("parity — SummaryDayCard — formattedLabel + summaryDetailHref + classDetailHref", () => {
    assert.match(src, /formattedLabel/, "formattedLabel prop 사용");
    assert.match(src, /summaryDetailHref/, "summaryDetailHref prop 사용");
    assert.match(src, /classDetailHref/, "classDetailHref prop 사용");
  });

  it("parity — 요약 상세 보기 / 수업 상세 링크 존재", () => {
    assert.match(src, /요약 상세 보기/, "요약 상세 보기 텍스트 존재");
    assert.match(src, /수업 상세/, "수업 상세 텍스트 존재");
  });
});
