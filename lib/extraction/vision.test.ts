import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  batchAnnotateFilesMock,
  documentTextDetectionMock,
  getTextMock,
  destroyMock,
} = vi.hoisted(() => ({
  batchAnnotateFilesMock: vi.fn(),
  documentTextDetectionMock: vi.fn(),
  getTextMock: vi.fn(),
  destroyMock: vi.fn(),
}));

vi.mock("@google-cloud/vision", () => ({
  ImageAnnotatorClient: vi.fn().mockImplementation(function ImageAnnotatorClient() {
    return {
      batchAnnotateFiles: batchAnnotateFilesMock,
      documentTextDetection: documentTextDetectionMock,
    };
  }),
}));

vi.mock("pdf-parse", () => ({
  PDFParse: vi.fn().mockImplementation(function PDFParse() {
    return { getText: getTextMock, destroy: destroyMock };
  }),
}));

import { extractWithVision } from "./vision";

const VALID_CREDENTIALS = JSON.stringify({
  client_email: "test@example.com",
  private_key: "test-key",
});

describe("extractWithVision", () => {
  const originalEnv = process.env.GOOGLE_CLOUD_CREDENTIALS;

  beforeEach(() => {
    batchAnnotateFilesMock.mockReset();
    documentTextDetectionMock.mockReset();
    getTextMock.mockReset();
    destroyMock.mockReset();
  });

  afterEach(() => {
    process.env.GOOGLE_CLOUD_CREDENTIALS = originalEnv;
  });

  it("GOOGLE_CLOUD_CREDENTIALS eksikse hata fırlatır", async () => {
    delete process.env.GOOGLE_CLOUD_CREDENTIALS;

    await expect(
      extractWithVision(Buffer.from(""), "image/png")
    ).rejects.toThrow("Ortam değişkeni eksik");
  });

  it("GOOGLE_CLOUD_CREDENTIALS geçersiz JSON ise hata fırlatır", async () => {
    process.env.GOOGLE_CLOUD_CREDENTIALS = "gecersiz-json";

    await expect(
      extractWithVision(Buffer.from(""), "image/png")
    ).rejects.toThrow("geçerli bir JSON değil");
  });

  it("resimler için documentTextDetection çağırır ve metni döner", async () => {
    process.env.GOOGLE_CLOUD_CREDENTIALS = VALID_CREDENTIALS;
    documentTextDetectionMock.mockResolvedValue([
      { fullTextAnnotation: { text: "merhaba", pages: [{ confidence: 0.9 }] } },
    ]);

    const result = await extractWithVision(Buffer.from(""), "image/png");

    expect(result).toEqual({ text: "merhaba", confidence: 0.9 });
    expect(documentTextDetectionMock).toHaveBeenCalled();
  });

  it("resim yanıtında hata varsa fırlatır", async () => {
    process.env.GOOGLE_CLOUD_CREDENTIALS = VALID_CREDENTIALS;
    documentTextDetectionMock.mockResolvedValue([
      { error: { message: "kota aşıldı" } },
    ]);

    await expect(
      extractWithVision(Buffer.from(""), "image/png")
    ).rejects.toThrow("kota aşıldı");
  });

  it("5 sayfa ve altı PDF için senkron batchAnnotateFiles çağırır, sayfa güvenlerinin ortalamasını döner", async () => {
    process.env.GOOGLE_CLOUD_CREDENTIALS = VALID_CREDENTIALS;
    getTextMock.mockResolvedValue({
      text: "",
      pages: [
        { num: 1, text: "" },
        { num: 2, text: "" },
      ],
      total: 2,
    });
    batchAnnotateFilesMock.mockResolvedValue([
      {
        responses: [
          {
            responses: [
              {
                fullTextAnnotation: { text: "sayfa1", pages: [{ confidence: 0.8 }] },
              },
              {
                fullTextAnnotation: { text: "sayfa2", pages: [{ confidence: 0.6 }] },
              },
            ],
          },
        ],
      },
    ]);

    const result = await extractWithVision(Buffer.from(""), "application/pdf");

    expect(result.text).toBe("sayfa1\nsayfa2");
    expect(result.confidence).toBeCloseTo(0.7);
    expect(batchAnnotateFilesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        requests: [expect.objectContaining({ pages: [1, 2] })],
      })
    );
  });

  it("5 sayfadan fazla PDF için hata fırlatır ve Vision'ı çağırmaz", async () => {
    process.env.GOOGLE_CLOUD_CREDENTIALS = VALID_CREDENTIALS;
    getTextMock.mockResolvedValue({
      text: "",
      pages: Array.from({ length: 6 }, (_, index) => ({ num: index + 1, text: "" })),
      total: 6,
    });

    await expect(
      extractWithVision(Buffer.from(""), "application/pdf")
    ).rejects.toThrow("en fazla 5 sayfayı destekler");
    expect(batchAnnotateFilesMock).not.toHaveBeenCalled();
  });

  it("PDF sayfa yanıtında hata varsa fırlatır", async () => {
    process.env.GOOGLE_CLOUD_CREDENTIALS = VALID_CREDENTIALS;
    getTextMock.mockResolvedValue({
      text: "",
      pages: [{ num: 1, text: "" }],
      total: 1,
    });
    batchAnnotateFilesMock.mockResolvedValue([
      { responses: [{ responses: [{ error: { message: "sayfa okunamadı" } }] }] },
    ]);

    await expect(
      extractWithVision(Buffer.from(""), "application/pdf")
    ).rejects.toThrow("sayfa okunamadı");
  });
});
