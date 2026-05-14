// ConversationService spec: bearer id negative case와 safe source snapshot을 검증한다.
import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import type { PrismaService } from "@study-note/corpus";
import { ConversationService } from "../conversation.service";
import type { PersonaTurnService } from "../persona-turn.service";
import { PersonaService } from "../persona.service";

const VALID_CONVERSATION_ID = "cmulti0000000000000000000";

function makePrismaStub() {
  const createdTurns: unknown[] = [];
  return {
    createdTurns,
    conversation: {
      async create(args: { data: { subject: string; personaName: string } }) {
        return {
          id: VALID_CONVERSATION_ID,
          subject: args.data.subject,
          personaName: args.data.personaName,
          createdAt: new Date("2026-05-09T00:00:00.000Z")
        };
      },
      async findFirst(args: { where: { id: string; ownerId?: string }; include?: unknown }) {
        if (args.where.id !== VALID_CONVERSATION_ID) return null;
        if (args.include) {
          return {
            id: VALID_CONVERSATION_ID,
            subject: "digital-engineering",
            personaName: "디공이",
            createdAt: new Date("2026-05-09T00:00:00.000Z"),
            turns: []
          };
        }
        return {
          id: VALID_CONVERSATION_ID,
          subject: "digital-engineering",
          personaName: "디공이",
          createdAt: new Date("2026-05-09T00:00:00.000Z")
        };
      }
    },
    turn: {
      async findMany() {
        return [
          { query: "q1", response: "a1" },
          { query: "q2", response: "a2" }
        ];
      },
      async create(args: { data: unknown }) {
        createdTurns.push(args.data);
        return {
          id: "cmulti0000000000000000001",
          createdAt: new Date("2026-05-09T00:00:01.000Z")
        };
      }
    }
  };
}

describe("ConversationService", () => {
  it("rejects malformed conversation ids before data access", async () => {
    const prisma = makePrismaStub();
    const service = new ConversationService(
      prisma as unknown as PrismaService,
      new PersonaService(),
      {} as unknown as PersonaTurnService
    );

    await assert.rejects(
      () => service.history("not-a-cuid", "user-test"),
      (err) => err instanceof BadRequestException
    );
  });

  it("returns 404 for unknown high-entropy conversation id", async () => {
    const prisma = makePrismaStub();
    const service = new ConversationService(
      prisma as unknown as PrismaService,
      new PersonaService(),
      {} as unknown as PersonaTurnService
    );

    await assert.rejects(
      () => service.history("cmulti0000000000000009999", "user-test"),
      (err) => err instanceof NotFoundException
    );
  });

  it("persists safe source labels and passes previous turns to PersonaTurnService", async () => {
    const prisma = makePrismaStub();
    let capturedInput: unknown;
    const turn = {
      async execute(input: unknown) {
        capturedInput = input;
        return {
          personaName: "디공이",
          subject: "digital-engineering",
          query: "현재 질문",
          k: 5,
          response: "[디공이] ...",
          sources: [
            {
              ord: 0,
              corpusId: "cmovexample0001abcd",
              sourcePdfPath: "/Users/mj/private/de.pdf",
              score: 0.9
            }
          ],
          provider: "claude-cli-fixture",
          modelName: "claude-cli@stub-fixture",
          retrievalCount: 1,
          isFallback: false
        };
      }
    } as unknown as PersonaTurnService;

    const service = new ConversationService(
      prisma as unknown as PrismaService,
      new PersonaService(),
      turn
    );
    const result = await service.appendTurn(VALID_CONVERSATION_ID, {
      query: "현재 질문",
      mode: "real",
      agent: "gemini-cli"
    }, "user-test");

    assert.match(JSON.stringify(capturedInput), /previousTurns/);
    assert.match(JSON.stringify(capturedInput), /"requestAgent":"gemini-cli"/);
    assert.equal(result.sources[0]?.sourcePdfPath, "de.pdf");
    assert.ok(!JSON.stringify(prisma.createdTurns).includes("/Users/mj/private"));
  });

  it("history() preserves sprint-1 stored provider/modelName strings (sprint-2 AC4 backward compat)", async () => {
    const storedTurn = {
      id: "cmulti0000000000000000999",
      conversationId: VALID_CONVERSATION_ID,
      subject: "digital-engineering",
      query: "지난 질문",
      k: 3,
      response: "[디공이] 이전 응답",
      sources: [{ ord: 1, corpusId: "cmovexample0001abcd", sourcePdfPath: "de.pdf", score: 0.7 }],
      // sprint-1 stored shape: raw string provider/modelName (3-layer 도입 전)
      provider: "claude-cli-fixture",
      modelName: "claude-cli@stub-fixture",
      retrievalCount: 1,
      isFallback: false,
      createdAt: new Date("2026-05-09T00:00:00.500Z")
    };
    const prismaWithTurn = {
      conversation: {
        async findFirst(args: { where: { id: string; ownerId?: string }; include?: unknown }) {
          if (args.where.id !== VALID_CONVERSATION_ID) return null;
          if (args.include) {
            return {
              id: VALID_CONVERSATION_ID,
              subject: "digital-engineering",
              personaName: "디공이",
              createdAt: new Date("2026-05-09T00:00:00.000Z"),
              turns: [storedTurn]
            };
          }
          return null;
        }
      },
      turn: { async findMany() { return []; }, async create() { return {}; } }
    };
    const service = new ConversationService(
      prismaWithTurn as unknown as PrismaService,
      new PersonaService(),
      {} as unknown as PersonaTurnService
    );

    const result = await service.history(VALID_CONVERSATION_ID, "user-test");
    assert.equal(result.turns.length, 1);
    // sprint-2 invariant: stored string provider/modelName 그대로 통과 (Q5=A backward compat)
    assert.equal(result.turns[0]?.provider, "claude-cli-fixture");
    assert.equal(result.turns[0]?.modelName, "claude-cli@stub-fixture");
  });
});
