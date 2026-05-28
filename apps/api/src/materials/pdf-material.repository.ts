// DDD audit F-1 Slice 7 — PdfMaterial aggregate 의 영속 접근 캡슐화.
// MaterialsService 가 Prisma 를 직접 호출하지 않고 Repository 경유. 업로드 상태
// 머신 / 검증 / storage orchestration 은 service 에 남기고, DB query 만 위임.

import { Injectable } from "@nestjs/common";
import { Prisma, type PdfMaterial } from "@prisma/client";
import { PrismaService } from "@study-note/persistence";

// owner 본인 + (uploaded master/admin 공유) 접근 정책 — listMaterials / getMaterial /
// getManageableMaterial 공통. soft-delete 제외.
function accessibleWhere(ownerId: string): Prisma.PdfMaterialWhereInput {
  return {
    deletedAt: null,
    OR: [
      { ownerId },
      {
        uploadStatus: "uploaded",
        owner: { role: { in: ["MASTER", "ADMIN"] } }
      }
    ]
  };
}

@Injectable()
export class PdfMaterialRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** 신규 PdfMaterial (pending) 생성. */
  async create(data: Prisma.PdfMaterialUncheckedCreateInput): Promise<PdfMaterial> {
    return this.prisma.pdfMaterial.create({ data });
  }

  /** uploadStatus → uploaded (server-upload path). */
  async markUploaded(id: string): Promise<PdfMaterial> {
    return this.prisma.pdfMaterial.update({
      where: { id },
      data: { uploadStatus: "uploaded" }
    });
  }

  /**
   * race-safe 조건부 transition: uploadStatus=pending 인 row 만 uploaded 로.
   * 반환 count=1 → 본 호출이 transition. count=0 → 이미 다른 호출이 처리(race).
   */
  async markUploadedIfPending(id: string): Promise<{ count: number }> {
    return this.prisma.pdfMaterial.updateMany({
      where: { id, uploadStatus: "pending", deletedAt: null },
      data: { uploadStatus: "uploaded" }
    });
  }

  /** classDate metadata 변경. */
  async updateClassDate(id: string, classDate: Date): Promise<PdfMaterial> {
    return this.prisma.pdfMaterial.update({ where: { id }, data: { classDate } });
  }

  /** owner 본인 소유 + soft-delete 제외 단건 (업로드 흐름 전용). */
  async findOwned(ownerId: string, id: string): Promise<PdfMaterial | null> {
    return this.prisma.pdfMaterial.findFirst({
      where: { id, ownerId, deletedAt: null }
    });
  }

  /** 접근 가능 (owner 또는 shared) 단건. */
  async findAccessible(ownerId: string, id: string): Promise<PdfMaterial | null> {
    return this.prisma.pdfMaterial.findFirst({
      where: { id, ...accessibleWhere(ownerId) }
    });
  }

  /** 접근 가능 목록 — createdAt desc. */
  async findAccessibleList(ownerId: string): Promise<PdfMaterial[]> {
    return this.prisma.pdfMaterial.findMany({
      where: accessibleWhere(ownerId),
      orderBy: { createdAt: "desc" }
    });
  }
}
