import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const subjects = [
  { id: "digital-engineering", title: "디지털공학개론" },
  { id: "information-communication", title: "정보통신개론" },
  { id: "c-language", title: "C언어" },
  { id: "computer-introduction", title: "컴퓨터개론" }
];

const users = [
  {
    id: "user-dev-1",
    displayName: process.env.STUDY_NOTE_DEV_USER_NAME ?? "Dev User",
    studentNumber: process.env.STUDY_NOTE_DEV_STUDENT_NUMBER ?? "20260001",
    email: process.env.STUDY_NOTE_DEV_USER_EMAIL ?? "dev1@example.com"
  },
  {
    id: "user-dev-2",
    displayName: process.env.STUDY_NOTE_SECOND_USER_NAME ?? "Reviewer",
    studentNumber: process.env.STUDY_NOTE_SECOND_STUDENT_NUMBER ?? "20260002",
    email: process.env.STUDY_NOTE_SECOND_USER_EMAIL ?? "reviewer@example.com"
  }
];

try {
  for (const subject of subjects) {
    await prisma.subject.upsert({
      where: { id: subject.id },
      update: { title: subject.title },
      create: subject
    });
  }

  for (const user of users) {
    await prisma.user.upsert({
      where: { studentNumber: user.studentNumber },
      update: {
        displayName: user.displayName,
        email: user.email
      },
      create: user
    });
  }

  console.log(
    `Seeded ${subjects.length} subjects and ${users.length} local MVP users`
  );
} finally {
  await prisma.$disconnect();
}
