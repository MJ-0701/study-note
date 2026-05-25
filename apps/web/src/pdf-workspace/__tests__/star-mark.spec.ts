/**
 * star-mark.spec.ts — sprint-2026-W22-sprint-3 / layer B/slice-2e AC3+AC4.
 *
 * star-mark.ts 의 6 function + 5 const characterization.
 * id format / clamp / cycle / HEX fallback / HTML escape 4 / numeric finite
 * guard / state mutate 를 spec assertion 으로 잠근다.
 *
 * 실행:
 *   node --experimental-strip-types --no-warnings --test \
 *     apps/web/src/pdf-workspace/__tests__/star-mark.spec.ts
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  addStarMark,
  cycleStarMarkSize,
  DEFAULT_STAR_MARK_SIZE_RATIO,
  makeStarMarkId,
  removeStarMark,
  renderStarMark,
  resizeStarMark,
  STAR_MARK_COLOR_DEFAULT,
  STAR_MARK_SIZE_CYCLE,
  STAR_MARK_SIZE_MAX,
  STAR_MARK_SIZE_MIN,
  type StarMarkCallbacks,
  type StarMarkContext
} from "../star-mark.ts";
import type { PdfStarMark, SubjectPdfWorkspace } from "@study-note/domain";

// ─── Workspace fixture + Callbacks recorder ─────────────────────────────

function makeWorkspace(overrides: Partial<SubjectPdfWorkspace> = {}): SubjectPdfWorkspace {
  return {
    subjectId: "subject-1",
    material: { selectedPage: 3 } as SubjectPdfWorkspace["material"],
    stickyNotes: [],
    inkStrokes: [],
    eraserShape: "circle",
    eraserSize: 16,
    textBoxes: [],
    checklists: [],
    tables: [],
    charts: [],
    starMarks: [],
    updatedAt: "2026-05-25T00:00:00.000Z",
    ...overrides
  } as SubjectPdfWorkspace;
}

function makeCallbacks() {
  let current = makeWorkspace();
  const cb: StarMarkCallbacks = {
    updateWorkspace(subjectId, updater) {
      assert.equal(subjectId, "subject-1");
      current = updater(current);
    }
  };
  const ctx: StarMarkContext = {
    getWorkspace: () => current
  };
  return {
    ctx,
    callbacks: cb,
    snapshot: () => current,
    seed(starMarks: PdfStarMark[]) {
      current = { ...current, starMarks } as SubjectPdfWorkspace;
    }
  };
}

function fakeStarMark(overrides: Partial<PdfStarMark> = {}): PdfStarMark {
  return {
    id: "sm" + "0".repeat(32),
    pageNumber: 1,
    xRatio: 0.5,
    yRatio: 0.5,
    sizeRatio: DEFAULT_STAR_MARK_SIZE_RATIO,
    color: STAR_MARK_COLOR_DEFAULT,
    createdAt: "2026-05-25T00:00:00.000Z",
    updatedAt: "2026-05-25T00:00:00.000Z",
    ...overrides
  };
}

// ─── makeStarMarkId ─────────────────────────────────────────────────────

describe("makeStarMarkId", () => {
  it("prefix sm + 32 hex char = 34 char total", () => {
    const id = makeStarMarkId();
    assert.equal(id.length, 34);
    assert.match(id, /^sm[0-9a-f]{32}$/);
  });

  it("두 번 호출 시 충돌 없음 (random 16 byte)", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 32; i++) ids.add(makeStarMarkId());
    assert.equal(ids.size, 32);
  });
});

// ─── addStarMark ────────────────────────────────────────────────────────

describe("addStarMark", () => {
  it("xRatio/yRatio 가 [0, 1] clamp 된다", () => {
    const { ctx, callbacks, snapshot } = makeCallbacks();
    addStarMark(ctx, callbacks, "subject-1", { x: 1.5, y: -0.3 });
    const stored = snapshot().starMarks ?? [];
    assert.equal(stored.length, 1);
    assert.equal(stored[0]!.xRatio, 1);
    assert.equal(stored[0]!.yRatio, 0);
  });

  it("workspace 의 selectedPage 를 mark.pageNumber 로 캡처", () => {
    const { ctx, callbacks, snapshot } = makeCallbacks();
    addStarMark(ctx, callbacks, "subject-1", { x: 0.4, y: 0.6 });
    assert.equal(snapshot().starMarks![0]!.pageNumber, 3);
  });

  it("초기 sizeRatio = DEFAULT_STAR_MARK_SIZE_RATIO + color = STAR_MARK_COLOR_DEFAULT", () => {
    const { ctx, callbacks, snapshot } = makeCallbacks();
    addStarMark(ctx, callbacks, "subject-1", { x: 0.5, y: 0.5 });
    const m = snapshot().starMarks![0]!;
    assert.equal(m.sizeRatio, DEFAULT_STAR_MARK_SIZE_RATIO);
    assert.equal(m.color, STAR_MARK_COLOR_DEFAULT);
  });
});

// ─── removeStarMark ─────────────────────────────────────────────────────

describe("removeStarMark", () => {
  it("markId 일치 항목만 제거", () => {
    const { ctx, callbacks, snapshot, seed } = makeCallbacks();
    seed([fakeStarMark({ id: "sm-keep" }), fakeStarMark({ id: "sm-drop" })]);
    removeStarMark(callbacks, "subject-1", "sm-drop");
    void ctx;
    assert.deepEqual(
      (snapshot().starMarks ?? []).map((m) => m.id),
      ["sm-keep"]
    );
  });

  it("markId 미일치 시 no-op (배열 길이 보존)", () => {
    const { callbacks, snapshot, seed } = makeCallbacks();
    seed([fakeStarMark({ id: "sm-a" })]);
    removeStarMark(callbacks, "subject-1", "sm-missing");
    assert.equal((snapshot().starMarks ?? []).length, 1);
  });
});

// ─── resizeStarMark ─────────────────────────────────────────────────────

describe("resizeStarMark", () => {
  it("sizeRatio 가 [SIZE_MIN, SIZE_MAX] clamp 된다", () => {
    const { callbacks, snapshot, seed } = makeCallbacks();
    seed([fakeStarMark({ id: "sm-1" })]);
    resizeStarMark(callbacks, "subject-1", "sm-1", 99);
    assert.equal(snapshot().starMarks![0]!.sizeRatio, STAR_MARK_SIZE_MAX);
    resizeStarMark(callbacks, "subject-1", "sm-1", -5);
    assert.equal(snapshot().starMarks![0]!.sizeRatio, STAR_MARK_SIZE_MIN);
  });

  it("markId 미일치 시 no-op", () => {
    const { callbacks, snapshot, seed } = makeCallbacks();
    seed([fakeStarMark({ id: "sm-a", sizeRatio: 0.08 })]);
    resizeStarMark(callbacks, "subject-1", "sm-missing", 0.16);
    assert.equal(snapshot().starMarks![0]!.sizeRatio, 0.08);
  });
});

// ─── cycleStarMarkSize ──────────────────────────────────────────────────

describe("cycleStarMarkSize", () => {
  it("cycle 단계 0.04 → 0.06 → 0.08 → 0.16 → 0.04 wrap", () => {
    assert.equal(cycleStarMarkSize(0.04), 0.06);
    assert.equal(cycleStarMarkSize(0.06), 0.08);
    assert.equal(cycleStarMarkSize(0.08), 0.16);
    assert.equal(cycleStarMarkSize(0.16), 0.04);
  });

  it("epsilon match (< 0.005) 가 boundary 값 포섭", () => {
    // 0.0599 → cycle[1] = 0.06 매칭 → 다음 = 0.08.
    assert.equal(cycleStarMarkSize(0.0599), 0.08);
    // 0.1602 → cycle[3] = 0.16 매칭 → 다음 = 0.04.
    assert.equal(cycleStarMarkSize(0.1602), 0.04);
  });

  it("cycle 외 값 → wrap (findIndex = -1, (-1+1) % 4 = 0 → cycle[0])", () => {
    // 원본 main.ts L1681 `?? 0.08` fallback 은 cycles 가 비어있을 때만 trigger.
    // 실측 = cycle 외 값 → -1 + 1 = 0 → cycle[0] = 0.04 wrap. behavior 보존.
    assert.equal(cycleStarMarkSize(0.1), 0.04);
    assert.equal(cycleStarMarkSize(0.5), 0.04);
  });

  it("STAR_MARK_SIZE_CYCLE 가 [0.04, 0.06, 0.08, 0.16] 그대로 (PR #52 R2 P2 보존)", () => {
    assert.deepEqual([...STAR_MARK_SIZE_CYCLE], [0.04, 0.06, 0.08, 0.16]);
  });
});

// ─── renderStarMark ─────────────────────────────────────────────────────

describe("renderStarMark", () => {
  it("happy path HTML 에 data-star-mark-id + glyph + 2 button 이 있다", () => {
    const html = renderStarMark("subject-1", fakeStarMark({ id: "sm-happy" }));
    assert.match(html, /data-star-mark-id="sm-happy"/);
    assert.match(html, /data-subject-id="subject-1"/);
    assert.match(html, /★/);
    assert.match(html, /data-action="resize-star-mark"/);
    assert.match(html, /data-action="remove-star-mark"/);
  });

  it("color HEX regex 통과 시 그대로, 통과 못하면 COLOR_DEFAULT", () => {
    const okHtml = renderStarMark("s", fakeStarMark({ color: "#abcdef" }));
    assert.match(okHtml, /color: #abcdef/);
    const badHtml = renderStarMark("s", fakeStarMark({ color: "javascript:alert(1)" }));
    assert.match(badHtml, new RegExp(`color: ${STAR_MARK_COLOR_DEFAULT}`));
  });

  it("XSS payload 가 data-* attribute 에서 escape 된다 (script/img tag 0)", () => {
    const html = renderStarMark(
      `"'><img src=x onerror=alert(1)>`,
      fakeStarMark({ id: `'><script>alert(1)</script>` })
    );
    assert.equal((html.match(/<script/gi) ?? []).length, 0);
    assert.equal((html.match(/<img\b/gi) ?? []).length, 0);
  });

  it("NaN xRatio → left:0%, Infinity sizeRatio → SIZE_MIN%, -1 yRatio → 0% (numeric finite/clamp guard)", () => {
    const html = renderStarMark(
      "s",
      fakeStarMark({
        xRatio: Number.NaN,
        yRatio: -1,
        sizeRatio: Number.POSITIVE_INFINITY
      })
    );
    assert.match(html, /left: 0\.00%/);
    assert.match(html, /top: 0\.00%/);
    const sizePct = (STAR_MARK_SIZE_MIN * 100).toFixed(2);
    assert.match(html, new RegExp(`width: ${sizePct.replace(".", "\\.")}%`));
  });

  it("normal 범위 ratio → 정확한 백분율 (0.5 → 50.00%)", () => {
    const html = renderStarMark("s", fakeStarMark({ xRatio: 0.5, yRatio: 0.25, sizeRatio: 0.08 }));
    assert.match(html, /left: 50\.00%/);
    assert.match(html, /top: 25\.00%/);
    assert.match(html, /width: 8\.00%/);
  });
});
