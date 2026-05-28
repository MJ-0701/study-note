// PDF 자료 공개 응답 DTO (DDD F-10) — controller 가 raw 영속 엔티티(PdfMaterialRecord) 대신
// 명시 변환(toMaterialPublic)으로 반환. API 응답 contract 를 persistence 파생 타입과 분리해,
// PdfMaterialRecord 에 향후 내부 필드가 추가돼도 명시 등록 전까지 응답에 새지 않게 한다.
// subjects 의 toSubjectPublic 패턴.
//
// 현재 필드 = PdfMaterialRecord 와 동일(FE 호환 유지). storageKey(R2 object key) 비노출은
// domain PdfMaterialRecord 가 storage port(getObject/createDownloadIntent)에 storageKey 를
// 넘겨야 해 타입 분리가 선행돼야 하므로 별도 backlog (R-DTO-storageKey).
import type { PdfMaterialRecord } from "@study-note/domain";

export interface MaterialPublicResponse {
  id: string;
  /** @deprecated uploaderId 사용. ownerId 는 업로더/감사 alias 로 유지. */
  ownerId: string;
  uploaderId: string;
  subjectId: string;
  classDate: string;
  fileName: string;
  fileSize: number;
  pageCount: number;
  contentType: string;
  storageKey: string;
  uploadStatus: "pending" | "uploaded";
  createdAt: string;
  updatedAt: string;
}

export function toMaterialPublic(record: PdfMaterialRecord): MaterialPublicResponse {
  return {
    id: record.id,
    ownerId: record.ownerId,
    uploaderId: record.uploaderId,
    subjectId: record.subjectId,
    classDate: record.classDate,
    fileName: record.fileName,
    fileSize: record.fileSize,
    pageCount: record.pageCount,
    contentType: record.contentType,
    storageKey: record.storageKey,
    uploadStatus: record.uploadStatus,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}
