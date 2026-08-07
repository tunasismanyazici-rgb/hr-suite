import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VerificationForm } from "./verification-form";

const SIGNED_URL_TTL_SECONDS = 300;

export default async function BasvuruDogrulamaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/basvuru");
  }

  const { data: candidate } = await supabase
    .from("candidates")
    .select(
      "id, first_name, last_name, birth_date, province_code, district_code"
    )
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!candidate) {
    redirect("/basvuru/yukle");
  }

  const { data: document } = await supabase
    .from("candidate_documents")
    .select("id, storage_path, mime_type, ocr_status")
    .eq("candidate_id", candidate.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!document || document.ocr_status !== "completed") {
    redirect("/basvuru/durum");
  }

  const { data: profile } = await supabase
    .from("candidate_profiles")
    .select("field_confidence")
    .eq("candidate_id", candidate.id)
    .maybeSingle();

  if (!profile) {
    redirect("/basvuru/durum");
  }

  const [
    { data: experiences },
    { data: educations },
    { data: certifications },
    { data: provinces },
    { data: districts },
    { data: signedUrlData },
  ] = await Promise.all([
    supabase
      .from("experiences")
      .select("id, company_name, title, start_date, end_date, is_current, sort_order")
      .eq("candidate_id", candidate.id)
      .order("sort_order"),
    supabase
      .from("educations")
      .select("id, institution, field_of_study, end_year")
      .eq("candidate_id", candidate.id),
    supabase
      .from("certifications")
      .select("id, name, expiry_date, sort_order")
      .eq("candidate_id", candidate.id)
      .order("sort_order"),
    supabase.from("provinces").select("code, name").order("name"),
    supabase.from("districts").select("code, name, province_code").order("name"),
    supabase.storage
      .from("candidate-documents")
      .createSignedUrl(document.storage_path, SIGNED_URL_TTL_SECONDS),
  ]);

  return (
    <div className="flex flex-1 justify-center bg-zinc-50 px-4 py-8 dark:bg-black">
      <div className="w-full max-w-5xl">
        <VerificationForm
          candidate={candidate}
          document={{ mimeType: document.mime_type, signedUrl: signedUrlData?.signedUrl ?? null }}
          fieldConfidence={profile.field_confidence}
          experiences={experiences ?? []}
          educations={educations ?? []}
          certifications={certifications ?? []}
          provinces={provinces ?? []}
          districts={districts ?? []}
        />
      </div>
    </div>
  );
}
