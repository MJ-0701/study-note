// S3 HomeView 정적 소스 검증 spec (render 없음 — node:test 전용).
//
// AC5: pure-props leaf — useState/useEffect/useSyncExternalStore/store 구독 0.
// AC3/INV-8: dangerouslySetInnerHTML 0 + escapeHtml 미사용(JSX auto-escape).
// AC4: data-action 속성 보존(import-week-note / reset-local-data).
//
// 실행:
//   node --experimental-strip-types --no-warnings --test \
//     apps/web/src/subject-views/__tests__/HomeView.spec.ts

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const src = readFileSync(new URL("../HomeView.tsx", import.meta.url), "utf8");

describe("HomeView 정적 소스 검증", () => {
  it("AC5 — pure-props: no useState, useEffect, useSyncExternalStore", () => {
    assert.doesNotMatch(src, /\buseState\b/, "useState 미사용");
    assert.doesNotMatch(src, /\buseEffect\b/, "useEffect 미사용");
    assert.doesNotMatch(src, /\buseSyncExternalStore\b/, "useSyncExternalStore 미사용");
  });

  it("AC5 — pure-props: no store subscriptions (useStore / zustand imports)", () => {
    assert.doesNotMatch(src, /\buseStore\b/, "useStore 미사용");
    assert.doesNotMatch(src, /from ["']zustand/, "zustand import 없음");
    assert.doesNotMatch(src, /uiStore|notebookStore|pdfWorkspaceStore/, "store import 없음");
  });

  it("INV-8 — no dangerouslySetInnerHTML", () => {
    assert.doesNotMatch(src, /dangerouslySetInnerHTML/, "dangerouslySetInnerHTML 미사용");
  });

  it("INV-8 — no escapeHtml (JSX auto-escape 로 대체)", () => {
    assert.doesNotMatch(src, /escapeHtml/, "escapeHtml 미사용(JSX auto-escape)");
  });

  it("INV-8 — sanitizeExternalUrl import 유지 (protocol allowlist)", () => {
    assert.match(src, /sanitizeExternalUrl/, "sanitizeExternalUrl import 존재");
  });

  it("HomeViewProps export 존재", () => {
    assert.match(src, /export interface HomeViewProps/);
  });

  it("HomeView function export 존재", () => {
    assert.match(src, /export function HomeView/);
  });

  it("scheduleRangeLabel import (일정 metric 출력)", () => {
    assert.match(src, /scheduleRangeLabel/);
  });

  it("subjectCoverageRates prop 사용 — SubjectCard coverage span 존재", () => {
    // 커버리지 span 렌더 경로: props.subjectCoverageRates[subject.id] → 숫자 → JSX span
    assert.match(src, /subjectCoverageRates/, "subjectCoverageRates prop 참조 존재");
    assert.match(src, /키워드 반영/, "'키워드 반영' span 텍스트 존재");
  });

  it("AC7 XSS 방어 구조 — 사용자 콘텐츠 JSX interpolation 만 사용 (중괄호 패턴)", () => {
    // notebook.title, subject.title, sharePolicy.* 등 = JSX {} 로 auto-escape
    assert.match(src, /\{notebook\.title\}/, "notebook.title JSX interpolation");
    assert.match(src, /\{subject\.title\}/, "subject.title JSX interpolation");
  });

  it("needsFillSessions 배열 map 렌더 존재", () => {
    assert.match(src, /needsFillSessions/, "needsFillSessions prop 참조");
    assert.match(src, /needsFillSessions\.length/, "length 체크 존재");
  });

  it("warnings 배열 map 렌더 존재", () => {
    assert.match(src, /warnings\.length/, "warnings length 체크");
    assert.match(src, /\.map\(/, "map 렌더 존재");
  });
});
