// ConversationController spec: split REST shape와 security-negative 계약을 검증한다.
import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { ConversationController } from "../conversation.controller";
import {
  AppendConversationTurnRequestDto,
  CreateConversationRequestDto
} from "../dto/conversation.dto";
import type {
  ConversationHistoryResponse,
  ConversationService,
  ConversationSummaryResponse,
  PersonaTurnHttpResult
} from "../services/conversation.service";

describe("Conversation DTO validation", () => {
  it("accepts create conversation subject", async () => {
    const dto = plainToInstance(CreateConversationRequestDto, {
      subject: "digital-engineering"
    });
    const errors = await validate(dto);
    assert.equal(errors.length, 0);
  });

  it("rejects append turn without query", async () => {
    const dto = plainToInstance(AppendConversationTurnRequestDto, { k: 3 });
    const errors = await validate(dto);
    assert.ok(errors.length > 0);
    assert.equal(errors[0]?.property, "query");
  });

  it("rejects invalid real/fixture mode", async () => {
    const dto = plainToInstance(AppendConversationTurnRequestDto, {
      query: "반가산기",
      mode: "cloud"
    });
    const errors = await validate(dto);
    assert.ok(errors.length > 0);
    assert.equal(errors[0]?.property, "mode");
  });
});

describe("ConversationController", () => {
  it("creates, appends, and fetches history through ConversationService", async () => {
    const created: ConversationSummaryResponse = {
      id: "cmulti0000000000000000000",
      subject: "digital-engineering",
      personaName: "디공이",
      createdAt: "2026-05-09T00:00:00.000Z"
    };
    const appended: PersonaTurnHttpResult = {
      personaName: "디공이",
      subject: "digital-engineering",
      query: "반가산기",
      k: 5,
      response: "[디공이] ...",
      sources: [],
      provider: "claude-cli-fixture",
      modelName: "claude-cli@stub-fixture",
      retrievalCount: 0,
      isFallback: true,
      conversationId: created.id,
      turnId: "cmulti0000000000000000001",
      createdAt: "2026-05-09T00:00:01.000Z"
    };
    const history: ConversationHistoryResponse = { ...created, turns: [appended] };

    const calls: string[] = [];
    const fakeService = {
      async create(dto: CreateConversationRequestDto) {
        calls.push(`create:${dto.subject}`);
        return created;
      },
      async appendTurn(id: string, dto: AppendConversationTurnRequestDto) {
        calls.push(`append:${id}:${dto.query}`);
        return appended;
      },
      async history(id: string) {
        calls.push(`history:${id}`);
        return history;
      }
    } as unknown as ConversationService;

    const controller = new ConversationController(fakeService);
    assert.equal(
      await controller.create({ subject: "digital-engineering" }),
      created
    );
    assert.equal(
      await controller.appendTurn(created.id, { query: "반가산기" }),
      appended
    );
    assert.equal(await controller.history(created.id), history);
    assert.deepEqual(calls, [
      "create:digital-engineering",
      "append:cmulti0000000000000000000:반가산기",
      "history:cmulti0000000000000000000"
    ]);
  });
});
