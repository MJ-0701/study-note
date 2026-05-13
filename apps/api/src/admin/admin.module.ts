import { Module } from "@nestjs/common";
import { AuthService, RoleGuard, SessionAuthGuard, SessionsService, UsersService } from "@study-note/auth";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

/**
 * AdminModule — owns admin dashboard endpoints.
 *
 * Provider decision: SessionAuthGuard depends on AuthService which depends on
 * UsersService + SessionsService. PrismaModule is @Global() so PrismaService is
 * injected automatically. We redeclare the auth chain here so AdminModule is
 * self-contained and does not couple to app.module.ts internal providers.
 */
@Module({
  controllers: [AdminController],
  providers: [AdminService, AuthService, SessionAuthGuard, RoleGuard, UsersService, SessionsService]
})
export class AdminModule {}
