import { Module } from "@nestjs/common";
import { AuthModule } from "@study-note/auth";
import { MetricsModule } from "../observability/metrics.module";
import { PdfAnnotationsController } from "./pdf-annotations.controller";
import { PdfAnnotationQueryService } from "./pdf-annotation-query.service";
import { PdfAnnotationCommandService } from "./pdf-annotation-command.service";
import { PdfMaterialRepository } from "../materials/pdf-material.repository";
import { AnnotationSnapshotRepository } from "./annotation-snapshot.repository";

// sprint-2/S1 fix (codex P1): StoragePort + AuthModule 둘 다 module-level 등록.
// SessionAuthGuard 의 의존성 resolve 위해 AuthModule import 필수.
// DDD Slice 2: PdfMaterialRepository provider 등록 → Service inject path 활성.
// S3 (경량 CQRS): PdfAnnotationsService 를 Query/Command service 로 분리.
// StoragePort 는 @Global StorageModule 에서 단일 인스턴스로 제공됨 (app.module 등록).
@Module({
  imports: [AuthModule, MetricsModule],
  controllers: [PdfAnnotationsController],
  providers: [
    PdfAnnotationQueryService,
    PdfAnnotationCommandService,
    PdfMaterialRepository,
    AnnotationSnapshotRepository
  ]
})
export class PdfAnnotationsModule {}
