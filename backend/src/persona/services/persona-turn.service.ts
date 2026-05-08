import { Injectable } from "@nestjs/common";
import { ClaudeCliProvider, resolveProviderMode } from "../providers/claude-cli.provider";
import { PersonaService } from "./persona.service";
import { RetrievalService, RetrievedChunk } from "./retrieval.service";

export interface PersonaTurnInput {
  subject: string;
  queryText: string;
  k: number;
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
}

@Injectable()
export class PersonaTurnService {
  constructor(
    private readonly persona: PersonaService,
    private readonly retrieval: RetrievalService,
    private readonly provider: ClaudeCliProvider
  ) {}

  async execute(input: PersonaTurnInput): Promise<PersonaTurnResult> {
    const { subject, queryText, k } = input;

    const archetype = this.persona.archetypeFor(subject);
    if (!archetype) {
      throw new Error(
        `unsupported subject: ${subject}. Sprint-3 supports only digital-engineering. (다음 sprint 에서 4 페르소나 완비 후 라우팅)`
      );
    }

    const chunks = await this.retrieval.retrieveTopK({ subject, queryText, k });
    const isFallback = chunks.length === 0;

    const systemPrompt = this.persona.systemPromptFor(archetype);
    const userMessage = this.composeUserMessage(queryText, chunks);

    const mode = resolveProviderMode();
    const llmResult =
      mode === "fixture"
        ? this.provider.generateFixture(
            { systemPrompt, userMessage },
            { retrievalCount: chunks.length, queryText, k }
          )
        : await this.provider.generate({ systemPrompt, userMessage });

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
        sourcePdfPath: c.sourcePdfPath,
        score: c.score
      })),
      provider: llmResult.provider,
      modelName: llmResult.modelName,
      retrievalCount: chunks.length,
      isFallback
    };
  }

  private composeUserMessage(queryText: string, chunks: RetrievedChunk[]): string {
    if (chunks.length === 0) {
      return queryText;
    }
    const sections = chunks.map(
      (c) => `chunk[${c.ord}]: ${c.text}`
    );
    return [
      "Retrieved PDF chunks:",
      ...sections,
      "",
      `User question: ${queryText}`
    ].join("\n");
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
            `  - 출처: chunk[${c.ord}] (corpus=${c.corpusId.slice(0, 8)}...)`
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
