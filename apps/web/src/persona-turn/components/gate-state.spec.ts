// sprint-7 slice-1 spec — MCPOnboardingGate dismiss state machine.
//
// 검증 대상 = plan §3 AC2: 3 버튼 (completed / deferred / guide) + 외부 close
// 의 storage transitions + 재표시 invariant.
//
// 본 spec 는 node:test 로 실행 — apps/web 에 vitest infra 미존재.
// 실행: `node --test apps/web/src/persona-turn/components/gate-state.spec.ts`
// (또는 typescript-아닌 사전 transpile 필요 시 ts-node loader 등).
//
// 단, react 외 의존 0 이라 typescript 컴파일러가 produced JS 만 있으면 동작.

import { strict as assert } from "node:assert";
import { describe, it, beforeEach } from "node:test";
import {
  LS_COMPLETED_KEY,
  SS_DEFERRED_KEY,
  applyDismiss,
  createMemoryStorage,
  isGateDismissed,
  type GateStores
} from "./gate-state.ts";

describe("gate-state — MCPOnboardingGate dismiss state machine (plan §3 AC2)", () => {
  let stores: GateStores;

  beforeEach(() => {
    stores = {
      local: createMemoryStorage(),
      session: createMemoryStorage()
    };
  });

  describe("isGateDismissed", () => {
    it("empty stores → gate 표시 (dismissed=false)", () => {
      assert.equal(isGateDismissed(stores), false);
    });

    it("localStorage completed=true → 영구 dismiss", () => {
      stores.local.setItem(LS_COMPLETED_KEY, "true");
      assert.equal(isGateDismissed(stores), true);
    });

    it("sessionStorage deferred=true → 임시 dismiss", () => {
      stores.session.setItem(SS_DEFERRED_KEY, "true");
      assert.equal(isGateDismissed(stores), true);
    });

    it("localStorage completed 값이 'true' 외 (예 'false') → dismiss 아님", () => {
      stores.local.setItem(LS_COMPLETED_KEY, "false");
      assert.equal(isGateDismissed(stores), false);
    });

    it("sessionStorage deferred 값이 'true' 외 → dismiss 아님", () => {
      stores.session.setItem(SS_DEFERRED_KEY, "0");
      assert.equal(isGateDismissed(stores), false);
    });
  });

  describe('applyDismiss("completed") — "이미 설정 완료" 영구 dismiss', () => {
    it("localStorage 에 completed=true 기록 + willReappear=false", () => {
      const result = applyDismiss(stores, "completed");
      assert.equal(stores.local.getItem(LS_COMPLETED_KEY), "true");
      assert.equal(stores.session.getItem(SS_DEFERRED_KEY), null);
      assert.equal(result.willReappear, false);
      assert.equal(isGateDismissed(stores), true);
    });
  });

  describe('applyDismiss("deferred") — "나중에" 임시 dismiss', () => {
    it("sessionStorage 에 deferred=true 기록 + willReappear=true", () => {
      const result = applyDismiss(stores, "deferred");
      assert.equal(stores.session.getItem(SS_DEFERRED_KEY), "true");
      assert.equal(stores.local.getItem(LS_COMPLETED_KEY), null);
      assert.equal(result.willReappear, true);
      assert.equal(isGateDismissed(stores), true);
    });

    it("새 session simulation (sessionStorage clear) 후 다시 표시", () => {
      applyDismiss(stores, "deferred");
      assert.equal(isGateDismissed(stores), true);
      // 새 탭/세션 = sessionStorage 비움
      stores.session = createMemoryStorage();
      assert.equal(isGateDismissed(stores), false);
    });
  });

  describe('applyDismiss("guide") — "지금 안내 보기" 안내 페이지 이동', () => {
    it("storage 미변경 + willReappear=true (안내 페이지 다녀온 뒤 다시 노출 가능)", () => {
      const result = applyDismiss(stores, "guide");
      assert.equal(stores.local.getItem(LS_COMPLETED_KEY), null);
      assert.equal(stores.session.getItem(SS_DEFERRED_KEY), null);
      assert.equal(result.willReappear, true);
      assert.equal(isGateDismissed(stores), false);
    });
  });

  describe('applyDismiss("external-close") — Escape / X / 배경 클릭', () => {
    it("sessionStorage deferred=true 기록 (deferred 와 동일 — 임시 dismiss)", () => {
      const result = applyDismiss(stores, "external-close");
      assert.equal(stores.session.getItem(SS_DEFERRED_KEY), "true");
      assert.equal(stores.local.getItem(LS_COMPLETED_KEY), null);
      assert.equal(result.willReappear, true);
    });
  });

  describe("invariant — 영구 dismiss 는 'completed' 클릭만 가능", () => {
    it('deferred 후 guide 후 external-close 모두 거쳐도 localStorage 영구화 안 됨', () => {
      applyDismiss(stores, "deferred");
      applyDismiss(stores, "guide");
      applyDismiss(stores, "external-close");
      assert.equal(stores.local.getItem(LS_COMPLETED_KEY), null);
    });

    it("'completed' 클릭 시점에서만 localStorage 기록", () => {
      applyDismiss(stores, "deferred");
      assert.equal(stores.local.getItem(LS_COMPLETED_KEY), null);
      applyDismiss(stores, "completed");
      assert.equal(stores.local.getItem(LS_COMPLETED_KEY), "true");
    });
  });
});
