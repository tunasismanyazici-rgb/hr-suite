export type SourceType = "digital_pdf" | "scanned_pdf" | "image" | "docx";

export interface ExtractionResult {
  text: string;
  confidence: number;
}

export interface TextExtractionResult extends ExtractionResult {
  sourceType: SourceType;
}

export const DOCX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
