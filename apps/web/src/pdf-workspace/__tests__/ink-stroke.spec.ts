/**
 * ink-stroke.spec.ts — sprint-2026-W22-sprint-3 / layer B/slice-2c AC3+AC5.
 *
 * named-export ink stroke 함수 7 + state 2 + interface 1 의 characterization.
 * happy-path / coalesced / RAF dedup / ESC mid-stroke commit / tap skip /
 * reattach after rerender / pointerId mismatch ignore / pressure clamp 를
 * spec assertion 으로 잠근다.
 *
 * 실행:
 *   node --experimental-strip-types --no-warnings --test \
 *     apps/web/src/pdf-workspace/__tests__/ink-stroke.spec.ts
 */
import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";

import {
  __resetInkStrokeForTest,
  beginInkStroke,
  commitActiveInkStrokeOnEsc,
  commitInkStroke,
  extendInkStroke,
  formatSvgPoint,
  getSurfacePoint,
  measurePenStrokeNextPaintFromMark,
  peekActiveInkStroke,
  peekLiveStrokeRafId,
  reattachLiveInkPolyline,
  toInkPoint,
  type InkStrokeCallbacks,
  type InkStrokeContext,
  type InkStrokeDomainHelpers
} from "../ink-stroke.ts";
import type {
  PdfInkPoint,
  PdfInkStroke,
  PdfMaterialDraft,
  SubjectPdfWorkspace
} from "@study-note/domain";

// ─── SVG element stub ────────────────────────────────────────────────────

interface StubAttr {
  name: string;
  value: string;
}

interface StubSvgElement {
  attributes: StubAttr[];
  children: StubSvgElement[];
  parent: StubSvgElement | null;
  tag: string;
  setAttribute: (name: string, value: string) => void;
  getAttribute: (name: string) => string | null;
  append: (child: StubSvgElement) => void;
  appendChild: (child: StubSvgElement) => StubSvgElement;
  remove: () => void;
  querySelector: (sel: string) => StubSvgElement | null;
}

function makeSvgElement(tag: string): StubSvgElement {
  const el: StubSvgElement = {
    tag,
    attributes: [],
    children: [],
    parent: null,
    setAttribute(name, value) {
      const existing = this.attributes.find((a) => a.name === name);
      if (existing) existing.value = value;
      else this.attributes.push({ name, value });
    },
    getAttribute(name) {
      return this.attributes.find((a) => a.name === name)?.value ?? null;
    },
    append(child) {
      child.parent = this;
      this.children.push(child);
    },
    appendChild(child) {
      child.parent = this;
      this.children.push(child);
      return child;
    },
    remove() {
      if (this.parent) {
        const idx = this.parent.children.indexOf(this);
        if (idx >= 0) this.parent.children.splice(idx, 1);
        this.parent = null;
      }
    },
    querySelector(sel) {
      if (sel === "[data-live-ink-layer]") {
        return this.children.find(
          (c) => c.getAttribute("data-live-ink-layer") !== null
        ) ?? null;
      }
      return null;
    }
  };
  return el;
}

interface StubSurface extends StubSvgElement {
  getBoundingClientRect: () => { left: number; top: number; width: number; height: number };
  setPointerCapture: (pointerId: number) => void;
  pointerCaptures: number[];
}

function makeSurface(): StubSurface {
  const base = makeSvgElement("div");
  const surface: StubSurface = Object.assign(base, {
    pointerCaptures: [] as number[],
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 1414 }),
    setPointerCapture(pointerId: number) {
      this.pointerCaptures.push(pointerId);
    }
  });
  const liveLayer = makeSvgElement("svg");
  liveLayer.setAttribute("data-live-ink-layer", "");
  surface.append(liveLayer);
  return surface;
}

// ─── document.createElementNS + globalThis.document stub ────────────────

const SVG_NS = "http://www.w3.org/2000/svg";

const globalAny = globalThis as unknown as {
  document?: { createElementNS: (ns: string, tag: string) => StubSvgElement };
};

globalAny.document = {
  createElementNS: (_ns: string, tag: string) => makeSvgElement(tag)
};

// ─── PointerEvent stub ──────────────────────────────────────────────────

interface StubPointerEvent {
  clientX: number;
  clientY: number;
  pointerId: number;
  pressure: number;
  preventDefault: () => void;
  getCoalescedEvents?: () => StubPointerEvent[];
  defaultPrevented: boolean;
}

function makePointer(
  clientX: number,
  clientY: number,
  opts: Partial<StubPointerEvent> = {}
): StubPointerEvent {
  let prevented = false;
  return {
    clientX,
    clientY,
    pointerId: opts.pointerId ?? 1,
    pressure: opts.pressure ?? 0.5,
    preventDefault: () => {
      prevented = true;
    },
    getCoalescedEvents: opts.getCoalescedEvents,
    get defaultPrevented() {
      return prevented;
    }
  };
}

// ─── domain helpers stub (clamped normalize + deterministic createInkStroke) ──

const helpers: InkStrokeDomainHelpers = {
  normalizePdfPoint: (x, y) => ({
    x: Math.min(1, Math.max(0, x)),
    y: Math.min(1, Math.max(0, y))
  }),
  createInkStroke: (pageNumber, points): PdfInkStroke => ({
    id: `stroke-test-${points.length}`,
    pageNumber,
    color: "#1a1a1a",
    width: 3,
    points,
    createdAt: "2026-05-25T00:00:00.000Z"
  })
};

// ─── ctx + callbacks harness ─────────────────────────────────────────────

interface Harness {
  surface: StubSurface;
  ctx: InkStrokeContext;
  callbacks: InkStrokeCallbacks;
  updatePdfWorkspaceCalls: Array<{ subjectId: string; updater: (w: SubjectPdfWorkspace) => SubjectPdfWorkspace }>;
  workspace: SubjectPdfWorkspace;
  renderCalls: number;
  rumActionCalls: Array<{ name: string; context?: { durationMs: number } }>;
}

function makeWorkspace(subjectId: string): SubjectPdfWorkspace {
  return {
    subjectId,
    material: null,
    materials: [],
    materialIndex: 0,
    selectedTool: "pen",
    eraserShape: "round",
    eraserSize: 12,
    textBoxes: [],
    checklists: [],
    tables: [],
    charts: [],
    inkStrokes: [],
    starMarks: [],
    stickyNotes: []
  } as unknown as SubjectPdfWorkspace;
}

function makeHarness(subjectId = "subj-1"): Harness {
  const surface = makeSurface();
  const h: Harness = {
    surface,
    workspace: makeWorkspace(subjectId),
    updatePdfWorkspaceCalls: [],
    renderCalls: 0,
    rumActionCalls: [],
    ctx: {
      querySurface: (sid) => (sid === subjectId ? (surface as unknown as HTMLElement) : null)
    },
    callbacks: {
      updatePdfWorkspace: (sid, updater) => {
        h.updatePdfWorkspaceCalls.push({ subjectId: sid, updater });
        h.workspace = updater(h.workspace);
      },
      renderApp: () => {
        h.renderCalls += 1;
      },
      trackRumAction: (name, context) => {
        h.rumActionCalls.push({ name, context });
      }
    }
  };
  return h;
}

function makeMaterial(pageNumber = 1): PdfMaterialDraft {
  return {
    id: "mat-1",
    subjectId: "subj-1",
    fileName: "test.pdf",
    fileSize: 1024,
    pageCount: 3,
    contentType: "application/pdf",
    uploadStatus: "local",
    selectedPage: pageNumber,
    selectedTool: "pen"
  } as unknown as PdfMaterialDraft;
}

// ─── RAF capture (sync-run on demand) ────────────────────────────────────

interface RafQueue {
  pending: Array<() => void>;
  flushOne: () => void;
  flushAll: () => void;
}

function installRaf(): RafQueue {
  const queue: Array<() => void> = [];
  let nextId = 1;
  (globalThis as unknown as { requestAnimationFrame: (cb: () => void) => number }).requestAnimationFrame = (
    cb: () => void
  ) => {
    queue.push(cb);
    return nextId++;
  };
  (globalThis as unknown as { cancelAnimationFrame: (id: number) => void }).cancelAnimationFrame = () => {
    // no-op for test — __resetInkStrokeForTest clears liveStrokeRafId.
  };
  return {
    pending: queue,
    flushOne: () => {
      const cb = queue.shift();
      if (cb) cb();
    },
    flushAll: () => {
      while (queue.length > 0) {
        const cb = queue.shift();
        if (cb) cb();
      }
    }
  };
}

// ─── performance stub ────────────────────────────────────────────────────

interface PerfStub {
  marks: Set<string>;
  measures: Array<{ name: string; duration: number }>;
}

function installPerformance(durationMs = 16): PerfStub {
  const marks = new Set<string>();
  const measures: Array<{ name: string; duration: number }> = [];
  (globalThis as unknown as { performance: unknown }).performance = {
    mark: (name: string) => {
      marks.add(name);
    },
    measure: (name: string, start: string) => {
      if (!marks.has(start)) throw new Error("mark missing");
      measures.push({ name, duration: durationMs });
    },
    getEntriesByName: (name: string) =>
      measures.filter((m) => m.name === name).map((m) => ({ duration: m.duration })),
    clearMarks: (name: string) => marks.delete(name),
    clearMeasures: (name: string) => {
      const idx = measures.findIndex((m) => m.name === name);
      if (idx >= 0) measures.splice(idx, 1);
    }
  };
  return { marks, measures };
}

// ─── tests ──────────────────────────────────────────────────────────────

describe("ink-stroke — module-private state lifecycle", () => {
  let raf: RafQueue;
  let perf: PerfStub;
  beforeEach(() => {
    __resetInkStrokeForTest();
    raf = installRaf();
    perf = installPerformance(16);
  });
  afterEach(() => {
    __resetInkStrokeForTest();
  });

  // (i) happy-path begin → extend → commit
  it("(i) happy-path: begin → extend → commit pushes stroke + emits next-paint metric", () => {
    const h = makeHarness();
    const material = makeMaterial(2);
    const initialPoint = getSurfacePoint(
      makePointer(100, 100) as unknown as PointerEvent,
      h.surface as unknown as HTMLElement,
      helpers
    );

    beginInkStroke(
      makePointer(100, 100) as unknown as PointerEvent,
      h.surface as unknown as HTMLElement,
      "subj-1",
      material,
      initialPoint
    );
    assert.ok(peekActiveInkStroke());
    assert.equal(peekActiveInkStroke()!.points.length, 1);
    assert.equal(peekActiveInkStroke()!.pageNumber, 2);
    assert.deepEqual(h.surface.pointerCaptures, [1]);

    extendInkStroke(
      makePointer(200, 200) as unknown as PointerEvent,
      h.ctx,
      helpers
    );
    assert.equal(peekActiveInkStroke()!.points.length, 2);

    const committed = commitInkStroke(
      makePointer(300, 300, { pointerId: 1 }) as unknown as PointerEvent,
      h.ctx,
      h.callbacks,
      helpers
    );
    assert.equal(committed, true);
    assert.equal(peekActiveInkStroke(), undefined);
    assert.equal(h.updatePdfWorkspaceCalls.length, 1);
    assert.equal(h.workspace.inkStrokes.length, 1);
    assert.equal(h.workspace.inkStrokes[0]!.pageNumber, 2);

    // RAF queue order:
    //   1) extend's updateLiveStroke (scheduleLiveStrokeRender 가 schedule)
    //   2) commit's outer = renderApp + 새 schedule inner
    //   3) commit's inner = measurePenStrokeNextPaintFromMark
    raf.flushOne(); // (1) extend updateLiveStroke
    raf.flushOne(); // (2) commit outer — renderApp
    assert.equal(h.renderCalls, 1);
    raf.flushOne(); // (3) commit inner — measure → RUM emit
    const rumEntry = h.rumActionCalls.find((c) => c.name === "pen-stroke.next-paint");
    assert.ok(rumEntry, "pen-stroke.next-paint RUM emit expected");
    assert.equal(rumEntry!.context?.durationMs, 16);
  });

  // (ii) coalesced multi-sample push 순서
  it("(ii) coalesced: getCoalescedEvents 결과 순서대로 points push", () => {
    const h = makeHarness();
    const material = makeMaterial();
    beginInkStroke(
      makePointer(100, 100) as unknown as PointerEvent,
      h.surface as unknown as HTMLElement,
      "subj-1",
      material,
      getSurfacePoint(makePointer(100, 100) as unknown as PointerEvent, h.surface as unknown as HTMLElement, helpers)
    );
    assert.equal(peekActiveInkStroke()!.points.length, 1);

    const coalesced = [makePointer(150, 150), makePointer(200, 200), makePointer(250, 250)];
    extendInkStroke(
      makePointer(300, 300, {
        getCoalescedEvents: () => coalesced
      }) as unknown as PointerEvent,
      h.ctx,
      helpers
    );
    // begin (1) + 3 coalesced samples = 4 points (event 자체는 push X — empty fallback 만)
    const pts = peekActiveInkStroke()!.points;
    assert.equal(pts.length, 4);
    // 좌표 0~1 ratio normalize: clientX / rect.width = 150/1000 = 0.15.
    assert.equal(pts[1]!.x, 0.15);
    assert.equal(pts[2]!.x, 0.2);
    assert.equal(pts[3]!.x, 0.25);
  });

  // (iii) RAF dedup
  it("(iii) RAF dedup: extend N회 호출 → setAttribute 는 RAF tick 1회만", () => {
    const h = makeHarness();
    const material = makeMaterial();
    beginInkStroke(
      makePointer(100, 100) as unknown as PointerEvent,
      h.surface as unknown as HTMLElement,
      "subj-1",
      material,
      getSurfacePoint(makePointer(100, 100) as unknown as PointerEvent, h.surface as unknown as HTMLElement, helpers)
    );
    // First extend → schedules RAF.
    extendInkStroke(makePointer(150, 150) as unknown as PointerEvent, h.ctx, helpers);
    assert.notEqual(peekLiveStrokeRafId(), undefined, "first extend schedules RAF");
    const queueAfterFirst = raf.pending.length;

    // Subsequent extends within same frame → no new RAF schedule.
    extendInkStroke(makePointer(200, 200) as unknown as PointerEvent, h.ctx, helpers);
    extendInkStroke(makePointer(250, 250) as unknown as PointerEvent, h.ctx, helpers);
    assert.equal(raf.pending.length, queueAfterFirst, "RAF dedup — only 1 scheduled");

    // points 는 모두 push 됐는지 확인 (event 자체).
    assert.equal(peekActiveInkStroke()!.points.length, 4); // begin(1) + 3 extends

    // RAF flush → setAttribute 1회 발생 + liveStrokeRafId reset.
    raf.flushOne();
    assert.equal(peekLiveStrokeRafId(), undefined, "RAF tick clears id (dedup re-arms)");
  });

  // (iv) ESC mid-stroke commit
  it("(iv) ESC mid-stroke: points>1 → workspace push, points<=1 → 폐기", () => {
    const h = makeHarness();
    const material = makeMaterial();

    // 첫 케이스: points=1 (tap-like) → ESC 시 workspace push 없음.
    beginInkStroke(
      makePointer(100, 100) as unknown as PointerEvent,
      h.surface as unknown as HTMLElement,
      "subj-1",
      material,
      getSurfacePoint(makePointer(100, 100) as unknown as PointerEvent, h.surface as unknown as HTMLElement, helpers)
    );
    commitActiveInkStrokeOnEsc(h.callbacks, helpers);
    assert.equal(peekActiveInkStroke(), undefined);
    assert.equal(h.updatePdfWorkspaceCalls.length, 0, "points=1 → no commit");

    // 두 번째 케이스: points>1 → ESC 시 workspace push.
    __resetInkStrokeForTest();
    raf = installRaf();
    beginInkStroke(
      makePointer(100, 100) as unknown as PointerEvent,
      h.surface as unknown as HTMLElement,
      "subj-1",
      material,
      getSurfacePoint(makePointer(100, 100) as unknown as PointerEvent, h.surface as unknown as HTMLElement, helpers)
    );
    extendInkStroke(makePointer(150, 150) as unknown as PointerEvent, h.ctx, helpers);
    commitActiveInkStrokeOnEsc(h.callbacks, helpers);
    assert.equal(peekActiveInkStroke(), undefined);
    assert.equal(h.updatePdfWorkspaceCalls.length, 1, "points>1 → workspace push");
    assert.equal(h.workspace.inkStrokes.length, 1);
  });

  // (v) tap (points<=1) skip metric
  it("(v) tap: pointerup with points<=1 → commit 안 됨 + RUM skip", () => {
    const h = makeHarness();
    const material = makeMaterial();
    beginInkStroke(
      makePointer(100, 100) as unknown as PointerEvent,
      h.surface as unknown as HTMLElement,
      "subj-1",
      material,
      getSurfacePoint(makePointer(100, 100) as unknown as PointerEvent, h.surface as unknown as HTMLElement, helpers)
    );
    // 바로 pointerup (no extend) — points=1 = tap.
    const committed = commitInkStroke(
      makePointer(100, 100, { pointerId: 1 }) as unknown as PointerEvent,
      h.ctx,
      h.callbacks,
      helpers
    );
    assert.equal(committed, false);
    assert.equal(h.updatePdfWorkspaceCalls.length, 0);
    assert.equal(h.rumActionCalls.length, 0, "tap → RUM emit skip");
    assert.equal(peekActiveInkStroke(), undefined);
  });

  // (vi) reattach after rerender
  it("(vi) reattach: rerender 이후 fresh polyline 재생성 + reference 갱신", () => {
    const h = makeHarness();
    const material = makeMaterial();
    beginInkStroke(
      makePointer(100, 100) as unknown as PointerEvent,
      h.surface as unknown as HTMLElement,
      "subj-1",
      material,
      getSurfacePoint(makePointer(100, 100) as unknown as PointerEvent, h.surface as unknown as HTMLElement, helpers)
    );
    extendInkStroke(makePointer(200, 200) as unknown as PointerEvent, h.ctx, helpers);

    const original = peekActiveInkStroke()!;
    const originalPolyline = original.livePolyline;
    originalPolyline.setAttribute("data-test-tag", "original");
    // attribute 가 fresh polyline 에 복사돼야 함.

    // simulate renderApp = remove old polyline (off-DOM detach).
    originalPolyline.remove();
    // → liveLayer 안 polyline 0개. reattach 시 fresh 생성 + parent = liveLayer.

    reattachLiveInkPolyline(original, h.ctx);
    const liveLayer = h.surface.querySelector("[data-live-ink-layer]")!;
    assert.equal(liveLayer.children.length, 1);
    const fresh = liveLayer.children[0]!;
    assert.equal(fresh.getAttribute("data-test-tag"), "original", "attribute 복원");
    assert.notEqual(fresh, originalPolyline, "fresh element 가 새로 생성됨");
    assert.equal(original.livePolyline, fresh, "stroke.livePolyline reference 갱신");
    assert.equal(
      fresh.getAttribute("points"),
      original.points.map(formatSvgPoint).join(" "),
      "points attribute 복원"
    );
  });

  // (vii) pointerId mismatch ignore
  it("(vii) pointerId mismatch: extend/commit 가 다른 pointerId 면 noop", () => {
    const h = makeHarness();
    const material = makeMaterial();
    beginInkStroke(
      makePointer(100, 100, { pointerId: 7 }) as unknown as PointerEvent,
      h.surface as unknown as HTMLElement,
      "subj-1",
      material,
      getSurfacePoint(makePointer(100, 100, { pointerId: 7 }) as unknown as PointerEvent, h.surface as unknown as HTMLElement, helpers)
    );
    // 다른 pointerId = 99 로 extend → state 변화 없음.
    extendInkStroke(makePointer(200, 200, { pointerId: 99 }) as unknown as PointerEvent, h.ctx, helpers);
    assert.equal(peekActiveInkStroke()!.points.length, 1, "mismatch extend ignored");

    // 다른 pointerId = 99 로 commit → false + state 그대로.
    const committed = commitInkStroke(
      makePointer(300, 300, { pointerId: 99 }) as unknown as PointerEvent,
      h.ctx,
      h.callbacks,
      helpers
    );
    assert.equal(committed, false);
    assert.ok(peekActiveInkStroke(), "mismatch commit ignored — state 유지");
  });

  // (ix) RAF race — commit RAF 도중 새 stroke 가 시작되면 새 stroke 의
  // polyline 이 fresh SVG 안에 reattach 됨 (PR #53 R3 P2 의 race 가장 fragile
  // branch). carriedStroke === activeInkStroke 가 true 가 되는 경로.
  it("(ix) RAF race: commit 후 새 beginInkStroke → outer RAF flush 시 새 stroke reattach", () => {
    const h = makeHarness();
    const material = makeMaterial();
    // 1) 첫 stroke begin + extend + commit (RAF 2개 schedule: extend updateLiveStroke + commit outer)
    beginInkStroke(
      makePointer(100, 100) as unknown as PointerEvent,
      h.surface as unknown as HTMLElement,
      "subj-1",
      material,
      getSurfacePoint(makePointer(100, 100) as unknown as PointerEvent, h.surface as unknown as HTMLElement, helpers)
    );
    extendInkStroke(makePointer(200, 200) as unknown as PointerEvent, h.ctx, helpers);
    commitInkStroke(
      makePointer(300, 300, { pointerId: 1 }) as unknown as PointerEvent,
      h.ctx,
      h.callbacks,
      helpers
    );
    assert.equal(peekActiveInkStroke(), undefined, "commit 직후 activeInkStroke = undefined");

    // 2) commit outer RAF flush 직전에 새 stroke 시작 (다른 pointerId).
    raf.flushOne(); // extend updateLiveStroke
    // 새 stroke begin — pointerId=2, activeInkStroke = 새 stroke.
    const newInitial = getSurfacePoint(
      makePointer(50, 50, { pointerId: 2 }) as unknown as PointerEvent,
      h.surface as unknown as HTMLElement,
      helpers
    );
    beginInkStroke(
      makePointer(50, 50, { pointerId: 2 }) as unknown as PointerEvent,
      h.surface as unknown as HTMLElement,
      "subj-1",
      material,
      newInitial
    );
    const newStroke = peekActiveInkStroke();
    assert.ok(newStroke, "새 stroke 가 activeInkStroke 로 set");
    const oldPolyline = newStroke!.livePolyline;

    // 3) outer RAF flush — carriedStroke === activeInkStroke (= 새 stroke) → reattach.
    raf.flushOne();
    assert.equal(h.renderCalls, 1, "outer RAF 에서 renderApp 호출");
    // 새 stroke 의 livePolyline 이 fresh element 로 교체됨.
    assert.notEqual(peekActiveInkStroke()!.livePolyline, oldPolyline, "fresh polyline reattach");
  });

  // (viii) pressure clamp
  it("(viii) pressure clamp: pressure<=0 → undefined, >0 → round(3 digit)", () => {
    const eZero = makePointer(0, 0, { pressure: 0 }) as unknown as PointerEvent;
    const eNeg = makePointer(0, 0, { pressure: -0.5 }) as unknown as PointerEvent;
    const eValid = makePointer(0, 0, { pressure: 0.7567 }) as unknown as PointerEvent;

    const p0 = toInkPoint({ x: 0, y: 0 }, eZero);
    const pNeg = toInkPoint({ x: 0, y: 0 }, eNeg);
    const pValid = toInkPoint({ x: 0, y: 0 }, eValid);

    assert.equal(p0.pressure, undefined, "pressure=0 → undefined");
    assert.equal(pNeg.pressure, undefined, "pressure<0 → undefined");
    assert.equal(pValid.pressure, 0.757, "pressure 양수 → round 3 digit");
  });
});

// ─── stateless helpers (additional invariant evidence) ───────────────────

describe("ink-stroke — stateless helpers", () => {
  it("formatSvgPoint: 0~1 ratio × A4 aspect (1000 × 1414) round", () => {
    assert.equal(formatSvgPoint({ x: 0.5, y: 0.5 }), "500,707");
    assert.equal(formatSvgPoint({ x: 0, y: 1 }), "0,1414");
    assert.equal(formatSvgPoint({ x: 0.1234, y: 0.9876 }), `123,1396`);
  });

  it("getSurfacePoint: rect 기준 0~1 normalize + clamp", () => {
    const surface = makeSurface();
    const event = makePointer(500, 707, { pressure: 0.3 }) as unknown as PointerEvent;
    const point = getSurfacePoint(event, surface as unknown as HTMLElement, helpers);
    assert.equal(point.x, 0.5);
    assert.equal(point.y, 0.5);
    assert.equal(point.pressure, 0.3);
  });

  it("measurePenStrokeNextPaintFromMark: mark 미존재 시 noop (no throw)", () => {
    installPerformance(0);
    const rumCalls: Array<{ name: string }> = [];
    const cb: InkStrokeCallbacks = {
      updatePdfWorkspace: () => {},
      renderApp: () => {},
      trackRumAction: (name) => {
        rumCalls.push({ name });
      }
    };
    // mark 없이 호출 → try/catch 가 swallow.
    measurePenStrokeNextPaintFromMark("missing-mark-id", cb);
    assert.equal(rumCalls.length, 0);
  });
});
