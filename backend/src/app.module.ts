import { Module } from "@nestjs/common";
import { AuthController } from "./auth/auth.controller";
import { AuthService } from "./auth/auth.service";
import { SessionAuthGuard } from "./auth/session-auth.guard";
import { SessionsService } from "./auth/sessions.service";
import { UsersService } from "./auth/users.service";
import { HealthController } from "./health.controller";
import { MaterialsController } from "./materials/materials.controller";
import { MaterialsService } from "./materials/materials.service";
import { PrismaService } from "./prisma/prisma.service";
import { createStorageProvider } from "./storage/storage.provider";
import { StoragePort } from "./storage/storage.port";

@Module({
  controllers: [AuthController, HealthController, MaterialsController],
  providers: [
    AuthService,
    SessionAuthGuard,
    PrismaService,
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
