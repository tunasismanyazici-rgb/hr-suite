import "./pdf-worker-setup";
import { ImageAnnotatorClient } from "@google-cloud/vision";
import { PDFParse } from "pdf-parse";
import type { ExtractionResult } from "./types";

const MAX_SYNC_PDF_PAGES = 5;

function readCredentials(): Record<string, unknown> {
  const raw = process.env.GOOGLE_CLOUD_CREDENTIALS;
  if (!raw) {
    throw new Error(
      "Ortam değişkeni eksik: GOOGLE_CLOUD_CREDENTIALS. Lütfen .env.local dosyasını kontrol edin."
    );
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("GOOGLE_CLOUD_CREDENTIALS geçerli bir JSON değil.");
  }
}

function createVisionClient(): ImageAnnotatorClient {
  return new ImageAnnotatorClient({ credentials: readCredentials() });
}

function averageOf(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

async function extractFromPdfWithVision(buffer: Buffer): Promise<ExtractionResult> {
  const parser = new PDFParse({ data: buffer });
  let pageCount: number;
  try {
    const info = await parser.getText();
    pageCount = info.pages.length || 1;
  } finally {
    await parser.destroy();
  }

  if (pageCount > MAX_SYNC_PDF_PAGES) {
    throw new Error(
      `Taranmış PDF ${pageCount} sayfa içeriyor; senkron Vision API en fazla ${MAX_SYNC_PDF_PAGES} sayfayı destekler. Toplu (async) işleme henüz uygulanmadı.`
    );
  }

  const client = createVisionClient();
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1);

  const [batchResult] = await client.batchAnnotateFiles({
    requests: [
      {
        inputConfig: { content: buffer, mimeType: "application/pdf" },
        features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
        pages,
      },
    ],
  });

  const pageResponses = batchResult.responses?.[0]?.responses ?? [];

  const texts: string[] = [];
  const confidences: number[] = [];

  for (const pageResponse of pageResponses) {
    if (pageResponse.error) {
      throw new Error(`Vision API hatası: ${pageResponse.error.message}`);
    }
    texts.push(pageResponse.fullTextAnnotation?.text ?? "");
    const pageConfidence = pageResponse.fullTextAnnotation?.pages?.[0]?.confidence;
    if (typeof pageConfidence === "number") {
      confidences.push(pageConfidence);
    }
  }

  return { text: texts.join("\n"), confidence: averageOf(confidences) };
}

async function extractFromImageWithVision(buffer: Buffer): Promise<ExtractionResult> {
  const client = createVisionClient();
  const [result] = await client.documentTextDetection({
    image: { content: buffer },
  });

  if (result.error) {
    throw new Error(`Vision API hatası: ${result.error.message}`);
  }

  const text = result.fullTextAnnotation?.text ?? "";
  const confidence = result.fullTextAnnotation?.pages?.[0]?.confidence ?? 0;
  return { text, confidence };
}

export async function extractWithVision(
  buffer: Buffer,
  mimeType: string
): Promise<ExtractionResult> {
  if (mimeType === "application/pdf") {
    return extractFromPdfWithVision(buffer);
  }
  return extractFromImageWithVision(buffer);
}
