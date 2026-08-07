import { describe, expect, it } from "vitest";

import { computeTargetDimensions, isCompressibleImage } from "./compress-image";

describe("computeTargetDimensions", () => {
  it("uzun kenar sınırın altındaysa boyutu değiştirmez", () => {
    expect(computeTargetDimensions(1200, 800)).toEqual({ width: 1200, height: 800 });
  });

  it("uzun kenar sınırı aşarsa oranı koruyarak küçültür", () => {
    expect(computeTargetDimensions(4000, 2000)).toEqual({ width: 2000, height: 1000 });
  });

  it("dikey görsellerde uzun kenar yükseklik olabilir", () => {
    expect(computeTargetDimensions(1500, 3000)).toEqual({ width: 1000, height: 2000 });
  });

  it("sınıra tam eşit olan kenarı değiştirmez", () => {
    expect(computeTargetDimensions(2000, 1000)).toEqual({ width: 2000, height: 1000 });
  });
});

describe("isCompressibleImage", () => {
  it("jpeg ve png için true döner", () => {
    expect(isCompressibleImage(new File([], "a.jpg", { type: "image/jpeg" }))).toBe(true);
    expect(isCompressibleImage(new File([], "a.png", { type: "image/png" }))).toBe(true);
  });

  it("pdf ve docx için false döner", () => {
    expect(
      isCompressibleImage(new File([], "a.pdf", { type: "application/pdf" }))
    ).toBe(false);
    expect(
      isCompressibleImage(
        new File([], "a.docx", {
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        })
      )
    ).toBe(false);
  });
});
