import { Module } from "@nestjs/common";
import { AuthModule } from "@study-note/auth";
import { TermsController } from "./terms.controller";
import { TermsService } from "./terms.service";
import { TermRepository } from "./term.repository";

@Module({
  imports: [AuthModule],
  controllers: [TermsController],
  providers: [TermsService, TermRepository],
  exports: [TermsService]
})
export class TermsModule {}
