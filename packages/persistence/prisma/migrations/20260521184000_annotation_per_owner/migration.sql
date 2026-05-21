CREATE UNIQUE INDEX `AnnotationSnapshot_materialId_ownerId_key`
  ON `AnnotationSnapshot`(`materialId`, `ownerId`);

DROP INDEX `AnnotationSnapshot_materialId_key` ON `AnnotationSnapshot`;
