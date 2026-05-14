-- CreateTable
CREATE TABLE `Corpus` (
    `id` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `sourcePdfPath` TEXT NOT NULL,
    `contentHash` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Corpus_contentHash_key` (`contentHash`),
    INDEX `Corpus_subject_idx` (`subject`),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Chunk` (
    `id` VARCHAR(191) NOT NULL,
    `corpusId` VARCHAR(191) NOT NULL,
    `ord` INTEGER NOT NULL,
    `text` TEXT NOT NULL,
    `charCount` INTEGER NOT NULL,
    `embedding` LONGBLOB,
    `modelName` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Chunk_corpusId_ord_key` (`corpusId`, `ord`),
    INDEX `Chunk_corpusId_idx` (`corpusId`),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Chunk` ADD CONSTRAINT `Chunk_corpusId_fkey`
    FOREIGN KEY (`corpusId`) REFERENCES `Corpus`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
