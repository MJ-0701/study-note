// ConversationService spec: bearer id negative case와 safe source snapshot을 검증한다.
import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import type { PrismaService } from "@study-note/corpus";
import { ConversationService, deriveTitleFromQuery } from "../conversation.service";
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

  // sprint-8 slice-1 — list() + deriveTitleFromQuery() (AC1 + AC1-amend).
  describe("deriveTitleFromQuery (sprint-8 slice-1, AC1-amend PII redact)", () => {
    it("empty / nullish → (빈 대화) placeholder", () => {
      assert.equal(deriveTitleFromQuery(null), "(빈 대화)");
      assert.equal(deriveTitleFromQuery(undefined), "(빈 대화)");
      assert.equal(deriveTitleFromQuery(""), "(빈 대화)");
      assert.equal(deriveTitleFromQuery("   "), "(빈 대화)");
    });

    it("≤40자 trimmed query 그대로", () => {
      assert.equal(deriveTitleFromQuery("디지털 회로 1주차 요약해줘"), "디지털 회로 1주차 요약해줘");
    });

    it("41자 이상 → 39자 + …", () => {
      // 의도: 64자 한글 query. hex token regex `[a-f0-9]{32,}` 와 학번 `\d{8}`
      // 모두 미매치 → redact 영향 없이 truncate 만 발생.
      const long = "회로 분석 질문 ".repeat(8); // 64자
      const out = deriveTitleFromQuery(long);
      assert.equal(out.length, 40);
      assert.ok(out.endsWith("…"));
    });

    it("hex token regex 가 aggressive — 32자+ [a-f0-9] 연속이면 redact (의도된 동작)", () => {
      // 실제 사용자 query 에 32자 연속 `[a-f0-9]` 가 나오는 경우는 토큰 / 해시 뿐.
      // 학습 query 한글/공백 섞이면 자동 회피. 본 케이스는 redactor 의 안전판 검증.
      const out = deriveTitleFromQuery("a".repeat(60));
      assert.equal(out, "[redacted]");
    });

    it("학번 8자리 redact", () => {
      const out = deriveTitleFromQuery("내 학번은 20260001 인데 회로 좀");
      assert.ok(!/\d{8}/.test(out), `학번 8자리 누설: ${out}`);
      assert.ok(out.includes("[redacted]"));
    });

    it("토큰 hex (32자+) redact", () => {
      const token = "deadbeefcafef00d1234567890abcdef";
      const out = deriveTitleFromQuery(`token ${token} 봐줘`);
      assert.ok(!/[a-f0-9]{32,}/i.test(out), `hex 토큰 누설: ${out}`);
      assert.ok(out.includes("[redacted]"));
    });

    it("학번 + 토큰 둘 다 redact", () => {
      const token = "abcd1234abcd1234abcd1234abcd1234";
      const out = deriveTitleFromQuery(`학번 20260001 token ${token}`);
      assert.ok(!/\d{8}/.test(out));
      assert.ok(!/[a-f0-9]{32,}/i.test(out));
    });
  });

  describe("list() (sprint-8 slice-1, AC1)", () => {
    function makeListPrismaStub(rows: any[]) {
      return {
        conversation: {
          async findMany(args: any) {
            // ownerId filter assertion (cross-owner leak X).
            assert.ok(args.where?.ownerId, "list() must filter by ownerId");
            return rows.filter((r) => r.__ownerId === args.where.ownerId)
              .filter((r) => !args.where.subject || r.subject === args.where.subject);
          }
        },
        turn: { async findMany() { return []; }, async create() { return {}; } }
      };
    }

    it("ownerId 일치 row 만 반환, cross-owner row 미노출", async () => {
      const rows = [
        {
          __ownerId: "user-mine",
          id: "cmlist0000000000000000001",
          subject: "digital-engineering",
          personaName: "디공이",
          createdAt: new Date("2026-05-09T00:00:00.000Z"),
          updatedAt: new Date("2026-05-09T00:00:01.000Z"),
          _count: { turns: 2 },
          turns: [{ query: "내 질문 1" }]
        },
        {
          __ownerId: "user-other",
          id: "cmlist0000000000000000002",
          subject: "digital-engineering",
          personaName: "디공이",
          createdAt: new Date("2026-05-09T00:00:00.000Z"),
          updatedAt: new Date("2026-05-09T00:00:02.000Z"),
          _count: { turns: 1 },
          turns: [{ query: "다른 사람 질문" }]
        }
      ];
      const prisma = makeListPrismaStub(rows);
      const service = new ConversationService(
        prisma as unknown as PrismaService,
        new PersonaService(),
        {} as unknown as PersonaTurnService
      );

      const list = await service.list("user-mine", {});
      assert.equal(list.length, 1);
      assert.equal(list[0]?.id, "cmlist0000000000000000001");
      assert.equal(list[0]?.derivedTitle, "내 질문 1");
      assert.equal(list[0]?.turnCount, 2);
    });

    it("subject query param filter 동작", async () => {
      const rows = [
        {
          __ownerId: "u1",
          id: "cmlist0000000000000000010",
          subject: "digital-engineering",
          personaName: "디공이",
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { turns: 0 },
          turns: []
        },
        {
          __ownerId: "u1",
          id: "cmlist0000000000000000011",
          subject: "linear-algebra",
          personaName: "씨랭이",
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { turns: 0 },
          turns: []
        }
      ];
      const prisma = makeListPrismaStub(rows);
      const service = new ConversationService(
        prisma as unknown as PrismaService,
        new PersonaService(),
        {} as unknown as PersonaTurnService
      );

      const list = await service.list("u1", { subject: "linear-algebra" });
      assert.equal(list.length, 1);
      assert.equal(list[0]?.subject, "linear-algebra");
    });

    it("turn 0 conversation → derivedTitle = (빈 대화)", async () => {
      const rows = [{
        __ownerId: "u1",
        id: "cmlist0000000000000000020",
        subject: "digital-engineering",
        personaName: "디공이",
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { turns: 0 },
        turns: []
      }];
      const prisma = makeListPrismaStub(rows);
      const service = new ConversationService(
        prisma as unknown as PrismaService,
        new PersonaService(),
        {} as unknown as PersonaTurnService
      );

      const list = await service.list("u1", {});
      assert.equal(list[0]?.derivedTitle, "(빈 대화)");
      assert.equal(list[0]?.turnCount, 0);
    });

    it("학번 8자리 포함 query → derivedTitle redacted (AC1-amend smoke 회귀 가드)", async () => {
      const rows = [{
        __ownerId: "u1",
        id: "cmlist0000000000000000030",
        subject: "digital-engineering",
        personaName: "디공이",
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { turns: 1 },
        turns: [{ query: "20260001 회로 좀 봐줘" }]
      }];
      const prisma = makeListPrismaStub(rows);
      const service = new ConversationService(
        prisma as unknown as PrismaService,
        new PersonaService(),
        {} as unknown as PersonaTurnService
      );

      const list = await service.list("u1", {});
      assert.ok(!/\d{8}/.test(list[0]!.derivedTitle));
      assert.ok(list[0]!.derivedTitle.includes("[redacted]"));
    });
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
