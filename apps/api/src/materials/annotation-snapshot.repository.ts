// DDD audit F-1 Slice 7 — AnnotationSnapshot aggregate 의 영속 접근 캡슐화.
// MaterialsService 의 annotation 저장/조회 query 를 위임. upsert 분기(있으면 update,
// 없으면 create)는 service 의 도메인 흐름이라 repo 는 단순 find/update/create 제공.

import { Injectable } from "@nestjs/common";
import { Prisma, type AnnotationSnapshot } from "@prisma/client";
import { PrismaService } from "@study-note/persistence";

@Injectable()
export class AnnotationSnapshotRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** (materialId, ownerId) 의 단일 snapshot — 없으면 null. */
  async findByMaterialOwner(
    materialId: string,
    ownerId: string
  ): Promise<AnnotationSnapshot | null> {
    return this.prisma.annotationSnapshot.findFirst({
      where: { materialId, ownerId }
    });
  }

  async update(
    id: string,
    data: Prisma.AnnotationSnapshotUpdateInput
  ): Promise<AnnotationSnapshot> {
    return this.prisma.annotationSnapshot.update({ where: { id }, data });
  }

  async create(
    data: Prisma.AnnotationSnapshotUncheckedCreateInput
  ): Promise<AnnotationSnapshot> {
    return this.prisma.annotationSnapshot.create({ data });
  }
}
