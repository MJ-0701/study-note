import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { PersonaTurnRequestDto } from "../dto/persona-turn-request.dto";
import { PersonaTurnController } from "../persona-turn.controller";
import type { PersonaTurnResult, PersonaTurnService } from "../services/persona-turn.service";

// sprint-5 plan §3 AC4 — persona-turn controller 단위 테스트 (validation + happy path).
// HTTP transport (NestApplicationContext + supertest) 대신 controller 메서드를 직접 호출
// + DTO 를 class-validator 로 검증. NestJS 가 controller 단위 테스트에 이 패턴 권장.

describe("PersonaTurnRequestDto validation (AC3)", () => {
  it("rejects missing subject", async () => {
    const dto = plainToInstance(PersonaTurnRequestDto, { query: "test" });
    const errors = await validate(dto);
    assert.ok(errors.length > 0, "expected validation errors when subject missing");
    assert.equal(errors[0]?.property, "subject");
  });

  it("accepts valid {subject, query, k, mode}", async () => {
    const dto = plainToInstance(PersonaTurnRequestDto, {
      subject: "digital-engineering",
      query: "반가산기",
      k: 3,
      mode: "fixture"
    });
    const errors = await validate(dto);
    assert.equal(errors.length, 0, `expected 0 errors, got: ${JSON.stringify(errors)}`);
  });

  it("rejects mode outside {fixture, real}", async () => {
    const dto = plainToInstance(PersonaTurnRequestDto, {
      subject: "digital-engineering",
      query: "test",
      mode: "cloud"
    });
    const errors = await validate(dto);
    assert.ok(errors.length > 0);
    assert.equal(errors[0]?.property, "mode");
  });
});

describe("PersonaTurnController.run (AC4 happy path)", () => {
  it("delegates to PersonaTurnService.execute with correct shape + propagates result", async () => {
    const stubResult: PersonaTurnResult = {
      personaName: "디공이",
      subject: "digital-engineering",
      query: "반가산기",
      k: 3,
      response: "[디공이] FIXTURE: ...",
      sources: [],
      provider: "claude-cli-fixture",
      modelName: "claude-cli@stub-fixture",
      retrievalCount: 0,
      isFallback: true
    };

    let capturedInput: unknown;
    const fakeService = {
      async execute(input: unknown) {
        capturedInput = input;
        return stubResult;
      }
    } as unknown as PersonaTurnService;

    const controller = new PersonaTurnController(fakeService);
    const dto = plainToInstance(PersonaTurnRequestDto, {
      subject: "digital-engineering",
      query: "반가산기",
      k: 3,
      mode: "real"
    });
    const result = await controller.run(dto);

    assert.deepEqual(capturedInput, {
      subject: "digital-engineering",
      queryText: "반가산기",
      k: 3,
      requestMode: "real"
    });
    assert.equal(result, stubResult);
  });

  it("defaults k to 5 when omitted", async () => {
    let capturedInput: { k: number } | undefined;
    const fakeService = {
      async execute(input: { k: number }) {
        capturedInput = input;
        return { k: input.k } as unknown as PersonaTurnResult;
      }
    } as unknown as PersonaTurnService;

    const controller = new PersonaTurnController(fakeService);
    const dto = plainToInstance(PersonaTurnRequestDto, {
      subject: "digital-engineering",
      query: "test"
    });
    await controller.run(dto);
    assert.equal(capturedInput?.k, 5);
  });
});
