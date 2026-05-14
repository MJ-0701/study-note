// Conversation/Turn HTTP DTO: multi-turn 디공이 대화 API 입력 검증.
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator";
import { LLM_AGENT_IDS, type LlmAgentId } from "../providers/llm-provider.port";

const LLM_AGENT_VALUES = [...LLM_AGENT_IDS];

export class CreateConversationRequestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  subject!: string;
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
