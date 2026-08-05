import mammoth from "mammoth";
import type { ExtractionResult } from "./types";

export async function extractFromDocx(buffer: Buffer): Promise<ExtractionResult> {
  const result = await mammoth.extractRawText({ buffer });
  return { text: result.value, confidence: 1 };
}
