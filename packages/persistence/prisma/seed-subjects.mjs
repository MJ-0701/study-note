import { PrismaClient } from "@prisma/client";
import { fileURLToPath } from "node:url";

export const subjects = [
  { id: "digital-engineering", title: "디지털공학개론" },
  { id: "information-communication", title: "정보통신개론" },
  { id: "c-language", title: "C언어" },
  { id: "computer-introduction", title: "컴퓨터개론" }
];

export async function seedSubjects(prisma) {
  const term = await prisma.term.upsert({
    where: {
      grade_semester_title: { grade: 1, semester: 1, title: "기본 학기" }
    },
    update: {},
    create: {
      grade: 1,
      semester: 1,
      title: "기본 학기",
      createdById: "user-dev-1"
    }
  });

  for (const subject of subjects) {
    await prisma.subject.upsert({
      where: { id: subject.id },
      update: { title: subject.title },
      create: { id: subject.id, title: subject.title, termId: term.id }
    });
  }

  return subjects.length;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const prisma = new PrismaClient();

  try {
    const count = await seedSubjects(prisma);
    console.log(`Seeded ${count} subjects`);
  } finally {
    await prisma.$disconnect();
  }
}
