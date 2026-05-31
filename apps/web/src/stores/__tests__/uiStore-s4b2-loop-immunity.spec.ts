// S4b-2 uiStore subject-class loop-immunity spec — subjectClassProps setter 의 JSON-key
// value-equal guard 가 동일-값 재발행 시 setState skip → zustand ref 유지를 검증.
//
// setSubjectClassProps 에 대해:
//   1. 동일-값 재발행 → setState skip → getter ref 불변 확인.
//   2. 값 변경 시 신규 ref 반환.
//   3. null → props 전환 (guard bypass, 항상 setState).
//   4. props → null 전환 (항상 setState).
//   5. subjectId 변경 → 신규 ref (route 전환 시).
//
// 실행:
//   node --experimental-strip-types --no-warnings --test \
//     apps/web/src/stores/__tests__/uiStore-s4b2-loop-immunity.spec.ts

import assert from "node:assert/strict";
import { describe, test, beforeEach } from "node:test";

import {
  setSubjectClassProps,
  getSubjectClassProps,
} from "../uiStore.ts";
import type { SubjectClassViewProps } from "../../subject-views/SubjectClassView.tsx";

// ─── fixture ────────────────────────────────────────────────────────────────

const makeSubjectClassProps = (overrides?: Partial<SubjectClassViewProps>): SubjectClassViewProps => ({
  subjectId: "digital-engineering",
  subjectTitle: "디지털공학개론",
  examLabel: "중간고사",
  weekRange: "1~7주차",
  classPath: "#/subjects/digital-engineering/class",
  summaryPath: "#/subjects/digital-engineering/summaries",
  memorizePath: "#/subjects/digital-engineering/memorize",
  pdfWorkspacePath: "#/subjects/digital-engineering/pdf-workspace",
  weekCount: 3,
  materialCount: 0,
  intakeFeedback: null,
  intakeFeedbackEmptyText: "수업일 추가와 PDF 매핑 상태가 여기에 표시됩니다.",
  classDayCards: [],
  uploadCard: {
    isReadonly: false,
    subjectTitle: "디지털공학개론",
    subjectId: "digital-engineering",
    materialCount: 0,
    readonlyHref: "#/subjects/digital-engineering/pdf-workspace",
    inputId: "pdf-library-upload-digital-engineering",
  },
  materials: [],
  ...overrides,
});

// ─── 리셋 헬퍼 ──────────────────────────────────────────────────────────────

function resetSubjectClassProps(): void {
  setSubjectClassProps(null);
}

// ─── tests ──────────────────────────────────────────────────────────────────

describe("uiStore S4b-2 — subjectClassProps loop-immunity (JSON-key value-equal guard)", () => {
  beforeEach(() => {
    resetSubjectClassProps();
  });

  test("동일-값 재발행 → setState skip → getter ref 불변", () => {
    const props = makeSubjectClassProps();
    setSubjectClassProps(props);
    const ref1 = getSubjectClassProps();

    // 동일 직렬화 값으로 재발행 (새 object ref)
    setSubjectClassProps(makeSubjectClassProps());
    const ref2 = getSubjectClassProps();

    assert.strictEqual(ref1, ref2, "value-equal 재발행 → 동일 ref (setState skip)");
  });

  test("weekCount 변경 → 신규 ref", () => {
    setSubjectClassProps(makeSubjectClassProps({ weekCount: 3 }));
    const ref1 = getSubjectClassProps();

    setSubjectClassProps(makeSubjectClassProps({ weekCount: 5 }));
    const ref2 = getSubjectClassProps();

    assert.notStrictEqual(ref1, ref2, "값 변경 → 신규 ref");
    assert.equal(ref2?.weekCount, 5);
  });

  test("subjectId 변경(route 전환) → 신규 ref", () => {
    setSubjectClassProps(makeSubjectClassProps({ subjectId: "digital-engineering" }));
    const ref1 = getSubjectClassProps();

    setSubjectClassProps(makeSubjectClassProps({ subjectId: "mathematics" }));
    const ref2 = getSubjectClassProps();

    assert.notStrictEqual(ref1, ref2, "subjectId 변경 → 신규 ref");
    assert.equal(ref2?.subjectId, "mathematics");
  });

  test("null → props 전환 → 항상 setState", () => {
    // null 상태에서 props 발행 (guard bypass: current === null)
    setSubjectClassProps(makeSubjectClassProps());
    assert.ok(getSubjectClassProps() !== null, "null→props 전환 성공");
  });

  test("props → null 전환 → 항상 setState", () => {
    setSubjectClassProps(makeSubjectClassProps());
    setSubjectClassProps(null);
    assert.equal(getSubjectClassProps(), null, "props→null 전환 성공");
  });

  test("동일 props 2회 set → 1회만 publish (background renderApp 시뮬레이션)", () => {
    // background renderApp → setSubjectClassProps 동일값 → 재발행 skip → React 재렌더 없음.
    const props = makeSubjectClassProps();
    setSubjectClassProps(props);
    const ref1 = getSubjectClassProps();

    // 동일 값 재발행 (renderApp 재호출 경로)
    setSubjectClassProps(makeSubjectClassProps());
    const ref2 = getSubjectClassProps();

    assert.strictEqual(ref1, ref2, "동일값 재발행 → 재렌더 차단 (loop-immunity)");
  });

  test("intakeFeedback 변경 → 신규 ref (수업일 추가 결과)", () => {
    setSubjectClassProps(makeSubjectClassProps({ intakeFeedback: null }));
    const ref1 = getSubjectClassProps();

    setSubjectClassProps(makeSubjectClassProps({
      intakeFeedback: {
        kind: "info",
        title: "수업일 추가 완료",
        detail: "2025-03-05 수업일이 추가됐습니다.",
        href: null,
        retrySubjectId: null,
        hasPendingRetry: false,
      }
    }));
    const ref2 = getSubjectClassProps();

    assert.notStrictEqual(ref1, ref2, "intakeFeedback 변경 → 신규 ref");
    assert.ok(ref2?.intakeFeedback !== null);
  });
});
