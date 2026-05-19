// sprint-12/slice-3 — PdfChecklist reducer + hydration integration tests (AC2 + AC9-c).
//
// 실행 (project-root 에서):
//   node --experimental-strip-types --no-warnings --test apps/web/src/__tests__/checklist-tool.spec.ts
//
// 이 spec 은 self-contained: domain 패키지를 직접 import 하지 않고
// 관련 pure function 을 inline 복사해서 사용 (textbox-tool.spec.ts 패턴 동일).
// 이유: Vite bundler 없이 node:test 로 실행 가능하도록 유지.

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

// ---------------------------------------------------------------------------
// Types (mirror packages/domain PdfChecklist / PdfChecklistItem shape)
// ---------------------------------------------------------------------------
interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

interface Checklist {
  id: string;
  subjectId: string;
  page: number;
  position: { x: number; y: number };
  items: ChecklistItem[];
  collapsed: boolean;   // R11: default true
  createdAt: string;
  updatedAt: string;
}

interface Workspace {
  subjectId: string;
  stickyNotes: unknown[];
  inkStrokes: unknown[];
  textBoxes: unknown[];
  checklists: Checklist[];
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Constants (mirror packages/domain/src/pdf-workspace.ts)
// ---------------------------------------------------------------------------
const CHECKLIST_ITEMS_CAP = 100;
const CHECKLIST_LABEL_CAP = 500;

// ---------------------------------------------------------------------------
// Inline reducer copies (mirrors packages/domain/src/pdf-workspace.ts)
// ---------------------------------------------------------------------------
function normalizePdfPoint(x: number, y: number): { x: number; y: number } {
  return {
    x: Math.min(1, Math.max(0, x)),
    y: Math.min(1, Math.max(0, y))
  };
}

function createChecklist(input: {
  subjectId: string;
  page: number;
  position: { x: number; y: number };
}): Checklist {
  const now = new Date().toISOString();
  const itemId = `clitem-${Date.now()}-0`;

  return {
    id: `checklist-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    subjectId: input.subjectId,
    page: input.page,
    position: normalizePdfPoint(input.position.x, input.position.y),
    items: [{ id: itemId, label: "", checked: false }],
    collapsed: true, // R11: default 접힘
    createdAt: now,
    updatedAt: now
  };
}

// R11: toggleChecklistCollapsed reducer (inline mirror)
function toggleChecklistCollapsed(checklist: Checklist): Checklist {
  return {
    ...checklist,
    collapsed: !checklist.collapsed,
    updatedAt: new Date().toISOString()
  };
}

function addChecklistItem(checklist: Checklist, label?: string): Checklist {
  if (checklist.items.length >= CHECKLIST_ITEMS_CAP) {
    console.warn(
      "pdf-workspace: checklist items cap exceeded; ignoring add",
      { count: checklist.items.length, cap: CHECKLIST_ITEMS_CAP }
    );

    return checklist;
  }

  const itemId = `clitem-${Date.now()}-${checklist.items.length}`;
  const safeLabel = (label ?? "").slice(0, CHECKLIST_LABEL_CAP);

  return {
    ...checklist,
    items: [
      ...checklist.items,
      { id: itemId, label: safeLabel, checked: false }
    ],
    updatedAt: new Date().toISOString()
  };
}

function toggleChecklistItem(checklist: Checklist, itemId: string): Checklist {
  return {
    ...checklist,
    items: checklist.items.map((item) =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    ),
    updatedAt: new Date().toISOString()
  };
}

function updateChecklistItemLabel(
  checklist: Checklist,
  itemId: string,
  label: string
): Checklist {
  return {
    ...checklist,
    items: checklist.items.map((item) =>
      item.id === itemId
        ? { ...item, label: label.slice(0, CHECKLIST_LABEL_CAP) }
        : item
    ),
    updatedAt: new Date().toISOString()
  };
}

function deleteChecklistItem(checklist: Checklist, itemId: string): Checklist {
  return {
    ...checklist,
    items: checklist.items.filter((item) => item.id !== itemId),
    updatedAt: new Date().toISOString()
  };
}

function moveChecklist(
  checklist: Checklist,
  position: { x: number; y: number }
): Checklist {
  return {
    ...checklist,
    position: normalizePdfPoint(position.x, position.y),
    updatedAt: new Date().toISOString()
  };
}

function deleteChecklist(checklists: Checklist[], id: string): Checklist[] {
  return checklists.filter((cl) => cl.id !== id);
}

// ---------------------------------------------------------------------------
// Inline hydration helpers (mirrors packages/domain/src/pdf-workspace.ts)
// ---------------------------------------------------------------------------
function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

function isFiniteNormalized(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1;
}

function isPositiveInteger(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 1;
}

function validateChecklistItem(raw: unknown): ChecklistItem | null {
  if (raw === null || typeof raw !== "object") {
    return null;
  }

  const r = raw as Record<string, unknown>;

  if (!isNonEmptyString(r.id)) {
    return null;
  }

  const label = typeof r.label === "string" ? r.label.slice(0, CHECKLIST_LABEL_CAP) : "";
  // boolean coercion: string "true" → false (only strict boolean true is accepted)
  const checked = r.checked === true;

  return { id: r.id, label, checked };
}

function validateChecklist(raw: unknown): Checklist | null {
  if (raw === null || typeof raw !== "object") {
    return null;
  }

  const r = raw as Record<string, unknown>;

  if (
    !isNonEmptyString(r.id) ||
    !isNonEmptyString(r.subjectId) ||
    !isPositiveInteger(r.page) ||
    !isNonEmptyString(r.createdAt) ||
    !isNonEmptyString(r.updatedAt)
  ) {
    return null;
  }

  if (r.position === null || typeof r.position !== "object") {
    return null;
  }

  const pos = r.position as Record<string, unknown>;

  if (!isFiniteNormalized(pos.x) || !isFiniteNormalized(pos.y)) {
    return null;
  }

  // items: array required; truncate to cap 100; validate each item
  const rawItems = Array.isArray(r.items) ? r.items : [];
  const truncated = rawItems.slice(0, CHECKLIST_ITEMS_CAP);
  const items: ChecklistItem[] = truncated
    .map(validateChecklistItem)
    .filter((item): item is ChecklistItem => item !== null);

  // R11: collapsed hydration — boolean coercion (=== true 만 true). 누락 시 default true.
  const collapsed = r.collapsed === false ? false : true;

  return {
    id: r.id,
    subjectId: r.subjectId,
    page: r.page,
    position: { x: pos.x as number, y: pos.y as number },
    items,
    collapsed,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt
  };
}

function hydrateWorkspace(raw: unknown): Workspace {
  if (raw === null || raw === undefined || typeof raw !== "object") {
    return {
      subjectId: "<unknown>",
      stickyNotes: [],
      inkStrokes: [],
      textBoxes: [],
      checklists: [],
      updatedAt: new Date().toISOString()
    };
  }

  const r = raw as Record<string, unknown>;
  const subjectId = typeof r.subjectId === "string" ? r.subjectId : "<unknown>";
  const stickyNotes: unknown[] = Array.isArray(r.stickyNotes) ? r.stickyNotes : [];
  const inkStrokes: unknown[] = Array.isArray(r.inkStrokes) ? r.inkStrokes : [];
  const textBoxes: unknown[] = Array.isArray(r.textBoxes) ? r.textBoxes : [];

  const checklists: Checklist[] = Array.isArray(r.checklists)
    ? r.checklists
        .map(validateChecklist)
        .filter((cl): cl is Checklist => cl !== null)
    : [];

  const updatedAt =
    typeof r.updatedAt === "string" ? r.updatedAt : new Date().toISOString();

  return { subjectId, stickyNotes, inkStrokes, textBoxes, checklists, updatedAt };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeChecklist(overrides?: Partial<Checklist>): Checklist {
  return {
    id: "cl-001",
    subjectId: "subject-A",
    page: 1,
    position: { x: 0.1, y: 0.2 },
    items: [{ id: "clitem-001", label: "", checked: false }],
    collapsed: true, // R11: default
    createdAt: "2026-05-18T00:00:00.000Z",
    updatedAt: "2026-05-18T00:00:00.000Z",
    ...overrides
  };
}

// ---------------------------------------------------------------------------
// Tests — reducer (create / addItem / toggle / labelEdit / delete / move)
// ---------------------------------------------------------------------------
describe("PdfChecklist reducer (sprint-12/slice-3 AC2)", () => {
  it("checklist 추가 → checklists 배열 길이 +1, default item 1개", () => {
    const checklists: Checklist[] = [];
    const cl = createChecklist({ subjectId: "s1", page: 1, position: { x: 0.2, y: 0.3 } });
    checklists.push(cl);

    assert.equal(checklists.length, 1);
    assert.equal(cl.items.length, 1, "default item 1개");
    assert.equal(cl.items[0].label, "", "default label 빈 문자열");
    assert.equal(cl.items[0].checked, false, "default checked = false");
    assert.equal(cl.page, 1);
    assert.deepEqual(cl.position, { x: 0.2, y: 0.3 });
  });

  it("addChecklistItem → items 길이 +1", () => {
    const cl = makeChecklist({ items: [{ id: "item-1", label: "A", checked: false }] });
    const updated = addChecklistItem(cl, "B");

    assert.equal(updated.items.length, 2);
    assert.equal(updated.items[1].label, "B");
    assert.equal(updated.items[1].checked, false);
  });

  it("addChecklistItem cap 100 → 100 도달 시 no-op (length 유지)", () => {
    // build a checklist with exactly 100 items
    const items: ChecklistItem[] = Array.from({ length: 100 }, (_, i) => ({
      id: `item-${i}`,
      label: `item ${i}`,
      checked: false
    }));
    const cl = makeChecklist({ items });
    const updated = addChecklistItem(cl, "overflow");

    assert.equal(updated.items.length, 100, "100 초과 no-op");
  });

  it("toggleChecklistItem → 해당 item.checked 반전, 다른 item 미영향", () => {
    const cl = makeChecklist({
      items: [
        { id: "item-1", label: "A", checked: false },
        { id: "item-2", label: "B", checked: false }
      ]
    });
    const updated = toggleChecklistItem(cl, "item-1");

    assert.equal(updated.items[0].checked, true, "item-1 반전");
    assert.equal(updated.items[1].checked, false, "item-2 미영향");

    // 다시 토글 → false 로 복귀
    const reToggled = toggleChecklistItem(updated, "item-1");
    assert.equal(reToggled.items[0].checked, false, "재토글 → false");
  });

  it("updateChecklistItemLabel cap 500 → 500 초과 입력 → truncate", () => {
    const cl = makeChecklist({ items: [{ id: "item-1", label: "", checked: false }] });
    const longLabel = "X".repeat(600);
    const updated = updateChecklistItemLabel(cl, "item-1", longLabel);

    assert.equal(updated.items[0].label.length, 500, "500자 truncate");
  });

  it("updateChecklistItemLabel — 다른 item 미영향", () => {
    const cl = makeChecklist({
      items: [
        { id: "item-1", label: "A", checked: false },
        { id: "item-2", label: "B", checked: true }
      ]
    });
    const updated = updateChecklistItemLabel(cl, "item-1", "A-updated");

    assert.equal(updated.items[0].label, "A-updated");
    assert.equal(updated.items[1].label, "B", "item-2 label 미영향");
    assert.equal(updated.items[1].checked, true, "item-2 checked 미영향");
  });

  it("deleteChecklistItem → 해당 item 제거", () => {
    const cl = makeChecklist({
      items: [
        { id: "item-1", label: "A", checked: false },
        { id: "item-2", label: "B", checked: false }
      ]
    });
    const updated = deleteChecklistItem(cl, "item-1");

    assert.equal(updated.items.length, 1);
    assert.equal(updated.items[0].id, "item-2");
  });

  it("deleteChecklistItem — 존재하지 않는 itemId → 변화 없음", () => {
    const cl = makeChecklist({ items: [{ id: "item-1", label: "A", checked: false }] });
    const updated = deleteChecklistItem(cl, "nonexistent");

    assert.equal(updated.items.length, 1);
  });

  it("moveChecklist → position 갱신, items 미변경", () => {
    const cl = makeChecklist({
      items: [{ id: "item-1", label: "A", checked: true }],
      position: { x: 0.1, y: 0.2 }
    });
    const moved = moveChecklist(cl, { x: 0.5, y: 0.6 });

    assert.deepEqual(moved.position, { x: 0.5, y: 0.6 }, "position 갱신");
    assert.equal(moved.items.length, 1, "items 미변경");
    assert.equal(moved.items[0].checked, true, "item.checked 미변경");
  });

  it("moveChecklist — 범위 외 좌표 → clamp 0..1", () => {
    const cl = makeChecklist();
    const moved = moveChecklist(cl, { x: 2.0, y: -1.0 });

    assert.equal(moved.position.x, 1);
    assert.equal(moved.position.y, 0);
  });

  it("deleteChecklist → 해당 checklist 제거, 나머지 보존", () => {
    const cl1 = makeChecklist({ id: "cl-1" });
    const cl2 = makeChecklist({ id: "cl-2" });
    const result = deleteChecklist([cl1, cl2], "cl-1");

    assert.equal(result.length, 1);
    assert.equal(result[0].id, "cl-2");
  });

  it("deleteChecklist — 존재하지 않는 id → 배열 그대로 반환", () => {
    const cl = makeChecklist({ id: "cl-1" });
    const result = deleteChecklist([cl], "nonexistent");

    assert.equal(result.length, 1);
  });
});

// ---------------------------------------------------------------------------
// Tests — R11: collapse/expand reducer
// ---------------------------------------------------------------------------
describe("R11: toggleChecklistCollapsed (collapse/expand)", () => {
  it("createChecklist 의 default collapsed = true", () => {
    const cl = createChecklist({ subjectId: "s1", page: 1, position: { x: 0.2, y: 0.3 } });
    assert.equal(cl.collapsed, true, "신규 checklist 은 접힘 상태로 생성");
  });

  it("toggleChecklistCollapsed: true → false (펼침)", () => {
    const cl = makeChecklist({ collapsed: true });
    const expanded = toggleChecklistCollapsed(cl);
    assert.equal(expanded.collapsed, false, "접힘 → 펼침");
  });

  it("toggleChecklistCollapsed: false → true (접힘)", () => {
    const cl = makeChecklist({ collapsed: false });
    const collapsed = toggleChecklistCollapsed(cl);
    assert.equal(collapsed.collapsed, true, "펼침 → 접힘");
  });

  it("toggleChecklistCollapsed: 두 번 호출 → 원래 상태 복귀", () => {
    const cl = makeChecklist({ collapsed: true });
    const toggled = toggleChecklistCollapsed(toggleChecklistCollapsed(cl));
    assert.equal(toggled.collapsed, true, "2회 toggle → 원복");
  });

  it("toggleChecklistCollapsed: items 미변경", () => {
    const cl = makeChecklist({
      collapsed: true,
      items: [
        { id: "item-1", label: "A", checked: true },
        { id: "item-2", label: "B", checked: false }
      ]
    });
    const expanded = toggleChecklistCollapsed(cl);
    assert.equal(expanded.items.length, 2, "items 개수 미변경");
    assert.equal(expanded.items[0].checked, true, "item-1 checked 미변경");
  });

  it("toggleChecklistCollapsed: 원본 불변 (immutability)", () => {
    const cl = makeChecklist({ collapsed: false });
    toggleChecklistCollapsed(cl);
    assert.equal(cl.collapsed, false, "원본 collapsed 미변경");
  });
});

// ---------------------------------------------------------------------------
// Tests — AC9-c: hydration integration + fail-closed
// ---------------------------------------------------------------------------
describe("hydrateWorkspace checklist hydration fail-closed (AC9-c)", () => {
  const BASE_CHECKLIST = {
    id: "cl-001",
    subjectId: "s1",
    page: 1,
    position: { x: 0.1, y: 0.2 },
    items: [{ id: "clitem-001", label: "확인", checked: false }],
    createdAt: "2026-05-18T00:00:00.000Z",
    updatedAt: "2026-05-18T00:00:00.000Z"
  };

  it("정상 checklist entry → 그대로 hydrate", () => {
    const ws = hydrateWorkspace({ subjectId: "s1", checklists: [BASE_CHECKLIST] });
    assert.equal(ws.checklists.length, 1);
    assert.equal(ws.checklists[0].id, "cl-001");
    assert.equal(ws.checklists[0].items.length, 1);
  });

  it("corrupt checklist entry (position.x = NaN) → skip, 정상 entry 보존", () => {
    const raw = {
      subjectId: "s1",
      checklists: [
        { ...BASE_CHECKLIST, id: "cl-bad", position: { x: NaN, y: 0.2 } },
        { ...BASE_CHECKLIST, id: "cl-good" }
      ]
    };
    const ws = hydrateWorkspace(raw);

    assert.equal(ws.checklists.length, 1);
    assert.equal(ws.checklists[0].id, "cl-good");
  });

  it("position.x 범위 외 (> 1) → entry skip (fail-closed)", () => {
    const raw = {
      subjectId: "s1",
      checklists: [{ ...BASE_CHECKLIST, position: { x: 1.5, y: 0.2 } }]
    };
    const ws = hydrateWorkspace(raw);

    assert.equal(ws.checklists.length, 0, "out-of-range position → skip");
  });

  it("items[].checked = string 'true' → false (boolean coercion)", () => {
    const raw = {
      subjectId: "s1",
      checklists: [{
        ...BASE_CHECKLIST,
        items: [{ id: "clitem-001", label: "확인", checked: "true" }]
      }]
    };
    const ws = hydrateWorkspace(raw);

    assert.equal(ws.checklists.length, 1);
    assert.equal(ws.checklists[0].items[0].checked, false, "string 'true' → boolean false");
  });

  it("items.length 150 → truncate 100", () => {
    const items = Array.from({ length: 150 }, (_, i) => ({
      id: `clitem-${i}`,
      label: `item ${i}`,
      checked: false
    }));
    const raw = { subjectId: "s1", checklists: [{ ...BASE_CHECKLIST, items }] };
    const ws = hydrateWorkspace(raw);

    assert.equal(ws.checklists[0].items.length, 100, "150 → truncate 100");
  });

  it("label cap 500 — 초과 label → truncate (not drop)", () => {
    const longLabel = "L".repeat(600);
    const raw = {
      subjectId: "s1",
      checklists: [{
        ...BASE_CHECKLIST,
        items: [{ id: "clitem-001", label: longLabel, checked: false }]
      }]
    };
    const ws = hydrateWorkspace(raw);

    assert.equal(ws.checklists[0].items[0].label.length, 500, "600 → truncate 500");
  });

  it("checklists 누락 (sprint-10/11 legacy schema) → [] default", () => {
    const ws = hydrateWorkspace({ subjectId: "s1", stickyNotes: [], inkStrokes: [] });

    assert.equal(ws.checklists.length, 0, "checklists 누락 → []");
  });

  it("checklists 가 array 아님 → [] default", () => {
    const ws = hydrateWorkspace({ subjectId: "s1", checklists: "invalid" });

    assert.equal(ws.checklists.length, 0);
  });

  it("raw 가 null → 모든 slice [] default", () => {
    const ws = hydrateWorkspace(null);

    assert.equal(ws.checklists.length, 0);
    assert.equal(ws.stickyNotes.length, 0);
    assert.equal(ws.textBoxes.length, 0);
  });

  it("checklist id 빈 문자열 → entry skip", () => {
    const raw = {
      subjectId: "s1",
      checklists: [{ ...BASE_CHECKLIST, id: "" }]
    };
    const ws = hydrateWorkspace(raw);

    assert.equal(ws.checklists.length, 0, "empty id → skip");
  });

  // R11: collapsed hydration
  it("collapsed 누락 → default true (접힘)", () => {
    const raw = {
      subjectId: "s1",
      checklists: [{ ...BASE_CHECKLIST }] // collapsed 필드 없음
    };
    const ws = hydrateWorkspace(raw);

    assert.equal(ws.checklists[0].collapsed, true, "collapsed 누락 → true default");
  });

  it("collapsed: true (boolean) → true 보존", () => {
    const raw = {
      subjectId: "s1",
      checklists: [{ ...BASE_CHECKLIST, collapsed: true }]
    };
    const ws = hydrateWorkspace(raw);

    assert.equal(ws.checklists[0].collapsed, true);
  });

  it("collapsed: false (boolean) → false 보존 (펼침 유지)", () => {
    const raw = {
      subjectId: "s1",
      checklists: [{ ...BASE_CHECKLIST, collapsed: false }]
    };
    const ws = hydrateWorkspace(raw);

    assert.equal(ws.checklists[0].collapsed, false, "false = 명시적 펼침 → 보존");
  });

  it("collapsed: 'true' (string) → true (fail-closed: 누락 처리와 동일)", () => {
    const raw = {
      subjectId: "s1",
      checklists: [{ ...BASE_CHECKLIST, collapsed: "true" }]
    };
    const ws = hydrateWorkspace(raw);

    // string 'true' !== false → default true
    assert.equal(ws.checklists[0].collapsed, true, "string 'true' → boolean coercion → true");
  });

  it("collapsed: 0 (number) → true (fail-closed, 누락과 동일)", () => {
    const raw = {
      subjectId: "s1",
      checklists: [{ ...BASE_CHECKLIST, collapsed: 0 }]
    };
    const ws = hydrateWorkspace(raw);

    assert.equal(ws.checklists[0].collapsed, true, "number 0 → true (not === false)");
  });
});
