import { Module } from "@nestjs/common";
import { createStorageProvider, StoragePort } from "@study-note/storage";
import { PdfAnnotationsController } from "./pdf-annotations.controller";
import { PdfAnnotationsService } from "./pdf-annotations.service";

// sprint-2/S1 fix (codex P1): StoragePort 토큰을 module 안에서도 resolve 가능하게
// factory 등록. UserNotesModule 과 동일 패턴.
@Module({
  controllers: [PdfAnnotationsController],
  providers: [
    PdfAnnotationsService,
    {
      provide: StoragePort,
      useFactory: createStorageProvider
    }
  ]
})
export class PdfAnnotationsModule {}
