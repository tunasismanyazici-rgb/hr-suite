import "./pdf-worker-setup";
import { PDFParse } from "pdf-parse";
import type { ExtractionResult } from "./types";

export async function extractFromDigitalPdf(
  buffer: Buffer
): Promise<ExtractionResult> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return { text: result.text, confidence: 1 };
  } finally {
    await parser.destroy();
  }
}
