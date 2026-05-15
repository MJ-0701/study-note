// Conversation/Turn HTTP DTO: multi-turn 디공이 대화 API 입력 검증.
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from "class-validator";
import { LLM_AGENT_IDS, type LlmAgentId } from "../providers/llm-provider.port";

const LLM_AGENT_VALUES = [...LLM_AGENT_IDS];

// sprint-3 의 subject slug 와 동일 패턴 — Shield Pattern.
const SUBJECT_SLUG_PATTERN = /^[a-z][a-z0-9-]{0,63}$/;

export class CreateConversationRequestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  subject!: string;
}

// sprint-8 slice-1 — GET /v1/conversations 의 query param. subject 는 선택적
// filter. Shield Pattern: regex + length. 위반 시 global ValidationPipe 가
// VALIDATION_ERROR 400 emit.
export class ListConversationsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Matches(SUBJECT_SLUG_PATTERN, {
    message: "subject must match ^[a-z][a-z0-9-]{0,63}$"
  })
  subject?: string;
}

export class AppendConversationTurnRequestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  query!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  k?: number;

  @IsOptional()
  @IsIn(["fixture", "real"])
  mode?: "fixture" | "real";

  @IsOptional()
  @IsIn(LLM_AGENT_VALUES)
  agent?: LlmAgentId;
}
