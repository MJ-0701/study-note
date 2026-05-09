// Conversation/Turn HTTP DTO: multi-turn 디공이 대화 API 입력 검증.
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator";

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
}
