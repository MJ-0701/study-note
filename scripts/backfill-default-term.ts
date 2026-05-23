// sprint-W21-sprint-1 / S1 / AC7 — Default Term backfill.
//
// 1. MASTER_USER_ID env 가 가리키는 user 의 role 이 MASTER 인지 확인 (없거나 다르면 abort).
// 2. Default Term (grade=1, semester=1, title="기본 학기", startDate=null, endDate=null,
//    createdById=MASTER_USER_ID) idempotent 생성.
// 3. termId IS NULL 인 모든 Subject 를 default Term 으로 backfill.
// 4. dry-run default. --apply 로 실제 write.
//
// 실행:
//   MASTER_USER_ID=<id> node --experimental-strip-types --no-warnings scripts/backfill-default-term.ts
//   MASTER_USER_ID=<id> node --experimental-strip-types --no-warnings scripts/backfill-default-term.ts --apply
//
// 필요 env: DATABASE_URL, MASTER_USER_ID

import { PrismaClient } from "@prisma/client";

const APPLY = process.argv.includes("--apply");
const DEFAULT_GRADE = 1;
const DEFAULT_SEMESTER = 1;
const DEFAULT_TITLE = "기본 학기";

async function main(): Promise<void> {
  const masterUserId = process.env.MASTER_USER_ID;
  if (!masterUserId) {
    console.error("[backfill-default-term] MASTER_USER_ID env is required");
    process.exit(2);
  }

  const prisma = new PrismaClient();

  try {
    const masterUser = await prisma.user.findUnique({
      where: { id: masterUserId },
      select: { id: true, role: true, studentNumber: true, displayName: true }
    });
    if (!masterUser) {
      console.error(
        `[backfill-default-term] MASTER_USER_ID=${masterUserId} does not exist in User table`
      );
      process.exit(2);
    }
    if (masterUser.role !== "MASTER") {
      console.error(
        `[backfill-default-term] MASTER_USER_ID=${masterUserId} role=${masterUser.role} (expected MASTER)`
      );
      process.exit(2);
    }
    console.log(
      `[backfill-default-term] mode=${APPLY ? "APPLY" : "DRY-RUN"} master=${masterUser.studentNumber} (${masterUser.displayName})`
    );

    const orphanCount = await prisma.subject.count({ where: { termId: null } });
    const existingTerm = await prisma.term.findUnique({
      where: {
        grade_semester_title: {
          grade: DEFAULT_GRADE,
          semester: DEFAULT_SEMESTER,
          title: DEFAULT_TITLE
        }
      },
      select: { id: true, createdById: true, createdAt: true }
    });

    console.log(`[backfill-default-term] orphan Subject (termId IS NULL): ${orphanCount}`);
    if (existingTerm) {
      console.log(
        `[backfill-default-term] default Term exists: id=${existingTerm.id} createdBy=${existingTerm.createdById}`
      );
    } else {
      console.log(
        `[backfill-default-term] default Term missing — will create (grade=${DEFAULT_GRADE}, semester=${DEFAULT_SEMESTER}, title="${DEFAULT_TITLE}")`
      );
    }

    if (!APPLY) {
      console.log("\n[backfill-default-term] dry-run — re-run with --apply to write.");
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const term =
        existingTerm ??
        (await tx.term.create({
          data: {
            grade: DEFAULT_GRADE,
            semester: DEFAULT_SEMESTER,
            title: DEFAULT_TITLE,
            createdById: masterUserId
          },
          select: { id: true, createdById: true }
        }));

      const updated = await tx.subject.updateMany({
        where: { termId: null },
        data: { termId: term.id }
      });

      return { termId: term.id, updatedCount: updated.count };
    });

    console.log(`[backfill-default-term] applied — termId=${result.termId} subjects updated=${result.updatedCount}`);

    const remaining = await prisma.subject.count({ where: { termId: null } });
    if (remaining > 0) {
      console.error(`[backfill-default-term] FAIL — ${remaining} Subject rows still have termId IS NULL`);
      process.exit(3);
    }
    console.log("[backfill-default-term] verified — all Subject.termId NOT NULL");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[backfill-default-term] FAILED:", err);
  process.exit(1);
});
