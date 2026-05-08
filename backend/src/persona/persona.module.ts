import { Module } from "@nestjs/common";
import { CorpusModule } from "../corpus/corpus.module";
import { PrismaModule } from "../prisma/prisma.module";
import { ClaudeCliProvider } from "./providers/claude-cli.provider";
import { PersonaTurnService } from "./services/persona-turn.service";
import { PersonaService } from "./services/persona.service";
import { RetrievalService } from "./services/retrieval.service";

@Module({
  imports: [PrismaModule, CorpusModule],
  providers: [
    PersonaService,
    RetrievalService,
    {
      provide: ClaudeCliProvider,
      useFactory: () => new ClaudeCliProvider()
    },
    PersonaTurnService
  ],
  exports: [PersonaTurnService]
})
export class PersonaModule {}
