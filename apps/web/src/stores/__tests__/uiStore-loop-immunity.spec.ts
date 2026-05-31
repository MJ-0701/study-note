// codex cross review (20260531) Required fix 회귀 잠금 — setHomeProps/setIntakeProps
// loop-immunity guard. value-equal 재발행은 store 재방출(=island 재렌더)을 일으키지
// 않아야 한다 (#185 계열 낭비-render 차단). value 가 바뀌면 방출한다.
//
// 실행:
//   node --experimental-strip-types --no-warnings --test \
//     apps/web/src/stores/__tests__/uiStore-loop-immunity.spec.ts
//
// uiStore.ts 의 비-type import = zustand/vanilla 뿐 (나머지는 import type → strip).

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  uiStore,
  setHomeProps,
  setIntakeProps,
  getHomeProps,
  getIntakeProps,
} from "../uiStore.ts";

// HomeViewProps/IntakeViewProps 실제 shape 와 무관 — guard 는 JSON.stringify 비교만 한다.
// plain object 로 value-equality 동작을 검증한다.
const homeA = () => ({ coverageRate: 0.5, covered: 2, total: 4, list: [{ id: "s1" }] });
const intakeA = () => ({ variant: "general", subjects: [{ id: "s1" }], rates: { s1: 0.5 } });

describe("uiStore loop-immunity guard (codex Required 20260531)", () => {
  it("homeProps: value-equal 재발행은 store 재방출 안 함, value 변경/ null 전이는 방출", () => {
    setHomeProps(null); // baseline 정규화

    let emits = 0;
    const unsub = uiStore.subscribe(() => {
      emits += 1;
    });

    setHomeProps(homeA() as never); // null → A : 방출
    assert.equal(emits, 1, "null→A 는 방출");

    const firstRef = getHomeProps();
    setHomeProps(homeA() as never); // 새 ref, 동일 value : skip
    assert.equal(emits, 1, "value-equal 재발행은 방출 안 함");
    assert.equal(getHomeProps(), firstRef, "store ref 유지(동일 객체)");

    setHomeProps({ ...homeA(), covered: 3 } as never); // value 변경 : 방출
    assert.equal(emits, 2, "value 변경은 방출");

    setHomeProps(null); // 비움 : 방출
    assert.equal(emits, 3, "A→null 은 방출");

    unsub();
  });

  it("intakeProps: value-equal 재발행 skip + value 변경 방출", () => {
    setIntakeProps(null);

    let emits = 0;
    const unsub = uiStore.subscribe(() => {
      emits += 1;
    });

    setIntakeProps(intakeA() as never);
    assert.equal(emits, 1, "null→A 방출");

    const firstRef = getIntakeProps();
    setIntakeProps(intakeA() as never);
    assert.equal(emits, 1, "value-equal skip");
    assert.equal(getIntakeProps(), firstRef, "ref 유지");

    setIntakeProps({ ...intakeA(), variant: "subject" } as never);
    assert.equal(emits, 2, "value 변경 방출");

    unsub();
  });
});
