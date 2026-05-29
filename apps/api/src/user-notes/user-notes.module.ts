import { Module } from "@nestjs/common";
import { AuthModule } from "@study-note/auth";
import { UserNotesController } from "./user-notes.controller";
import { UserNotesService } from "./user-notes.service";

// sprint-2/S1 fix (codex P1): AuthModule export is required for the guard
// + UserProfile request decoration to resolve at bootstrap.
// StoragePort 는 @Global StorageModule 에서 단일 인스턴스로 제공됨 (app.module 등록).
// 이전엔 모듈별 useFactory 가 인스턴스를 분리시켜 cross-module read 가 깨졌음.
@Module({
  imports: [AuthModule],
  controllers: [UserNotesController],
  providers: [UserNotesService]
})
export class UserNotesModule {}
