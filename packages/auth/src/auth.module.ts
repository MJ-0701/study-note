import { Module } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { UsersService } from "./users.service";
import { SessionsService } from "./sessions.service";
import { SessionAuthGuard } from "./session-auth.guard";
import { RoleGuard } from "./role.guard";

/**
 * AuthModule — single source of truth for auth providers.
 * Consumers (AppModule, AdminModule, etc.) import this module instead of
 * redeclaring providers. PrismaService is provided by @Global() PrismaModule.
 */
@Module({
  providers: [AuthService, UsersService, SessionsService, SessionAuthGuard, RoleGuard],
  exports: [AuthService, UsersService, SessionsService, SessionAuthGuard, RoleGuard]
})
export class AuthModule {}
