// sprint-12/slice-2 — PdfTextBox reducer + hydration integration tests (AC1 + AC9-c).
//
// 실행 (project-root 에서):
//   node --experimental-strip-types --no-warnings --test apps/web/src/__tests__/textbox-tool.spec.ts
//
// 이 spec 은 self-contained: domain 패키지를 직접 import 하지 않고
// 관련 pure function 을 inline 복사해서 사용 (eraser-tool.spec.ts 패턴 동일).
// 이유: Vite bundler 없이 node:test 로 실행 가능하도록 유지.

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

// ---------------------------------------------------------------------------
// Types (mirror packages/domain PdfTextBox / SubjectPdfWorkspace shape)
// ---------------------------------------------------------------------------
interface TextBox {
  id: string;
  subjectId: string;
  page: number;
  position: { x: number; y: number };
  size: { width: number; height: number };
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface StickyNote {
  id: string;
  pageNumber: number;
  anchor: { x: number; y: number };
  blocks: Array<{ id: string; kind: string; content: string }>;
  updatedAt: string;
}

interface InkStroke {
  id: string;
  pageNumber: number;
  color: string;
  width: number;
  points: Array<{ x: number; y: number; t: number }>;
  createdAt: string;
}

interface Workspace {
  subjectId: string;
  stickyNotes: StickyNote[];
  inkStrokes: InkStroke[];
  textBoxes: TextBox[];
  checklists: unknown[];
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Inline reducer copies (mirrors packages/domain/src/pdf-workspace.ts)
// ---------------------------------------------------------------------------
const TEXT_BOX_CONTENT_CAP = 5000;
const TEXT_BOX_DEFAULT_SIZE = { width: 0.2, height: 0.1 };

function normalizePdfPoint(x: number, y: number): { x: number; y: number } {
  return {
    x: Math.min(1, Math.max(0, x)),
    y: Math.min(1, Math.max(0, y))
  };
}

function createTextBox(input: {
  subjectId: string;
  page: number;
  position: { x: number; y: number };
}): TextBox {
  const now = new Date().toISOString();

  return {
    id: `textbox-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    subjectId: input.subjectId,
    page: input.page,
    position: normalizePdfPoint(input.position.x, input.position.y),
    size: { ...TEXT_BOX_DEFAULT_SIZE },
    content: "",
    createdAt: now,
    updatedAt: now
  };
}

function updateTextBoxContent(tb: TextBox, content: string): TextBox {
  return {
    ...tb,
    content: content.slice(0, TEXT_BOX_CONTENT_CAP),
    updatedAt: new Date().toISOString()
  };
}

function moveTextBox(tb: TextBox, position: { x: number; y: number }): TextBox {
  return {
    ...tb,
    position: normalizePdfPoint(position.x, position.y),
    updatedAt: new Date().toISOString()
  };
}

function deleteTextBox(textBoxes: TextBox[], id: string): TextBox[] {
  return textBoxes.filter((tb) => tb.id !== id);
}

// ---------------------------------------------------------------------------
// Hydration helpers (inline copies of domain hydration logic)
// ---------------------------------------------------------------------------
const CHECKLIST_ITEMS_CAP = 100;
const CHECKLIST_LABEL_CAP = 500;

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

function isFiniteNormalized(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1;
}

function isPositiveInteger(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 1;
}

function validateTextBox(raw: unknown): TextBox | null {
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

  if (r.size === null || typeof r.size !== "object") {
    return null;
  }

  const size = r.size as Record<string, unknown>;

  if (!isFiniteNormalized(size.width) || !isFiniteNormalized(size.height)) {
    return null;
  }

  const content =
    typeof r.content === "string" ? r.content.slice(0, TEXT_BOX_CONTENT_CAP) : "";

  return {
    id: r.id,
    subjectId: r.subjectId,
    page: r.page,
    position: { x: pos.x as number, y: pos.y as number },
    size: { width: size.width as number, height: size.height as number },
    content,
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
  const subjectId =
    typeof r.subjectId === "string" ? r.subjectId : "<unknown>";

  const stickyNotes: StickyNote[] = Array.isArray(r.stickyNotes)
    ? (r.stickyNotes as StickyNote[])
    : [];

  const inkStrokes: InkStroke[] = Array.isArray(r.inkStrokes)
    ? (r.inkStrokes as InkStroke[])
    : [];

  const textBoxes: TextBox[] = Array.isArray(r.textBoxes)
    ? r.textBoxes
        .map(validateTextBox)
        .filter((tb): tb is TextBox => tb !== null)
    : [];

  const checklists: unknown[] = Array.isArray(r.checklists) ? r.checklists : [];
  const updatedAt =
    typeof r.updatedAt === "string" ? r.updatedAt : new Date().toISOString();

  return { subjectId, stickyNotes, inkStrokes, textBoxes, checklists, updatedAt };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeTextBox(overrides?: Partial<TextBox>): TextBox {
  return {
    id: "tb-001",
    subjectId: "subject-A",
    page: 1,
    position: { x: 0.1, y: 0.2 },
    size: { width: 0.2, height: 0.1 },
    content: "",
    createdAt: "2026-05-18T00:00:00.000Z",
    updatedAt: "2026-05-18T00:00:00.000Z",
    ...overrides
  };
}

// ---------------------------------------------------------------------------
// Tests — AC1: reducer (create / update / move / delete)
// ---------------------------------------------------------------------------
describe("PdfTextBox reducer (sprint-12/slice-2 AC1)", () => {
  it("createTextBox — textBoxes 배열 길이 +1, content 빈 문자열", () => {
    const textBoxes: TextBox[] = [];
    const tb = createTextBox({ subjectId: "s1", page: 1, position: { x: 0.2, y: 0.3 } });
    textBoxes.push(tb);

    assert.equal(textBoxes.length, 1);
    assert.equal(textBoxes[0].content, "");
    assert.equal(textBoxes[0].page, 1);
    assert.deepEqual(textBoxes[0].position, { x: 0.2, y: 0.3 });
  });

  it("createTextBox — position clamp: 범위 외 좌표 → 0..1 로 clamp", () => {
    const tb = createTextBox({ subjectId: "s1", page: 1, position: { x: -0.5, y: 1.8 } });
    assert.equal(tb.position.x, 0);
    assert.equal(tb.position.y, 1);
  });

  it("updateTextBoxContent — 해당 textBox content 변경, 다른 textBox 미영향", () => {
    const tb1 = makeTextBox({ id: "tb-1", content: "" });
    const tb2 = makeTextBox({ id: "tb-2", content: "기존 내용" });
    let textBoxes = [tb1, tb2];

    textBoxes = textBoxes.map((tb) =>
      tb.id === "tb-1" ? updateTextBoxContent(tb, "새로운 내용") : tb
    );

    assert.equal(textBoxes[0].content, "새로운 내용");
    assert.equal(textBoxes[1].content, "기존 내용"); // 미영향
  });

  it("updateTextBoxContent — content cap 5000 chars: 초과 → truncate", () => {
    const tb = makeTextBox();
    const longContent = "A".repeat(6000);
    const updated = updateTextBoxContent(tb, longContent);
    assert.equal(updated.content.length, 5000);
  });

  it("moveTextBox — position 갱신, content 미변경", () => {
    const tb = makeTextBox({ content: "some text", position: { x: 0.1, y: 0.2 } });
    const moved = moveTextBox(tb, { x: 0.5, y: 0.6 });

    assert.deepEqual(moved.position, { x: 0.5, y: 0.6 });
    assert.equal(moved.content, "some text"); // 미변경
  });

  it("moveTextBox — 범위 외 좌표 → clamp", () => {
    const tb = makeTextBox();
    const moved = moveTextBox(tb, { x: 2.0, y: -1.0 });
    assert.equal(moved.position.x, 1);
    assert.equal(moved.position.y, 0);
  });

  it("deleteTextBox — store 의 textBoxes 배열에서 해당 항목 제거", () => {
    const tb1 = makeTextBox({ id: "tb-1" });
    const tb2 = makeTextBox({ id: "tb-2" });
    const textBoxes = [tb1, tb2];
    const result = deleteTextBox(textBoxes, "tb-1");

    assert.equal(result.length, 1);
    assert.equal(result[0].id, "tb-2");
  });

  it("deleteTextBox — 존재하지 않는 id → 배열 그대로 반환", () => {
    const tb = makeTextBox({ id: "tb-1" });
    const result = deleteTextBox([tb], "nonexistent");
    assert.equal(result.length, 1);
  });
});

// ---------------------------------------------------------------------------
// Tests — AC9-c: hydration integration + fail-closed
// ---------------------------------------------------------------------------
describe("hydrateWorkspace hydration fail-closed (AC9-c)", () => {
  it("정상 textBox entry → 그대로 hydrate", () => {
    const raw = {
      subjectId: "s1",
      stickyNotes: [],
      inkStrokes: [],
      textBoxes: [
        {
          id: "tb-001",
          subjectId: "s1",
          page: 1,
          position: { x: 0.1, y: 0.2 },
          size: { width: 0.2, height: 0.1 },
          content: "hello",
          createdAt: "2026-05-18T00:00:00.000Z",
          updatedAt: "2026-05-18T00:00:00.000Z"
        }
      ],
      checklists: [],
      updatedAt: "2026-05-18T00:00:00.000Z"
    };

    const ws = hydrateWorkspace(raw);
    assert.equal(ws.textBoxes.length, 1);
    assert.equal(ws.textBoxes[0].content, "hello");
  });

  it("corrupt textBox entry (position.x = NaN) → 해당 entry skip, 나머지 보존", () => {
    const raw = {
      subjectId: "s1",
      stickyNotes: [],
      inkStrokes: [],
      textBoxes: [
        {
          id: "tb-bad",
          subjectId: "s1",
          page: 1,
          position: { x: NaN, y: 0.2 }, // corrupt
          size: { width: 0.2, height: 0.1 },
          content: "bad",
          createdAt: "2026-05-18T00:00:00.000Z",
          updatedAt: "2026-05-18T00:00:00.000Z"
        },
        {
          id: "tb-good",
          subjectId: "s1",
          page: 1,
          position: { x: 0.3, y: 0.4 },
          size: { width: 0.2, height: 0.1 },
          content: "good",
          createdAt: "2026-05-18T00:00:00.000Z",
          updatedAt: "2026-05-18T00:00:00.000Z"
        }
      ],
      checklists: [],
      updatedAt: "2026-05-18T00:00:00.000Z"
    };

    const ws = hydrateWorkspace(raw);
    assert.equal(ws.textBoxes.length, 1, "corrupt entry dropped, good entry preserved");
    assert.equal(ws.textBoxes[0].id, "tb-good");
  });

  it("position.x 범위 외 (> 1) → entry skip (fail-closed)", () => {
    const raw = {
      subjectId: "s1",
      stickyNotes: [],
      inkStrokes: [],
      textBoxes: [
        {
          id: "tb-oob",
          subjectId: "s1",
          page: 1,
          position: { x: 1.5, y: 0.2 }, // out of 0..1 range
          size: { width: 0.2, height: 0.1 },
          content: "",
          createdAt: "2026-05-18T00:00:00.000Z",
          updatedAt: "2026-05-18T00:00:00.000Z"
        }
      ],
      checklists: [],
      updatedAt: "2026-05-18T00:00:00.000Z"
    };

    const ws = hydrateWorkspace(raw);
    assert.equal(ws.textBoxes.length, 0, "out-of-range position → entry skipped");
  });

  it("content 5000 chars 초과 → truncate (not drop)", () => {
    const raw = {
      subjectId: "s1",
      stickyNotes: [],
      inkStrokes: [],
      textBoxes: [
        {
          id: "tb-long",
          subjectId: "s1",
          page: 1,
          position: { x: 0.1, y: 0.1 },
          size: { width: 0.2, height: 0.1 },
          content: "B".repeat(6000),
          createdAt: "2026-05-18T00:00:00.000Z",
          updatedAt: "2026-05-18T00:00:00.000Z"
        }
      ],
      checklists: [],
      updatedAt: "2026-05-18T00:00:00.000Z"
    };

    const ws = hydrateWorkspace(raw);
    assert.equal(ws.textBoxes.length, 1);
    assert.equal(ws.textBoxes[0].content.length, 5000);
  });

  it("textBoxes 누락 (sprint-10/11 legacy schema) → [] default, stickyNotes / inkStrokes BC 보존", () => {
    const legacyStickyNote: StickyNote = {
      id: "note-1",
      pageNumber: 1,
      anchor: { x: 0.1, y: 0.1 },
      blocks: [{ id: "b1", kind: "text", content: "기존 포스트잇" }],
      updatedAt: "2026-05-01T00:00:00.000Z"
    };
    const legacyInkStroke: InkStroke = {
      id: "stroke-1",
      pageNumber: 1,
      color: "#1a1a1a",
      width: 3,
      points: [{ x: 0.5, y: 0.5, t: 0 }],
      createdAt: "2026-05-01T00:00:00.000Z"
    };

    const raw = {
      subjectId: "s-legacy",
      stickyNotes: [legacyStickyNote],
      inkStrokes: [legacyInkStroke],
      // textBoxes 미포함 (sprint-10/11 legacy data)
      updatedAt: "2026-05-01T00:00:00.000Z"
    };

    const ws = hydrateWorkspace(raw);
    assert.equal(ws.textBoxes.length, 0, "missing textBoxes → []");
    assert.equal(ws.stickyNotes.length, 1, "stickyNotes BC 보존");
    assert.equal(ws.inkStrokes.length, 1, "inkStrokes BC 보존");
    assert.equal(ws.stickyNotes[0].id, "note-1");
  });

  it("sprint-10/11 + 신규 textBox mix → 모두 정상 hydrate", () => {
    const legacyNote: StickyNote = {
      id: "note-legacy",
      pageNumber: 2,
      anchor: { x: 0.5, y: 0.5 },
      blocks: [{ id: "b-legacy", kind: "checklist", content: "기존" }],
      updatedAt: "2026-05-10T00:00:00.000Z"
    };

    const raw = {
      subjectId: "s-mix",
      stickyNotes: [legacyNote],
      inkStrokes: [],
      textBoxes: [
        {
          id: "tb-new",
          subjectId: "s-mix",
          page: 1,
          position: { x: 0.3, y: 0.4 },
          size: { width: 0.25, height: 0.12 },
          content: "새 텍스트",
          createdAt: "2026-05-18T00:00:00.000Z",
          updatedAt: "2026-05-18T00:00:00.000Z"
        }
      ],
      checklists: [],
      updatedAt: "2026-05-18T00:00:00.000Z"
    };

    const ws = hydrateWorkspace(raw);
    assert.equal(ws.stickyNotes.length, 1, "legacy sticky BC");
    assert.equal(ws.textBoxes.length, 1, "신규 textBox");
    assert.equal(ws.textBoxes[0].content, "새 텍스트");
  });

  it("raw 가 null → createEmptyPdfWorkspace 대응 (모든 slice [])", () => {
    const ws = hydrateWorkspace(null);
    assert.equal(ws.textBoxes.length, 0);
    assert.equal(ws.stickyNotes.length, 0);
    assert.equal(ws.inkStrokes.length, 0);
  });

  it("textBoxes 가 array 아님 (string) → [] default", () => {
    const raw = {
      subjectId: "s1",
      stickyNotes: [],
      inkStrokes: [],
      textBoxes: "invalid-not-array",
      checklists: [],
      updatedAt: "2026-05-18T00:00:00.000Z"
    };

    const ws = hydrateWorkspace(raw);
    assert.equal(ws.textBoxes.length, 0);
  });

  it("textBox id 빈 문자열 → entry skip (isNonEmptyString 체크)", () => {
    const raw = {
      subjectId: "s1",
      stickyNotes: [],
      inkStrokes: [],
      textBoxes: [
        {
          id: "", // empty = invalid
          subjectId: "s1",
          page: 1,
          position: { x: 0.1, y: 0.1 },
          size: { width: 0.2, height: 0.1 },
          content: "",
          createdAt: "2026-05-18T00:00:00.000Z",
          updatedAt: "2026-05-18T00:00:00.000Z"
        }
      ],
      checklists: [],
      updatedAt: "2026-05-18T00:00:00.000Z"
    };

    const ws = hydrateWorkspace(raw);
    assert.equal(ws.textBoxes.length, 0, "empty id → entry skipped");
  });

  it("checklists 필드 array pass-through (BC)", () => {
    const raw = {
      subjectId: "s1",
      stickyNotes: [],
      inkStrokes: [],
      textBoxes: [],
      checklists: [
        { id: "cl-1", items: [] }
      ],
      updatedAt: "2026-05-18T00:00:00.000Z"
    };

    const ws = hydrateWorkspace(raw);
    assert.equal((ws.checklists as unknown[]).length, 1);
  });
});
