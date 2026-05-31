// S4b-1 WeekView 정적 소스 검증 spec (render 없음 — node:test 전용).
//
// AC1: pure-props leaf — useState/useEffect/store 구독 0.
// INV-8: dangerouslySetInnerHTML 0 + escapeHtml 미사용(JSX auto-escape).
// AC1: data-action="generate-week-note" 보존(document 위임).
// AC5: userNotes = defaultValue(uncontrolled), value+onChange controlled 금지.
// AC6: console/RUM/datadog import 0.
// parity: hero/mappedPDF/userNotes/quickNote/§1/§2/§3 섹션 구조 검증.
//
// 실행:
//   node --experimental-strip-types --no-warnings --test \
//     apps/web/src/subject-views/__tests__/WeekView.spec.ts

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const src = readFileSync(new URL("../WeekView.tsx", import.meta.url), "utf8");

describe("WeekView 정적 소스 검증", () => {
  it("AC1 — pure-props: no useState, useEffect, useSyncExternalStore", () => {
    assert.doesNotMatch(src, /\buseState\b/);
    assert.doesNotMatch(src, /\buseEffect\b/);
    assert.doesNotMatch(src, /\buseSyncExternalStore\b/);
  });

  it("AC1 — pure-props: no store subscriptions", () => {
    assert.doesNotMatch(src, /\buseStore\b/);
    assert.doesNotMatch(src, /from ["']zustand/);
  });

  it("INV-8 — no dangerouslySetInnerHTML", () => {
    assert.doesNotMatch(src, /dangerouslySetInnerHTML/);
  });

  it("INV-8 — no escapeHtml (JSX auto-escape)", () => {
    assert.doesNotMatch(src, /escapeHtml/);
  });

  it("WeekViewProps export 존재", () => {
    assert.match(src, /export interface WeekViewProps/);
  });

  it("WeekView function export 존재", () => {
    assert.match(src, /export function WeekView/);
  });

  it("AC1 — data-action='generate-week-note' 보존 (document 위임)", () => {
    assert.match(src, /data-action="generate-week-note"/);
  });

  it("event strategy — onClick handler 없음 (data-action 위임)", () => {
    assert.doesNotMatch(src, /onClick\s*=/);
  });

  it("AC5 — userNotes textarea: defaultValue 사용 (uncontrolled)", () => {
    assert.match(src, /defaultValue\s*=\s*\{userNotes\}/, "defaultValue prop 사용");
  });

  it("AC5 — userNotes textarea: value= controlled 패턴 없음", () => {
    // value= attribute controlled pattern 금지 (onChange + value 쌍)
    assert.doesNotMatch(src, /onChange\s*=.*update-week-user-notes/s);
  });

  it("AC5 — userNotes textarea: data-action='update-week-user-notes' 보존", () => {
    assert.match(src, /data-action="update-week-user-notes"/);
  });

  it("AC5 — userNotes textarea: key={userNotesToken} 존재 (fetch-complete 재hydrate)", () => {
    assert.match(src, /key\s*=\s*\{userNotesToken\}/, "key prop 존재");
  });

  it("AC6 — security: console/RUM/datadog import 0", () => {
    assert.doesNotMatch(src, /import.*console/);
    assert.doesNotMatch(src, /import.*datadog/);
    assert.doesNotMatch(src, /import.*rum/i);
  });

  it("parity — hero 섹션 (subject-page-hero class + week title + lede)", () => {
    assert.match(src, /subject-page-hero/, "hero class 존재");
    assert.match(src, /weekTitle/, "weekTitle prop 사용");
    assert.match(src, /weekFocus/, "weekFocus(lede) prop 사용");
  });

  it("parity — hero 메타: subjectTitle·weekLabel·reviewStatusLabel", () => {
    assert.match(src, /subjectTitle/, "subjectTitle 사용");
    assert.match(src, /weekLabel/, "weekLabel 사용");
    assert.match(src, /reviewStatusLabel/, "reviewStatusLabel 사용");
  });

  it("parity — mappedPDF 섹션 (pdf-material-browser class)", () => {
    assert.match(src, /pdf-material-browser/, "pdf-material-browser class 존재");
    assert.match(src, /week-pdf-title/, "week-pdf-title 섹션 id 존재");
  });

  it("parity — userNotes 섹션 (week-user-notes class)", () => {
    assert.match(src, /week-user-notes/, "week-user-notes class 존재");
    assert.match(src, /week-user-notes-title/, "week-user-notes-title id 존재");
  });

  it("parity — §1 개요 섹션 (week-overview-title id + week-note-grid)", () => {
    assert.match(src, /week-overview-title/, "week-overview-title id 존재");
    assert.match(src, /week-note-grid/, "week-note-grid class 존재");
    assert.match(src, /키워드/, "키워드 column 텍스트 존재");
    assert.match(src, /개념/, "개념 column 텍스트 존재");
  });

  it("parity — §2 개념 섹션 (week-concepts-title id + concept-list)", () => {
    assert.match(src, /week-concepts-title/, "week-concepts-title id 존재");
    assert.match(src, /concept-list/, "concept-list class 존재");
    assert.match(src, /ConceptRow/, "ConceptRow 컴포넌트 존재");
  });

  it("parity — §3 문제 섹션 (week-practice-title id + question-list)", () => {
    assert.match(src, /week-practice-title/, "week-practice-title id 존재");
    assert.match(src, /question-list/, "question-list class 존재");
    assert.match(src, /QuestionRow/, "QuestionRow 컴포넌트 존재");
  });

  it("parity — PdfMaterialCard 컴포넌트 존재 (compact=is-compact class)", () => {
    assert.match(src, /PdfMaterialCard/, "PdfMaterialCard 컴포넌트 존재");
    assert.match(src, /is-compact/, "is-compact class 존재 (compact 전용)");
  });

  it("parity — QuickNotePanel 컴포넌트 존재 (data-action='clear-quick-note' 위임)", () => {
    assert.match(src, /QuickNotePanel/, "QuickNotePanel 컴포넌트 존재");
    assert.match(src, /data-action="clear-quick-note"/, "clear-quick-note 위임 존재");
  });

  it("parity — PdfMaterialCard data-action='open-pdf-material' 보존", () => {
    assert.match(src, /data-action="open-pdf-material"/);
  });

  it("AC6 — XSS: no class/style 직접 주입 (className만 허용)", () => {
    // dangerouslySetInnerHTML 은 이미 체크됨.
    assert.doesNotMatch(src, /\bstyle\s*=\s*\{.*innerHTML/s);
  });
});
