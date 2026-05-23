import { Module } from "@nestjs/common";
import { AuthModule } from "@study-note/auth";
import { TermsModule } from "../terms/terms.module";
import { SubjectsController } from "./subjects.controller";
import { SubjectsService } from "./subjects.service";

@Module({
  imports: [AuthModule, TermsModule],
  controllers: [SubjectsController],
  providers: [SubjectsService],
  exports: [SubjectsService]
})
export class SubjectsModule {}
