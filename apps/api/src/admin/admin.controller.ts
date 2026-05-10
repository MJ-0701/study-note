import { Controller, Get, UseGuards } from "@nestjs/common";
import { Roles, RoleGuard, SessionAuthGuard, UsersService } from "@study-note/auth";

@Controller("v1/admin")
@UseGuards(SessionAuthGuard, RoleGuard)
export class AdminController {
  constructor(private readonly users: UsersService) {}

  @Get("users")
  @Roles("master", "admin")
  async listUsers() {
    return { users: await this.users.listAll() };
  }
}
