// S4c uiStore pdf-workspaces loop-immunity spec — pdfWorkspacesProps setter 의 JSON-key
// value-equal guard 가 동일-값 재발행 시 setState skip → zustand ref 유지를 검증.
//
// setPdfWorkspacesProps 에 대해:
//   1. 동일-값 재발행 → setState skip → getter ref 불변 확인.
//   2. 값 변경 시 신규 ref 반환.
//   3. null → props 전환 (guard bypass, 항상 setState).
//   4. props → null 전환 (항상 setState).
//   5. totalMaterials 변경 → 신규 ref.
//   6. 동일 props 2회 set → 1회만 publish (background renderApp 시뮬레이션).
//
// 실행:
//   node --experimental-strip-types --no-warnings --test \
//     apps/web/src/stores/__tests__/uiStore-s4c-loop-immunity.spec.ts

import assert from "node:assert/strict";
import { describe, test, beforeEach } from "node:test";

import {
  setPdfWorkspacesProps,
  getPdfWorkspacesProps,
  setPdfWorkspacesSlot,
  getPdfWorkspacesSlot,
} from "../uiStore.ts";
import type { PdfWorkspacesViewProps } from "../../subject-views/PdfWorkspacesView.tsx";

// ─── fixture ────────────────────────────────────────────────────────────────

const makeProps = (overrides?: Partial<PdfWorkspacesViewProps>): PdfWorkspacesViewProps => ({
  summary: {
    totalMaterials: 3,
    activeSubjects: 2,
    totalSubjects: 4,
  },
  subjects: [
    {
      subjectId: "digital-engineering",
      title: "디지털공학개론",
      examLabel: "기말고사",
      weekRange: "4월 30일(목)-6월 13일(토)",
      materialCount: 2,
      uploadCard: {
        isReadonly: true,
        subjectTitle: "디지털공학개론",
        subjectId: "digital-engineering",
        materialCount: 2,
        readonlyHref: "#/subjects/digital-engineering/pdf-workspace",
        inputId: "pdf-library-upload-digital-engineering",
      },
      materials: [
        {
          materialKey: "mat-001",
          fileName: "lecture01.pdf",
          fileSize: "1.2 MB",
          pageCount: 20,
          statusLabel: "공유 가능",
          ownerLabel: "공유 자료",
          classDateLabel: "2025-04-30",
          classDateIsUnconfirmed: false,
        },
      ],
    },
  ],
  ...overrides,
});

// ─── 리셋 헬퍼 ──────────────────────────────────────────────────────────────

function resetProps(): void {
  setPdfWorkspacesProps(null);
}

// ─── tests ──────────────────────────────────────────────────────────────────

describe("uiStore S4c — pdfWorkspacesProps loop-immunity (JSON-key value-equal guard)", () => {
  beforeEach(() => {
    resetProps();
  });

  test("동일-값 재발행 → setState skip → getter ref 불변", () => {
    const props = makeProps();
    setPdfWorkspacesProps(props);
    const ref1 = getPdfWorkspacesProps();

    // 동일 직렬화 값으로 재발행 (새 object ref)
    setPdfWorkspacesProps(makeProps());
    const ref2 = getPdfWorkspacesProps();

    assert.strictEqual(ref1, ref2, "value-equal 재발행 → 동일 ref (setState skip)");
  });

  test("totalMaterials 변경 → 신규 ref", () => {
    setPdfWorkspacesProps(makeProps({ summary: { totalMaterials: 3, activeSubjects: 2, totalSubjects: 4 } }));
    const ref1 = getPdfWorkspacesProps();

    setPdfWorkspacesProps(makeProps({ summary: { totalMaterials: 5, activeSubjects: 2, totalSubjects: 4 } }));
    const ref2 = getPdfWorkspacesProps();

    assert.notStrictEqual(ref1, ref2, "값 변경 → 신규 ref");
    assert.equal(ref2?.summary.totalMaterials, 5);
  });

  test("null → props 전환 → 항상 setState", () => {
    // null 상태에서 props 발행 (guard bypass: current === null)
    setPdfWorkspacesProps(makeProps());
    assert.ok(getPdfWorkspacesProps() !== null, "null→props 전환 성공");
  });

  test("props → null 전환 → 항상 setState", () => {
    setPdfWorkspacesProps(makeProps());
    setPdfWorkspacesProps(null);
    assert.equal(getPdfWorkspacesProps(), null, "props→null 전환 성공");
  });

  test("동일 props 2회 set → 1회만 publish (background renderApp 시뮬레이션)", () => {
    // background renderApp → setPdfWorkspacesProps 동일값 → 재발행 skip → React 재렌더 없음.
    const props = makeProps();
    setPdfWorkspacesProps(props);
    const ref1 = getPdfWorkspacesProps();

    // 동일 값 재발행 (renderApp 재호출 경로)
    setPdfWorkspacesProps(makeProps());
    const ref2 = getPdfWorkspacesProps();

    assert.strictEqual(ref1, ref2, "동일값 재발행 → 재렌더 차단 (loop-immunity)");
  });

  test("activeSubjects 변경 → 신규 ref (route 이탈 후 재진입 시)", () => {
    setPdfWorkspacesProps(makeProps({ summary: { totalMaterials: 3, activeSubjects: 2, totalSubjects: 4 } }));
    const ref1 = getPdfWorkspacesProps();

    setPdfWorkspacesProps(makeProps({ summary: { totalMaterials: 3, activeSubjects: 3, totalSubjects: 4 } }));
    const ref2 = getPdfWorkspacesProps();

    assert.notStrictEqual(ref1, ref2, "activeSubjects 변경 → 신규 ref");
    assert.equal(ref2?.summary.activeSubjects, 3);
  });
});

describe("uiStore S4c — pdfWorkspacesSlot set/clear", () => {
  beforeEach(() => {
    setPdfWorkspacesSlot(null);
  });

  test("slot set → getter 반환", () => {
    // HTMLElement 는 브라우저 전용 — null 이 아닌 객체로 대체 확인
    const fakeEl = {} as HTMLElement;
    setPdfWorkspacesSlot(fakeEl);
    assert.strictEqual(getPdfWorkspacesSlot(), fakeEl, "slot set → getter 반환");
  });

  test("slot null set → getter null", () => {
    setPdfWorkspacesSlot(null);
    assert.equal(getPdfWorkspacesSlot(), null, "slot null → getter null");
  });
});
