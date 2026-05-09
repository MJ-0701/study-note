import { Body, Controller, Post } from "@nestjs/common";
import { PersonaTurnRequestDto } from "./dto/persona-turn-request.dto";
import { PersonaTurnService, PersonaTurnResult } from "./services/persona-turn.service";

// sprint-5 plan §3 AC1 + R1 — sprint-3 stdout schema 그대로 emit.
@Controller("v1/persona-turns")
export class PersonaTurnController {
  constructor(private readonly turn: PersonaTurnService) {}

  @Post()
  async run(@Body() dto: PersonaTurnRequestDto): Promise<PersonaTurnResult> {
    return this.turn.execute({
      subject: dto.subject,
      queryText: dto.query,
      k: dto.k ?? 5,
      requestMode: dto.mode
    });
  }
}
