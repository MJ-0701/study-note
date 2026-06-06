// S4a SubjectMemorizeView 정적 소스 검증 spec (render 없음 — node:test 전용).
//
// AC5: pure-props leaf — useState/useEffect/store 구독 0.
// INV-8: dangerouslySetInnerHTML 0 + escapeHtml 미사용(JSX auto-escape).
// parity: 시험 구간별 그룹 / 필수 개념 / 키워드 / 질문 섹션 구조 검증.
//
// 실행:
//   node --experimental-strip-types --no-warnings --test \
//     apps/web/src/subject-views/__tests__/SubjectMemorizeView.spec.ts

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const src = readFileSync(new URL("../SubjectMemorizeView.tsx", import.meta.url), "utf8");

describe("SubjectMemorizeView 정적 소스 검증", () => {
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

  it("SubjectMemorizeViewProps export 존재", () => {
    assert.match(src, /export interface SubjectMemorizeViewProps/);
  });

  it("SubjectMemorizeView function export 존재", () => {
    assert.match(src, /export function SubjectMemorizeView/);
  });

  it("parity — 시험 구간별 그룹 섹션 존재 (memorize-by-exam-title)", () => {
    assert.match(src, /memorize-by-exam-title/, "시험 구간별 섹션 h2 id 존재");
    assert.match(src, /MemorizeExamGroup/, "MemorizeExamGroup 인터페이스 존재");
    assert.match(src, /memorize-exam-group/, "memorize-exam-group class 존재");
  });

  it("parity — 시험 기준 챕터 섹션 존재 (memorize-exam-chapters-title)", () => {
    assert.match(src, /MemorizeExamChapter/, "MemorizeExamChapter 인터페이스 존재");
    assert.match(src, /memorize-exam-chapters-title/, "시험 기준 챕터 h2 id 존재");
    assert.match(src, /memorize-chapter-grid/, "memorize-chapter-grid class 존재");
  });

  it("parity — 필수 개념 섹션 존재 (memorize-concepts-title)", () => {
    assert.match(src, /memorize-concepts-title/);
    assert.match(src, /concept-list/);
  });

  it("parity — 키워드 섹션 존재 (memorize-keywords-title)", () => {
    assert.match(src, /memorize-keywords-title/);
    assert.match(src, /keyword-grid/);
  });

  it("parity — 질문 섹션 존재 (memorize-questions-title)", () => {
    assert.match(src, /memorize-questions-title/);
    assert.match(src, /question-list/);
  });

  it("MemorizeKeyword 에 subjectId 필드 존재 (data-subject-id parity)", () => {
    assert.match(src, /subjectId:/, "subjectId 필드 존재");
    assert.match(src, /data-subject-id=\{keyword\.subjectId\}/, "data-subject-id 정확히 keyword.subjectId");
  });

  it("difficulty type — 'applied' 값 처리 (domain parity)", () => {
    assert.match(src, /"basic" \| "applied"/, "difficulty type = basic|applied");
  });

  it("difficulty label — '기본'/'응용' (formatQuestionDifficulty parity)", () => {
    assert.match(src, /"기본"/, "기본 label 존재");
    assert.match(src, /"응용"/, "응용 label 존재");
  });

  it("event strategy — onClick handler 없음 (data-action 위임)", () => {
    assert.doesNotMatch(src, /onClick\s*=/);
  });

  it("data-action='generate-keyword-note' 존재 (위임 경로 보존)", () => {
    assert.match(src, /data-action="generate-keyword-note"/);
  });

  it("parity — 연결 문제 블록에 linkedQuestionCount 바인딩 존재 (대시 placeholder 제거)", () => {
    assert.match(src, /\{concept\.linkedQuestionCount\}개/, "linkedQuestionCount 바인딩 존재");
    assert.doesNotMatch(src, /<strong>연결 문제<\/strong>\s*<p>-<\/p>/, "대시 placeholder 삭제 확인");
  });

  it("parity — MemorizeConcept 에 linkedQuestionCount: number 존재", () => {
    assert.match(src, /linkedQuestionCount:\s*number/, "linkedQuestionCount 필드 선언 존재");
  });
});
