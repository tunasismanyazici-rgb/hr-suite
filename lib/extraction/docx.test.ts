import { beforeEach, describe, expect, it, vi } from "vitest";

const { extractRawTextMock } = vi.hoisted(() => ({
  extractRawTextMock: vi.fn(),
}));

vi.mock("mammoth", () => ({
  default: { extractRawText: extractRawTextMock },
  extractRawText: extractRawTextMock,
}));

import { extractFromDocx } from "./docx";

describe("extractFromDocx", () => {
  beforeEach(() => {
    extractRawTextMock.mockReset();
  });

  it("mammoth sonucundaki metni ve sabit güveni döndürür", async () => {
    extractRawTextMock.mockResolvedValue({ value: "cv metni", messages: [] });

    const result = await extractFromDocx(Buffer.from("belge-içeriği"));

    expect(result).toEqual({ text: "cv metni", confidence: 1 });
    expect(extractRawTextMock).toHaveBeenCalledWith({
      buffer: expect.any(Buffer),
    });
  });

  it("mammoth hata fırlatırsa hatayı yukarı iletir", async () => {
    extractRawTextMock.mockRejectedValue(new Error("bozuk docx"));

    await expect(extractFromDocx(Buffer.from(""))).rejects.toThrow("bozuk docx");
  });
});
