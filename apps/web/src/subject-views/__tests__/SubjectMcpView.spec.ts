// S4a SubjectMcpView 정적 소스 검증 spec (render 없음 — node:test 전용).
//
// AC5: pure-props leaf — useState/useEffect/useSyncExternalStore/store 구독 0.
// INV-8: dangerouslySetInnerHTML 0 + escapeHtml 미사용(JSX auto-escape).
// AC4: data-action="generate-subject-note" 보존(document 위임).
// event strategy: data-action 보존, onClick handler 없음.
//
// 실행:
//   node --experimental-strip-types --no-warnings --test \
//     apps/web/src/subject-views/__tests__/SubjectMcpView.spec.ts

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const src = readFileSync(new URL("../SubjectMcpView.tsx", import.meta.url), "utf8");

describe("SubjectMcpView 정적 소스 검증", () => {
  it("AC5 — pure-props: no useState, useEffect, useSyncExternalStore", () => {
    assert.doesNotMatch(src, /\buseState\b/, "useState 미사용");
    assert.doesNotMatch(src, /\buseEffect\b/, "useEffect 미사용");
    assert.doesNotMatch(src, /\buseSyncExternalStore\b/, "useSyncExternalStore 미사용");
  });

  it("AC5 — pure-props: no store subscriptions", () => {
    assert.doesNotMatch(src, /\buseStore\b/, "useStore 미사용");
    assert.doesNotMatch(src, /from ["']zustand/, "zustand import 없음");
    assert.doesNotMatch(src, /uiStore|notebookStore/, "store import 없음");
  });

  it("INV-8 — no dangerouslySetInnerHTML", () => {
    assert.doesNotMatch(src, /dangerouslySetInnerHTML/, "dangerouslySetInnerHTML 미사용");
  });

  it("INV-8 — no escapeHtml (JSX auto-escape 로 대체)", () => {
    assert.doesNotMatch(src, /escapeHtml/, "escapeHtml 미사용");
  });

  it("SubjectMcpViewProps export 존재", () => {
    assert.match(src, /export interface SubjectMcpViewProps/);
  });

  it("SubjectMcpView function export 존재", () => {
    assert.match(src, /export function SubjectMcpView/);
  });

  it("AC4 — data-action='generate-subject-note' 보존 (document 위임 경로)", () => {
    assert.match(src, /data-action="generate-subject-note"/, "generate-subject-note data-action 존재");
  });

  it("event strategy — onClick handler 없음 (data-action 위임만)", () => {
    assert.doesNotMatch(src, /onClick\s*=/, "onClick handler 없음");
  });

  it("sanitizeExternalUrl import 존재 (personaCallHref protocol allowlist)", () => {
    assert.match(src, /sanitizeExternalUrl/, "sanitizeExternalUrl import 존재");
  });

  it("difficulty type — 'applied' 값 처리 (domain parity)", () => {
    assert.match(src, /"basic" \| "applied"/, "difficulty type = basic|applied");
  });

  it("질문 difficultyLabel — '기본'/'응용' 정확 (formatQuestionDifficulty parity)", () => {
    assert.match(src, /"기본"/, "기본 label 존재");
    assert.match(src, /"응용"/, "응용 label 존재");
  });

  it("persona 미활성 시 aria-disabled button 렌더", () => {
    assert.match(src, /aria-disabled="true"/, "aria-disabled 렌더 경로 존재");
  });

  it("subjectMcpPanel section — mcp-title h2 존재 (parity)", () => {
    assert.match(src, /mcp-title/, "mcp-title id 존재");
    assert.match(src, /subject-mcp-panel/, "subject-mcp-panel class 존재");
  });
});
