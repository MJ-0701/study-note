import { PrismaClient } from "@prisma/client";
import { seedSubjects, subjects } from "./seed-subjects.mjs";

const prisma = new PrismaClient();

const users = [
  {
    id: "user-dev-1",
    displayName: process.env.STUDY_NOTE_DEV_USER_NAME ?? "Dev User",
    studentNumber: process.env.STUDY_NOTE_DEV_STUDENT_NUMBER ?? "20260001",
    email: process.env.STUDY_NOTE_DEV_USER_EMAIL ?? "dev1@example.com",
    role: "MASTER",
    devUserFlag: true
  },
  {
    id: "user-dev-2",
    displayName: process.env.STUDY_NOTE_SECOND_USER_NAME ?? "Reviewer",
    studentNumber: process.env.STUDY_NOTE_SECOND_STUDENT_NUMBER ?? "20260002",
    email: process.env.STUDY_NOTE_SECOND_USER_EMAIL ?? "reviewer@example.com",
    role: "REVIEWER",
    devUserFlag: true
  },
  {
    id: "user-dev-3",
    displayName: process.env.STUDY_NOTE_THIRD_USER_NAME ?? "Plain User",
    studentNumber: process.env.STUDY_NOTE_THIRD_STUDENT_NUMBER ?? "20269998",
    email: process.env.STUDY_NOTE_THIRD_USER_EMAIL ?? "plain@example.com",
    role: "NORMAL",
    devUserFlag: false
  }
];

try {
  await seedSubjects(prisma);

  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {
        displayName: user.displayName,
        studentNumber: user.studentNumber,
        email: user.email,
        role: user.role,
        devUserFlag: user.devUserFlag
      },
      create: {
        id: user.id,
        displayName: user.displayName,
        studentNumber: user.studentNumber,
        email: user.email,
        role: user.role,
        devUserFlag: user.devUserFlag
      }
    });
  }

  console.log(
    `Seeded ${subjects.length} subjects and ${users.length} local MVP users`
  );
} finally {
  await prisma.$disconnect();
}
