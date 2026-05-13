import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

export type UserRole = "master" | "admin" | "normal";
export const ROLES_KEY = "roles";
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass()
    ]);
    if (!required || required.length === 0) return true;
    const req = ctx.switchToHttp().getRequest();
    const userRole = req.user?.role;
    if (!userRole) {
      throw new ForbiddenException({ errorCode: "FORBIDDEN_ROLE", errorMessage: "role required" });
    }
    if (!required.includes(userRole as UserRole)) {
      throw new ForbiddenException({ errorCode: "FORBIDDEN_ROLE", errorMessage: `role ${userRole} not authorized` });
    }
    return true;
  }
}
