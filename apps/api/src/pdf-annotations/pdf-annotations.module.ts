import { Module } from "@nestjs/common";
import { AuthModule } from "@study-note/auth";
import { createStorageProvider, StoragePort } from "@study-note/storage";
import { MetricsModule } from "../observability/metrics.module";
import { PdfAnnotationsController } from "./pdf-annotations.controller";
import { PdfAnnotationsService } from "./pdf-annotations.service";
import { PdfMaterialRepository } from "./pdf-material.repository";
import { AnnotationSnapshotRepository } from "./annotation-snapshot.repository";

// sprint-2/S1 fix (codex P1): StoragePort + AuthModule 둘 다 module-level 등록.
// SessionAuthGuard 의 의존성 resolve 위해 AuthModule import 필수.
// DDD Slice 2: PdfMaterialRepository provider 등록 → Service inject path 활성.
@Module({
  imports: [AuthModule, MetricsModule],
  controllers: [PdfAnnotationsController],
  providers: [
    PdfAnnotationsService,
    PdfMaterialRepository,
    AnnotationSnapshotRepository,
    {
      provide: StoragePort,
      useFactory: createStorageProvider
    }
  ]
})
export class PdfAnnotationsModule {}
