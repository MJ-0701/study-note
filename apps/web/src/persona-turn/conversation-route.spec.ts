// sprint-8 slice-3 spec — parseConversationRoute / buildConversationRoute (AC3).
//
// 실행: `pnpm test:web-conversation-route`

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
  buildConversationRoute,
  parseConversationRoute
} from "./conversation-route.ts";

const VALID_CUID = "cmroute0000000000000000001";

describe("parseConversationRoute (sprint-8 slice-3, AC3)", () => {
  it("빈 hash → conversationId null", () => {
    assert.equal(parseConversationRoute("").conversationId, null);
    assert.equal(parseConversationRoute("#").conversationId, null);
    assert.equal(parseConversationRoute("#/").conversationId, null);
  });

  it("`#/conversation/<cuid>` → conversationId 추출", () => {
    assert.equal(
      parseConversationRoute(`#/conversation/${VALID_CUID}`).conversationId,
      VALID_CUID
    );
  });

  it("`#` prefix 없어도 동작 (정규화)", () => {
    assert.equal(
      parseConversationRoute(`/conversation/${VALID_CUID}`).conversationId,
      VALID_CUID
    );
  });

  it("cuid 패턴 미일치 → null (stale URL leak X)", () => {
    assert.equal(parseConversationRoute("#/conversation/not-a-cuid").conversationId, null);
    assert.equal(parseConversationRoute("#/conversation/123").conversationId, null);
    assert.equal(parseConversationRoute("#/conversation/").conversationId, null);
  });

  it("다른 fragment → null", () => {
    assert.equal(parseConversationRoute("#/subjects/digital-engineering").conversationId, null);
    assert.equal(parseConversationRoute("#/random").conversationId, null);
  });

  it("query / 추가 segment 무시", () => {
    assert.equal(
      parseConversationRoute(`#/conversation/${VALID_CUID}?foo=bar`).conversationId,
      VALID_CUID
    );
    assert.equal(
      parseConversationRoute(`#/conversation/${VALID_CUID}/turns`).conversationId,
      VALID_CUID
    );
  });
});

describe("buildConversationRoute (sprint-8 slice-3, AC3)", () => {
  it("null → '#/'", () => {
    assert.equal(buildConversationRoute(null), "#/");
  });

  it("cuid → '#/conversation/<id>'", () => {
    assert.equal(buildConversationRoute(VALID_CUID), `#/conversation/${VALID_CUID}`);
  });

  it("round-trip 일관성", () => {
    const hash = buildConversationRoute(VALID_CUID);
    assert.equal(parseConversationRoute(hash).conversationId, VALID_CUID);
  });
});
