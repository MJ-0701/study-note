import { Module } from "@nestjs/common";
import { createStorageProvider, StoragePort } from "@study-note/storage";
import { UserNotesController } from "./user-notes.controller";
import { UserNotesService } from "./user-notes.service";

// sprint-2/S1 fix (codex P1): StoragePort is a per-module token. Without
// providing it here Nest cannot resolve UserNotesService's dependency, so the
// feature module must register the storage factory itself (or import a shared
// global module — kept self-contained for now to match the existing
// AppModule pattern).
@Module({
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
