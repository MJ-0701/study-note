// sprint-2026-W22-sprint-3 / layer B/slice-2e — PDF star mark widget domain.
// main.ts 의 makeStarMarkId + addStarMark + removeStarMark + resizeStarMark +
// cycleStarMarkSize + renderStarMark + 5 const (SIZE_CYCLE / DEFAULT_SIZE_RATIO /
// COLOR_DEFAULT / SIZE_MIN / SIZE_MAX) 격리.
// slice-2a/2b/2c/2d 패턴 (Context + Callbacks + named export + module-private
// 미사용 + characterization spec) 일관.
//
// invariant:
//   - xRatio/yRatio clamp = `Math.min(1, Math.max(0, x/y))` 강제. boundary
//     point [0,1] 보장.
//   - sizeRatio clamp = `Math.min(SIZE_MAX, Math.max(SIZE_MIN, sizeRatio))`
//     강제. [0.02, 0.3] 보장.
//   - size cycle = SIZE_CYCLE [0.04, 0.06, 0.08, 0.16] + initial DEFAULT_SIZE_RATIO
//     0.06 cycle 포함 + epsilon `< CYCLE_MATCH_EPSILON` (0.005) match (PR #52
//     R2 P2 lineage). cycle 외 값 → 다음 size = 0.08 fallback.
//   - color HEX regex `^#[0-9a-fA-F]{6}$` defense in depth + fallback
//     COLOR_DEFAULT "#f59e0b". hydration validateStarMark 가 1차 가드, 본
//     renderer 가 2차.
//   - HTML escape 4 경로 (data-star-mark-id × 2 + data-subject-id × 2 + style
//     color + button label = 6 escapeHtml call) 그대로 보존.
//   - render-time numeric finite/clamp guard (Gate 3 self-review Required
//     §9) = renderStarMark 가 inline style 삽입 전 xRatio/yRatio/sizeRatio
//     Number.isFinite + clamp 강제. non-finite (NaN/Infinity) → 0/0/SIZE_MIN
//     fallback. hydration 우회 / persistence 손상 시 style context 깨짐
//     방지. OWASP A03+A04 defense in depth.
//   - id format = `sm` + 16 byte hex = 34 char. crypto.getRandomValues
//     fallback to Math.random (Node 18+ globalThis.crypto 가정).
//   - tool dispatch = main.ts 책임 (selectedTool === "star" → addStarMark +
//     setPdfTool("read") + renderApp). 본 module 은 state mutate 만.

import type { PdfStarMark, SubjectPdfWorkspace } from "@study-note/domain";

import { escapeHtml } from "../app/escape-html.ts";

// ─── Public constants ────────────────────────────────────────────────────

/** [0.02, 0.3] sizeRatio 의 cycle 단계. PR #52 R2 P2 fix lineage. */
export const STAR_MARK_SIZE_CYCLE: readonly number[] = [0.04, 0.06, 0.08, 0.16];
/** initial sizeRatio. cycle 의 일원이라 첫 클릭 → 다음 단계 (0.08) 로 진행. */
export const DEFAULT_STAR_MARK_SIZE_RATIO = 0.06;
/** color HEX 가 깨졌을 때 fallback. AMBER 500. */
export const STAR_MARK_COLOR_DEFAULT = "#f59e0b";
/** sizeRatio 의 최소값. */
export const STAR_MARK_SIZE_MIN = 0.02;
/** sizeRatio 의 최대값. */
export const STAR_MARK_SIZE_MAX = 0.3;
/** size cycle 매칭 epsilon (floating point boundary). */
export const STAR_MARK_CYCLE_MATCH_EPSILON = 0.005;

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

// ─── Public types ────────────────────────────────────────────────────────

/**
 * star-mark 함수가 read-only 로 보는 app state.
 * - getWorkspace: subjectId → 해당 workspace (selectedPage 조회용).
 */
export interface StarMarkContext {
  getWorkspace: (subjectId: string) => SubjectPdfWorkspace;
}

/**
 * star-mark 의 side-effect deps. main.ts updatePdfWorkspace wrapper 1개만.
 */
export interface StarMarkCallbacks {
  updateWorkspace: (
    subjectId: string,
    updater: (workspace: SubjectPdfWorkspace) => SubjectPdfWorkspace
  ) => void;
}

// ─── ID helper ───────────────────────────────────────────────────────────

/**
 * star mark id = `sm` + 16 byte hex (총 34 char). crypto.getRandomValues 가
 * 없으면 Math.random fallback (Node 18+ globalThis.crypto 가정이라 일반적으로
 * 도달 X — defense in depth).
 */
export function makeStarMarkId(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return "sm" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ─── State mutators ──────────────────────────────────────────────────────

/**
 * star mark 추가. xRatio/yRatio 는 [0, 1] clamp. 초기 sizeRatio =
 * DEFAULT_STAR_MARK_SIZE_RATIO. color = STAR_MARK_COLOR_DEFAULT.
 */
export function addStarMark(
  ctx: StarMarkContext,
  callbacks: StarMarkCallbacks,
  subjectId: string,
  position: { x: number; y: number }
): void {
  const workspace = ctx.getWorkspace(subjectId);
  const page = workspace.material?.selectedPage ?? 1;
  const now = new Date().toISOString();
  const mark: PdfStarMark = {
    id: makeStarMarkId(),
    pageNumber: page,
    xRatio: Math.min(1, Math.max(0, position.x)),
    yRatio: Math.min(1, Math.max(0, position.y)),
    sizeRatio: DEFAULT_STAR_MARK_SIZE_RATIO,
    color: STAR_MARK_COLOR_DEFAULT,
    createdAt: now,
    updatedAt: now
  };

  callbacks.updateWorkspace(subjectId, (current) => ({
    ...current,
    starMarks: [...(current.starMarks ?? []), mark]
  }));
}

/**
 * star mark 삭제. markId 가 일치하지 않으면 no-op.
 */
export function removeStarMark(
  callbacks: StarMarkCallbacks,
  subjectId: string,
  markId: string
): void {
  callbacks.updateWorkspace(subjectId, (workspace) => ({
    ...workspace,
    starMarks: (workspace.starMarks ?? []).filter((m) => m.id !== markId)
  }));
}

/**
 * star mark sizeRatio 변경 ([SIZE_MIN, SIZE_MAX] clamp).
 */
export function resizeStarMark(
  callbacks: StarMarkCallbacks,
  subjectId: string,
  markId: string,
  sizeRatio: number
): void {
  const clamped = Math.min(STAR_MARK_SIZE_MAX, Math.max(STAR_MARK_SIZE_MIN, sizeRatio));
  const now = new Date().toISOString();
  callbacks.updateWorkspace(subjectId, (workspace) => ({
    ...workspace,
    starMarks: (workspace.starMarks ?? []).map((m) =>
      m.id === markId ? { ...m, sizeRatio: clamped, updatedAt: now } : m
    )
  }));
}

/**
 * size cycle 의 다음 단계 (PR #52 R2 P2 lineage). 현재 sizeRatio 가 cycle
 * 어느 위치인지 epsilon match → 다음 위치 wrap. cycle 외 값 → fallback
 * (cycle[2] = 0.08).
 */
export function cycleStarMarkSize(currentSizeRatio: number): number {
  const currentIdx = STAR_MARK_SIZE_CYCLE.findIndex(
    (c) => Math.abs(c - currentSizeRatio) < STAR_MARK_CYCLE_MATCH_EPSILON
  );
  const nextSize = STAR_MARK_SIZE_CYCLE[(currentIdx + 1) % STAR_MARK_SIZE_CYCLE.length] ?? 0.08;
  return nextSize;
}

// ─── Renderer ────────────────────────────────────────────────────────────

/**
 * inline style 의 numeric 값을 [min, max] clamp + non-finite fallback.
 * Gate 3 self-review Required §9 invariant (h) — hydration 우회 / persistence
 * 손상 시 style context 깨짐 방지.
 */
function clampStyleRatio(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

export function renderStarMark(subjectId: string, mark: PdfStarMark): string {
  // Color = hydration validateStarMark 가 hex regex 통과해야만 도착. 추가 방어:
  // 잘못된 color 면 default. (defense in depth)
  const safeColor = HEX_COLOR_PATTERN.test(mark.color) ? mark.color : STAR_MARK_COLOR_DEFAULT;
  // Numeric finite + clamp (Gate 3 §9 invariant (h)): non-finite / 범위 외
  // ratio 가 style context 에 흘러들면 layout 깨짐. defense in depth.
  const safeXRatio = clampStyleRatio(mark.xRatio, 0, 1, 0);
  const safeYRatio = clampStyleRatio(mark.yRatio, 0, 1, 0);
  const safeSizeRatio = clampStyleRatio(mark.sizeRatio, STAR_MARK_SIZE_MIN, STAR_MARK_SIZE_MAX, STAR_MARK_SIZE_MIN);
  const sizePct = (safeSizeRatio * 100).toFixed(2);
  // PR #52 codex Round-2 P1: viewport (vw) 단위가 PDF surface 폭 무관해서
  // split pane / 다른 zoom 에서 시각 크기 불일치. container query (cqw) 로
  // 변경 — glyph font-size 가 container 폭에 정확히 따라감 (= sizeRatio *
  // pageWidth). .pdf-star-mark { container-type: inline-size } +
  // .glyph { font-size: 100cqw } 조합.
  return `
    <div
      class="pdf-star-mark"
      data-star-mark-id="${escapeHtml(mark.id)}"
      data-subject-id="${escapeHtml(subjectId)}"
      style="left: ${(safeXRatio * 100).toFixed(2)}%; top: ${(safeYRatio * 100).toFixed(2)}%; width: ${sizePct}%; aspect-ratio: 1; color: ${escapeHtml(safeColor)};"
      aria-label="별표 마스킹"
    >
      <span class="pdf-star-mark__glyph" aria-hidden="true">★</span>
      <div class="pdf-star-mark__controls" aria-hidden="true">
        <button type="button" class="pdf-star-mark__btn" data-action="resize-star-mark" data-subject-id="${escapeHtml(subjectId)}" data-star-mark-id="${escapeHtml(mark.id)}" title="크기 변경">⤢</button>
        <button type="button" class="pdf-star-mark__btn pdf-star-mark__btn--danger" data-action="remove-star-mark" data-subject-id="${escapeHtml(subjectId)}" data-star-mark-id="${escapeHtml(mark.id)}" title="삭제">×</button>
      </div>
    </div>
  `;
}
