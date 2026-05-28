// DDD audit F-2 Slice 4 — Term aggregate 의 영속 접근 캡슐화.
// TermsService 가 Prisma 를 직접 호출하지 않고 Repository 경유. Term 자체 테이블
// ops 만 담당 (subject.count 같은 cross-aggregate read 는 후속 Bounded Context
// slice 에서 별 port 로 분리). unique(P2002) / FK(P2003) 분기는 호출자 책임.

import { Injectable } from "@nestjs/common";
import type { Term as PrismaTerm } from "@prisma/client";
import { PrismaService } from "@study-note/persistence";

export interface TermCreateData {
  grade: number;
  semester: number;
  title: string;
  startDate: Date | null;
  endDate: Date | null;
  createdById: string;
}

export interface TermUpdateData {
  grade?: number;
  semester?: number;
  title?: string;
  startDate?: Date | null;
  endDate?: Date | null;
}

@Injectable()
export class TermRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** 전체 Term — grade, semester, title asc. */
  async findAllOrdered(): Promise<PrismaTerm[]> {
    return this.prisma.term.findMany({
      orderBy: [{ grade: "asc" }, { semester: "asc" }, { title: "asc" }]
    });
  }

  /** 단건 조회 — 없으면 null. */
  async findById(id: string): Promise<PrismaTerm | null> {
    return this.prisma.term.findUnique({ where: { id } });
  }

  /** 신규 Term 생성. P2002 (unique) 는 호출자에서 409 변환. */
  async create(data: TermCreateData): Promise<PrismaTerm> {
    return this.prisma.term.create({ data });
  }

  /** 부분 업데이트. undefined 필드는 변경 안 함. P2002 호출자 분기. */
  async update(id: string, data: TermUpdateData): Promise<PrismaTerm> {
    return this.prisma.term.update({ where: { id }, data });
  }

  /** 삭제. FK(P2003) 는 호출자에서 409 변환. */
  async deleteById(id: string): Promise<void> {
    await this.prisma.term.delete({ where: { id } });
  }
}
