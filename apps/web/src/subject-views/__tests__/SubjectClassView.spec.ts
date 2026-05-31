// S4b-2 SubjectClassView 정적 소스 검증 spec (render 없음 — node:test 전용).
//
// AC2 parity: pure-props leaf — dispatcher/form control name/data-action 전수.
// AC4: 전 input uncontrolled (defaultValue/defaultChecked). controlled value/checked 금지.
// AC5: dangerouslySetInnerHTML 0 + escapeHtml 미사용(JSX auto-escape).
// INV: hook 구독 0, data-action 위임, onClick handler 없음.
// AC6: console/RUM/datadog import 0.
//
// 실행:
//   node --experimental-strip-types --no-warnings --test \
//     apps/web/src/subject-views/__tests__/SubjectClassView.spec.ts

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const src = readFileSync(new URL("../SubjectClassView.tsx", import.meta.url), "utf8");

describe("SubjectClassView 정적 소스 검증", () => {
  // ─── AC1/INV: pure-props ───────────────────────────────────────────────────

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

  it("SubjectClassViewProps export 존재", () => {
    assert.match(src, /export interface SubjectClassViewProps/);
  });

  it("SubjectClassView function export 존재", () => {
    assert.match(src, /export function SubjectClassView/);
  });

  it("INV — onClick handler 없음 (data-action 위임)", () => {
    assert.doesNotMatch(src, /onClick\s*=/);
  });

  // ─── AC4: uncontrolled inputs ─────────────────────────────────────────────

  it("AC4 — hidden subjectId: defaultValue 사용 (uncontrolled)", () => {
    assert.match(src, /defaultValue=\{subjectId\}/, "hidden subjectId defaultValue 사용");
  });

  it("AC4 — radio input: defaultChecked 사용 (uncontrolled)", () => {
    assert.match(src, /defaultChecked=\{opt\.checked\}/, "radio defaultChecked prop 사용");
  });

  it("AC4 — controlled value= 금지 (select/textarea controlled value= 없음, radio value attr 제외)", () => {
    // select/textarea 에서 controlled value={...} 금지.
    // radio input 의 value={opt.value} 는 form submission value attribute (비제어 정상).
    // text/date/hidden input 에서 value={...} 제어 패턴 금지.
    assert.doesNotMatch(src, /<select[^>]*\bvalue=\{[^}]+\}/s, "select controlled value= 금지");
    assert.doesNotMatch(src, /<textarea[^>]*\bvalue=\{[^}]+\}/s, "textarea controlled value= 금지");
    // text/date/hidden input controlled value (onChange 없이 단독으로 controlled 불가 — onChange 패턴 검사)
    assert.doesNotMatch(src, /onChange\s*=\s*\{/, "onChange= 없음 (controlled state 패턴 금지)");
  });

  it("AC4 — controlled checked= 금지 (input에 checked={...} 없음)", () => {
    // checked=\{...\} 패턴 — defaultChecked 는 허용.
    assert.doesNotMatch(src, /(?<!default)checked=\{/, "checked= controlled 금지 (defaultChecked 제외)");
  });

  // ─── AC2 parity: data-action dispatch-half ─────────────────────────────────

  it("AC2 parity — data-action='add-class-date' form 존재", () => {
    assert.match(src, /data-action="add-class-date"/);
  });

  it("AC2 parity — hidden input name='subjectId' 존재 (FormData read key)", () => {
    assert.match(src, /name="subjectId"/);
  });

  it("AC2 parity — input name='classDate' 존재", () => {
    assert.match(src, /name="classDate"/);
  });

  it("AC2 parity — input name='title' 존재", () => {
    assert.match(src, /name="title"/);
  });

  it("AC2 parity — data-action='attach-pdf-to-week' form 존재", () => {
    assert.match(src, /data-action="attach-pdf-to-week"/);
  });

  it("AC2 parity — select name='materialId' 존재 (attach form)", () => {
    assert.match(src, /name="materialId"/);
  });

  it("AC2 parity — data-action='open-pdf-material' 버튼 존재", () => {
    assert.match(src, /data-action="open-pdf-material"/);
  });

  it("AC2 parity — data-action='import-pdf-material' input 존재 (upload card)", () => {
    assert.match(src, /data-action="import-pdf-material"/);
  });

  it("AC2 parity — data-action='assign-pdf-class-date' 버튼 존재", () => {
    assert.match(src, /data-action="assign-pdf-class-date"/);
  });

  it("AC2 parity — data-action='preview-pdf-class-date' radio input 존재", () => {
    assert.match(src, /data-action="preview-pdf-class-date"/);
  });

  it("AC2 parity — data-role='pdf-class-date-picker' 존재", () => {
    assert.match(src, /data-role="pdf-class-date-picker"/);
  });

  it("AC2 parity — data-role='pdf-class-date-current' 존재", () => {
    assert.match(src, /data-role="pdf-class-date-current"/);
  });

  it("AC2 parity — data-role='pdf-class-date-option' 존재 (radio)", () => {
    assert.match(src, /data-role="pdf-class-date-option"/);
  });

  it("AC2 parity — data-action='retry-pdf-upload' 버튼 존재 (intake feedback error)", () => {
    assert.match(src, /data-action="retry-pdf-upload"/);
  });

  it("AC2 parity — data-subject-id prop 존재 (attach form + open-pdf + assign-class-date)", () => {
    assert.match(src, /data-subject-id=/);
  });

  it("AC2 parity — data-material-id prop 존재 (open-pdf + assign-class-date)", () => {
    assert.match(src, /data-material-id=/);
  });

  it("AC2 parity — data-week-label prop 존재 (attach-pdf-to-week)", () => {
    assert.match(src, /data-week-label=/);
  });

  // ─── AC2 parity: render-half 구조 ────────────────────────────────────────

  it("AC2 parity — subject-page-hero section 존재", () => {
    assert.match(src, /subject-page-hero/);
  });

  it("AC2 parity — subject-unit-grid section 존재 (4 unit card)", () => {
    assert.match(src, /subject-unit-grid/);
    assert.match(src, /subject-unit-card/);
  });

  it("AC2 parity — class-date-add-section 존재", () => {
    assert.match(src, /class-date-add-section/);
  });

  it("AC2 parity — class-day-grid 존재 (weekly section)", () => {
    assert.match(src, /class-day-grid/);
  });

  it("AC2 parity — class-day-card article 존재", () => {
    assert.match(src, /class-day-card/);
  });

  it("AC2 parity — pdf-material-browser section 존재 (assignment)", () => {
    assert.match(src, /pdf-material-browser/);
  });

  it("AC2 parity — pdf-material-card article 존재 (assignment cards)", () => {
    assert.match(src, /pdf-material-card/);
  });

  it("AC2 parity — pdf-upload-card article 존재 (upload card)", () => {
    assert.match(src, /pdf-upload-card/);
  });

  it("AC2 parity — pdf-material-card__class-date-picker details 존재", () => {
    assert.match(src, /pdf-material-card__class-date-picker/);
  });

  it("AC2 parity — is-readonly class 존재 (upload card readonly 분기)", () => {
    assert.match(src, /is-readonly/);
  });

  it("AC2 parity — is-disabled class 존재 (class-date option disabled)", () => {
    assert.match(src, /is-disabled/);
  });

  // ─── AC4: stable key ─────────────────────────────────────────────────────

  it("AC4 stable key — ClassDayCard key=card.weekId 존재", () => {
    assert.match(src, /key=\{card\.weekId\}/, "ClassDayCard key=weekId 존재");
  });

  it("AC4 stable key — PdfMaterialCard key=material.materialKey 존재", () => {
    assert.match(src, /key=\{material\.materialKey\}/, "PdfMaterialCard key=materialKey 존재");
  });

  it("AC4 stable key — class-date option key 가 opt.value+checked 포함(remount on select change)", () => {
    // codex P2 fix: key 에 opt.value + opt.checked → 같은 카드(materialKey) 재렌더 시
    // selectedValue 변경되면 영향 radio remount → defaultChecked 재적용(uncontrolled
    // radio defaultChecked 가 update 시 무시되는 React 동작 보정, old morphdom parity).
    assert.match(src, /key=\{`\$\{opt\.value\}:\$\{opt\.checked\}`\}/, "class-date option key = value+checked");
  });

  // ─── AC5/AC6: security ───────────────────────────────────────────────────

  it("AC5 — console/RUM/datadog import 0", () => {
    assert.doesNotMatch(src, /import.*console/);
    assert.doesNotMatch(src, /import.*datadog/);
    assert.doesNotMatch(src, /import.*rum/i);
  });

  it("AC5 — disabled select/button when !canManage 패턴 존재", () => {
    assert.match(src, /disabled/, "disabled attribute 존재 (canManage false 분기)");
  });
});
