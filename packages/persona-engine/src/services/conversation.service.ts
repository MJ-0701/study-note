// ConversationService: 디공이 multi-turn persistence와 history API를 조율한다.
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { basename } from "node:path";
import { PrismaService } from "@study-note/corpus";
import {
  AppendConversationTurnRequestDto,
  CreateConversationRequestDto,
  ListConversationsQueryDto
} from "../dto/conversation.dto";
import { PersonaTurnRequestDto } from "../dto/persona-turn-request.dto";
import {
  PersonaTurnResult,
  PersonaTurnSource,
  PreviousTurn,
  PersonaTurnService
} from "./persona-turn.service";
import { PersonaService } from "./persona.service";

const CUID_PATTERN = /^c[a-z0-9]{24,}$/i;

export interface ConversationSummaryResponse {
  id: string;
  subject: string;
  personaName: string;
  createdAt: string;
}

export interface ConversationTurnResponse {
  turnId: string;
  conversationId: string;
  subject: string;
  query: string;
  k: number;
  response: string;
  sources: PersonaTurnSource[];
  provider: string;
  modelName: string;
  retrievalCount: number;
  isFallback: boolean;
  createdAt: string;
}

export interface ConversationHistoryResponse extends ConversationSummaryResponse {
  turns: ConversationTurnResponse[];
}

// sprint-8 slice-1 — GET /v1/conversations response item.
// derivedTitle = 첫 Turn query 의 40자 truncate + PII redact (학번 / 토큰 hex).
// turnCount = Prisma `_count: { turns: true }` 단일 호출 (N+1 회피, plan §6 R-4).
export interface ConversationListItem {
  id: string;
  subject: string;
  personaName: string;
  derivedTitle: string;
  createdAt: string;
  updatedAt: string;
  turnCount: number;
}

export type PersonaTurnHttpResult = PersonaTurnResult & {
  conversationId: string;
  turnId: string;
  createdAt: string;
};

function assertConversationId(id: string): void {
  if (!CUID_PATTERN.test(id)) {
    throw new BadRequestException({
      errorCode: "INVALID_CONVERSATION_ID",
      errorMessage: "conversation id is malformed"
    });
  }
}

function notFound(): NotFoundException {
  return new NotFoundException({
    errorCode: "CONVERSATION_NOT_FOUND",
    errorMessage: "conversation not found"
  });
}

function safeSourceLabel(p: string): string {
  if (!p) return "<unknown>";
  if (p.startsWith("smoke://")) return p.replace("smoke://", "");
  return basename(p);
}

// sprint-8 slice-1 — derivedTitle 의 PII redact + truncate.
// 1) hex 토큰 (32자+ `[a-f0-9]`) 우선 + 학번 (`\d{8}`) 단일 alternation 매치 →
//    `[redacted]` 로 치환. PR #8 P2 fix: 순차 replace (학번→hex) 가 hex 안의
//    8자리 digit run 을 먼저 가르고 leak 시키는 버그 → 단일 regex 로 일괄 처리.
//    alternation 좌측 hex 우선이라 `12345678abcdef...` 같은 hex 토큰은 전체가
//    한 번에 redact (학번 분리 X).
// 2) trim 후 40자 초과면 39자 + `…` 로 축약.
// 3) empty / nullish input → `(빈 대화)` placeholder (AC1).
const PII_REDACT_RE = /[a-f0-9]{32,}|\d{8}/gi;
const MAX_TITLE_LEN = 40;
const EMPTY_TITLE_PLACEHOLDER = "(빈 대화)";

export function deriveTitleFromQuery(query: string | null | undefined): string {
  if (!query) return EMPTY_TITLE_PLACEHOLDER;
  const trimmed = query.trim();
  if (trimmed.length === 0) return EMPTY_TITLE_PLACEHOLDER;
  const redacted = trimmed.replace(PII_REDACT_RE, "[redacted]");
  if (redacted.length <= MAX_TITLE_LEN) return redacted;
  return `${redacted.slice(0, MAX_TITLE_LEN - 1)}…`;
}

function safeSources(sources: PersonaTurnSource[]): PersonaTurnSource[] {
  return sources.map((s) => ({
    ...s,
    sourcePdfPath: safeSourceLabel(s.sourcePdfPath)
  }));
}

@Injectable()
export class ConversationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly persona: PersonaService,
    private readonly turn: PersonaTurnService
  ) {}

  async create(
    dto: CreateConversationRequestDto,
    ownerId: string
  ): Promise<ConversationSummaryResponse> {
    const archetype = this.persona.archetypeFor(dto.subject);
    if (!archetype) {
      throw new BadRequestException({
        errorCode: "UNSUPPORTED_SUBJECT",
        errorMessage: `unsupported subject: ${dto.subject}`
      });
    }

    // codex PR review 적용 — ownerId 를 인증 사용자 (req.user.id) 에서 derive.
    // 이전 hardcode "user-dev-1" 제거 (sprint-2 handoff #6 carry).
    const conversation = await this.prisma.conversation.create({
      data: {
        ownerId,
        subject: dto.subject,
        personaName: archetype.name
      }
    });
    return {
      id: conversation.id,
      subject: conversation.subject,
      personaName: conversation.personaName,
      createdAt: conversation.createdAt.toISOString()
    };
  }

  // sprint-8 slice-1 — GET /v1/conversations 의 service 메서드.
  // - cookie-auth ownerId 필터 단독 (cross-owner leak X, plan §4.1).
  // - subject query param 시 추가 filter (Shield Pattern 은 DTO 에서).
  // - 무제한 (D5=c lock).
  // - turnCount 는 Prisma `_count` 로 N+1 회피.
  // - derivedTitle 은 첫 turn query 의 PII redact + 40자 truncate.
  // - 정렬은 최근 활동 우선 (updatedAt desc) — sidebar "최근 대화" 의미와 일치.
  async list(
    ownerId: string,
    query: ListConversationsQueryDto = {}
  ): Promise<ConversationListItem[]> {
    const where: Record<string, unknown> = { ownerId };
    if (query.subject) where.subject = query.subject;

    const rows: any[] = await this.prisma.conversation.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { turns: true } },
        turns: {
          orderBy: { createdAt: "asc" },
          take: 1,
          select: { query: true }
        }
      }
    });

    return rows.map((c) => ({
      id: c.id,
      subject: c.subject,
      personaName: c.personaName,
      derivedTitle: deriveTitleFromQuery(c.turns[0]?.query),
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      turnCount: c._count.turns
    }));
  }

  async history(
    conversationId: string,
    ownerId: string
  ): Promise<ConversationHistoryResponse> {
    assertConversationId(conversationId);
    // codex PR review 적용 — owner scoping. 다른 ownerId 가 conversation ID 알아도 미접근.
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, ownerId },
      include: { turns: { orderBy: { createdAt: "asc" } } }
    });
    if (!conversation) throw notFound();

    return {
      id: conversation.id,
      subject: conversation.subject,
      personaName: conversation.personaName,
      createdAt: conversation.createdAt.toISOString(),
      turns: conversation.turns.map((t: any) => ({
        turnId: t.id,
        conversationId: t.conversationId,
        subject: t.subject,
        query: t.query,
        k: t.k,
        response: t.response,
        sources: t.sources as unknown as PersonaTurnSource[],
        provider: t.provider,
        modelName: t.modelName,
        retrievalCount: t.retrievalCount,
        isFallback: t.isFallback,
        createdAt: t.createdAt.toISOString()
      }))
    };
  }

  async appendTurn(
    conversationId: string,
    dto: AppendConversationTurnRequestDto,
    ownerId: string
  ): Promise<PersonaTurnHttpResult> {
    assertConversationId(conversationId);
    // codex PR review 적용 — owner scoping. cross-user append 차단.
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, ownerId }
    });
    if (!conversation) throw notFound();

    const recentTurns = await this.prisma.turn.findMany({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      take: 3
    });
    const previousTurns: PreviousTurn[] = recentTurns
      .reverse()
      .map((t: any) => ({ queryText: t.query, responseText: t.response }));

    const result = await this.turn.execute({
      subject: conversation.subject,
      queryText: dto.query,
      k: dto.k ?? 5,
      requestMode: dto.mode,
      requestAgent: dto.agent,
      conversationId,
      previousTurns
    });

    const safeResult = { ...result, sources: safeSources(result.sources) };
    const persisted = await this.prisma.turn.create({
      data: {
        conversationId,
        subject: safeResult.subject,
        query: safeResult.query,
        k: safeResult.k,
        response: safeResult.response,
        sources: safeResult.sources as unknown as object,
        provider: safeResult.provider,
        modelName: safeResult.modelName,
        retrievalCount: safeResult.retrievalCount,
        isFallback: safeResult.isFallback
      }
    });

    return {
      ...safeResult,
      conversationId,
      turnId: persisted.id,
      createdAt: persisted.createdAt.toISOString()
    };
  }

  async runStandalone(
    dto: PersonaTurnRequestDto,
    ownerId: string
  ): Promise<PersonaTurnHttpResult> {
    const conversation = await this.create({ subject: dto.subject }, ownerId);
    return this.appendTurn(conversation.id, {
      query: dto.query,
      k: dto.k,
      mode: dto.mode,
      agent: dto.agent
    }, ownerId);
  }
}
