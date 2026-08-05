import { beforeEach, describe, expect, it, vi } from "vitest";

const { getTextMock, destroyMock } = vi.hoisted(() => ({
  getTextMock: vi.fn(),
  destroyMock: vi.fn(),
}));

vi.mock("pdf-parse", () => ({
  PDFParse: vi.fn().mockImplementation(function PDFParse() {
    return { getText: getTextMock, destroy: destroyMock };
  }),
}));

import { extractFromDigitalPdf } from "./digital-pdf";

describe("extractFromDigitalPdf", () => {
  beforeEach(() => {
    getTextMock.mockReset();
    destroyMock.mockReset();
  });

  it("pdf-parse sonucundaki metni ve sabit güveni döndürür", async () => {
    getTextMock.mockResolvedValue({ text: "merhaba dünya", pages: [], total: 1 });

    const result = await extractFromDigitalPdf(Buffer.from(""));

    expect(result).toEqual({ text: "merhaba dünya", confidence: 1 });
    expect(destroyMock).toHaveBeenCalledTimes(1);
  });

  it("hata durumunda bile parser.destroy çağrılır", async () => {
    getTextMock.mockRejectedValue(new Error("bozuk pdf"));

    await expect(extractFromDigitalPdf(Buffer.from(""))).rejects.toThrow(
      "bozuk pdf"
    );
    expect(destroyMock).toHaveBeenCalledTimes(1);
  });
});
