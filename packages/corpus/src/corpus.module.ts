import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { ChunkerService } from "./services/chunker.service";
import { EmbeddingService } from "./services/embedding.service";
import { IngestService } from "./services/ingest.service";
import { PdfTextExtractorService } from "./services/pdf-text-extractor.service";

@Module({
  imports: [PrismaModule],
  providers: [PdfTextExtractorService, ChunkerService, EmbeddingService, IngestService],
  exports: [PrismaModule, IngestService, ChunkerService, EmbeddingService]
})
export class CorpusModule {}
