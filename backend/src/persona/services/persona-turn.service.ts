import { Injectable } from "@nestjs/common";
import { basename } from "node:path";
import { ClaudeCliProvider, resolveProviderMode } from "../providers/claude-cli.provider";
import { PersonaService } from "./persona.service";
import { RetrievalService, RetrievedChunk } from "./retrieval.service";

function pdfBasename(p: string): string {
  if (!p) return "<unknown>";
  if (p.startsWith("smoke://")) return p.replace("smoke://", "");
  return basename(p);
}

function sourceLabel(p: string): string {
  return pdfBasename(p);
}

export interface PreviousTurn {
  queryText: string;
  responseText: string;
}

export interface PersonaTurnInput {
  subject: string;
  queryText: string;
  k: number;
  /** sprint-5 D-S5-3 b additive — HTTP body 의 mode flag 가 routing priority lock. */
  requestMode?: "fixture" | "real";
  /** sprint-1 multi-turn — last N=3 previous turns only. */
  previousTurns?: PreviousTurn[];
  conversationId?: string;
}

export interface PersonaTurnSource {
  ord: number;
  corpusId: string;
  sourcePdfPath: string;
  score: number;
}

export interface PersonaTurnResult {
  personaName: string;
  subject: string;
  query: string;
  k: number;
  response: string;
  sources: PersonaTurnSource[];
  provider: string;
  modelName: string;
  retrievalCount: number;
  isFallback: boolean;
  conversationId?: string;
  turnId?: string;
  createdAt?: string;
}

@Injectable()
export class PersonaTurnService {
  constructor(
    private readonly persona: PersonaService,
    private readonly retrieval: RetrievalService,
    private readonly provider: ClaudeCliProvider
  ) {}

  async execute(input: PersonaTurnInput): Promise<PersonaTurnResult> {
    const { subject, queryText, k, requestMode } = input;

    const archetype = this.persona.archetypeFor(subject);
    if (!archetype) {
      throw new Error(
        `unsupported subject: ${subject}. Sprint-3 supports only digital-engineering. (다음 sprint 에서 4 페르소나 완비 후 라우팅)`
      );
    }

    const chunks = await this.retrieval.retrieveTopK({ subject, queryText, k });
    const isFallback = chunks.length === 0;

    const systemPrompt = this.persona.systemPromptFor(archetype);
    const retrievedChunks = chunks.map((c) => ({ ord: c.ord, text: c.text }));
    const previousTurns = (input.previousTurns ?? []).slice(-3);

    const mode = resolveProviderMode(process.env, requestMode);
    let llmResult;
    if (isFallback) {
      // ADR 0004 (b) invariant — when retrieval is empty, neither fixture nor
      // real provider is allowed to fabricate teaching. Force a deterministic
      // refusal at the service layer so cloud send is never reached and the
      // "출처 없는 임의 teaching 금지" rule holds across providers.
      llmResult = this.provider.generateFixture(
        { systemPrompt, userMessage: queryText, previousTurns },
        { retrievalCount: 0, queryText, k }
      );
    } else if (mode === "fixture") {
      llmResult = this.provider.generateFixture(
        { systemPrompt, userMessage: queryText, previousTurns, retrievedChunks },
        { retrievalCount: chunks.length, queryText, k }
      );
    } else {
      llmResult = await this.provider.generate({
        systemPrompt,
        userMessage: queryText,
        previousTurns,
        retrievedChunks
      });
    }

    const response = this.formatResponse({
      personaName: archetype.name,
      provider: llmResult.provider,
      rawText: llmResult.text,
      chunks,
      queryText,
      isFallback
    });

    return {
      personaName: archetype.name,
      subject,
      query: queryText,
      k,
      response,
      sources: chunks.map((c) => ({
        ord: c.ord,
        corpusId: c.corpusId,
        sourcePdfPath: sourceLabel(c.sourcePdfPath),
        score: c.score
      })),
      provider: llmResult.provider,
      modelName: llmResult.modelName,
      retrievalCount: chunks.length,
      isFallback
    };
  }

  /**
   * Wrap the LLM raw text with persona invariant cues — this is the SSoT
   * for §3.5 transcript invariants. Provider response (fixture or real)
   * supplies *content*, formatter supplies *cues* so the contract stays
   * stable across provider swaps (codex Gate 3 round 3 finding 2).
   */
  private formatResponse(args: {
    personaName: string;
    provider: string;
    rawText: string;
    chunks: RetrievedChunk[];
    queryText: string;
    isFallback: boolean;
  }): string {
    const header = `[${args.personaName}] (provider: ${args.provider})`;
    const sourceLines = args.isFallback
      ? ["  - 출처: 없음 (corpus 비어있음)"]
      : args.chunks.map(
          (c) =>
            `  - 출처: chunk[${c.ord}] (pdf=${pdfBasename(c.sourcePdfPath)}, corpus=${c.corpusId.slice(0, 8)}...)`
        );
    const followUp = args.isFallback
      ? "다음 단계로 npm run ingest:pdf 로 PDF 1개 ingest 후 다시 물어볼래?"
      : `${args.queryText} 의 어느 부분부터 짚어줄까?`;

    return [
      header,
      args.rawText.trim(),
      "",
      ...sourceLines,
      "",
      followUp
    ].join("\n");
  }
}
