/**
 * routes.spec.ts — sprint-2026-W21-sprint-2 / layer A (routing/shell) AC2 + AC10.
 *
 * 실행:
 *   node --experimental-strip-types --no-warnings --test \
 *     apps/web/src/app/__tests__/routes.spec.ts
 */
import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import type { SubjectNote, WeekNote } from "@study-note/domain";
import {
  intakePath,
  parseRoute,
  subjectClassPath,
  subjectIntakePath,
  subjectMcpPath,
  subjectMemorizePath,
  subjectPdfWorkspacePath,
  subjectSummaryPath,
  weekPath,
  weekSummaryPath
} from "../routes.ts";

const subject = (id: string): SubjectNote => ({
  id,
  title: "X",
  professor: "",
  examLabel: "",
  summary: { overview: "", goals: [], structureChart: "" },
  sources: [],
  requiredKeywords: [],
  concepts: [],
  exampleQuestions: [],
  weekNotes: []
});

const week = (id: string): WeekNote =>
  ({
    id,
    label: "X",
    examPhase: "midterm",
    keyConcepts: [],
    learningGoals: [],
    requiredOutcomes: [],
    keywordIds: [],
    conceptIds: [],
    exampleQuestionIds: [],
    userNotes: { authorNickname: "X", lastEditedAt: "", entries: [] }
  }) as unknown as WeekNote;

describe("parseRoute — AC2 happy paths", () => {
  it("(a) empty hash → home", () => {
    assert.deepEqual(parseRoute(""), { name: "home" });
  });

  it("(b) #/intake → intake", () => {
    assert.deepEqual(parseRoute("#/intake"), { name: "intake" });
  });

  it("(c) #/pdf-workspaces → pdf-workspaces", () => {
    assert.deepEqual(parseRoute("#/pdf-workspaces"), { name: "pdf-workspaces" });
  });

  it("(d) #/subjects/sub-1 → subject", () => {
    assert.deepEqual(parseRoute("#/subjects/sub-1"), {
      name: "subject",
      subjectId: "sub-1"
    });
  });

  it("(e) #/subjects/sub-1/class → subject-class", () => {
    assert.deepEqual(parseRoute("#/subjects/sub-1/class"), {
      name: "subject-class",
      subjectId: "sub-1"
    });
  });

  it("(f) #/subjects/sub-1/weeks/w-1 → week", () => {
    assert.deepEqual(parseRoute("#/subjects/sub-1/weeks/w-1"), {
      name: "week",
      subjectId: "sub-1",
      weekId: "w-1"
    });
  });

  it("(g) #/subjects/sub-1/pdf-workspace → pdf-workspace", () => {
    assert.deepEqual(parseRoute("#/subjects/sub-1/pdf-workspace"), {
      name: "pdf-workspace",
      subjectId: "sub-1"
    });
  });

  it("(h) #/subjects/sub-1/summary (alias) → subject-summaries", () => {
    assert.deepEqual(parseRoute("#/subjects/sub-1/summary"), {
      name: "subject-summaries",
      subjectId: "sub-1"
    });
  });

  it("(h2) #/subjects/sub-1/summaries → subject-summaries", () => {
    assert.deepEqual(parseRoute("#/subjects/sub-1/summaries"), {
      name: "subject-summaries",
      subjectId: "sub-1"
    });
  });

  it("(h3) #/subjects/sub-1/summaries/w-1 → subject-summary-detail", () => {
    assert.deepEqual(parseRoute("#/subjects/sub-1/summaries/w-1"), {
      name: "subject-summary-detail",
      subjectId: "sub-1",
      weekId: "w-1"
    });
  });

  it("(h4) #/subjects/sub-1/mcp → subject-mcp", () => {
    assert.deepEqual(parseRoute("#/subjects/sub-1/mcp"), {
      name: "subject-mcp",
      subjectId: "sub-1"
    });
  });

  it("(h5) #/subjects/sub-1/memorize → subject-memorize", () => {
    assert.deepEqual(parseRoute("#/subjects/sub-1/memorize"), {
      name: "subject-memorize",
      subjectId: "sub-1"
    });
  });

  it("(h6) #/subjects/sub-1/intake → subject-intake", () => {
    assert.deepEqual(parseRoute("#/subjects/sub-1/intake"), {
      name: "subject-intake",
      subjectId: "sub-1"
    });
  });

  it("(i) #/subjects/%ED%95%9C/class → 한 decoded", () => {
    assert.deepEqual(parseRoute("#/subjects/%ED%95%9C/class"), {
      name: "subject-class",
      subjectId: "한"
    });
  });
});

describe("path helpers — AC2 round-trip", () => {
  it("(j) subjectClassPath", () => {
    assert.equal(subjectClassPath(subject("sub-1")), "#/subjects/sub-1/class");
  });

  it("(k) weekSummaryPath", () => {
    assert.equal(weekSummaryPath(subject("s"), week("w")), "#/subjects/s/summaries/w");
  });

  it("(l) weekPath (sprint-W22-sprint-11 moved from main.ts)", () => {
    assert.equal(weekPath(subject("s"), week("w")), "#/subjects/s/weeks/w");
  });

  it("intakePath", () => {
    assert.equal(intakePath(), "#/intake");
  });

  it("subjectSummaryPath", () => {
    assert.equal(subjectSummaryPath(subject("s")), "#/subjects/s/summaries");
  });

  it("subjectMcpPath", () => {
    assert.equal(subjectMcpPath(subject("s")), "#/subjects/s/mcp");
  });

  it("subjectMemorizePath", () => {
    assert.equal(subjectMemorizePath(subject("s")), "#/subjects/s/memorize");
  });

  it("subjectIntakePath", () => {
    assert.equal(subjectIntakePath(subject("s")), "#/subjects/s/intake");
  });

  it("subjectPdfWorkspacePath", () => {
    assert.equal(subjectPdfWorkspacePath(subject("s")), "#/subjects/s/pdf-workspace");
  });
});

describe("parseRoute — AC10 malformed / encoding failure modes", () => {
  it("(l) incomplete percent-encoding root → home (decode fail → raw 보존 + match 실패)", () => {
    // "#/%E0%A4%A" — top-level path segment match 없음 → home fallback.
    assert.deepEqual(parseRoute("#/%E0%A4%A"), { name: "home" });
  });

  it("(m) incomplete percent-encoded subjectId → raw 보존 + class 분기", () => {
    // decodeURIComponent throws → catch returns raw "%E0%A4%A". route name 보존.
    assert.deepEqual(parseRoute("#/subjects/%E0%A4%A/class"), {
      name: "subject-class",
      subjectId: "%E0%A4%A"
    });
  });

  it("(n) empty subjectId segment → home (filter Boolean 로 빈 세그먼트 제거 후 match 실패)", () => {
    // "#/subjects//class" → split + filter → ["subjects", "class"] → parts[2] undefined →
    // subject branch matches (parts[0]==="subjects" && parts[1]==="class"). 현행 거동 capture.
    assert.deepEqual(parseRoute("#/subjects//class"), {
      name: "subject",
      subjectId: "class"
    });
  });

  it("(o) script-like top-level segment → home (parts[0] match 없음)", () => {
    assert.deepEqual(parseRoute("#/<script>"), { name: "home" });
  });
});

describe("path helpers — AC2 (l) attacker-shaped ID characterization", () => {
  // 본 sprint 는 behavior 변경 0. path helper 의 raw `${id}` interpolation 거동을
  // capture. BE Prisma `Subject.id @default(cuid())` 가 attacker-shaped id 차단 =
  // schema-enforced. layer C 후속 sprint 에서 encodeURIComponent + escapeHtml
  // 도입 시 본 spec 갱신 신호.

  it("한글 id raw interpolation (encodeURIComponent 미적용 — 현행 보존)", () => {
    assert.equal(subjectClassPath(subject("한")), "#/subjects/한/class");
  });

  it("slash in id (현행 거동 capture)", () => {
    assert.equal(subjectClassPath(subject("a/b")), "#/subjects/a/b/class");
  });

  it("attribute-breaker payload (현행 거동 capture — sink 측 escape 미적용)", () => {
    // hash 자체에는 raw 그대로 들어감. sink (`<a href="${...}">`) 에서 attribute
    // breakout 가능성은 schema-enforced cuid 로 차단됨 (plan §R7 evidence).
    const payload = '"><img src=x onerror=1>';
    const result = subjectClassPath(subject(payload));
    assert.equal(result, `#/subjects/${payload}/class`);
    // raw payload substring 확인 — escape/encode 미적용 명시 capture.
    assert.ok(result.includes('"><img src=x onerror=1>'));
  });
});
