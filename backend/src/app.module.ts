import { Module } from "@nestjs/common";
import { AuthController } from "./auth/auth.controller";
import { AuthService } from "./auth/auth.service";
import { SessionAuthGuard } from "./auth/session-auth.guard";
import { SessionsService } from "./auth/sessions.service";
import { UsersService } from "./auth/users.service";
import { CorpusModule } from "./corpus/corpus.module";
import { HealthController } from "./health.controller";
import { MaterialsController } from "./materials/materials.controller";
import { MaterialsService } from "./materials/materials.service";
import { PrismaModule } from "./prisma/prisma.module";
import { createStorageProvider } from "./storage/storage.provider";
import { StoragePort } from "./storage/storage.port";

@Module({
  imports: [PrismaModule, CorpusModule],
  controllers: [AuthController, HealthController, MaterialsController],
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
