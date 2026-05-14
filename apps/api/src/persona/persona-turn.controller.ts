import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { SessionAuthGuard } from "@study-note/auth";
import type { UserProfile } from "@study-note/domain";
import {
  ConversationService,
  PersonaTurnHttpResult,
  PersonaTurnRequestDto
} from "@study-note/persona-engine";

interface NestRequest {
  user?: UserProfile;
}

// sprint-5 plan §3 AC1 + R1 — sprint-3 stdout schema 그대로 emit.
// codex PR review 적용 — SessionAuthGuard 의무 + ownerId = req.user.id.
@Controller("v1/persona-turns")
@UseGuards(SessionAuthGuard)
export class PersonaTurnController {
  constructor(private readonly conversations: ConversationService) {}

  @Post()
  async run(
    @Body() dto: PersonaTurnRequestDto,
    @Req() req: NestRequest
  ): Promise<PersonaTurnHttpResult> {
    const owner = req.user as UserProfile;
    return this.conversations.runStandalone(dto, owner.id);
  }
}
