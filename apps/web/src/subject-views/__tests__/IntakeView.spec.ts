// S3 IntakeView 정적 소스 검증 spec (render 없음 — node:test 전용).
//
// AC5: pure-props leaf — useState/useEffect/useSyncExternalStore/store 구독 0.
// AC3/INV-8: dangerouslySetInnerHTML 0.
// AC4: data-action 속성 보존(import-week-note / reset-local-data).
//
// 실행:
//   node --experimental-strip-types --no-warnings --test \
//     apps/web/src/subject-views/__tests__/IntakeView.spec.ts

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const src = readFileSync(new URL("../IntakeView.tsx", import.meta.url), "utf8");

describe("IntakeView 정적 소스 검증", () => {
  it("AC5 — pure-props: no useState, useEffect, useSyncExternalStore", () => {
    assert.doesNotMatch(src, /\buseState\b/, "useState 미사용");
    assert.doesNotMatch(src, /\buseEffect\b/, "useEffect 미사용");
    assert.doesNotMatch(src, /\buseSyncExternalStore\b/, "useSyncExternalStore 미사용");
  });

  it("AC5 — pure-props: no store subscriptions (runtime)", () => {
    // notebookStore 는 import type 으로만 참조(IntakeFeedback 타입 재사용). 런타임 구독 없음.
    assert.doesNotMatch(src, /\buseStore\b/, "useStore 미사용");
    assert.doesNotMatch(src, /from ["']zustand/, "zustand import 없음");
    assert.doesNotMatch(src, /uiStore|pdfWorkspaceStore/, "uiStore/pdfWorkspaceStore import 없음");
    // notebookStore 는 type-only import 만 허용
    assert.doesNotMatch(src, /import\s+\{[^}]*notebookStore[^}]*\}/, "notebookStore 런타임 import 없음");
    assert.doesNotMatch(src, /notebookStore\.getState/, "notebookStore 런타임 구독 없음");
  });

  it("INV-8 — no dangerouslySetInnerHTML", () => {
    assert.doesNotMatch(src, /dangerouslySetInnerHTML/, "dangerouslySetInnerHTML 미사용");
  });

  it("INV-8 — no escapeHtml (JSX auto-escape 로 대체)", () => {
    assert.doesNotMatch(src, /escapeHtml/, "escapeHtml 미사용(JSX auto-escape)");
  });

  it("AC4 — data-action='import-week-note' 보존 (document 위임 bubbling)", () => {
    assert.match(src, /data-action="import-week-note"/, 'import-week-note data-action 존재');
  });

  it("AC4 — data-action='reset-local-data' 보존 (document 위임 bubbling)", () => {
    assert.match(src, /data-action="reset-local-data"/, 'reset-local-data data-action 존재');
  });

  it("IntakeViewProps export 존재 (variant discriminant)", () => {
    assert.match(src, /export type IntakeViewProps/);
  });

  it("IntakeViewGeneralProps / IntakeViewSubjectProps export 존재", () => {
    assert.match(src, /IntakeViewGeneralProps/);
    assert.match(src, /IntakeViewSubjectProps/);
  });

  it("IntakeView function export 존재", () => {
    assert.match(src, /export function IntakeView/);
  });

  it("variant 'general' / 'subject' 분기 존재", () => {
    assert.match(src, /variant.*general/, "'general' variant 분기");
    assert.match(src, /variant.*subject/, "'subject' variant 분기");
  });

  it("AC7 XSS 방어 구조 — subject.title/id JSX interpolation 만 사용", () => {
    assert.match(src, /\{subject\.title\}/, "subject.title JSX interpolation");
    assert.match(src, /\{subject\.id\}/, "subject.id JSX interpolation");
  });

  it("AC2 parity — retry button uses intakeFeedback.retrySubjectId (not current route subject.id)", () => {
    // 원본 renderIntakeFeedback 에서 data-subject-id = intakeFeedback.retrySubjectId.
    // current route subject.id 와 다를 수 있음 (cross-subject PDF upload retry).
    assert.match(src, /intakeFeedback\.retrySubjectId/, "retrySubjectId 참조 존재");
    assert.match(src, /data-subject-id=\{intakeFeedback\.retrySubjectId\}/, "data-subject-id = retrySubjectId");
  });

  it("AC7: intakeFeedback null 경로 존재 (빈 feedback 케이스)", () => {
    // null/undefined intakeFeedback → 기본 배너 렌더
    assert.match(src, /아직 반영한 JSON 파일이 없습니다/, "기본 피드백 텍스트 존재");
  });

  it("AC7: intakeFeedback.kind → class 이름에 반영 (is-success/is-error)", () => {
    assert.match(src, /is-\$\{intakeFeedback\.kind\}|is-\${.*kind/, "kind → CSS class 패턴");
  });

  it("subjectCoverageRates → SubjectImportCard span 렌더 경로 존재", () => {
    assert.match(src, /coverageRate/, "coverageRate prop 참조");
    assert.match(src, /키워드 반영/, "'키워드 반영' 텍스트 존재");
  });
});
