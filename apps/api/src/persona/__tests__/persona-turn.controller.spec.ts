import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import {
  PersonaTurnRequestDto,
  type ConversationService,
  type PersonaTurnHttpResult
} from "@study-note/persona-engine";
import { PersonaTurnController } from "../persona-turn.controller";

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

  it("accepts valid {subject, query, k, mode, agent}", async () => {
    const dto = plainToInstance(PersonaTurnRequestDto, {
      subject: "digital-engineering",
      query: "반가산기",
      k: 3,
      mode: "fixture",
      agent: "gemini-cli"
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

  it("rejects agent outside supported CLI adapters", async () => {
    const dto = plainToInstance(PersonaTurnRequestDto, {
      subject: "digital-engineering",
      query: "test",
      agent: "claude-only"
    });
    const errors = await validate(dto);
    assert.ok(errors.length > 0);
    assert.equal(errors[0]?.property, "agent");
  });
});

describe("PersonaTurnController.run (AC4 happy path)", () => {
  it("delegates to ConversationService.runStandalone + propagates additive result", async () => {
    const stubResult: PersonaTurnHttpResult = {
      personaName: "디공이",
      subject: "digital-engineering",
      query: "반가산기",
      k: 3,
      response: "[디공이] FIXTURE: ...",
      sources: [],
      provider: "claude-cli-fixture",
      modelName: "claude-cli@stub-fixture",
      retrievalCount: 0,
      isFallback: true,
      conversationId: "cmulti0000000000000000000",
      turnId: "cmulti0000000000000000001",
      createdAt: "2026-05-09T00:00:00.000Z"
    };

    let capturedInput: PersonaTurnRequestDto | undefined;
    const fakeService = {
      async runStandalone(dto: PersonaTurnRequestDto) {
        capturedInput = dto;
        return stubResult;
      }
    } as unknown as ConversationService;

    const controller = new PersonaTurnController(fakeService);
    const dto = plainToInstance(PersonaTurnRequestDto, {
      subject: "digital-engineering",
      query: "반가산기",
      k: 3,
      mode: "real",
      agent: "gemini-cli"
    });
    const result = await controller.run(dto);

    assert.equal(capturedInput, dto);
    assert.equal(result, stubResult);
  });

  it("preserves omitted k for compatibility wrapper to default downstream", async () => {
    let capturedInput: PersonaTurnRequestDto | undefined;
    const fakeService = {
      async runStandalone(dto: PersonaTurnRequestDto) {
        capturedInput = dto;
        return { k: dto.k ?? 5 } as unknown as PersonaTurnHttpResult;
      }
    } as unknown as ConversationService;

    const controller = new PersonaTurnController(fakeService);
    const dto = plainToInstance(PersonaTurnRequestDto, {
      subject: "digital-engineering",
      query: "test"
    });
    await controller.run(dto);
    assert.equal(capturedInput?.k, undefined);
  });
});
