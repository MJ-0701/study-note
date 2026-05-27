import { Module } from "@nestjs/common";
import { AuthModule } from "@study-note/auth";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { OpsDashboardService } from "./ops-dashboard.service";

/**
 * AdminModule — owns admin dashboard endpoints.
 *
 * Auth providers (AuthService, UsersService, SessionsService,
 * SessionAuthGuard, RoleGuard) are sourced from AuthModule (single source of
 * truth). PrismaModule is @Global() so PrismaService is injected automatically.
 */
@Module({
  imports: [AuthModule],
  controllers: [AdminController],
  providers: [AdminService, OpsDashboardService]
})
export class AdminModule {}
