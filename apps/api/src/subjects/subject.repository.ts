// DDD audit F-2 Slice 3 — Subject aggregate 의 영속 접근 캡슐화.
// SubjectsService 가 Prisma 를 직접 호출하지 않고 Repository 경유. Subject 자체
// 테이블 ops 만 담당 (term.findUnique / pdfMaterial.count 같은 cross-aggregate
// read 는 후속 slice 에서 별 port 로 분리).

import { Injectable } from "@nestjs/common";
import type { Subject as PrismaSubject } from "@prisma/client";
import { PrismaService } from "@study-note/persistence";

@Injectable()
export class SubjectRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** 전체 Subject — termId asc, title asc. */
  async findAllOrdered(): Promise<PrismaSubject[]> {
    return this.prisma.subject.findMany({
      orderBy: [{ termId: "asc" }, { title: "asc" }]
    });
  }

  /** 단건 조회 — 없으면 null (호출자가 404 변환). */
  async findById(id: string): Promise<PrismaSubject | null> {
    return this.prisma.subject.findUnique({ where: { id } });
  }

  /** 신규 Subject 생성 (Subject = metadata-only, ADR-4). */
  async create(termId: string, title: string): Promise<PrismaSubject> {
    return this.prisma.subject.create({ data: { title, termId } });
  }

  /** title 변경. P2025 등 Prisma 에러는 호출자에서 분기. */
  async updateTitle(id: string, title: string): Promise<PrismaSubject> {
    return this.prisma.subject.update({ where: { id }, data: { title } });
  }

  /** termId 변경 (Subject move). */
  async updateTermId(id: string, termId: string): Promise<PrismaSubject> {
    return this.prisma.subject.update({ where: { id }, data: { termId } });
  }

  /** 삭제. FK(P2003) / not-found(P2025) 는 호출자에서 분기. */
  async deleteById(id: string): Promise<void> {
    await this.prisma.subject.delete({ where: { id } });
  }
}
