import { Module } from "@nestjs/common";
import { AuthModule } from "@study-note/auth";
import { createStorageProvider, StoragePort } from "@study-note/storage";
import { PdfAnnotationsController } from "./pdf-annotations.controller";
import { PdfAnnotationsService } from "./pdf-annotations.service";

// sprint-2/S1 fix (codex P1): StoragePort + AuthModule 둘 다 module-level 등록.
// SessionAuthGuard 의 의존성 resolve 위해 AuthModule import 필수.
@Module({
  imports: [AuthModule],
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
