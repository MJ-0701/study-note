import { Module } from "@nestjs/common";
import { PdfAnnotationsController } from "./pdf-annotations.controller";
import { PdfAnnotationsService } from "./pdf-annotations.service";

@Module({
  controllers: [PdfAnnotationsController],
  providers: [PdfAnnotationsService]
})
export class PdfAnnotationsModule {}
