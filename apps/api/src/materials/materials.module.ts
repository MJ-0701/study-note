import { Module } from "@nestjs/common";
import { AuthModule } from "@study-note/auth";
import { MaterialsController } from "./materials.controller";
import { MaterialsService } from "./materials.service";
import { MaterialUploadService } from "./material-upload.service";
import { PdfMaterialRepository } from "./pdf-material.repository";
import { AnnotationSnapshotRepository } from "../pdf-annotations/annotation-snapshot.repository";

// S4 (BE arch 위생): Materials 도메인을 app.module 직접 등록에서 자체 module 로 추출
// (Terms/Subjects/PdfAnnotations 와 모듈화 일관). SessionAuthGuard resolve 위해
// AuthModule import. PrismaModule 은 @Global 이라 import 불필요.
// AnnotationSnapshotRepository 는 pdf-annotations aggregate 소유(SoT) — getAnnotation/
// getExportBundle 의 read 를 위해 file import 후 provider 등록(단일 class, 상태 없음).
// StoragePort 는 @Global StorageModule 에서 단일 인스턴스로 제공됨 (app.module 등록).
@Module({
  imports: [AuthModule],
  controllers: [MaterialsController],
  providers: [
    MaterialsService,
    MaterialUploadService,
    PdfMaterialRepository,
    AnnotationSnapshotRepository
  ]
})
export class MaterialsModule {}
