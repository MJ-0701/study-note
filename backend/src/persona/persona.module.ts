import { Module } from "@nestjs/common";
import { CorpusModule } from "../corpus/corpus.module";
import { PrismaModule } from "../prisma/prisma.module";
import { ConversationController } from "./conversation.controller";
import { PersonaTurnController } from "./persona-turn.controller";
import { ClaudeCliProvider } from "./providers/claude-cli.provider";
import { GeminiCliProvider } from "./providers/gemini-cli.provider";
import { LlmAgentRegistry } from "./providers/llm-agent.registry";
import { ConversationService } from "./services/conversation.service";
import { PersonaTurnService } from "./services/persona-turn.service";
import { PersonaService } from "./services/persona.service";
import { RetrievalService } from "./services/retrieval.service";

@Module({
  imports: [PrismaModule, CorpusModule],
  controllers: [PersonaTurnController, ConversationController],
  providers: [
    PersonaService,
    RetrievalService,
    {
      provide: ClaudeCliProvider,
      useFactory: () => new ClaudeCliProvider()
    },
    {
      provide: GeminiCliProvider,
      useFactory: () => new GeminiCliProvider()
    },
    LlmAgentRegistry,
    PersonaTurnService,
    ConversationService
  ],
  exports: [PersonaTurnService, ConversationService]
})
export class PersonaModule {}
