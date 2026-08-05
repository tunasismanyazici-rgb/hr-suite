import { detectSourceType } from "./detect-source-type";
import { extractFromDigitalPdf } from "./digital-pdf";
import { extractFromDocx } from "./docx";
import { extractWithVision } from "./vision";
import type { TextExtractionResult } from "./types";

export async function extractText(
  buffer: Buffer,
  mimeType: string
): Promise<TextExtractionResult> {
  const sourceType = await detectSourceType(buffer, mimeType);

  switch (sourceType) {
    case "digital_pdf": {
      const result = await extractFromDigitalPdf(buffer);
      return { ...result, sourceType };
    }
    case "docx": {
      const result = await extractFromDocx(buffer);
      return { ...result, sourceType };
    }
    case "scanned_pdf":
    case "image": {
      const result = await extractWithVision(buffer, mimeType);
      return { ...result, sourceType };
    }
  }
}

export { detectSourceType } from "./detect-source-type";
export { extractFromDigitalPdf } from "./digital-pdf";
export { extractFromDocx } from "./docx";
export { extractWithVision } from "./vision";
export type { SourceType, ExtractionResult, TextExtractionResult } from "./types";
