import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator";
import { LLM_AGENT_IDS, type LlmAgentId } from "../providers/llm-provider.port";

const LLM_AGENT_VALUES = [...LLM_AGENT_IDS];

// sprint-5 plan §3 AC1, AC3 — POST /api/v1/persona-turns body shape.
// `mode` 가 D-S5-3 (b) 의 requestMode (sprint-3 routing 우선순위 lock).
export class PersonaTurnRequestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  subject!: string;

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
