import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(function Anthropic() {
    return { messages: { create: createMock } };
  }),
}));

import { extractStructuredData } from "./structure";

const VALID_RESULT = {
  first_name: "Ahmet",
  last_name: "Yılmaz",
  birth_date: "1990-05-01",
  province: "İstanbul",
  district: "Kadıköy",
  summary: "5 yıllık deneyime sahip yazılım mühendisi.",
  experiences: [
    {
      company_name: "Acme A.Ş.",
      title: "Yazılım Mühendisi",
      start_date: "2019-01-01",
      end_date: null,
      is_current: true,
    },
  ],
  educations: [
    {
      institution: "Boğaziçi Üniversitesi",
      field_of_study: "Bilgisayar Mühendisliği",
      end_year: 2018,
    },
  ],
  certifications: [{ name: "AWS Certified", expiry_date: null }],
  languages: [{ language_code: "en", cefr_level: "C1" }],
  skills: ["TypeScript", "React"],
  field_confidence: {
    first_name: 0.9,
    last_name: 0.9,
    birth_date: 0.5,
    province: 0.8,
    district: 0.8,
    experiences: 0.9,
    educations: 0.9,
    certifications: 0.7,
    languages: 0.7,
    skills: 0.8,
    summary: 0.8,
  },
};

function mockResponse(input: unknown, usage = { input_tokens: 100, output_tokens: 50 }) {
  return {
    content: [
      { type: "tool_use", id: "toolu_1", name: "extract_candidate_data", input },
    ],
    usage,
  };
}

describe("extractStructuredData", () => {
  const originalEnv = process.env.ANTHROPIC_API_KEY;

  beforeEach(() => {
    createMock.mockReset();
    process.env.ANTHROPIC_API_KEY = "test-key";
  });

  afterEach(() => {
    process.env.ANTHROPIC_API_KEY = originalEnv;
  });

  it("ANTHROPIC_API_KEY eksikse hata fırlatır", async () => {
    delete process.env.ANTHROPIC_API_KEY;

    await expect(extractStructuredData("cv metni")).rejects.toThrow(
      "Ortam değişkeni eksik"
    );
  });

  it("geçerli yanıtı doğrulayıp döndürür, token/maliyeti hesaplar", async () => {
    createMock.mockResolvedValue(mockResponse(VALID_RESULT));

    const result = await extractStructuredData("cv metni");

    expect(result.data.first_name).toBe("Ahmet");
    expect(result.data.experiences).toHaveLength(1);
    expect(result.data.field_confidence.summary).toBe(0.8);
    expect(result.usage.inputTokens).toBe(100);
    expect(result.usage.outputTokens).toBe(50);
    expect(result.usage.costUsd).toBeGreaterThan(0);
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it("ilk yanıt geçersizse bir kez daha dener, ikinci geçerli yanıtı döner ve token kullanımını toplar", async () => {
    createMock
      .mockResolvedValueOnce(
        mockResponse({ ...VALID_RESULT, first_name: 123 }, { input_tokens: 100, output_tokens: 50 })
      )
      .mockResolvedValueOnce(
        mockResponse(VALID_RESULT, { input_tokens: 110, output_tokens: 55 })
      );

    const result = await extractStructuredData("cv metni");

    expect(result.data.first_name).toBe("Ahmet");
    expect(result.usage.inputTokens).toBe(210);
    expect(result.usage.outputTokens).toBe(105);
    expect(createMock).toHaveBeenCalledTimes(2);
  });

  it("iki deneme de geçersizse hata fırlatır", async () => {
    createMock.mockResolvedValue(
      mockResponse({ ...VALID_RESULT, first_name: 123 })
    );

    await expect(extractStructuredData("cv metni")).rejects.toThrow(
      "Yapılandırılmış veri doğrulanamadı"
    );
    expect(createMock).toHaveBeenCalledTimes(2);
  });

  it("araç çağrısı yoksa hata fırlatır", async () => {
    createMock.mockResolvedValue({
      content: [{ type: "text", text: "merhaba" }],
      usage: { input_tokens: 10, output_tokens: 5 },
    });

    await expect(extractStructuredData("cv metni")).rejects.toThrow(
      "araç çağrısı bulunamadı"
    );
  });
});
