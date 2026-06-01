// S4c PdfWorkspacesView 정적 소스 검증 spec (render 없음 — node:test 전용).
//
// AC2 parity: pure-props leaf — data-action 전수, 버튼 레이블, upload card 분기.
// AC3: class-date picker 미존재(showClassDateControl=false 경로).
// AC4: dangerouslySetInnerHTML 0 + escapeHtml 미사용(JSX auto-escape).
// INV: hook 구독 0, onClick handler 없음.
// XSS: <script> 포함 텍스트가 JSX auto-escape 로 처리됨을 구조적 확인.
//
// 실행:
//   node --experimental-strip-types --no-warnings --test \
//     apps/web/src/subject-views/__tests__/PdfWorkspacesView.spec.ts

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const src = readFileSync(new URL("../PdfWorkspacesView.tsx", import.meta.url), "utf8");

describe("PdfWorkspacesView 정적 소스 검증", () => {
  // ─── INV: pure-props ────────────────────────────────────────────────────────

  it("INV — pure-props: no useState, useEffect, useSyncExternalStore", () => {
    assert.doesNotMatch(src, /\buseState\b/);
    assert.doesNotMatch(src, /\buseEffect\b/);
    assert.doesNotMatch(src, /\buseSyncExternalStore\b/);
  });

  it("INV — pure-props: no store subscriptions (no useStore, no zustand)", () => {
    assert.doesNotMatch(src, /\buseStore\b/);
    assert.doesNotMatch(src, /from ["']zustand/);
  });

  it("INV — no dangerouslySetInnerHTML", () => {
    assert.doesNotMatch(src, /dangerouslySetInnerHTML/);
  });

  it("INV — no escapeHtml (JSX auto-escape)", () => {
    assert.doesNotMatch(src, /escapeHtml/);
  });

  it("INV — onClick handler 없음 (data-action 위임)", () => {
    assert.doesNotMatch(src, /onClick\s*=/);
  });

  // ─── exports ────────────────────────────────────────────────────────────────

  it("PdfWorkspacesViewProps export 존재", () => {
    assert.match(src, /export interface PdfWorkspacesViewProps/);
  });

  it("PdfWorkspacesView function export 존재", () => {
    assert.match(src, /export function PdfWorkspacesView/);
  });

  it("PdfWorkspacesViewSubject export 존재", () => {
    assert.match(src, /export interface PdfWorkspacesViewSubject/);
  });

  it("PdfWorkspacesViewMaterial export 존재", () => {
    assert.match(src, /export interface PdfWorkspacesViewMaterial/);
  });

  // ─── AC2 parity: data-action dispatch-half ──────────────────────────────────

  it("AC2 parity — data-action='open-pdf-material' 버튼 존재", () => {
    assert.match(src, /data-action="open-pdf-material"/);
  });

  it("AC2 parity — data-action='import-pdf-material' 파일 input 존재", () => {
    assert.match(src, /data-action="import-pdf-material"/);
  });

  it("AC2 parity — data-subject-id 속성 존재", () => {
    assert.match(src, /data-subject-id=\{/);
  });

  it("AC2 parity — data-material-id 속성 존재", () => {
    assert.match(src, /data-material-id=\{/);
  });

  it("AC2 parity — 버튼 레이블 '열기' (isCurrent=false 고정)", () => {
    assert.match(src, />열기</);
  });

  it("AC2 parity — '현재 열림' 레이블 없음 (isCurrent=false 고정)", () => {
    assert.doesNotMatch(src, /현재 열림/);
  });

  // ─── AC3 parity: class-date picker 없음 ─────────────────────────────────────

  it("AC3 — class-date picker 없음 (showClassDateControl=false 경로)", () => {
    // renderPdfMaterialClassDateControl 는 showClassDateControl=false 시 미호출.
    // 인덱스 뷰에서 class-date picker/radio/details 없어야 함.
    assert.doesNotMatch(src, /pdf-class-date-picker/);
    assert.doesNotMatch(src, /class-date-summary/);
    assert.doesNotMatch(src, /assign-pdf-class-date/);
  });

  // ─── hero / metric summary ──────────────────────────────────────────────────

  it("hero h1 '수업자료 찾기' 존재", () => {
    assert.match(src, /수업자료 찾기/);
  });

  it("pdf-library-summary div 존재", () => {
    assert.match(src, /pdf-library-summary/);
  });

  it("metric '등록 자료' 존재", () => {
    assert.match(src, /등록 자료/);
  });

  it("metric '업로드된 PDF' 존재", () => {
    assert.match(src, /업로드된 PDF/);
  });

  it("metric '필기' 개인별 존재", () => {
    assert.match(src, /개인별/);
  });

  it("h2 '과목별 PDF' 존재", () => {
    assert.match(src, /과목별 PDF/);
  });

  // ─── upload card 분기 ────────────────────────────────────────────────────────

  it("readonly card '새 자료 요청' 존재", () => {
    assert.match(src, /새 자료 요청/);
  });

  it("readonly card '공유 자료 보기' 조건 존재", () => {
    assert.match(src, /공유 자료 보기/);
  });

  it("readonly card '작업공간 열기' 조건 존재", () => {
    assert.match(src, /작업공간 열기/);
  });

  it("editable card '새 PDF 업로드' 존재", () => {
    assert.match(src, /새 PDF 업로드/);
  });

  it("editable card file accept='application/pdf,.pdf'", () => {
    assert.match(src, /accept="application\/pdf,\.pdf"/);
  });

  it("editable card '첫 강의 PDF를 바로 올립니다' 조건 존재", () => {
    assert.match(src, /첫 강의 PDF를 바로 올립니다/);
  });

  it("editable card '개 자료에 이어 추가합니다' 조건 존재", () => {
    assert.match(src, /개 자료에 이어 추가합니다/);
  });

  // ─── material card ────────────────────────────────────────────────────────

  it("material card '나중에 수정' badge 조건 존재 (classDateIsUnconfirmed)", () => {
    assert.match(src, /나중에 수정/);
  });

  it("material card badges div 존재", () => {
    assert.match(src, /pdf-material-card__badges/);
  });

  it("material card body div 존재", () => {
    assert.match(src, /pdf-material-card__body/);
  });

  it("material card '페이지' 존재", () => {
    assert.match(src, /페이지/);
  });

  // ─── pdf-count-pill ──────────────────────────────────────────────────────────

  it("pdf-count-pill span 존재 (materialCount)", () => {
    assert.match(src, /pdf-count-pill/);
  });

  it("'개 자료' 텍스트 존재 (count pill)", () => {
    assert.match(src, /개 자료/);
  });

  // ─── subject section ────────────────────────────────────────────────────────

  it("pdf-subject-section class 존재", () => {
    assert.match(src, /pdf-subject-section/);
  });

  it("aria-labelledby pdf-subject-${subjectId} 존재", () => {
    assert.match(src, /aria-labelledby=\{`pdf-subject-\$\{/);
  });

  it("h3 id=pdf-subject-${subjectId} 존재", () => {
    assert.match(src, /id=\{`pdf-subject-\$\{/);
  });

  it("pdf-material-slider div 존재", () => {
    assert.match(src, /pdf-material-slider/);
  });

  // ─── XSS: <script> 포함 텍스트는 JSX 로 auto-escape (구조 확인) ────────────

  it("XSS — JSX auto-escape: 텍스트 바인딩은 {} 표현식 (innerHTML 없음)", () => {
    // dangerouslySetInnerHTML 없음 + {value} 바인딩이 있으면 JSX 가 auto-escape.
    // subject.title 같은 사용자 입력이 {subject.title} 로 바인딩됨을 확인.
    assert.match(src, /\{subject\.title\}/);
    assert.doesNotMatch(src, /dangerouslySetInnerHTML/);
  });

  // ─── MetricCard sub-component ────────────────────────────────────────────────

  it("MetricCard sub-component 존재 (metric-card class)", () => {
    assert.match(src, /metric-card/);
  });

  // ─── aria ────────────────────────────────────────────────────────────────────

  it("aria-label PDF 자료 현황 존재", () => {
    assert.match(src, /PDF 자료 현황/);
  });

  it("pdf-workspaces-title aria id 존재", () => {
    assert.match(src, /pdf-workspaces-title/);
  });
});
