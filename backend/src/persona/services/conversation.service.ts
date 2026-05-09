// ConversationService: 디공이 multi-turn persistence와 history API를 조율한다.
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { basename } from "node:path";
import { PrismaService } from "../../prisma/prisma.service";
import { AppendConversationTurnRequestDto, CreateConversationRequestDto } from "../dto/conversation.dto";
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

  async create(dto: CreateConversationRequestDto): Promise<ConversationSummaryResponse> {
    const archetype = this.persona.archetypeFor(dto.subject);
    if (!archetype) {
      throw new BadRequestException({
        errorCode: "UNSUPPORTED_SUBJECT",
        errorMessage: `unsupported subject: ${dto.subject}`
      });
    }

    const conversation = await this.prisma.conversation.create({
      data: {
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

  async history(conversationId: string): Promise<ConversationHistoryResponse> {
    assertConversationId(conversationId);
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { turns: { orderBy: { createdAt: "asc" } } }
    });
    if (!conversation) throw notFound();

    return {
      id: conversation.id,
      subject: conversation.subject,
      personaName: conversation.personaName,
      createdAt: conversation.createdAt.toISOString(),
      turns: conversation.turns.map((t) => ({
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
    dto: AppendConversationTurnRequestDto
  ): Promise<PersonaTurnHttpResult> {
    assertConversationId(conversationId);
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId }
    });
    if (!conversation) throw notFound();

    const recentTurns = await this.prisma.turn.findMany({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      take: 3
    });
    const previousTurns: PreviousTurn[] = recentTurns
      .reverse()
      .map((t) => ({ queryText: t.query, responseText: t.response }));

    const result = await this.turn.execute({
      subject: conversation.subject,
      queryText: dto.query,
      k: dto.k ?? 5,
      requestMode: dto.mode,
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

  async runStandalone(dto: PersonaTurnRequestDto): Promise<PersonaTurnHttpResult> {
    const conversation = await this.create({ subject: dto.subject });
    return this.appendTurn(conversation.id, {
      query: dto.query,
      k: dto.k,
      mode: dto.mode
    });
  }
}
