import { Body, Controller, Post } from "@nestjs/common";
import { PersonaTurnRequestDto } from "./dto/persona-turn-request.dto";
import { ConversationService, PersonaTurnHttpResult } from "./services/conversation.service";

// sprint-5 plan §3 AC1 + R1 — sprint-3 stdout schema 그대로 emit.
@Controller("v1/persona-turns")
export class PersonaTurnController {
  constructor(private readonly conversations: ConversationService) {}

  @Post()
  async run(@Body() dto: PersonaTurnRequestDto): Promise<PersonaTurnHttpResult> {
    return this.conversations.runStandalone(dto);
  }
}
