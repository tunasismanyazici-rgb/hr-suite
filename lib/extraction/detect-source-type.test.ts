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

import { detectSourceType } from "./detect-source-type";

describe("detectSourceType", () => {
  beforeEach(() => {
    getTextMock.mockReset();
    destroyMock.mockReset();
  });

  it("image mime tipini 'image' olarak tanır", async () => {
    await expect(detectSourceType(Buffer.from(""), "image/png")).resolves.toBe(
      "image"
    );
    expect(getTextMock).not.toHaveBeenCalled();
  });

  it("docx mime tipini 'docx' olarak tanır", async () => {
    await expect(
      detectSourceType(
        Buffer.from(""),
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      )
    ).resolves.toBe("docx");
  });

  it("desteklenmeyen mime tipi için hata fırlatır", async () => {
    await expect(
      detectSourceType(Buffer.from(""), "application/zip")
    ).rejects.toThrow("Desteklenmeyen MIME tipi");
  });

  it("sayfa başına yeterli metin varsa digital_pdf döner", async () => {
    getTextMock.mockResolvedValue({
      text: "a".repeat(200),
      pages: [
        { num: 1, text: "a".repeat(100) },
        { num: 2, text: "a".repeat(100) },
      ],
      total: 2,
    });

    await expect(
      detectSourceType(Buffer.from(""), "application/pdf")
    ).resolves.toBe("digital_pdf");
    expect(destroyMock).toHaveBeenCalledTimes(1);
  });

  it("sayfa başına yetersiz metin varsa scanned_pdf döner", async () => {
    getTextMock.mockResolvedValue({
      text: "az",
      pages: [{ num: 1, text: "az" }],
      total: 1,
    });

    await expect(
      detectSourceType(Buffer.from(""), "application/pdf")
    ).resolves.toBe("scanned_pdf");
  });

  it("pdf-parse hata fırlatsa bile parser.destroy çağrılır", async () => {
    getTextMock.mockRejectedValue(new Error("bozuk pdf"));

    await expect(
      detectSourceType(Buffer.from(""), "application/pdf")
    ).rejects.toThrow("bozuk pdf");
    expect(destroyMock).toHaveBeenCalledTimes(1);
  });
});
