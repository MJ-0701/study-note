import { Module } from "@nestjs/common";
import { CorpusModule } from "@study-note/corpus";
import { PersonaModule } from "@study-note/persona-engine";
import { AuthController } from "./auth/auth.controller";
import { AuthService } from "./auth/auth.service";
import { SessionAuthGuard } from "./auth/session-auth.guard";
import { SessionsService } from "./auth/sessions.service";
import { UsersService } from "./auth/users.service";
import { HealthController } from "./health.controller";
import { MaterialsController } from "./materials/materials.controller";
import { MaterialsService } from "./materials/materials.service";
import { ConversationController } from "./persona/conversation.controller";
import { PersonaTurnController } from "./persona/persona-turn.controller";
import { PrismaModule } from "./prisma/prisma.module";
import { createStorageProvider } from "./storage/storage.provider";
import { StoragePort } from "./storage/storage.port";

@Module({
  imports: [PrismaModule, CorpusModule, PersonaModule],
  controllers: [
    AuthController,
    HealthController,
    MaterialsController,
    PersonaTurnController,
    ConversationController
  ],
  providers: [
    AuthService,
    SessionAuthGuard,
    SessionsService,
    UsersService,
    MaterialsService,
    {
      provide: StoragePort,
      useFactory: createStorageProvider
    }
  ]
})
export class AppModule {}
