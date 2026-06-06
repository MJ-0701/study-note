// S4a uiStore loop-immunity spec — S4a subject view props setter 의 JSON-key
// value-equal guard 가 동일-값 재발행 시 setState skip → zustand ref 유지를 검증.
//
// 각 setter (setSubjectSummariesProps / setSubjectSummaryDetailProps /
// setSubjectMcpProps / setSubjectMemorizeProps) 에 대해:
//   1. 동일-값 재발행 → setState skip → getter ref 불변 확인.
//   2. 값 변경 시 신규 ref 반환.
//   3. null → props 전환 (guard bypass, 항상 setState).
//   4. props → null 전환 (항상 setState).
//
// 실행:
//   node --experimental-strip-types --no-warnings --test \
//     apps/web/src/stores/__tests__/uiStore-s4a-loop-immunity.spec.ts

import assert from "node:assert/strict";
import { describe, test, beforeEach } from "node:test";

import {
  uiStore,
  setSubjectSummariesProps,
  getSubjectSummariesProps,
  setSubjectSummaryDetailProps,
  getSubjectSummaryDetailProps,
  setSubjectMcpProps,
  getSubjectMcpProps,
  setSubjectMemorizeProps,
  getSubjectMemorizeProps,
} from "../uiStore.ts";
import type { SubjectSummariesViewProps } from "../../subject-views/SubjectSummariesView.tsx";
import type { SubjectSummaryDetailViewProps } from "../../subject-views/SubjectSummaryDetailView.tsx";
import type { SubjectMcpViewProps } from "../../subject-views/SubjectMcpView.tsx";
import type { SubjectMemorizeViewProps } from "../../subject-views/SubjectMemorizeView.tsx";

// ─── fixtures ────────────────────────────────────────────────────────────────

const makeSummariesProps = (title = "수학"): SubjectSummariesViewProps => ({
  subjectId: "s1",
  subjectTitle: title,
  examLabel: "기말고사",
  weekRange: "5~8주",
  classPath: "#/subjects/s1/class",
  memorizePath: "#/subjects/s1/memorize",
  coverageRate: 80,
  covered: 8,
  total: 10,
  weekCount: 3,
  examScope: "5~8주 전범위",
  examLabelShort: "기말고사",
  strategy: "키워드 중심 복습",
  weakSpots: "약점 A",
  days: [],
});

const makeSummaryDetailProps = (title = "1주차"): SubjectSummaryDetailViewProps => ({
  subjectId: "s1",
  subjectTitle: "수학",
  weekId: "w1",
  weekLabel: "5월 9일",
  weekTitle: title,
  weekFocus: "핵심 내용",
  classPath: "#/subjects/s1/weeks/w1",
  summaryListPath: "#/subjects/s1/summaries",
  keywords: [],
  concepts: [],
  questions: [],
  sources: [],
  quickNote: null,
});

const makeMcpProps = (nick = "수학이"): SubjectMcpViewProps => ({
  subjectId: "s1",
  subjectTitle: "수학",
  examLabel: "기말고사",
  weekRange: "5~8주",
  summaryPath: "#/subjects/s1/summaries",
  personaCallHref: null,
  persona: { nick, active: false },
  weakSpots: "약점 A",
  keywordsLabel: "키워드1, 키워드2",
  questions: [],
});

const makeMemorizeProps = (scope = "5~8주"): SubjectMemorizeViewProps => ({
  subjectId: "s1",
  subjectTitle: "수학",
  examLabel: "기말고사",
  summaryPath: "#/subjects/s1/summaries",
  mcpPath: "#/subjects/s1/mcp",
  examScope: scope,
  strategy: "키워드 중심",
  weakSpots: "약점 A",
  examChapters: [],
  midtermGroup: { title: "중간고사", weeks: [] },
  finalGroup: { title: "기말고사", weeks: [] },
  mustKnowConcepts: [],
  keywords: [],
  examQuestions: [],
});

// ─── 리셋 헬퍼 ──────────────────────────────────────────────────────────────

function resetS4aProps(): void {
  setSubjectSummariesProps(null);
  setSubjectSummaryDetailProps(null);
  setSubjectMcpProps(null);
  setSubjectMemorizeProps(null);
}

// ─── tests ──────────────────────────────────────────────────────────────────

describe("uiStore S4a — loop-immunity (JSON-key value-equal guard)", () => {
  beforeEach(() => {
    resetS4aProps();
  });

  describe("setSubjectSummariesProps", () => {
    test("동일-값 재발행 → setState skip → getter ref 불변", () => {
      const props = makeSummariesProps();
      setSubjectSummariesProps(props);
      const ref1 = getSubjectSummariesProps();

      // 동일 직렬화 값으로 재발행
      setSubjectSummariesProps(makeSummariesProps());
      const ref2 = getSubjectSummariesProps();

      assert.strictEqual(ref1, ref2, "value-equal 재발행 → 동일 ref (setState skip)");
    });

    test("값 변경 시 신규 ref 반환", () => {
      setSubjectSummariesProps(makeSummariesProps("수학"));
      const ref1 = getSubjectSummariesProps();

      setSubjectSummariesProps(makeSummariesProps("물리"));
      const ref2 = getSubjectSummariesProps();

      assert.notStrictEqual(ref1, ref2, "값 변경 → 신규 ref");
      assert.equal(ref2?.subjectTitle, "물리");
    });

    test("null → props 전환 → 항상 setState", () => {
      // null 상태에서 props 발행 (guard bypass: current === null)
      setSubjectSummariesProps(makeSummariesProps());
      assert.ok(getSubjectSummariesProps() !== null, "null→props 전환 성공");
    });

    test("props → null 전환 → 항상 setState", () => {
      setSubjectSummariesProps(makeSummariesProps());
      setSubjectSummariesProps(null);
      assert.equal(getSubjectSummariesProps(), null, "props→null 전환 성공");
    });
  });

  describe("setSubjectSummaryDetailProps", () => {
    test("동일-값 재발행 → getter ref 불변", () => {
      setSubjectSummaryDetailProps(makeSummaryDetailProps());
      const ref1 = getSubjectSummaryDetailProps();
      setSubjectSummaryDetailProps(makeSummaryDetailProps());
      const ref2 = getSubjectSummaryDetailProps();
      assert.strictEqual(ref1, ref2, "value-equal 재발행 → 동일 ref");
    });

    test("weekTitle 변경 → 신규 ref", () => {
      setSubjectSummaryDetailProps(makeSummaryDetailProps("1주차"));
      const ref1 = getSubjectSummaryDetailProps();
      setSubjectSummaryDetailProps(makeSummaryDetailProps("2주차"));
      const ref2 = getSubjectSummaryDetailProps();
      assert.notStrictEqual(ref1, ref2);
    });
  });

  describe("setSubjectMcpProps", () => {
    test("동일-값 재발행 → getter ref 불변", () => {
      setSubjectMcpProps(makeMcpProps());
      const ref1 = getSubjectMcpProps();
      setSubjectMcpProps(makeMcpProps());
      const ref2 = getSubjectMcpProps();
      assert.strictEqual(ref1, ref2, "value-equal 재발행 → 동일 ref");
    });

    test("persona.nick 변경 → 신규 ref", () => {
      setSubjectMcpProps(makeMcpProps("수학이"));
      const ref1 = getSubjectMcpProps();
      setSubjectMcpProps(makeMcpProps("물리이"));
      const ref2 = getSubjectMcpProps();
      assert.notStrictEqual(ref1, ref2);
      assert.equal(ref2?.persona?.nick, "물리이");
    });
  });

  describe("setSubjectMemorizeProps", () => {
    test("동일-값 재발행 → getter ref 불변", () => {
      setSubjectMemorizeProps(makeMemorizeProps());
      const ref1 = getSubjectMemorizeProps();
      setSubjectMemorizeProps(makeMemorizeProps());
      const ref2 = getSubjectMemorizeProps();
      assert.strictEqual(ref1, ref2, "value-equal 재발행 → 동일 ref");
    });

    test("examScope 변경 → 신규 ref", () => {
      setSubjectMemorizeProps(makeMemorizeProps("5~8주"));
      const ref1 = getSubjectMemorizeProps();
      setSubjectMemorizeProps(makeMemorizeProps("1~8주"));
      const ref2 = getSubjectMemorizeProps();
      assert.notStrictEqual(ref1, ref2);
      assert.equal(ref2?.examScope, "1~8주");
    });
  });
});
