// DDD audit F-7 Slice 8 — AnnotationSnapshot aggregate 의 영속 접근 캡슐화.
// CAS(낙관적 동시성) 의 atomic updateMany / rollback / unique-violation 의사결정은
// service 에 유지하고, Prisma query 호출만 위임한다. where/data/select 형태는
// 기존 동작과 1:1 동일 (CAS where 절 자체가 lock 이므로 의미 보존 필수).

import { Injectable } from "@nestjs/common";
import { Prisma, type AnnotationSnapshot } from "@prisma/client";
import { PrismaService } from "@study-note/persistence";

export interface SnapshotIdRow {
  id: string;
  materialId: string;
  savedAt: Date;
}

export interface SnapshotSavedAtRow {
  savedAt: Date;
}

export interface SnapshotMaterialSavedAtRow {
  materialId: string;
  savedAt: Date;
}

@Injectable()
export class AnnotationSnapshotRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** owner 의 snapshot cursor 페이징 (id asc). take = pageSize+1 (hasNext 판정용). */
  async listByOwnerPaged(
    ownerId: string,
    pageSize: number,
    cursor?: string
  ): Promise<SnapshotIdRow[]> {
    return this.prisma.annotationSnapshot.findMany({
      where: { ownerId },
      select: { id: true, materialId: true, savedAt: true },
      orderBy: { id: "asc" },
      take: pageSize + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
    });
  }

  /** (materialId, ownerId) composite 단건의 savedAt 만. 없으면 null. */
  async findSavedAt(
    materialId: string,
    ownerId: string
  ): Promise<SnapshotSavedAtRow | null> {
    return this.prisma.annotationSnapshot.findUnique({
      where: { materialId_ownerId: { materialId, ownerId } },
      select: { savedAt: true }
    });
  }

  /** 여러 material 의 owner snapshot (batch). materialId + savedAt 만. */
  async findManyByMaterialsOwner(
    materialIds: string[],
    ownerId: string
  ): Promise<SnapshotMaterialSavedAtRow[]> {
    return this.prisma.annotationSnapshot.findMany({
      where: { materialId: { in: materialIds }, ownerId },
      select: { materialId: true, savedAt: true }
    });
  }

  /**
   * R9 atomic CAS: savedAt 이 expectedSavedAt 인 row 만 newSavedAt 으로 갱신.
   * 반환 count=1 → 본 호출이 lock 획득. count=0 → stale 또는 missing (service 판정).
   */
  async casUpdateSavedAt(
    materialId: string,
    ownerId: string,
    expectedSavedAt: Date,
    newSavedAt: Date
  ): Promise<{ count: number }> {
    return this.prisma.annotationSnapshot.updateMany({
      where: { materialId, ownerId, savedAt: expectedSavedAt },
      data: { savedAt: newSavedAt }
    });
  }

  /** R2 write 실패 시 보상: savedAt 을 currentSavedAt → previousSavedAt 으로 되돌림. */
  async rollbackSavedAt(
    materialId: string,
    ownerId: string,
    currentSavedAt: Date,
    previousSavedAt: Date
  ): Promise<{ count: number }> {
    return this.prisma.annotationSnapshot.updateMany({
      where: { materialId, ownerId, savedAt: currentSavedAt },
      data: { savedAt: previousSavedAt }
    });
  }

  /**
   * 신규 snapshot create (payload 는 JsonNull — R2 가 실제 payload SoT).
   * unique(P2002) violation 은 service 가 concurrent-create 로 분기.
   */
  async create(
    materialId: string,
    ownerId: string,
    savedAt: Date
  ): Promise<SnapshotSavedAtRow> {
    return this.prisma.annotationSnapshot.create({
      data: {
        materialId,
        ownerId,
        schemaVersion: 1,
        payload: Prisma.JsonNull,
        savedAt
      },
      select: { savedAt: true }
    });
  }

  /** 단일 entry full row (필요 시). */
  async findFull(
    materialId: string,
    ownerId: string
  ): Promise<AnnotationSnapshot | null> {
    return this.prisma.annotationSnapshot.findUnique({
      where: { materialId_ownerId: { materialId, ownerId } }
    });
  }

  /**
   * compare-and-delete 보상: 정확히 본인이 만든 revision(savedAt) 인 row 만 삭제.
   * 그 사이 다른 CAS 가 row 를 가져갔으면 no-op (data loss 방지, Codex PR #35 P1).
   */
  async deleteByRevision(
    materialId: string,
    ownerId: string,
    savedAt: Date
  ): Promise<{ count: number }> {
    return this.prisma.annotationSnapshot.deleteMany({
      where: { materialId, ownerId, savedAt }
    });
  }
}
