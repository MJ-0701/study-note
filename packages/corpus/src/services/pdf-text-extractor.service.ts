import { Injectable } from "@nestjs/common";
import { promises as fs } from "node:fs";
import pdfParse from "pdf-parse";

@Injectable()
export class PdfTextExtractorService {
  async extract(pdfPath: string): Promise<string> {
    const buffer = await fs.readFile(pdfPath);
    const parsed = await pdfParse(buffer);
    return parsed.text;
  }
}
