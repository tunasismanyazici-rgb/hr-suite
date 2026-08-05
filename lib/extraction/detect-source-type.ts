import { PDFParse } from "pdf-parse";
import { DOCX_MIME_TYPE, type SourceType } from "./types";

const MIN_CHARS_PER_PAGE = 50;

export async function detectSourceType(
  buffer: Buffer,
  mimeType: string
): Promise<SourceType> {
  if (mimeType.startsWith("image/")) {
    return "image";
  }

  if (mimeType === DOCX_MIME_TYPE) {
    return "docx";
  }

  if (mimeType === "application/pdf") {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      const pageCount = result.pages.length || 1;
      const averageCharsPerPage = result.text.trim().length / pageCount;
      return averageCharsPerPage >= MIN_CHARS_PER_PAGE
        ? "digital_pdf"
        : "scanned_pdf";
    } finally {
      await parser.destroy();
    }
  }

  throw new Error(`Desteklenmeyen MIME tipi: ${mimeType}`);
}
