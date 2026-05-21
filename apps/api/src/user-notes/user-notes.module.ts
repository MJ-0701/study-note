import { Module } from "@nestjs/common";
import { UserNotesController } from "./user-notes.controller";
import { UserNotesService } from "./user-notes.service";

@Module({
  controllers: [UserNotesController],
  providers: [UserNotesService]
})
export class UserNotesModule {}
