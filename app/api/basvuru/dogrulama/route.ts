import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const dateSchema = z.string().regex(DATE_PATTERN).nullable();

const experienceInputSchema = z.object({
  company_name: z.string().nullable(),
  title: z.string().nullable(),
  start_date: dateSchema,
  end_date: dateSchema,
  is_current: z.boolean(),
});

const educationInputSchema = z.object({
  institution: z.string().nullable(),
  field_of_study: z.string().nullable(),
  end_year: z.number().int().nullable(),
});

const certificationInputSchema = z.object({
  name: z.string().nullable(),
  expiry_date: dateSchema,
});

const bodySchema = z.object({
  first_name: z.string().trim().min(1),
  last_name: z.string().trim().min(1),
  birth_date: dateSchema,
  province_code: z.string().nullable(),
  district_code: z.string().nullable(),
  experiences: z.array(experienceInputSchema),
  educations: z.array(educationInputSchema),
  certifications: z.array(certificationInputSchema),
});

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

function arraysDiffer(a: unknown[], b: unknown[]): boolean {
  return JSON.stringify(a) !== JSON.stringify(b);
}

export async function PUT(request: Request) {
  const rawBody = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(rawBody);

  if (!parsed.success) {
    return NextResponse.json({ error: "İstek gövdesi geçersiz." }, { status: 400 });
  }

  const body = parsed.data;

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
    .select("id, first_name, last_name, birth_date, province_code, district_code")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!candidate) {
    return NextResponse.json({ error: "Aday kaydı bulunamadı." }, { status: 403 });
  }

  const { data: profile } = await supabase
    .from("candidate_profiles")
    .select("id")
    .eq("candidate_id", candidate.id)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json(
      { error: "Doğrulama için gerekli veri bulunamadı." },
      { status: 409 }
    );
  }

  if (body.district_code) {
    const { data: district } = await supabase
      .from("districts")
      .select("province_code")
      .eq("code", body.district_code)
      .maybeSingle();

    if (!district || district.province_code !== body.province_code) {
      return NextResponse.json(
        { error: "İlçe seçilen ile ait değil." },
        { status: 400 }
      );
    }
  }

  const [
    { data: existingExperiences },
    { data: existingEducations },
    { data: existingCertifications },
  ] = await Promise.all([
    supabase
      .from("experiences")
      .select("company_name, title, start_date, end_date, is_current")
      .eq("candidate_id", candidate.id)
      .order("sort_order"),
    supabase
      .from("educations")
      .select("institution, field_of_study, end_year")
      .eq("candidate_id", candidate.id),
    supabase
      .from("certifications")
      .select("name, expiry_date")
      .eq("candidate_id", candidate.id)
      .order("sort_order"),
  ]);

  const changedFields: string[] = [];
  if (candidate.first_name !== body.first_name) changedFields.push("first_name");
  if (candidate.last_name !== body.last_name) changedFields.push("last_name");
  if (candidate.birth_date !== body.birth_date) changedFields.push("birth_date");
  if (candidate.province_code !== body.province_code) changedFields.push("province_code");
  if (candidate.district_code !== body.district_code) changedFields.push("district_code");
  if (arraysDiffer(existingExperiences ?? [], body.experiences)) {
    changedFields.push("experiences");
  }
  if (arraysDiffer(existingEducations ?? [], body.educations)) {
    changedFields.push("educations");
  }
  if (arraysDiffer(existingCertifications ?? [], body.certifications)) {
    changedFields.push("certifications");
  }

  try {
    const { error: candidateUpdateError } = await supabase
      .from("candidates")
      .update({
        first_name: body.first_name,
        last_name: body.last_name,
        birth_date: body.birth_date,
        province_code: body.province_code,
        district_code: body.district_code,
        status: "verified",
        updated_at: new Date().toISOString(),
      })
      .eq("id", candidate.id);
    if (candidateUpdateError) {
      throw new Error(`candidates güncellenemedi: ${candidateUpdateError.message}`);
    }

    await replaceRows(
      supabase,
      "experiences",
      candidate.id,
      body.experiences.map((exp, index) => ({
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
      body.educations.map((edu) => ({
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
      body.certifications.map((cert, index) => ({
        candidate_id: candidate.id,
        name: cert.name,
        expiry_date: cert.expiry_date,
        sort_order: index,
      }))
    );

    const { error: profileUpdateError } = await supabase
      .from("candidate_profiles")
      .update({
        verified_by_candidate: true,
        verified_at: new Date().toISOString(),
      })
      .eq("candidate_id", candidate.id);
    if (profileUpdateError) {
      throw new Error(`candidate_profiles güncellenemedi: ${profileUpdateError.message}`);
    }
  } catch (error) {
    console.error(
      "Aday doğrulama hatası:",
      error instanceof Error ? error.message : "bilinmeyen hata"
    );
    return NextResponse.json(
      { error: "Bilgileriniz kaydedilemedi. Lütfen tekrar deneyin." },
      { status: 500 }
    );
  }

  const adminClient = createAdminClient();
  const { error: auditError } = await adminClient.from("audit_log").insert({
    actor_id: user.id,
    actor_type: "candidate",
    action: "aday_dogruladi",
    entity_type: "candidate",
    entity_id: candidate.id,
    metadata: { changed_fields: changedFields },
  });

  if (auditError) {
    console.error("audit_log kaydı başarısız:", auditError.message);
  }

  return NextResponse.json({ ok: true });
}
