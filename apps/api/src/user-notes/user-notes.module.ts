import { Module } from "@nestjs/common";
import { AuthModule } from "@study-note/auth";
import { createStorageProvider, StoragePort } from "@study-note/storage";
import { UserNotesController } from "./user-notes.controller";
import { UserNotesService } from "./user-notes.service";

// sprint-2/S1 fix (codex P1): StoragePort is a per-module token. Without
// providing it here Nest cannot resolve UserNotesService's dependency, so the
// feature module must register the storage factory itself.
// sprint-2/S1 fix-2 (codex P1): UserNotesController applies SessionAuthGuard,
// which lives in @study-note/auth. AuthModule export is required for the guard
// + UserProfile request decoration to resolve at bootstrap.
@Module({
  imports: [AuthModule],
  controllers: [UserNotesController],
  providers: [
    UserNotesService,
    {
      provide: StoragePort,
      useFactory: createStorageProvider
    }
  ]
})
export class UserNotesModule {}
