-- sprint-W21-sprint-1 / S1 / AC1 + AC2
-- Term table + Subject.termId nullable FK 추가.
-- Step (1) of AC7 two-phase migration. Step (3) NOT NULL tighten 는 별도 migration.
CREATE TABLE `Term` (
  `id`          VARCHAR(191) NOT NULL,
  `grade`       INT          NOT NULL,
  `semester`    INT          NOT NULL,
  `title`       VARCHAR(191) NOT NULL,
  `startDate`   DATE         NULL,
  `endDate`     DATE         NULL,
  `createdById` VARCHAR(191) NOT NULL,
  `createdAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`   DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Term_grade_semester_title_key` (`grade`, `semester`, `title`),
  KEY `Term_grade_semester_idx` (`grade`, `semester`)
);

ALTER TABLE `Subject` ADD COLUMN `termId` VARCHAR(191) NULL;
CREATE INDEX `Subject_termId_idx` ON `Subject`(`termId`);
ALTER TABLE `Subject`
  ADD CONSTRAINT `Subject_termId_fkey`
  FOREIGN KEY (`termId`) REFERENCES `Term`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
