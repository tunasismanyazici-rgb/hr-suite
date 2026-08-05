import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  detectSourceTypeMock,
  extractFromDigitalPdfMock,
  extractFromDocxMock,
  extractWithVisionMock,
} = vi.hoisted(() => ({
  detectSourceTypeMock: vi.fn(),
  extractFromDigitalPdfMock: vi.fn(),
  extractFromDocxMock: vi.fn(),
  extractWithVisionMock: vi.fn(),
}));

vi.mock("./detect-source-type", () => ({
  detectSourceType: detectSourceTypeMock,
}));
vi.mock("./digital-pdf", () => ({
  extractFromDigitalPdf: extractFromDigitalPdfMock,
}));
vi.mock("./docx", () => ({ extractFromDocx: extractFromDocxMock }));
vi.mock("./vision", () => ({ extractWithVision: extractWithVisionMock }));

import { extractText } from "./index";

describe("extractText", () => {
  beforeEach(() => {
    detectSourceTypeMock.mockReset();
    extractFromDigitalPdfMock.mockReset();
    extractFromDocxMock.mockReset();
    extractWithVisionMock.mockReset();
  });

  it("digital_pdf için extractFromDigitalPdf'e yönlendirir", async () => {
    detectSourceTypeMock.mockResolvedValue("digital_pdf");
    extractFromDigitalPdfMock.mockResolvedValue({ text: "x", confidence: 1 });

    const result = await extractText(Buffer.from(""), "application/pdf");

    expect(result).toEqual({ text: "x", confidence: 1, sourceType: "digital_pdf" });
    expect(extractFromDigitalPdfMock).toHaveBeenCalledTimes(1);
    expect(extractFromDocxMock).not.toHaveBeenCalled();
    expect(extractWithVisionMock).not.toHaveBeenCalled();
  });

  it("docx için extractFromDocx'e yönlendirir", async () => {
    detectSourceTypeMock.mockResolvedValue("docx");
    extractFromDocxMock.mockResolvedValue({ text: "y", confidence: 1 });

    const result = await extractText(
      Buffer.from(""),
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );

    expect(result).toEqual({ text: "y", confidence: 1, sourceType: "docx" });
    expect(extractFromDigitalPdfMock).not.toHaveBeenCalled();
  });

  it("scanned_pdf için extractWithVision'a yönlendirir", async () => {
    detectSourceTypeMock.mockResolvedValue("scanned_pdf");
    extractWithVisionMock.mockResolvedValue({ text: "z", confidence: 0.5 });

    const result = await extractText(Buffer.from(""), "application/pdf");

    expect(result).toEqual({ text: "z", confidence: 0.5, sourceType: "scanned_pdf" });
  });

  it("image için extractWithVision'a yönlendirir", async () => {
    detectSourceTypeMock.mockResolvedValue("image");
    extractWithVisionMock.mockResolvedValue({ text: "w", confidence: 0.9 });

    const result = await extractText(Buffer.from(""), "image/png");

    expect(result).toEqual({ text: "w", confidence: 0.9, sourceType: "image" });
  });
});
