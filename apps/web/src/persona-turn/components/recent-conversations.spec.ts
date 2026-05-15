// sprint-8 slice-2 spec — buildRecentConversationItems (AC2 의 pure transform 부).
//
// 실행: `pnpm test:web-recent-conversations`
// (node --experimental-strip-types --no-warnings --test ...)
//
// React 컴포넌트 자체의 DOM 렌더는 manual UAT / 후속 CDP smoke (sprint-7 retro
// §4 chore) 로 cover. 본 spec 는 view-model 변환의 회귀 가드.

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
  buildRecentConversationItems,
  type ConversationListItemLike
} from "./recent-conversations.ts";

const SAMPLE: ConversationListItemLike[] = [
  {
    id: "cmrecent00000000000000001",
    subject: "digital-engineering",
    personaName: "디공이",
    derivedTitle: "회로 1주차 요약해줘",
    turnCount: 3
  },
  {
    id: "cmrecent00000000000000002",
    subject: "digital-engineering",
    personaName: "디공이",
    derivedTitle: "(빈 대화)",
    turnCount: 0
  }
];

describe("buildRecentConversationItems (sprint-8 slice-2, AC2)", () => {
  it("empty input → empty array", () => {
    const out = buildRecentConversationItems([], null);
    assert.deepEqual(out, []);
  });

  it("activeConversationId 가 null → 모두 active=false", () => {
    const out = buildRecentConversationItems(SAMPLE, null);
    assert.equal(out.length, 2);
    assert.equal(out[0]?.active, false);
    assert.equal(out[1]?.active, false);
  });

  it("activeConversationId 일치 항목만 active=true", () => {
    const out = buildRecentConversationItems(SAMPLE, "cmrecent00000000000000002");
    assert.equal(out[0]?.active, false);
    assert.equal(out[1]?.active, true);
  });

  it("label = derivedTitle 그대로 (frontend transform 없음)", () => {
    const out = buildRecentConversationItems(SAMPLE, null);
    assert.equal(out[0]?.label, "회로 1주차 요약해줘");
    assert.equal(out[1]?.label, "(빈 대화)");
  });

  it("href = #/conversation/<id>", () => {
    const out = buildRecentConversationItems(SAMPLE, null);
    assert.equal(out[0]?.href, "#/conversation/cmrecent00000000000000001");
    assert.equal(out[1]?.href, "#/conversation/cmrecent00000000000000002");
  });

  it("backend 순서 보존 (sort 없음, updatedAt desc 가정)", () => {
    const out = buildRecentConversationItems(SAMPLE, null);
    assert.equal(out[0]?.id, "cmrecent00000000000000001");
    assert.equal(out[1]?.id, "cmrecent00000000000000002");
  });

  it("activeConversationId 가 undefined / 빈 string → 모두 active=false (false-y 안전)", () => {
    assert.equal(
      buildRecentConversationItems(SAMPLE, undefined).every((c) => !c.active),
      true
    );
    assert.equal(
      buildRecentConversationItems(SAMPLE, "").every((c) => !c.active),
      true
    );
  });
});
