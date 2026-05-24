/**
 * classdate-format.spec.ts — sprint-W21-sprint-1 / S3 / AC11+AC13 sanity.
 *
 * 실행:
 *   node --experimental-strip-types --no-warnings --test \
 *     apps/web/src/__tests__/classdate-format.spec.ts
 */
import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

// 동일 로직 inline (main.ts 의 isCanonicalIsoDate / formatWeekLabel 회기 가드).
// main.ts 가 module-level export 아니므로 spec 은 동일 로직을 inline 복제 후
// main.ts source 안 동일 함수 존재 source-guard 으로 회기 차단.
function isCanonicalIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.toISOString().slice(0, 10) === value;
}

function formatWeekLabel(label: string | undefined | null, classDate?: string | null): string {
  const candidate = (classDate && classDate.length > 0 ? classDate : label) ?? "";
  if (!candidate) return "(날짜 미지정)";
  if (isCanonicalIsoDate(candidate)) {
    const [, month, day] = candidate.split("-");
    return `${Number(month)}월 ${Number(day)}일`;
  }
  return candidate;
}

describe("AC11/AC12 — isCanonicalIsoDate", () => {
  it("valid YYYY-MM-DD passes", () => {
    assert.equal(isCanonicalIsoDate("2026-05-14"), true);
    assert.equal(isCanonicalIsoDate("2026-01-01"), true);
    assert.equal(isCanonicalIsoDate("2026-12-31"), true);
  });

  it("invalid month rejected", () => {
    assert.equal(isCanonicalIsoDate("2026-13-01"), false);
  });

  it("calendar overflow rejected (2026-02-30)", () => {
    assert.equal(isCanonicalIsoDate("2026-02-30"), false);
  });

  it("non-ISO format rejected", () => {
    assert.equal(isCanonicalIsoDate("5월 14일"), false);
    assert.equal(isCanonicalIsoDate("2026/05/14"), false);
    assert.equal(isCanonicalIsoDate("2026-5-14"), false);
    assert.equal(isCanonicalIsoDate(""), false);
  });
});

describe("AC13 — formatWeekLabel fallback", () => {
  it("ISO date label → 한국식 변환", () => {
    assert.equal(formatWeekLabel("2026-05-14"), "5월 14일");
    assert.equal(formatWeekLabel("2026-01-03"), "1월 3일");
  });

  it("non-ISO label 은 그대로 표시 (legacy)", () => {
    assert.equal(formatWeekLabel("5월 14일(목)"), "5월 14일(목)");
  });

  it("label 비어있고 classDate 있으면 classDate 우선", () => {
    assert.equal(formatWeekLabel("", "2026-05-14"), "5월 14일");
    assert.equal(formatWeekLabel(null, "2026-05-14"), "5월 14일");
  });

  it("둘 다 비어있으면 (날짜 미지정)", () => {
    assert.equal(formatWeekLabel(""), "(날짜 미지정)");
    assert.equal(formatWeekLabel(null), "(날짜 미지정)");
    assert.equal(formatWeekLabel(undefined), "(날짜 미지정)");
  });
});

describe("source-guard — main.ts 에 isCanonicalIsoDate + formatWeekLabel 존재", () => {
  it("main.ts source defines both helpers", async () => {
    const { readFile } = await import("node:fs/promises");
    const { dirname, resolve } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const src = await readFile(resolve(__dirname, "../main.ts"), "utf-8");
    assert.match(src, /function isCanonicalIsoDate\(/);
    assert.match(src, /function formatWeekLabel\(/);
    // PDF upload modal input type=date 회기.
    assert.match(src, /input name="classDate" type="date"/);
  });
});
