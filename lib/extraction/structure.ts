import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

export const EXTRACTION_MODEL = "claude-sonnet-5";

// Yaklaşık liste fiyatı (USD / 1M token). Kesin faturalandırma değil,
// audit_log'da gösterge amaçlı maliyet tahmini için kullanılır.
const PRICE_USD_PER_MILLION_INPUT_TOKENS = 3;
const PRICE_USD_PER_MILLION_OUTPUT_TOKENS = 15;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const dateSchema = z.string().regex(DATE_PATTERN).nullable();
const cefrLevelSchema = z
  .enum(["A1", "A2", "B1", "B2", "C1", "C2", "native"])
  .nullable();

const experienceSchema = z.object({
  company_name: z.string().nullable(),
  title: z.string().nullable(),
  start_date: dateSchema,
  end_date: dateSchema,
  is_current: z.boolean(),
});

const educationSchema = z.object({
  institution: z.string().nullable(),
  field_of_study: z.string().nullable(),
  end_year: z.number().int().nullable(),
});

const certificationSchema = z.object({
  name: z.string().nullable(),
  expiry_date: dateSchema,
});

const languageSchema = z.object({
  language_code: z.string(),
  cefr_level: cefrLevelSchema,
});

const fieldConfidenceSchema = z.object({
  first_name: z.number().min(0).max(1),
  last_name: z.number().min(0).max(1),
  birth_date: z.number().min(0).max(1),
  province: z.number().min(0).max(1),
  district: z.number().min(0).max(1),
  experiences: z.number().min(0).max(1),
  educations: z.number().min(0).max(1),
  certifications: z.number().min(0).max(1),
  languages: z.number().min(0).max(1),
  skills: z.number().min(0).max(1),
  summary: z.number().min(0).max(1),
});

export const structuredCandidateSchema = z.object({
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  birth_date: dateSchema,
  province: z.string().nullable(),
  district: z.string().nullable(),
  summary: z.string().nullable(),
  experiences: z.array(experienceSchema),
  educations: z.array(educationSchema),
  certifications: z.array(certificationSchema),
  languages: z.array(languageSchema),
  skills: z.array(z.string()),
  field_confidence: fieldConfidenceSchema,
});

export type StructuredCandidateData = z.infer<typeof structuredCandidateSchema>;

export interface ExtractionUsage {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export interface StructuredExtractionResult {
  data: StructuredCandidateData;
  usage: ExtractionUsage;
}

const TOOL_NAME = "extract_candidate_data";

const SYSTEM_PROMPT = `Sen bir CV/özgeçmiş ayrıştırma asistanısın. Sana verilen ham metin, OCR veya PDF/DOCX çıkarımından gelen bir CV'nin içeriğidir. Metin Türkçe, İngilizce ya da ikisinin karışımı olabilir.

Görevin: metindeki bilgileri ${TOOL_NAME} aracına verilen şemaya uygun şekilde çıkarmak.

Kurallar:
- Tarihleri her zaman YYYY-MM-DD formatına normalize et. Sadece ay/yıl biliniyorsa (ör. "01/2019", "Ocak 2019", "2019") günü "01" olarak yaz (ör. "2019-01-01"). Hiçbir tarih bilgisi yoksa null yaz.
- "Halen çalışıyor", "Present", "Devam ediyor" gibi ifadeler varsa is_current alanını true yap ve end_date'i null bırak.
- province ve district alanlarını metinde geçtiği hâliyle (orijinal yazımıyla) yaz; resmi plaka koduna veya standart isme çevirme.
- languages alanında language_code için ISO 639-1 iki harfli kodları kullan (ör. "tr", "en", "de").
- skills alanına serbest metin hâlinde, madde madde beceri isimleri yaz.
- summary alanına adayın deneyim ve becerilerini özetleyen, 2-3 cümlelik kısa bir Türkçe özet yaz. Metin çok kısa/yetersizse null bırak.
- Metinde bulunmayan veya emin olamadığın her alan için null (dizi alanlar için boş dizi []) kullan; asla veri uydurma.
- field_confidence içindeki her alan için 0 ile 1 arasında bir güven skoru ver: 1 metinde açıkça ve kesin şekilde belirtilmişse, 0 hiç bulunamadıysa ya da tahmine dayalıysa.
- Yanıtını sadece ${TOOL_NAME} aracını çağırarak ver, başka metin ekleme.`;

function getApiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error(
      "Ortam değişkeni eksik: ANTHROPIC_API_KEY. Lütfen .env.local dosyasını kontrol edin."
    );
  }
  return key;
}

function buildToolInputSchema(): Anthropic.Tool.InputSchema {
  const jsonSchema = z.toJSONSchema(
    structuredCandidateSchema
  ) as unknown as Anthropic.Tool.InputSchema & { $schema?: string };
  delete jsonSchema.$schema;
  return jsonSchema;
}

function estimateCostUsd(inputTokens: number, outputTokens: number): number {
  const cost =
    (inputTokens / 1_000_000) * PRICE_USD_PER_MILLION_INPUT_TOKENS +
    (outputTokens / 1_000_000) * PRICE_USD_PER_MILLION_OUTPUT_TOKENS;
  return Math.round(cost * 1_000_000) / 1_000_000;
}

interface ClaudeCallResult {
  input: unknown;
  usage: { inputTokens: number; outputTokens: number };
}

async function callClaudeForExtraction(rawText: string): Promise<ClaudeCallResult> {
  const client = new Anthropic({ apiKey: getApiKey() });

  const response = await client.messages.create({
    model: EXTRACTION_MODEL,
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    tools: [
      {
        name: TOOL_NAME,
        description: "CV metninden yapılandırılmış aday bilgilerini çıkarır.",
        input_schema: buildToolInputSchema(),
      },
    ],
    tool_choice: { type: "tool", name: TOOL_NAME },
    messages: [{ role: "user", content: rawText }],
  });

  const toolUseBlock = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );

  if (!toolUseBlock) {
    throw new Error("Claude yanıtında araç çağrısı bulunamadı.");
  }

  return {
    input: toolUseBlock.input,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  };
}

export async function extractStructuredData(
  rawText: string
): Promise<StructuredExtractionResult> {
  const first = await callClaudeForExtraction(rawText);
  const totalUsage = { ...first.usage };

  const firstAttempt = structuredCandidateSchema.safeParse(first.input);
  if (firstAttempt.success) {
    return {
      data: firstAttempt.data,
      usage: {
        ...totalUsage,
        costUsd: estimateCostUsd(totalUsage.inputTokens, totalUsage.outputTokens),
      },
    };
  }

  const second = await callClaudeForExtraction(rawText);
  totalUsage.inputTokens += second.usage.inputTokens;
  totalUsage.outputTokens += second.usage.outputTokens;

  const secondAttempt = structuredCandidateSchema.safeParse(second.input);
  if (secondAttempt.success) {
    return {
      data: secondAttempt.data,
      usage: {
        ...totalUsage,
        costUsd: estimateCostUsd(totalUsage.inputTokens, totalUsage.outputTokens),
      },
    };
  }

  throw new Error(
    `Yapılandırılmış veri doğrulanamadı: ${secondAttempt.error.message}`
  );
}
