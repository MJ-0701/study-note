-- AlterTable
ALTER TABLE `User` ADD COLUMN `devUserFlag` BOOLEAN NOT NULL DEFAULT FALSE;

-- AlterTable: Conversation owner backfill (nullable -> backfill -> NOT NULL + FK)
ALTER TABLE `Conversation` ADD COLUMN `ownerId` VARCHAR(191) NULL;

-- Backfill existing Conversation rows to seeded dev user (D-plan-1: 본인 학번 일괄 백필; dev-only acceptance per F6)
UPDATE `Conversation` SET `ownerId` = 'user-dev-1' WHERE `ownerId` IS NULL;

ALTER TABLE `Conversation` MODIFY COLUMN `ownerId` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE INDEX `Conversation_ownerId_idx` ON `Conversation`(`ownerId`);

-- AddForeignKey
ALTER TABLE `Conversation` ADD CONSTRAINT `Conversation_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
