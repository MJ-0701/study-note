// Subject 삭제 불변식(F-11) 회귀 테스트 — 자식 자료 0개일 때만 삭제 허용.
import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { canDeleteSubject } from "../subject-deletion.policy";

describe("canDeleteSubject (F-11 domain invariant)", () => {
  it("allows deletion when there are no child materials", () => {
    assert.equal(canDeleteSubject(0), true);
  });

  it("blocks deletion when any child material exists (live or soft-deleted)", () => {
    assert.equal(canDeleteSubject(1), false);
    assert.equal(canDeleteSubject(5), false);
    assert.equal(canDeleteSubject(100), false);
  });
});
