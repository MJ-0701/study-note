// DDD audit F-1/F-2/F-7 Slice 2 — PdfMaterial accessibility query 캡슐화.
// Service 가 Prisma 직접 노출하지 않고 Repository 경유. ownsMaterial 같은 hot
// path 쿼리를 한 곳에서 일관 정의 — listMaterials 의 share 정책 (`OR: [{ownerId},
// {uploaded master/admin}]`) 과 정렬.

import { Injectable } from "@nestjs/common";
import { PrismaService } from "@study-note/persistence";

export interface PdfMaterialAccessibilityRow {
  id: string;
}

@Injectable()
export class PdfMaterialRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * userId 가 materialId 에 접근 가능한지 확인. owner 또는 (uploaded + uploader
   * role master/admin) 인 material 만 hit. soft-deleted (deletedAt != null) 제외.
   * AnnotationSnapshot 등 다른 모듈의 fan-out 호출이 동일 쿼리 패턴을 공유한다.
   */
  async findAccessibleForUser(
    userId: string,
    materialId: string
  ): Promise<PdfMaterialAccessibilityRow | null> {
    return this.prisma.pdfMaterial.findFirst({
      where: {
        id: materialId,
        deletedAt: null,
        OR: [
          { ownerId: userId },
          {
            uploadStatus: "uploaded",
            owner: {
              role: {
                in: ["MASTER", "ADMIN"]
              }
            }
          }
        ]
      },
      select: { id: true }
    });
  }

  /**
   * subject 안 접근 가능 material 의 id 목록 (createdAt asc) — batchGetBySubject 용.
   * 접근 정책 = findAccessibleForUser 와 동일 (owner OR uploaded master/admin).
   */
  async findAccessibleIdsBySubject(
    userId: string,
    subjectId: string
  ): Promise<PdfMaterialAccessibilityRow[]> {
    return this.prisma.pdfMaterial.findMany({
      where: {
        subjectId,
        deletedAt: null,
        OR: [
          { ownerId: userId },
          {
            uploadStatus: "uploaded",
            owner: {
              role: {
                in: ["MASTER", "ADMIN"]
              }
            }
          }
        ]
      },
      select: { id: true },
      orderBy: { createdAt: "asc" }
    });
  }
}
