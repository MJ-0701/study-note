// S4b-1 uiStore week loop-immunity spec — weekProps setter 의 JSON-key
// value-equal guard 가 동일-값 재발행 시 setState skip → zustand ref 유지를 검증.
//
// setWeekProps 에 대해:
//   1. 동일-값 재발행 → setState skip → getter ref 불변 확인.
//   2. 값 변경 시 신규 ref 반환.
//   3. null → props 전환 (guard bypass, 항상 setState).
//   4. props → null 전환 (항상 setState).
//   5. userNotes 변경(fetchUserNoteIfMissing 완료) → 신규 ref 반환.
//
// 실행:
//   node --experimental-strip-types --no-warnings --test \
//     apps/web/src/stores/__tests__/uiStore-s4b1-week-loop-immunity.spec.ts

import assert from "node:assert/strict";
import { describe, test, beforeEach } from "node:test";

import {
  setWeekProps,
  getWeekProps,
} from "../uiStore.ts";
import type { WeekViewProps } from "../../subject-views/WeekView.tsx";

// ─── fixture ────────────────────────────────────────────────────────────────

const makeWeekProps = (overrides?: Partial<WeekViewProps>): WeekViewProps => ({
  subjectId: "sub1",
  subjectTitle: "디지털공학개론",
  weekId: "de-week-08",
  weekLabel: "2025-05-07",
  weekTitle: "진법과 코드",
  weekFocus: "진법 변환 계산 절차를 반복한다.",
  reviewStatusLabel: "읽기 가능",
  classPath: "#/subjects/sub1/class",
  keywordLabels: ["2진법", "8진법"],
  conceptTitles: ["진법 변환"],
  sourceTitles: [],
  concepts: [],
  questions: [],
  userNotes: "",
  userNotesToken: "",
  materials: [],
  quickNote: null,
  ...overrides,
});

// ─── 리셋 헬퍼 ──────────────────────────────────────────────────────────────

function resetWeekProps(): void {
  setWeekProps(null);
}

// ─── tests ──────────────────────────────────────────────────────────────────

describe("uiStore S4b-1 — weekProps loop-immunity (JSON-key value-equal guard)", () => {
  beforeEach(() => {
    resetWeekProps();
  });

  test("동일-값 재발행 → setState skip → getter ref 불변", () => {
    const props = makeWeekProps();
    setWeekProps(props);
    const ref1 = getWeekProps();

    // 동일 직렬화 값으로 재발행 (새 object ref)
    setWeekProps(makeWeekProps());
    const ref2 = getWeekProps();

    assert.strictEqual(ref1, ref2, "value-equal 재발행 → 동일 ref (setState skip)");
  });

  test("weekTitle 변경 → 신규 ref", () => {
    setWeekProps(makeWeekProps({ weekTitle: "진법과 코드" }));
    const ref1 = getWeekProps();

    setWeekProps(makeWeekProps({ weekTitle: "부울대수" }));
    const ref2 = getWeekProps();

    assert.notStrictEqual(ref1, ref2, "값 변경 → 신규 ref");
    assert.equal(ref2?.weekTitle, "부울대수");
  });

  test("userNotes 변경(fetchUserNoteIfMissing 완료) → 신규 ref", () => {
    setWeekProps(makeWeekProps({ userNotes: "", userNotesToken: "" }));
    const ref1 = getWeekProps();

    // fetchUserNoteIfMissing 완료 후 renderApp → 업데이트된 userNotes
    setWeekProps(makeWeekProps({ userNotes: "강의 메모 내용", userNotesToken: "강의 메모 내용" }));
    const ref2 = getWeekProps();

    assert.notStrictEqual(ref1, ref2, "userNotes 변경 → 신규 ref (defaultValue 재적용 트리거)");
    assert.equal(ref2?.userNotes, "강의 메모 내용");
  });

  test("null → props 전환 → 항상 setState", () => {
    // null 상태에서 props 발행 (guard bypass: current === null)
    setWeekProps(makeWeekProps());
    assert.ok(getWeekProps() !== null, "null→props 전환 성공");
  });

  test("props → null 전환 → 항상 setState", () => {
    setWeekProps(makeWeekProps());
    setWeekProps(null);
    assert.equal(getWeekProps(), null, "props→null 전환 성공");
  });

  test("동일 userNotes 재발행 → ref 불변 (타이핑 중 renderApp 미호출 시뮬레이션)", () => {
    const note = "강의 메모";
    setWeekProps(makeWeekProps({ userNotes: note, userNotesToken: note }));
    const ref1 = getWeekProps();

    // 타이핑 후 동일 값으로 재발행 (renderApp 재호출 없음 → 실제로는 발생 안함, guard 검증)
    setWeekProps(makeWeekProps({ userNotes: note, userNotesToken: note }));
    const ref2 = getWeekProps();

    assert.strictEqual(ref1, ref2, "동일 userNotes → 재렌더 차단 (루프 방지)");
  });
});
