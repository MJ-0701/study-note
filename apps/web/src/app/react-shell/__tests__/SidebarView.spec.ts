// S3b SidebarView 정적 소스 검증 spec (render 없음 — node:test 전용).
//
// AC4: pure-props leaf — hook 구독 0 + useEffect-setState 0 + onClick/onToggle 0.
// AC4 5-layer: (a)user content JSX escape (b)denylist 4분기 (c)href escape
//   (d)admin denylist master/admin/reviewer/none (e)PII/log import 0.
// AC5: data-action="sidebar-term-toggle" markup-only (onClick 0).
//
// 실행:
//   node --experimental-strip-types --no-warnings --test \
//     apps/web/src/app/react-shell/__tests__/SidebarView.spec.ts

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const src = readFileSync(new URL("../SidebarView.tsx", import.meta.url), "utf8");
// 코드 라인만 (주석 제거) — 단일행 주석(//) 과 내용만 포함하는 빈 행 제거
const codeLines = src.split("\n")
  .filter(line => !line.trim().startsWith("//"))
  .join("\n");

describe("SidebarView 정적 소스 검증 (AC4/AC5)", () => {
  // ─── AC4: pure-props leaf ──────────────────────────────────────────────

  it("AC4 — pure-props: no useState, useEffect, useSyncExternalStore", () => {
    assert.doesNotMatch(codeLines, /\buseState\b/, "useState 미사용");
    assert.doesNotMatch(codeLines, /\buseEffect\b/, "useEffect 미사용");
    assert.doesNotMatch(codeLines, /\buseSyncExternalStore\b/, "useSyncExternalStore 미사용");
  });

  it("AC4 — pure-props: no store subscriptions (useStore / zustand)", () => {
    assert.doesNotMatch(codeLines, /\buseStore\b/, "useStore 미사용");
    assert.doesNotMatch(codeLines, /from ["']zustand/, "zustand import 없음");
    assert.doesNotMatch(codeLines, /uiStore|notebookStore|pdfWorkspaceStore/, "store import 없음");
  });

  // ─── AC4 + AC5: no onClick / onToggle on shipping SidebarView ─────────

  it("AC5 — onClick 0 (document 위임 보존)", () => {
    assert.doesNotMatch(codeLines, /\bonClick\b/, "onClick 미사용 (data-action 위임 경로 보존)");
  });

  it("AC5 — onToggle 0 on SidebarView (controlled anti-pattern 없음)", () => {
    // SidebarView.tsx 에는 onToggle 없어야 함.
    // negativeControlSidebar.tsx 가 onToggle 을 쓰지만 그건 다른 파일.
    assert.doesNotMatch(codeLines, /\bonToggle\b/, "onToggle 미사용 (uncontrolled-style <details>)");
  });

  // ─── AC4 5-layer security (a)(b)(c) ────────────────────────────────────

  it("AC4(a) — dangerouslySetInnerHTML 0 (JSX auto-escape)", () => {
    assert.doesNotMatch(codeLines, /dangerouslySetInnerHTML/, "dangerouslySetInnerHTML 미사용");
  });

  it("AC4(a) — escapeHtml import 없음 (JSX auto-escape 로 대체)", () => {
    assert.doesNotMatch(src, /escapeHtml/, "escapeHtml 미사용");
  });

  it("AC4(b) — admin denylist 4분기 presence: showAdminBlock / showUserMgmt", () => {
    assert.match(src, /showAdminBlock/, "showAdminBlock 분기 존재 (denylist)");
    assert.match(src, /showUserMgmt/, "showUserMgmt 분기 존재 (reviewer vs admin)");
  });

  it("AC4(b) — 사용자 관리 / 운영 지표 admin block 존재", () => {
    assert.match(src, /사용자 관리/, "사용자 관리 링크 존재");
    assert.match(src, /운영 지표/, "운영 지표 링크 존재");
  });

  it("AC4(c) — href 는 props.href / props.*Href 에서만 (JSX props auto-escape)", () => {
    // href 는 JSX attribute = {item.href} / {props.*Href} 패턴만 허용.
    // 문자열 template literal ${...}/href escape 직접 호출 없음.
    assert.doesNotMatch(src, /escapeHtml.*href|href.*escapeHtml/, "href 에 escapeHtml 직접 호출 없음");
  });

  // ─── AC4(e): PII/log import 0 ───────────────────────────────────────────

  it("AC4(e) — console import 없음 (PII no-log)", () => {
    // console.log/warn/error 직접 호출 없음
    assert.doesNotMatch(src, /console\.(log|warn|error|debug|info)/, "console 호출 없음");
  });

  it("AC4(e) — Datadog / RUM import 없음 (PII 경계)", () => {
    assert.doesNotMatch(src, /datadog|datadogRum|trackRum|from ["'].*observability/, "Datadog import 없음");
  });

  // ─── AC5: data-action markup structure ─────────────────────────────────

  it("AC5 — data-action='sidebar-term-toggle' markup-only 존재", () => {
    assert.match(src, /data-action="sidebar-term-toggle"/, "sidebar-term-toggle data-action 존재");
  });

  it("AC5 — data-term-id attribute 존재 (toggle delegation id)", () => {
    assert.match(src, /data-term-id=/, "data-term-id attribute 존재");
  });

  // ─── 구조 확인 ──────────────────────────────────────────────────────────

  it("SidebarView function export 존재", () => {
    assert.match(src, /export function SidebarView/, "SidebarView export");
  });

  it("<aside class='sidebar'> 렌더 (slot placeholder 와 분리)", () => {
    // SidebarView 가 <aside className="sidebar"> 를 렌더함.
    // SIDEBAR_PLACEHOLDER 는 <div id=sidebar-island> (composeShell 책임).
    assert.match(src, /className="sidebar"/, "className=sidebar 존재");
    assert.match(src, /aria-label/, "aria-label 존재");
  });

  it("variant home / subject 분기 존재", () => {
    assert.match(src, /variant.*home/, "home variant 분기");
    assert.match(src, /variant.*subject/, "subject variant 분기");
  });

  it("<details open={...}> props-derived plain boolean (uncontrolled-style)", () => {
    assert.match(src, /open=\{.*isOpen.*\}|open=\{.*intakeDetails\.isOpen.*\}/, "open prop derived from props");
  });

  it("수업 일정 schedule-details 존재", () => {
    assert.match(src, /schedule-details/, "schedule-details class 존재");
    assert.match(src, /수업 일정/, "수업 일정 텍스트 존재");
  });

  it("depth nav aria-label parity (sidebar.ts:97 — '<title> 하위 화면')", () => {
    // old renderCurrentSubjectDepthNav 의 <div class="subject-sidebar-depth"
    // aria-label="${title} 하위 화면"> 를 보존해야 함 (AC2 parity).
    assert.match(src, /subject-sidebar-depth/, "subject-sidebar-depth div 존재");
    assert.match(src, /하위 화면/, "depth nav aria-label '하위 화면' 보존");
  });

  it("자료 관리 sidebar-details 존재", () => {
    assert.match(src, /sidebar-details/, "sidebar-details class 존재");
    assert.match(src, /자료 관리/, "자료 관리 텍스트 존재");
  });

  it("wordmark 존재 (study-note 링크)", () => {
    assert.match(src, /wordmark/, "wordmark class 존재");
    assert.match(src, /study-note/, "study-note 워드마크 텍스트 존재");
  });

  it("sidebar-group--admin CSS class 존재 (admin block)", () => {
    assert.match(src, /sidebar-group--admin/, "sidebar-group--admin class 존재");
  });

  it("🛡️ 관리자 텍스트 존재 (admin block label)", () => {
    assert.match(src, /🛡️ 관리자/, "관리자 label 존재");
  });
});
