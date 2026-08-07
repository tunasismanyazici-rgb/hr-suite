import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractText, extractStructuredData, EXTRACTION_MODEL } from "@/lib/extraction";
import { resolveLocation } from "@/lib/geo/resolve-location";

export const maxDuration = 60;

const FRIENDLY_ERROR_MESSAGE =
  "Belgeniz işlenirken bir sorun oluştu. Lütfen belgenizi tekrar yükleyin.";

interface ProcessRequest {
  document_id: string;
}

function isValidRequest(body: unknown): body is ProcessRequest {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  return typeof b.document_id === "string" && b.document_id.length > 0;
}

async function logAudit(
  actorId: string,
  documentId: string,
  action: string,
  metadata: Record<string, unknown>
) {
  const adminClient = createAdminClient();
  const { error } = await adminClient.from("audit_log").insert({
    actor_id: actorId,
    actor_type: "candidate",
    action,
    entity_type: "candidate_document",
    entity_id: documentId,
    metadata,
  });

  if (error) {
    console.error("audit_log kaydı başarısız:", error.message);
  }
}

interface ExperienceRow {
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
}

function computeTotalExperienceYears(experiences: ExperienceRow[]): number | null {
  let totalMonths = 0;
  let hasAny = false;

  for (const exp of experiences) {
    if (!exp.start_date) continue;
    const start = new Date(exp.start_date);
    const end = exp.is_current || !exp.end_date ? new Date() : new Date(exp.end_date);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;

    const months =
      (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth());
    if (months > 0) {
      totalMonths += months;
      hasAny = true;
    }
  }

  if (!hasAny) return null;
  return Math.round((totalMonths / 12) * 10) / 10;
}

async function replaceRows(
  supabase: SupabaseClient,
  table: string,
  candidateId: string,
  rows: Record<string, unknown>[]
) {
  const { error: deleteError } = await supabase
    .from(table)
    .delete()
    .eq("candidate_id", candidateId);
  if (deleteError) {
    throw new Error(`${table} silinemedi: ${deleteError.message}`);
  }

  if (rows.length === 0) return;

  const { error: insertError } = await supabase.from(table).insert(rows);
  if (insertError) {
    throw new Error(`${table} kaydedilemedi: ${insertError.message}`);
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!isValidRequest(body)) {
    return NextResponse.json(
      { error: "İstek gövdesi geçersiz." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Oturum bulunamadı." }, { status: 401 });
  }

  const { data: candidate } = await supabase
    .from("candidates")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!candidate) {
    return NextResponse.json(
      { error: "Aday kaydı bulunamadı." },
      { status: 403 }
    );
  }

  const { data: document } = await supabase
    .from("candidate_documents")
    .select("id, candidate_id, storage_path, mime_type")
    .eq("id", body.document_id)
    .maybeSingle();

  if (!document || document.candidate_id !== candidate.id) {
    return NextResponse.json({ error: "Belge bulunamadı." }, { status: 404 });
  }

  await supabase
    .from("candidate_documents")
    .update({ ocr_status: "processing" })
    .eq("id", document.id);

  const startedAt = Date.now();

  try {
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("candidate-documents")
      .download(document.storage_path);

    if (downloadError || !fileData) {
      throw new Error(
        `Depolamadan indirilemedi: ${downloadError?.message ?? "bilinmeyen hata"}`
      );
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());
    const ocrResult = await extractText(buffer, document.mime_type);

    await supabase
      .from("candidate_documents")
      .update({
        raw_text: ocrResult.text,
        source_type: ocrResult.sourceType,
        ocr_confidence: ocrResult.confidence,
        error_message: null,
      })
      .eq("id", document.id);

    await logAudit(user.id, document.id, "metin_cikarildi", {
      document_id: document.id,
      source_type: ocrResult.sourceType,
      duration_ms: Date.now() - startedAt,
    });

    const structureStartedAt = Date.now();
    const structured = await extractStructuredData(ocrResult.text);

    const { provinceCode, districtCode } = await resolveLocation(
      supabase,
      structured.data.province,
      structured.data.district
    );

    const { error: candidateUpdateError } = await supabase
      .from("candidates")
      .update({
        first_name: structured.data.first_name,
        last_name: structured.data.last_name,
        birth_date: structured.data.birth_date,
        province_code: provinceCode,
        district_code: districtCode,
        status: "needs_review",
      })
      .eq("id", candidate.id);
    if (candidateUpdateError) {
      throw new Error(`candidates güncellenemedi: ${candidateUpdateError.message}`);
    }

    const { error: profileError } = await supabase.from("candidate_profiles").upsert(
      {
        candidate_id: candidate.id,
        document_id: document.id,
        summary: structured.data.summary,
        total_experience_years: computeTotalExperienceYears(
          structured.data.experiences
        ),
        raw_extraction: structured.data,
        field_confidence: structured.data.field_confidence,
        extraction_model: EXTRACTION_MODEL,
      },
      { onConflict: "candidate_id" }
    );
    if (profileError) {
      throw new Error(`candidate_profiles kaydedilemedi: ${profileError.message}`);
    }

    await replaceRows(
      supabase,
      "experiences",
      candidate.id,
      structured.data.experiences.map((exp, index) => ({
        candidate_id: candidate.id,
        company_name: exp.company_name,
        title: exp.title,
        start_date: exp.start_date,
        end_date: exp.end_date,
        is_current: exp.is_current,
        sort_order: index,
      }))
    );

    await replaceRows(
      supabase,
      "educations",
      candidate.id,
      structured.data.educations.map((edu) => ({
        candidate_id: candidate.id,
        institution: edu.institution,
        field_of_study: edu.field_of_study,
        end_year: edu.end_year,
      }))
    );

    await replaceRows(
      supabase,
      "certifications",
      candidate.id,
      structured.data.certifications.map((cert, index) => ({
        candidate_id: candidate.id,
        name: cert.name,
        expiry_date: cert.expiry_date,
        sort_order: index,
      }))
    );

    const uniqueLanguages = new Map<
      string,
      { language_code: string; cefr_level: string | null }
    >();
    for (const lang of structured.data.languages) {
      if (!uniqueLanguages.has(lang.language_code)) {
        uniqueLanguages.set(lang.language_code, lang);
      }
    }

    await replaceRows(
      supabase,
      "candidate_languages",
      candidate.id,
      Array.from(uniqueLanguages.values()).map((lang) => ({
        candidate_id: candidate.id,
        language_code: lang.language_code,
        cefr_level: lang.cefr_level,
      }))
    );

    await supabase
      .from("candidate_documents")
      .update({ ocr_status: "completed" })
      .eq("id", document.id);

    await logAudit(user.id, document.id, "belge_islendi", {
      document_id: document.id,
      model: EXTRACTION_MODEL,
      input_tokens: structured.usage.inputTokens,
      output_tokens: structured.usage.outputTokens,
      cost_usd: structured.usage.costUsd,
      duration_ms: Date.now() - structureStartedAt,
    });

    return NextResponse.json({
      status: "completed",
      sourceType: ocrResult.sourceType,
      confidence: ocrResult.confidence,
      textLength: ocrResult.text.length,
    });
  } catch (error) {
    console.error("Belge işleme hatası:", error);

    await supabase
      .from("candidate_documents")
      .update({
        ocr_status: "failed",
        error_message: FRIENDLY_ERROR_MESSAGE,
      })
      .eq("id", document.id);

    await logAudit(user.id, document.id, "belge_islenemedi", {
      document_id: document.id,
      duration_ms: Date.now() - startedAt,
    });

    return NextResponse.json(
      { status: "failed", error: FRIENDLY_ERROR_MESSAGE },
      { status: 200 }
    );
  }
}
